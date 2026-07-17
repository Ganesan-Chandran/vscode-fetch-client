import fs from "fs/promises";
import path from "path";
import {
	CollectionRunContext,
	FolderRunContext,
	RequestLeaf,
} from "../types/common.types";
import {
	collectLeaves,
	findFolderInCollection,
	loadCollectionFromFile,
	resolveCollectionContexts,
	resolveEffectiveForRun,
	resolveFolderContext,
	resolveRequestsAcrossCollections,
} from "./lookup";
import { cliConfig } from "../config";
import { resolveSettings } from "./helper";
import {
	exportDataDrivenCSV,
	exportDataDrivenJson,
} from "../../fetch-client-core/utils/dataDrivenTestService/dataDrivenExport";
import { parseDataFile } from "../../fetch-client-core/utils/dataDrivenTestService/dataDrivenParser";
import { validateVariables } from "../../fetch-client-core/utils/dataDrivenTestService/dataDrivenVariables";
import {
	runDataDrivenTest,
	IDataDrivenCancelRef,
} from "../../fetch-client-core/utils/dataDrivenTestService/dataDrivenRunner";
import {
	CsvSeparator,
	DataFileFormat,
	IDataDrivenConfig,
	IDataDrivenRowResult,
} from "../../fetch-client-core/utils/dataDrivenTestService/dataDriven.types";
import { bold, dim, green, methodBadge, printSection, red, statusBadge, yellow } from "../utils/display";
import { ExportFormat } from "../../fetch-client-core/consts/export.consts";
import { FetchConfig } from "../../fetch-client-core/utils/fetchUtil";
import { getTimeOutConfiguration, getHeadersConfiguration } from "../../fetch-client-core/utils/vscodeConfig";
import { ICollections, IVariable } from "../../fetch-client-core/types/sidebar.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { writeConsoleLog, wrtieConsleError } from "../utils/logger";

export interface DataDrivenCliOptions {
	col?: boolean;
	fol?: boolean;
	all?: boolean;
	name?: string;
	id?: string;
	file?: string;
	varFile?: string;
	varId?: string;
	varName?: string;
	dataFile: string;
	format?: string;
	separator?: string;
	stopOnFailure?: boolean;
	req?: string;
	validateOnly?: boolean;
	exportFormat?: ExportFormat;
	exportPath?: string;
}

const SEPARATOR_ALIASES: Record<string, CsvSeparator> = {
	",": ",",
	comma: ",",
	";": ";",
	semicolon: ";",
	tab: "\t",
	"\\t": "\t",
};

function resolveFormat(opts: DataDrivenCliOptions): DataFileFormat {
	if (opts.format) {
		const f = opts.format.toLowerCase();
		if (f === "csv" || f === "json") {
			return f;
		}
		wrtieConsleError(`Invalid --dd-format '${opts.format}'. Use 'csv' or 'json'.`);
		process.exit(1);
	}
	const ext = path.extname(opts.dataFile).toLowerCase();
	if (ext === ".json") {
		return "json";
	}
	return "csv";
}

function resolveSeparator(opts: DataDrivenCliOptions): CsvSeparator {
	if (!opts.separator) {
		return ",";
	}
	const resolved = SEPARATOR_ALIASES[opts.separator.toLowerCase()];
	if (!resolved) {
		wrtieConsleError(`Invalid --dd-separator '${opts.separator}'. Use ',', ';', or 'tab'.`);
		process.exit(1);
	}
	return resolved;
}

/** Restricts a list of leaves to those matching the comma-separated --req list (by id or name, case-insensitive). */
function filterByReq(leaves: RequestLeaf[], req?: string): RequestLeaf[] {
	if (!req) {
		return leaves;
	}
	const wanted = req.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
	if (wanted.length === 0) {
		return leaves;
	}
	const matched = leaves.filter(
		(l) => wanted.includes(l.id.toLowerCase()) || wanted.includes(l.name.toLowerCase()),
	);
	const foundKeys = new Set(
		matched.flatMap((l) => [l.id.toLowerCase(), l.name.toLowerCase()]),
	);
	const missing = wanted.filter((w) => !foundKeys.has(w));
	if (missing.length > 0) {
		writeConsoleLog(
			yellow(`Warning: --req referenced requests not found and were skipped: ${missing.join(", ")}`),
		);
	}
	return matched;
}

