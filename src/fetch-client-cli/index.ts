import { cliConfig } from "./config";
import { setGlobalStorageUri } from "../fetch-client-core/db/dbHelper";
import {
	setSSLCheck,
	setTLSCertificates,
	setVariableEncryptionConfiguration,
	setVariableEncryptionKey,
} from "../fetch-client-core/utils/commonConfig";

// - 1. Bootstrap DB path before any repository code opens a database -
setGlobalStorageUri(cliConfig.dbPath);
setVariableEncryptionConfiguration(cliConfig.encryptionEnabled);
setVariableEncryptionKey(cliConfig.encryptionKey);
setSSLCheck(cliConfig.sslCheck);
setTLSCertificates(cliConfig.tlsCertificate);

// - 2. Lazy-import command handlers (DB repos are only called inside them) -
import { checkDbFiles } from "./commands/check";
import { DD_EXPORT_FORMATS, ExportFormat, SUPPORTED_EXPORT_FORMATS } from "../fetch-client-core/consts/export.consts";
import { isSupportedDataDrivenExportFormat, isSupportedExportFormat } from "./types/export.types";
import { listCollections, listFolders, listVariables } from "./commands/list";
import { perfCollection, perfCollectionFromFile, perfFolder, perfFolderFromFile, perfRequest, perfRequestFromFile } from "./commands/perf";
import { runCollection, runFolder, runRequest, runCurl, runCollectionFromFile, runFolderFromFile, runRequestFromFile } from "./commands/run";
import { runDataDrivenCli } from "./commands/ddTest";
import { writeConsoleLog, wrtieConsleError } from "./utils/logger";

// - Version / package info -

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VERSION: string = require("./package.json").version;

// - Help text -

