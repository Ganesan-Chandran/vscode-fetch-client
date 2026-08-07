import * as fs from "fs/promises";
import * as path from "path";
import {
	collectLeaves,
	findFolderInCollection,
	findRequestFolderId,
	loadCollectionFromFile,
	resolveCollectionContexts,
	resolveFolderContext,
	resolveRequestContext,
} from "./lookup";
import { resolveSettings } from "./helper";
import { cliConfig } from "../config";
import { CliPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/cliPreFetchContextProvider";
import { DbPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/dbPreFetchContextProvider";
import { IPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/preFetch.types.ts";
import { FetchConfig } from "../../fetch-client-core/utils/fetchUtil";
import {
	getHeadersConfiguration,
	getTimeOutConfiguration,
} from "../../fetch-client-core/utils/vscodeConfig";
import { Var_Repository_FindByIdSync } from "../../fetch-client-core/db/variableDB.repository";
import { runLiveQualityGateRequest } from "../../fetch-client-core/utils/preFetchService/qualityGateLiveRunner";
import {
	EXTENSION_BY_FORMAT,
	ExportFormat,
} from "../../fetch-client-core/consts/export.consts";
import { getRuleMetas } from "../../fetch-client-core/helpers/qualityGate/ruleRegistry";
import { runQualityGateForCollection } from "../../fetch-client-core/helpers/qualityGateAnalyzer";
import { toQGCsv } from "../../fetch-client-core/helpers/exporters/qualityGate/qgCsvExporter";
import { toQGHtml } from "../../fetch-client-core/helpers/exporters/qualityGate/qgHtmlExporter";
import { toQGJson } from "../../fetch-client-core/helpers/exporters/qualityGate/qgJsonExporter";
import { toQGXml } from "../../fetch-client-core/helpers/exporters/qualityGate/qgXmlExporter";
import {
	IQGConfig,
	IQGReport,
	IQGRequestInput,
	IQualityGateResult,
	QGSeverity,
	QGVerdict,
} from "../../fetch-client-core/types/qualityGate.types";
import {
	ICollections,
	ISettings,
	IVariable,
} from "../../fetch-client-core/types/sidebar.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { IReponseModel } from "../../fetch-client-core/types/response.types";
import { RequestLeaf } from "../types/common.types";
import {
	bold,
	cyan,
	dim,
	green,
	printSection,
	printTable,
	red,
	yellow,
} from "../utils/display";
import { writeConsoleLog, wrtieConsleError } from "../utils/logger";
import { writeReportFile } from "../utils/export/report";

// ─── Shared option shapes ─────────────────────────────────────────────────────

interface QCBaseOptions {
	configPath?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}

// ─── Config loading (.qgrc.json, or an explicit --config file) ──────────────

const QG_CONFIG_FILENAME = ".qgrc.json";

export async function loadQualityGateConfig(
	configPath?: string,
): Promise<IQGConfig> {
	const target = configPath
		? path.resolve(configPath)
		: path.join(process.cwd(), QG_CONFIG_FILENAME);

	try {
		const text = await fs.readFile(target, "utf8");
		return JSON.parse(text) as IQGConfig;
	} catch (err: any) {
		if (err?.code === "ENOENT") {
			if (configPath) {
				wrtieConsleError(`Quality gate config file not found: ${target}`);
				process.exit(1);
			}
			// No .qgrc.json in the current directory - fall back to defaults.
			return {};
		}

		wrtieConsleError(
			`Failed to read/parse quality gate config '${target}': ${err?.message ?? err}`,
		);
		process.exit(1);
	}
}

// ─── Rules listing (fc-cli qc --rules) ────────────────────────────────────────

export function printQualityGateRules(): void {
	const rules = getRuleMetas();
	printSection(`Quality Gate Rules (${rules.length})`);

	const dimensions = Array.from(new Set(rules.map((r) => r.dimension)));

	for (const dimension of dimensions) {
		const list = rules.filter((r) => r.dimension === dimension);
		writeConsoleLog(`\n ${bold(cyan(dimension))}`);

		const header = [
			bold("Rule ID"),
			bold("Severity"),
			bold("Name"),
			bold("Description"),
		];
		const rows = [
			header,
			...list.map((r) => [
				dim(r.ruleId),
				severityLabel(r.defaultSeverity),
				r.name,
				dim(r.description),
			]),
		];
		printTable(rows, true);
	}

	writeConsoleLog(
		dim(
			'\nDisable a rule via .qgrc.json { "disabledRules": ["<ruleId>"] }, ' +
			'or an inline "@qg-disable <ruleId>" tag in a request\'s Notes.',
		),
	);
}

// ─── Live execution (delegates to the shared core runner used by the extension too) ──

async function runLiveForQualityGate(
	request: IRequestModel,
	settings: ISettings,
	variable: IVariable | undefined,
	effectiveVarId: string,
	provider: IPreFetchContextProvider,
): Promise<IReponseModel | undefined> {
	const fetchConfig: FetchConfig = {
		timeOut: getTimeOutConfiguration(),
		headersCase: getHeadersConfiguration(),
	};

	const { response, skippedReason } = await runLiveQualityGateRequest({
		request,
		settings,
		variable,
		effectiveVarId,
		provider,
		fetchConfig,
		encryptionKey: cliConfig.encryptionKey,
		reloadVariable: (varId) =>
			Var_Repository_FindByIdSync(varId, cliConfig.encryptionKey),
	});

	if (skippedReason) {
		writeConsoleLog(yellow(`  Skipped - pre-request failed: ${skippedReason}`));
	}

	return response;
}

// ─── Core runner (shared by request/collection/folder, DB or file-backed) ───

async function runQualityCheckCore(
	scopeName: string,
	scope: "request" | "collection" | "folder",
	leaves: RequestLeaf[],
	requestMap: Map<string, IRequestModel>,
	collection: ICollections,
	variable: IVariable | null,
	effectiveVarId: string,
	provider: IPreFetchContextProvider,
	opts: QCBaseOptions,
): Promise<void> {
	if (leaves.length === 0) {
		writeConsoleLog(`'${scopeName}' has no requests to analyze.`);
		return;
	}

	const config = await loadQualityGateConfig(opts.configPath);

	const inputs: IQGRequestInput[] = [];

	for (const leaf of leaves) {
		const request = requestMap.get(leaf.id);

		if (!request) {
			continue;
		}

		const settings = resolveSettings(collection, leaf.folderId);

		printSection(
			`Analyzing: ${request.method.toUpperCase()} ${request.name || request.url}`,
		);

		const response = await runLiveForQualityGate(
			request,
			settings,
			variable ?? undefined,
			effectiveVarId,
			provider,
		);

		inputs.push({ request, response });
	}

	if (inputs.length === 0) {
		writeConsoleLog("Nothing to analyze - no requests were found.");
		return;
	}

	const report = runQualityGateForCollection(scopeName, inputs, config);

	let pos = 0;
	for (const result of report.results) {
		printSection(`\n\nRequest: ${inputs[pos].request?.name}`,);
		printQGRequestResult(result);
		pos++;
	}

	printQGReportSummary(report);

	if (opts.exportFormat) {
		const filePath = await exportQualityGateReport(
			report,
			opts.exportFormat,
			scope,
			scopeName,
			opts.exportPath,
		);
		writeConsoleLog(`Report exported to: ${filePath}`);
	}

	if (!report.gateStatus.passed) {
		process.exitCode = 1;
	}
}

// ─── DB-backed entry points (fc-cli qc --req/--col/--fol) ────────────────────

export async function qualityCheckRequest(
	opts: QCBaseOptions & {
		name?: string;
		id?: string;
		varId?: string;
		varName?: string;
	},
): Promise<void> {
	const context = await resolveRequestContext(opts);
	const provider = new DbPreFetchContextProvider();

	const leaves: RequestLeaf[] = [
		{
			id: context.request.id,
			name: context.request.name,
			method: context.request.method,
			url: context.request.url,
			folderId: context.folderId,
		},
	];
	const requestMap = new Map([[context.request.id, context.request]]);

	await runQualityCheckCore(
		context.request.name || context.request.url,
		"request",
		leaves,
		requestMap,
		context.collection,
		context.variable,
		context.effectiveVarId,
		provider,
		opts,
	);
}

export async function qualityCheckCollection(
	opts: QCBaseOptions & {
		all?: boolean;
		name?: string;
		id?: string;
		varId?: string;
		varName?: string;
	},
): Promise<void> {
	const contexts = await resolveCollectionContexts(opts);
	const provider = new DbPreFetchContextProvider();

	for (const context of contexts) {
		await runQualityCheckCore(
			context.collection.name,
			"collection",
			context.leaves,
			context.requestMap,
			context.collection,
			context.variable,
			context.effectiveVarId,
			provider,
			opts,
		);
	}
}

export async function qualityCheckFolder(
	opts: QCBaseOptions & {
		name?: string;
		id?: string;
		varId?: string;
		varName?: string;
	},
): Promise<void> {
	const context = await resolveFolderContext(opts);
	const provider = new DbPreFetchContextProvider();

	await runQualityCheckCore(
		context.folder.name,
		"folder",
		context.leaves,
		context.requestMap,
		context.collection,
		context.variable,
		context.effectiveVarId,
		provider,
		opts,
	);
}

// ─── File-backed entry points (fc-cli qc --file ...) ─────────────────────────

export async function qualityCheckCollectionFromFile(
	opts: QCBaseOptions & { file: string; varFile?: string },
): Promise<void> {
	const { collection, requests, variable } = await loadCollectionFromFile(opts);

	const leaves: RequestLeaf[] = [];
	collectLeaves(collection, "", leaves);

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(
		collection,
		requestMap,
		variable,
	);

	await runQualityCheckCore(
		collection.name,
		"collection",
		leaves,
		requestMap,
		collection,
		variable,
		"",
		provider,
		opts,
	);
}

export async function qualityCheckFolderFromFile(
	opts: QCBaseOptions & {
		file: string;
		name?: string;
		id?: string;
		varFile?: string;
	},
): Promise<void> {
	const { collection, requests, variable } = await loadCollectionFromFile(opts);

	if (!opts.id && !opts.name) {
		wrtieConsleError("Provide --name or --id.");
		process.exit(1);
	}

	const folder = findFolderInCollection(collection, opts);

	if (!folder) {
		wrtieConsleError("Folder not found.");
		process.exit(1);
	}

	const leaves: RequestLeaf[] = [];
	collectLeaves(folder, folder.id, leaves);

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(
		collection,
		requestMap,
		variable,
	);

	await runQualityCheckCore(
		folder.name,
		"folder",
		leaves,
		requestMap,
		collection,
		variable,
		"",
		provider,
		opts,
	);
}

export async function qualityCheckRequestFromFile(
	opts: QCBaseOptions & {
		file: string;
		name?: string;
		id?: string;
		varFile?: string;
	},
): Promise<void> {
	const { collection, requests, variable } = await loadCollectionFromFile(opts);

	const request = opts.id
		? requests.find((r) => r.id === opts.id)
		: requests.find((r) => r.name.toLowerCase() === opts.name!.toLowerCase());

	if (!request) {
		wrtieConsleError("Request not found.");
		process.exit(1);
	}

	const folderId = findRequestFolderId(collection, request.id);
	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(
		collection,
		requestMap,
		variable,
	);

	const leaves: RequestLeaf[] = [
		{
			id: request.id,
			name: request.name,
			method: request.method,
			url: request.url,
			folderId,
		},
	];

	await runQualityCheckCore(
		request.name || request.url,
		"request",
		leaves,
		requestMap,
		collection,
		variable,
		"",
		provider,
		opts,
	);
}

// ─── Export ───────────────────────────────────────────────────────────────────

async function exportQualityGateReport(
	report: IQGReport,
	format: ExportFormat,
	scope: string,
	name: string,
	exportPath?: string,
): Promise<string> {
	let content: string;

	switch (format) {
		case "json":
			content = toQGJson(report);
			break;
		case "csv":
			content = toQGCsv(report);
			break;
		case "html":
			content = toQGHtml(report);
			break;
		case "xml":
			content = toQGXml(report);
			break;
		default:
			wrtieConsleError(`Unsupported export format for 'qc': '${format}'.`);
			process.exit(1);
	}

	return writeReportFile(
		content,
		EXTENSION_BY_FORMAT[format],
		{ scope, name, format },
		exportPath,
	);
}

// ─── Console output ───────────────────────────────────────────────────────────

function severityLabel(sev: QGSeverity): string {
	switch (sev) {
		case "Critical":
			return red(sev);
		case "High":
			return yellow(sev);
		case "Medium":
			return yellow(sev);
		default:
			return green(sev);
	}
}

function verdictLabel(v: QGVerdict): string {
	switch (v) {
		case "PASS":
			return green(v);
		case "CONDITIONAL_PASS":
			return yellow("CONDITIONAL_PASS");
		case "FAIL":
			return red(v);
		default:
			return v;
	}
}

function printQGRequestResult(result: IQualityGateResult): void {
	writeConsoleLog(
		`  Score: ${bold(String(result.overallScore))}/100   Verdict: ${verdictLabel(result.verdict)}`,
	);
	writeConsoleLog(
		`  Issues -> ${red(`Critical: ${result.summary.critical}`)}  ${yellow(`High: ${result.summary.high}`)}  ${yellow(`Medium: ${result.summary.medium}`)}  ${green(`Low: ${result.summary.low}`)}`,
	);

	const allIssues = result.dimensions.flatMap((d) => d.issues);

	if (allIssues.length === 0) {
		writeConsoleLog(dim("  No issues found."));
		return;
	}

	const header = [bold("Severity"), bold("Dimension"), bold("Rule"), bold("Description")];
	const rows = [
		header,
		...allIssues.map((issue) => [
			severityLabel(issue.severity),
			dim(issue.dimension),
			dim(issue.ruleId),
			issue.description,
		]),
	];
	printTable(rows, true);
}

function printQGReportSummary(report: IQGReport): void {
	printSection("Quality Gate Summary");
	writeConsoleLog(
		`  Requests analyzed: ${report.results.length}   Aggregate Score: ${bold(String(report.aggregateScore))}/100   Aggregate Verdict: ${verdictLabel(report.aggregateVerdict)}`,
	);

	const gateLabel = report.gateStatus.passed ? green("PASSED") : red("FAILED");
	writeConsoleLog(`  CI Gate: ${gateLabel}`);

	for (const reason of report.gateStatus.reasons) {
		writeConsoleLog(red(`    - ${reason}`));
	}
}