function printRowResult(r: IDataDrivenRowResult): void {
	const passLabel = r.isError
		? bold(red("FAIL"))
		: r.testTotal === 0 || r.testPassed === r.testTotal
			? bold(green("PASS"))
			: bold(red("FAIL"));

	const status = r.isError && !r.status ? red("ERR") : statusBadge(r.status);

	const tests =
		r.testTotal === 0
			? dim("-")
			: r.testPassed === r.testTotal
				? green(`${r.testPassed}/${r.testTotal}`)
				: red(`${r.testPassed}/${r.testTotal}`);

	const sep = dim("·");

	writeConsoleLog(
		`  ${dim(`Row ${r.rowIndex}`)} ${sep} ${methodBadge(r.method ?? "")}${r.requestName} ${sep} ${status} ${sep} ${dim(`${r.duration}ms`)} ${sep} tests ${tests} ${sep} ${passLabel}` +
			(r.error ? ` ${sep} ${red(r.error)}` : ""),
	);
}

async function resolveTarget(opts: DataDrivenCliOptions): Promise<{
	collection: ICollections;
	requestMap: Map<string, IRequestModel>;
	leaves: RequestLeaf[];
	variable: IVariable | null;
	folderId: string;
}> {
	if (opts.file) {
		const { collection, requests, variable } = await loadCollectionFromFile({
			file: opts.file,
			varFile: opts.varFile,
		} as any);

		const requestMap = new Map(requests.map((r) => [r.id, r]));

		if (opts.fol) {
			const folder = findFolderInCollection(collection, { name: opts.name, id: opts.id });
			if (!folder) {
				wrtieConsleError("Folder not found in file.");
				process.exit(1);
			}
			const leaves: RequestLeaf[] = [];
			collectLeaves(folder, folder.id, leaves);
			return { collection, requestMap, leaves, variable, folderId: folder.id };
		}

		const leaves: RequestLeaf[] = [];
		collectLeaves(collection, "", leaves);
		return { collection, requestMap, leaves, variable, folderId: "" };
	}

	if (opts.fol) {
		const ctx: FolderRunContext = await resolveFolderContext({
			name: opts.name,
			id: opts.id,
			varId: opts.varId,
			varName: opts.varName,
		});
		return {
			collection: ctx.collection,
			requestMap: ctx.requestMap,
			leaves: ctx.leaves,
			variable: ctx.variable,
			folderId: ctx.folder.id,
		};
	}

	if (opts.col) {
		const contexts: CollectionRunContext[] = await resolveCollectionContexts({
			all: false,
			name: opts.name,
			id: opts.id,
			varId: opts.varId,
			varName: opts.varName,
		});

		if (contexts.length === 0) {
			wrtieConsleError("Collection not found or is empty.");
			process.exit(1);
		}

		const ctx = contexts[0];
		return {
			collection: ctx.collection,
			requestMap: ctx.requestMap,
			leaves: ctx.leaves,
			variable: ctx.variable,
			folderId: "",
		};
	}

	if (opts.req) {
		const identifiers = opts.req.split(",").map((s) => s.trim()).filter(Boolean);
		const { collection, leaves, requestMap, missing } =
			await resolveRequestsAcrossCollections(identifiers);

		if (missing.length > 0) {
			writeConsoleLog(
				yellow(`Warning: --req referenced requests not found and were skipped: ${missing.join(", ")}`),
			);
		}

		const { variable } = await resolveEffectiveForRun(
			collection.variableId,
			collection.name,
			{ varId: opts.varId, varName: opts.varName },
			cliConfig.encryptionKey,
		);

		return { collection, requestMap, leaves, variable, folderId: "" };
	}

	wrtieConsleError(
		"'fc-cli dd' requires --col <name/id>, --fol <name/id>, --req <name/id>[,...], or --file <collection.json> to select which requests to run.",
	);
	process.exit(1);
}