const HELP = `
Fetch Client CLI v${VERSION}
 
Usage:  fc-cli <command> [options]
 
Commands:
	list      List collections, folders, or variables
	run       Execute requests, collections, folders, a raw curl string, or exported collection json file
	check     Verify that all Fetch Client DB files are available
 
── LIST ────────────────────────────────────────────────────────────────────────────────────────────
 
fc-cli list --col <name/id>                                     Filter collections by name or id
 
fc-cli list --fol <name/id>                                     Find folder by name or id
 
fc-cli list --var                                               List all variable sets
fc-cli list --var <name/id>                                     Filter variable sets by name or id
 
── RUN ─────────────────────────────────────────────────────────────────────────────────────────────
 
fc-cli run --req <name/id>                                      Run a request by name or id
fc-cli run --req <name/id> --var <name/id>                      Override variable set (by name or id)
 
fc-cli run --col --all                                          Run every request in every collection
fc-cli run --col <name/id>                                      Run all requests in a collection by name or id
fc-cli run --col <name/id> --var <name/id>                      Run collection with a specific variable set (by name or id)
                                                                Note: if the collection is already linked to a variable set,
                                                                the linked variable takes priority and --var is ignored
                                                                (an info message is printed).
 
fc-cli run --fol <name/id>                                      Run all requests in a folder by name or id
fc-cli run --fol <name/id> --var <name/id>                      Override variable set (by name or id)
                                                                Note: same priority rule applies - linked variable wins.
 
fc-cli run --curl '<curl ...>'                                  Execute a raw curl command
 
── RUN FROM EXPORTED COLLECTION ────────────────────────────────────────────────────────────────────
 
fc-cli run --file <collection.json>                             Run an exported collection
fc-cli run --file <collection.json> --fol <name/id>             Run a folder
fc-cli run --file <collection.json> --req <name/id>             Run a request
fc-cli run --file <collection.json> --var-file <vars.json>      Override embedded variables
 
── EXPORT ──────────────────────────────────────────────────────────────────────────────────────────
 
fc-cli run --req <name/id> --export <format> --var <name/id>    Export a detailed report after running
fc-cli run --col <name/id> --export <format>                    Supported formats: csv, html, json, xml, nunit
fc-cli run --col --all --export json --export-path <dir>        Export to a custom directory
                                                                Notes:
                                                                --export is only supported with --req, --col, and --fol.
                                                                --export-path must be a directory. If omitted, reports are
                                                                written to a "fetch-client-exports" folder alongside the
                                                                Fetch Client database.
 
── LEGACY SYNTAX (still supported) ─────────────────────────────────────────────────────────────────
 
fc-cli run --col --name <name>                                  Same as: fc-cli run --col <name>
fc-cli run --col --id <uuid>                                    Same as: fc-cli run --col <uuid>
fc-cli run --fol --name <name>                                  Same as: fc-cli run --fol <name>
fc-cli run --fol --id <uuid>                                    Same as: fc-cli run --fol <uuid>
fc-cli run --req --name <name>                                  Same as: fc-cli run --req <name>
fc-cli run --req --id <uuid>                                    Same as: fc-cli run --req <uuid>
fc-cli run --col <name/id> --var-id <uuid>                      Same as: fc-cli run --col <name/id> --var <uuid>
fc-cli run --col <name/id> --var-name <name>                    Same as: fc-cli run --col <name/id> --var <name>
fc-cli list --var --name <name>                                 Same as: fc-cli list --var <name>
fc-cli list --var --id <uuid>                                   Same as: fc-cli list --var <uuid>

── PERF ────────────────────────────────────────────────────────────────────────────────────────────
 
fc-cli perf --req <name/id>                                       Load-test a single request
fc-cli perf --col <name/id>                                       Load-test a whole collection
fc-cli perf --fol <name/id>                                       Load-test a folder
fc-cli perf --col <name/id> --var <name/id>                       Override variable set (same priority rule as run)
fc-cli perf --file <collection.json>                              Load-test an exported collection
fc-cli perf --file <collection.json> --fol <name/id>              Load-test a folder within it
fc-cli perf --file <collection.json> --req <name/id>              Load-test a request within it
fc-cli perf --file <collection.json> --var-file <vars.json>       Override embedded variables
                                                                   Note: --var/--var-id/--var-name are not
                                                                   supported with --file (matches 'run --file').
 
--load-model <fixed|duration|rampup|combined>   [default: fixed]      Load pattern to use
--vus <n>                                       [default: 5]          Virtual users. Max 50.
                                                                       (target VUs for rampup/combined)
--iterations <n>                                [default: 10]         Waves per VU. Fixed model only. Max 1000.
--duration <sec>                                [default: 30]         Hold/test duration. duration/combined only. Max 3600.
--rampup-duration <sec>                         [default: 20]         Ramp-up window. rampup/combined only. Max 3600.
--rampup-steps <n>                              [default: 5]          Steps within ramp-up. rampup/combined only.
                                                                       Cannot exceed --vus (auto-clamped).
--think-time <ms>                               [default: 0]          Delay between waves. Max 300000.
--export <json|csv|html|xml>                    [default: none]       Export a perf report after the test
--export-path <dir>                             [default: fetch-client-exports folder]
 
Before running, the CLI prints the resolved configuration showing which values you
set explicitly (user) vs. which fell back to defaults, plus any warnings about
invalid, out-of-range, or irrelevant flags for the chosen load model.
 
Press Ctrl+C once to stop gracefully and print results so far; press it again to force-quit.
 
── DATA-DRIVEN TEST ────────────────────────────────────────────────────────────────────────────────

fc-cli dd --col <name/id> --data <file.csv|file.json>              Run every request in a collection once per data row
fc-cli dd --fol <name/id> --data <file.csv|file.json>              Run every request in a folder once per data row
fc-cli dd --req <name/id>[,<name/id>...] --data <file>              Run specific requests (must be in the same collection)
fc-cli dd --col <name/id> --req <name/id>[,...] --data <file>      Restrict a collection/folder run to specific requests
fc-cli dd --file <collection.json> --data <file>                   Run against an exported collection
fc-cli dd --file <collection.json> --fol <name/id> --data <file>   Restrict to a folder within the file

--data <file>                                   (required)            CSV or JSON data file, one row per iteration
--dd-format <csv|json>                          [default: inferred from --data extension]
--dd-separator <,|;|tab>                        [default: ,]           CSV column separator
--stop-on-fail                                                        Stop the run as soon as a row fails
--validate                                                            Check that all {{variables}} used are present as
                                                                       columns in the data file, then exit without running
--var <name/id>                                                      Variable set to merge under the row data (row data wins)
--export <json|csv|html|xml|nunit>              [default: none]       Export a data-driven report after the run
--export-path <dir>                             [default: ./fetch-client-exports]

Maximum 100 data rows per run. Requests run sequentially per row, in collection/folder order.
Press Ctrl+C once to stop gracefully and print results so far; press it again to force-quit.

── CHECK ───────────────────────────────────────────────────────────────────────────────────────────
 
fc-cli check                                                    Check if all DB files exist
 
── OPTIONS ─────────────────────────────────────────────────────────────────────────────────────────
 
--help, -h                                                      Show this help message
--version, -v                                                   Show CLI version
 
── CONFIGURATION ───────────────────────────────────────────────────────────────────────────────────
 
By default the CLI locates the Fetch Client database at the standard
VS Code global-storage path for this extension.
`;

