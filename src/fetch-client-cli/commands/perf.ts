import { CliPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/cliPreFetchContextProvider";
import { DbPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/dbPreFetchContextProvider";
import {
	collectLeaves,
	findFolderInCollection,
	findRequestFolderId,
	loadCollectionFromFile,
	resolveCollectionContexts,
	resolveFolderContext,
	resolveRequestContext,
} from "./lookup";
import { ExportFormat, PERF_EXPORT_FORMATS } from "../../fetch-client-core/consts/export.consts";
import { isSupportedPerfExportFormat } from "../types/export.types";
import { PerfCliOptions, buildPerfConfig } from "../utils/performance/perfConfig";
import { printPerfConfigSummary } from "../utils/display";
import { RequestLeaf, RunCollectionFileOptions } from "../types/common.types";
import { runPerfEngine } from "../utils/performance/perfRunner";
import { writeConsoleLog, wrtieConsleError } from "../utils/logger";

export interface PerfCommandOptions extends PerfCliOptions {
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
	exportFormat?: string;
	exportPath?: string;
}

export interface PerfFileCommandOptions extends PerfCliOptions {
	file: string;
	name?: string;
	id?: string;
	varFile?: string;
	exportFormat?: string;
	exportPath?: string;
}

function validateExportFormat(exportFormatRaw?: string): ExportFormat | undefined {
	if (!exportFormatRaw) {
		return undefined;
	}

	if (!isSupportedPerfExportFormat(exportFormatRaw)) {
		wrtieConsleError(
			`Invalid --export format '${exportFormatRaw}' for perf tests. Supported formats: ${PERF_EXPORT_FORMATS.join(", ")}.`,
		);
		process.exit(1);
	}

	return exportFormatRaw as ExportFormat;
}

function estimateTotalRequests(leafCount: number, config: ReturnType<typeof buildPerfConfig>["config"]): string {
	if (config.loadModel === "fixed") {
		return String(leafCount * config.targetVUs * config.iterations);
	}
	return `~${leafCount * config.targetVUs} per wave (open-ended, stops by time/duration)`;
}

// --- DB-backed perf (existing) ------------------------------------------------

export async function perfCollection(opts: PerfCommandOptions): Promise<void> {
	const exportFormat = validateExportFormat(opts.exportFormat);

	if (!opts.name && !opts.id) {
		wrtieConsleError("'fc-cli perf --col' requires a name or id, e.g. 'fc-cli perf --col <name/id>'.");
		process.exit(1);
	}

	const contexts = await resolveCollectionContexts(opts);

	if (contexts.length === 0) {
		wrtieConsleError(`Collection '${opts.name ?? opts.id}' has no requests to test.`);
		process.exit(1);
	}

	const context = contexts[0];
	const { config, userProvided, warnings } = buildPerfConfig("collection", opts);

	printPerfConfigSummary(context.collection.name, "Collection", config, userProvided, warnings);
	writeConsoleLog(`Requests  : ${context.leaves.length} in scope | Est. total calls: ${estimateTotalRequests(context.leaves.length, config)}`);
	writeConsoleLog("");

	const provider = new DbPreFetchContextProvider();

	await runPerfEngine(
		context.collection.name, context.leaves, context.requestMap, context.collection,
		context.variable, context.effectiveVarId, provider, config,
		{ exportFormat, exportPath: opts.exportPath },
	);
}

export async function perfFolder(opts: PerfCommandOptions): Promise<void> {
	const exportFormat = validateExportFormat(opts.exportFormat);

	if (!opts.name && !opts.id) {
		wrtieConsleError("'fc-cli perf --fol' requires a name or id, e.g. 'fc-cli perf --fol <name/id>'.");
		process.exit(1);
	}

	const context = await resolveFolderContext(opts);

	if (context.leaves.length === 0) {
		wrtieConsleError(`Folder '${context.folder.name}' has no requests to test.`);
		process.exit(1);
	}

	const { config, userProvided, warnings } = buildPerfConfig("collection", opts);

	printPerfConfigSummary(context.folder.name, "Folder", config, userProvided, warnings);
	writeConsoleLog(`Requests  : ${context.leaves.length} in scope | Est. total calls: ${estimateTotalRequests(context.leaves.length, config)}`);
	writeConsoleLog("");

	const provider = new DbPreFetchContextProvider();

	await runPerfEngine(
		context.folder.name, context.leaves, context.requestMap, context.collection,
		context.variable, context.effectiveVarId, provider, config,
		{ exportFormat, exportPath: opts.exportPath },
	);
}

export async function perfRequest(opts: PerfCommandOptions): Promise<void> {
	const exportFormat = validateExportFormat(opts.exportFormat);

	if (!opts.name && !opts.id) {
		wrtieConsleError("'fc-cli perf --req' requires a name or id, e.g. 'fc-cli perf --req <name/id>'.");
		process.exit(1);
	}

	const context = await resolveRequestContext(opts);

	const leaf: RequestLeaf = {
		id: context.request.id,
		name: context.request.name || context.request.url,
		method: context.request.method,
		url: context.request.url,
		folderId: context.folderId,
	};

	const requestMap = context.requestMap ?? new Map([[context.request.id, context.request]]);
	const { config, userProvided, warnings } = buildPerfConfig("single", opts);

	printPerfConfigSummary(context.request.name || context.request.url, "Request", config, userProvided, warnings);
	writeConsoleLog(`Requests  : 1 in scope | Est. total calls: ${estimateTotalRequests(1, config)}`);
	writeConsoleLog("");

	const provider = new DbPreFetchContextProvider();

	await runPerfEngine(
		context.request.name || context.request.url, [leaf], requestMap, context.collection,
		context.variable, context.effectiveVarId, provider, config,
		{ exportFormat, exportPath: opts.exportPath },
	);
}

// --- File-backed perf (new - mirrors run --file) ------------------------------

export async function perfCollectionFromFile(opts: PerfFileCommandOptions): Promise<void> {
	const exportFormat = validateExportFormat(opts.exportFormat);
	const { collection, requests, variable } = await loadCollectionFromFile(opts as RunCollectionFileOptions);

	const leaves: RequestLeaf[] = [];
	collectLeaves(collection, "", leaves);

	if (leaves.length === 0) {
		wrtieConsleError(`Collection in '${opts.file}' has no requests to test.`);
		process.exit(1);
	}

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(collection, requestMap, variable);
	const { config, userProvided, warnings } = buildPerfConfig("collection", opts);

	printPerfConfigSummary(collection.name, "Collection (file)", config, userProvided, warnings);
	writeConsoleLog(`Requests  : ${leaves.length} in scope | Est. total calls: ${estimateTotalRequests(leaves.length, config)}`);
	writeConsoleLog("");

	await runPerfEngine(
		collection.name, leaves, requestMap, collection,
		variable, "", provider, config,
		{ exportFormat, exportPath: opts.exportPath },
	);
}

export async function perfFolderFromFile(opts: PerfFileCommandOptions): Promise<void> {
	const exportFormat = validateExportFormat(opts.exportFormat);

	if (!opts.name && !opts.id) {
		wrtieConsleError("'fc-cli perf --file <file> --fol' requires a name or id.");
		process.exit(1);
	}

	const { collection, requests, variable } = await loadCollectionFromFile(opts as RunCollectionFileOptions);
	const folder = findFolderInCollection(collection, opts);

	if (!folder) {
		wrtieConsleError(`Folder '${opts.name ?? opts.id}' not found in '${opts.file}'.`);
		process.exit(1);
	}

	const leaves: RequestLeaf[] = [];
	collectLeaves(folder, folder.id, leaves);

	if (leaves.length === 0) {
		wrtieConsleError(`Folder '${folder.name}' has no requests to test.`);
		process.exit(1);
	}

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(collection, requestMap, variable);
	const { config, userProvided, warnings } = buildPerfConfig("collection", opts);

	printPerfConfigSummary(folder.name, "Folder (file)", config, userProvided, warnings);
	writeConsoleLog(`Requests  : ${leaves.length} in scope | Est. total calls: ${estimateTotalRequests(leaves.length, config)}`);
	writeConsoleLog("");

	await runPerfEngine(
		folder.name, leaves, requestMap, collection,
		variable, "", provider, config,
		{ exportFormat, exportPath: opts.exportPath },
	);
}

export async function perfRequestFromFile(opts: PerfFileCommandOptions): Promise<void> {
	const exportFormat = validateExportFormat(opts.exportFormat);

	if (!opts.name && !opts.id) {
		wrtieConsleError("'fc-cli perf --file <file> --req' requires a name or id.");
		process.exit(1);
	}

	const { collection, requests, variable } = await loadCollectionFromFile(opts as RunCollectionFileOptions);

	const request = opts.id
		? requests.find((r) => r.id === opts.id)
		: requests.find((r) => r.name.toLowerCase() === opts.name!.toLowerCase());

	if (!request) {
		wrtieConsleError(`Request '${opts.name ?? opts.id}' not found in '${opts.file}'.`);
		process.exit(1);
	}

	const folderId = findRequestFolderId(collection, request.id);
	const leaf: RequestLeaf = {
		id: request.id,
		name: request.name || request.url,
		method: request.method,
		url: request.url,
		folderId,
	};

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(collection, requestMap, variable);
	const { config, userProvided, warnings } = buildPerfConfig("single", opts);

	printPerfConfigSummary(request.name || request.url, "Request (file)", config, userProvided, warnings);
	writeConsoleLog(`Requests  : 1 in scope | Est. total calls: ${estimateTotalRequests(1, config)}`);
	writeConsoleLog("");

	await runPerfEngine(
		request.name || request.url, [leaf], requestMap, collection,
		variable, "", provider, config,
		{ exportFormat, exportPath: opts.exportPath },
	);
}