export async function runDataDrivenCli(opts: DataDrivenCliOptions): Promise<void> {
	if (opts.exportFormat && opts.exportFormat !== "json" && opts.exportFormat !== "csv") {
		wrtieConsleError(
			`Invalid --export format '${opts.exportFormat}' for 'dd'. Supported formats: json, csv.`,
		);
		process.exit(1);
	}

	const { collection, requestMap, leaves, variable, folderId } = await resolveTarget(opts);

	if (leaves.length === 0) {
		wrtieConsleError("No requests found for the given collection/folder.");
		process.exit(1);
	}

	const selectedLeaves =
		opts.col || opts.fol || opts.file ? filterByReq(leaves, opts.req) : leaves;

	if (selectedLeaves.length === 0) {
		wrtieConsleError("No requests left to run after applying --req.");
		process.exit(1);
	}

	const selectedRequests = selectedLeaves
		.map((l) => requestMap.get(l.id))
		.filter((r): r is IRequestModel => !!r);

	if (selectedRequests.length === 0) {
		wrtieConsleError("None of the selected requests could be loaded.");
		process.exit(1);
	}

	let fileContent: string;
	try {
		fileContent = await fs.readFile(opts.dataFile, "utf8");
	} catch {
		wrtieConsleError(`Data file not found: ${opts.dataFile}`);
		process.exit(1);
	}

	const fileFormat = resolveFormat(opts);
	const csvSeparator = resolveSeparator(opts);

	const parseResult = parseDataFile(fileContent, fileFormat, csvSeparator);

	if (parseResult.error) {
		wrtieConsleError(`Failed to parse data file: ${parseResult.error}`);
		process.exit(1);
	}

	printSection("Data-Driven Test");
	writeConsoleLog(
		`Loaded ${parseResult.rowCount} row(s), columns: ${parseResult.columns.join(", ")}`,
	);

	const validation = validateVariables(selectedRequests, requestMap, parseResult.columns);

	if (validation.valid) {
		writeConsoleLog(green(`✓ All variables present in data file (${validation.presentVars.join(", ") || "none used"}).`));
	} else {
		writeConsoleLog(
			red(`✗ Missing columns in data file: ${validation.missingVars.join(", ")}`),
		);
	}

	if (opts.validateOnly) {
		return;
	}

	const config: IDataDrivenConfig = {
		fileFormat,
		csvSeparator,
		maxRows: 100,
		stopOnRowFailure: !!opts.stopOnFailure,
		selectedRequestIds: selectedRequests.map((r) => r.id),
	};

	const fetchConfig: FetchConfig = {
		timeOut: getTimeOutConfiguration(),
		headersCase: getHeadersConfiguration(),
	};

	const parentSettings = resolveSettings(collection, folderId);

	const cancelRef: IDataDrivenCancelRef = { cancelled: false };
	let sigintCount = 0;
	const onSigint = () => {
		sigintCount++;
		if (sigintCount === 1) {
			writeConsoleLog(yellow("\nStopping after the current request... (press Ctrl+C again to force quit)"));
			cancelRef.cancelled = true;
		} else {
			process.exit(1);
		}
	};
	process.on("SIGINT", onSigint);

	writeConsoleLog(
		bold(`\nRunning: ${selectedRequests.length} request(s) x ${parseResult.rowCount} row(s)\n`),
	);

	const result = await runDataDrivenTest(
		selectedRequests,
		collection,
		requestMap,
		parseResult.rows,
		variable ?? undefined,
		parentSettings,
		config,
		fetchConfig,
		cancelRef,
		printRowResult,
	);

	process.off("SIGINT", onSigint);

	printSection("Summary");
	writeConsoleLog(
		`Rows: ${result.totalRows}  Requests: ${result.totalRequests}  ` +
			bold(green(`Passed: ${result.passedRequests}`)) +
			"  " +
			bold(red(`Failed: ${result.failedRequests}`)) +
			(cancelRef.cancelled ? "  " + yellow("(cancelled)") : ""),
	);

	if (!opts.exportFormat) {
		return;
	}

	const testName = collection.name;
	const timestamp = result.endTime.replace(/[:.]/g, "-");
	const dir = opts.exportPath ?? path.join(process.cwd(), "fetch-client-exports");
	await fs.mkdir(dir, { recursive: true });

	const fileBase = `${testName}-datadriven-${timestamp}`;
	const outPath =
		opts.exportFormat === "json"
			? path.join(dir, `${fileBase}.json`)
			: path.join(dir, `${fileBase}.csv`);

	const content =
		opts.exportFormat === "json"
			? exportDataDrivenJson(result, config, testName)
			: exportDataDrivenCSV(result);

	await fs.writeFile(outPath, content, "utf8");
	writeConsoleLog(`Report exported to: ${outPath}`);
}