// - Minimal argument parser -

interface ParsedArgs {
	/** Positional arguments (e.g. ['list'] or ['run']) */
	_: string[];
	col: boolean;
	fol: boolean;
	var: boolean;
	req: boolean;
	all: boolean;
	help: boolean;
	version: boolean;
	name?: string;
	id?: string;
	curl?: string;
	varId?: string;
	varName?: string;
	export?: string;
	exportPath?: string;
	file?: string;
	varFile?: string;
	/** Inline value passed directly after --col, e.g. `--col myCollection` */
	colValue?: string;
	/** Inline value passed directly after --fol, e.g. `--fol myFolder` */
	folValue?: string;
	/** Inline value passed directly after --req, e.g. `--req myRequest` */
	reqValue?: string;
	/** Inline value passed directly after --var, e.g. `--var myVariableSet` */
	varValue?: string;
	loadModel?: string;
	vus?: string;
	iterations?: string;
	duration?: string;
	rampupDuration?: string;
	rampupSteps?: string;
	thinkTime?: string;
	data?: string;
	ddFormat?: string;
	ddSeparator?: string;
	stopOnFail: boolean;
	validate: boolean;
}

const VALUE_FLAGS = new Set([
	"--name",
	"--id",
	"--curl",
	"--file",
	"--var-file",
	"--var-id",
	"--var-name",
	"--export",
	"--export-path",
	"--load-model",
	"--vus",
	"--iterations",
	"--duration",
	"--rampup-duration",
	"--rampup-steps",
	"--think-time",
	"--data",
	"--dd-format",
	"--dd-separator",
]);

/** Flags that support an inline `--flag <value>` shorthand for name/id. */
const ENTITY_FLAGS: Record<string, "col" | "fol" | "req"> = {
	"--col": "col",
	"--fol": "fol",
	"--req": "req",
};

function parseArgs(argv: string[]): ParsedArgs {
	const result: ParsedArgs = {
		_: [],
		col: false,
		fol: false,
		var: false,
		req: false,
		all: false,
		help: false,
		version: false,
		stopOnFail: false,
		validate: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "--help" || arg === "-h") {
			result.help = true;
			continue;
		}

		if (arg === "--version" || arg === "-v") {
			result.version = true;
			continue;
		}

		// --col / --fol / --req: booleans that also accept an optional inline
		// value, e.g. `--col myCollection`. If the next token is itself a flag
		// (starts with "--") or is missing, we fall back to legacy behaviour
		// where a separate --name/--id supplies the filter.
		const entityKey = ENTITY_FLAGS[arg];
		if (entityKey) {
			result[entityKey] = true;

			const next = argv[i + 1];
			if (next !== undefined && !next.startsWith("--")) {
				const valueKey = `${entityKey}Value` as
					| "colValue"
					| "folValue"
					| "reqValue";
				result[valueKey] = next;
				i++;
			}
			continue;
		}

		// --var: boolean (used by `list --var`) that also accepts an optional
		// inline value (used by `run` to override a variable set), e.g.
		// `--var myVariableSet`. Legacy --var-id/--var-name still work.
		if (arg === "--var") {
			result.var = true;

			const next = argv[i + 1];
			if (next !== undefined && !next.startsWith("--")) {
				result.varValue = next;
				i++;
			}
			continue;
		}

		if (arg === "--all") {
			result.all = true;
			continue;
		}

		if (arg === "--stop-on-fail") {
			result.stopOnFail = true;
			continue;
		}

		if (arg === "--validate") {
			result.validate = true;
			continue;
		}

		// --name=value / --id=value / --curl=value / --var-id=value /
		// --var-name=value / --export=value / --export-path=value
		const eqMatch =
			/^--(name|id|curl|file|var-file|var-id|var-name|export|export-path)=(.+)$/.exec(arg);
		if (eqMatch) {
			const key = eqMatch[1].replace(/-([a-z])/g, (_, c) =>
				c.toUpperCase(),
			) as keyof ParsedArgs;
			(result as any)[key] = eqMatch[2];
			continue;
		}

		if (VALUE_FLAGS.has(arg)) {
			const next = argv[i + 1];

			// Missing value entirely, or the "value" is actually another flag.
			if (next === undefined || next.startsWith("--")) {
				wrtieConsleError(`Missing value for '${arg}'.`);
				process.exit(1);
			}

			const key = arg
				.replace(/^--/, "")
				.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) as keyof ParsedArgs;
			(result as any)[key] = next;
			i++;
			continue;
		}

		if (!arg.startsWith("--")) {
			result._.push(arg);
		}
	}

	return result;
}

// - Name/id resolution helpers -

// Matches standard UUIDs (any version/variant), e.g. the ids stored in the DB.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

/**
 * Resolves a `{ name, id }` filter for an entity (collection/folder/request).
 *
 * Priority:
 *   1. Explicit --name / --id (legacy syntax) always wins if provided.
 *   2. Otherwise, an inline value (`--col <value>`) is classified as an id
 *      if it looks like a UUID, or a name otherwise.
 */
function resolveEntityFilter(
	explicitName: string | undefined,
	explicitId: string | undefined,
	inlineValue: string | undefined,
): { name?: string; id?: string } {
	if (explicitName !== undefined || explicitId !== undefined) {
		return { name: explicitName, id: explicitId };
	}

	if (inlineValue !== undefined) {
		return isUuid(inlineValue) ? { id: inlineValue } : { name: inlineValue };
	}

	return {};
}

/**
 * Resolves a `{ varId, varName }` variable-set override.
 *
 * Priority:
 *   1. Explicit --var-id / --var-name (legacy syntax) always wins if provided.
 *   2. Otherwise, an inline value (`--var <value>`) is classified as an id
 *      if it looks like a UUID, or a name otherwise.
 */
function resolveVarOverride(
	explicitVarId: string | undefined,
	explicitVarName: string | undefined,
	inlineValue: string | undefined,
): { varId?: string; varName?: string } {
	if (explicitVarId !== undefined || explicitVarName !== undefined) {
		return { varId: explicitVarId, varName: explicitVarName };
	}

	if (inlineValue !== undefined) {
		return isUuid(inlineValue)
			? { varId: inlineValue }
			: { varName: inlineValue };
	}

	return {};
}

// - Main -

async function main(): Promise<void> {
	const argv = parseArgs(process.argv.slice(2));

	if (argv.version) {
		writeConsoleLog(`fc-cli v${VERSION}`);
		return;
	}

	if (argv.help || argv._.length === 0) {
		writeConsoleLog(HELP);
		return;
	}

	const command = (argv._[0] ?? "").toLowerCase();

	switch (command) {
		case "list":
			await handleList(argv);
			break;

		case "run":
			await handleRun(argv);
			break;

		case "check":
			checkDbFiles();
			break;

		case "perf":
			await handlePerf(argv);
			break;

		case "dd":
			await handleDataDriven(argv);
			break;

		default:
			wrtieConsleError(
				`Unknown command: '${command}'. Run 'fc-cli --help' for usage.`,
			);
			process.exit(1);
	}
}

// - list -

async function handleList(argv: ParsedArgs): Promise<void> {
	if (argv.col) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.colValue);
		await listCollections({ name, id });
		return;
	}

	if (argv.fol) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.folValue);

		if (!name && !id) {
			wrtieConsleError("'fc-cli list --fol' requires a name or id, e.g. 'fc-cli list --fol <name/id>'.");
			process.exit(1);
		}

		await listFolders({ name, id });
		return;
	}

	if (argv.var) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.varValue);
		await listVariables({ name, id });
		return;
	}

	wrtieConsleError(
		"Specify --col, --fol, or --var after 'list'. Run 'fc-cli --help' for usage.",
	);
	process.exit(1);
}

// - run -

async function handleRun(argv: ParsedArgs): Promise<void> {
	const { curl, file, varFile, export: exportFormatRaw, exportPath } = argv;

	if (exportFormatRaw && !isSupportedExportFormat(exportFormatRaw)) {
		wrtieConsleError(
			`Invalid --export format '${exportFormatRaw}'. Supported formats: ${SUPPORTED_EXPORT_FORMATS.join(", ")}.`,
		);
		process.exit(1);
	}

	const exportFormat = exportFormatRaw as ExportFormat | undefined;

	if (curl) {
		if (exportFormat) {
			writeConsoleLog(
				"Note: --export is not supported with --curl and will be ignored.",
			);
		}
		await runCurl(curl);
		return;
	}

	if (file) {
		if (argv.col || argv.all) {
			wrtieConsleError(
				"'--col' and '--all' cannot be used with '--file'."
			);
			process.exit(1);
		}

		if (argv.req) {
			const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.reqValue);

			if (!name && !id) {
				wrtieConsleError(
					"'fc-cli run --file' with '--req' requires a name or id, e.g. 'fc-cli run --file <file> --req <name/id>'."
				);
				process.exit(1);
			}

			await runRequestFromFile({
				file,
				name,
				id,
				varFile,
				exportFormat,
				exportPath,
			});

			return;
		}

		if (argv.fol) {
			const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.folValue);

			if (!name && !id) {
				wrtieConsleError(
					"'fc-cli run --file' with '--fol' requires a name or id, e.g. 'fc-cli run --file <file> --fol <name/id>'."
				);
				process.exit(1);
			}

			await runFolderFromFile({
				file,
				name,
				id,
				varFile,
				exportFormat,
				exportPath,
			});

			return;
		}

		await runCollectionFromFile({
			file,
			varFile,
			exportFormat,
			exportPath,
		});

		return;
	}

	if (argv.req) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.reqValue);

		if (!name && !id) {
			wrtieConsleError("'fc-cli run --req' requires a name or id, e.g. 'fc-cli run --req <name/id>'.");
			process.exit(1);
		}

		const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);

		await runRequest({
			name,
			id,
			varId,
			varName,
			exportFormat,
			exportPath,
		});
		return;
	}

	if (argv.col) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.colValue);
		const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);

		await runCollection({
			all: argv.all,
			name,
			id,
			varId,
			varName,
			exportFormat,
			exportPath,
		});
		return;
	}

	if (argv.fol) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.folValue);
		const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);

		if (!name && !id) {
			wrtieConsleError("'fc-cli run --fol' requires a name or id, e.g. 'fc-cli run --fol <name/id>'.");
			process.exit(1);
		}

		await runFolder({
			name,
			id,
			varId,
			varName,
			exportFormat,
			exportPath,
		});
		return;
	}

	wrtieConsleError(
		"Specify --req, --col, --fol, or --curl after 'run'. Run 'fc-cli --help' for usage.",
	);

	process.exit(1);
}

// -- handlePerf --

async function handlePerf(argv: ParsedArgs): Promise<void> {
	const perfOpts = {
		exportFormat: argv.export,
		exportPath: argv.exportPath,
		loadModel: argv.loadModel,
		vus: argv.vus,
		iterations: argv.iterations,
		duration: argv.duration,
		rampupDuration: argv.rampupDuration,
		rampupSteps: argv.rampupSteps,
		thinkTime: argv.thinkTime,
	};

	if (argv.file) {
		if (argv.col || argv.all) {
			wrtieConsleError("'--col' and '--all' cannot be used with '--file'.");
			process.exit(1);
		}

		if (argv.req) {
			const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.reqValue);
			await perfRequestFromFile({ ...perfOpts, file: argv.file, name, id, varFile: argv.varFile });
			return;
		}

		if (argv.fol) {
			const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.folValue);
			await perfFolderFromFile({ ...perfOpts, file: argv.file, name, id, varFile: argv.varFile });
			return;
		}

		await perfCollectionFromFile({ ...perfOpts, file: argv.file, varFile: argv.varFile });
		return;
	}

	if (argv.req) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.reqValue);
		const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);
		await perfRequest({ ...perfOpts, name, id, varId, varName });
		return;
	}

	if (argv.col) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.colValue);
		const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);
		await perfCollection({ ...perfOpts, name, id, varId, varName });
		return;
	}

	if (argv.fol) {
		const { name, id } = resolveEntityFilter(argv.name, argv.id, argv.folValue);
		const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);
		await perfFolder({ ...perfOpts, name, id, varId, varName });
		return;
	}

	wrtieConsleError(
		"Specify --req, --col, --fol, or --file after 'perf'. Run 'fc-cli --help' for usage.",
	);
	process.exit(1);
}

// - dd -

async function handleDataDriven(argv: ParsedArgs): Promise<void> {
	if (argv.export && !isSupportedDataDrivenExportFormat(argv.export)) {
		wrtieConsleError(
			`Invalid --export format '${argv.export}' for 'dd'. Supported formats: ${DD_EXPORT_FORMATS.join(", ")}.`,
		);
		process.exit(1);
	}

	if (!argv.data) {
		wrtieConsleError("'fc-cli dd' requires --data <file.csv|file.json>.");
		process.exit(1);
	}

	if (!argv.file && !argv.col && !argv.fol && !argv.req) {
		wrtieConsleError(
			"'fc-cli dd' requires --col <name/id>, --fol <name/id>, --req <name/id>[,...], or --file <collection.json>. Run 'fc-cli --help' for usage.",
		);
		process.exit(1);
	}

	if (argv.req && !argv.reqValue) {
		wrtieConsleError(
			"'fc-cli dd --req' needs an inline value, e.g. 'fc-cli dd --req \"Login,Get Users\" --data rows.csv'.",
		);
		process.exit(1);
	}

	const { name, id } = resolveEntityFilter(
		argv.name,
		argv.id,
		argv.fol ? argv.folValue : argv.colValue,
	);
	const { varId, varName } = resolveVarOverride(argv.varId, argv.varName, argv.varValue);

	await runDataDrivenCli({
		col: argv.col,
		fol: argv.fol,
		name,
		id,
		file: argv.file,
		varFile: argv.varFile,
		varId,
		varName,
		dataFile: argv.data,
		format: argv.ddFormat,
		separator: argv.ddSeparator,
		stopOnFailure: argv.stopOnFail,
		req: argv.reqValue,
		validateOnly: argv.validate,
		exportFormat: argv.export as ExportFormat | undefined,
		exportPath: argv.exportPath,
	});
}

// - Entry -

main().catch((err: Error) => {
	console.error("Fatal error:", err?.message ?? err);
	process.exit(1);
});
