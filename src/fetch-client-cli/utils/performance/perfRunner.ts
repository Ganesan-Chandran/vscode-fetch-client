import { cliConfig } from "../../config";
import { computeVUsForWave, shouldStopTest } from "../../../fetch-client-core/utils/performanceTestService/perfEngine";
import { executeRequest, resolveSettings } from "../../commands/helper";
import { ExportFormat } from "../../../fetch-client-core/consts/export.consts";
import { finalizePerfTest } from "./perfReporter";
import { ICollections, IVariable } from "../../../fetch-client-core/types/sidebar.types";
import { IPerfConfig, IPerfResultPoint } from "../../../fetch-client-core/types/perfTest.types";
import { IPreFetchContextProvider } from "../../../fetch-client-core/utils/preFetchService/preFetch.types.ts";
import { IRequestModel } from "../../../fetch-client-core/types/request.types";
import { printPerfProgress, yellow, red } from "../display";
import { RequestLeaf } from "../../types/common.types";
import { writeConsoleLog } from "../logger";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const FORCE_EXIT_GRACE_MS = 5000;

export async function runPerfEngine(
	testName: string,
	leaves: RequestLeaf[],
	requestMap: Map<string, IRequestModel>,
	collection: ICollections,
	variable: IVariable | null,
	effectiveVarId: string,
	provider: IPreFetchContextProvider,
	cfg: IPerfConfig,
	exportOpts: { exportFormat?: ExportFormat; exportPath?: string },
): Promise<void> {
	const results: IPerfResultPoint[] = [];
	const testStartTime = Date.now();
	let waveIndex = 0;
	let running = true;
	let cancelled = false;
	let sigintCount = 0;

	const rampUpMs = cfg.rampUpDurationSec * 1000;
	const testDurationMs = cfg.testDurationSec * 1000;

	const sigintHandler = () => {
		sigintCount++;

		if (sigintCount === 1) {
			running = false;
			cancelled = true;
			writeConsoleLog(
				"\n" + yellow("Stopping after in-flight wave finishes... press Ctrl+C again to force quit."),
			);

			// Safety net: if the in-flight wave never resolves, don't hang forever.
			const forceTimer = setTimeout(() => {
				if (sigintCount === 1) {
					writeConsoleLog(red("\nWave did not finish in time, forcing exit."));
					process.exit(130);
				}
			}, FORCE_EXIT_GRACE_MS);
			forceTimer.unref();
		} else {
			writeConsoleLog(red("\nForced exit."));
			process.exit(130);
		}
	};
	process.on("SIGINT", sigintHandler);

	const isTTY = !!process.stdout.isTTY;
	const ticker = isTTY
		? setInterval(() => {
				printPerfProgress(results, Date.now() - testStartTime, waveIndex, isTTY);
			}, 500)
		: null;

	async function fireOneRequest(
		leaf: RequestLeaf,
		wave: number,
		vuIndex: number,
		timestampBase: number,
	): Promise<IPerfResultPoint> {
		const request = requestMap.get(leaf.id);
		const base = {
			wave,
			vuIndex,
			requestId: request?.id ?? leaf.id,
			requestName: request?.name || leaf.name || "unknown",
			url: request?.url ?? leaf.url ?? "unknown",
			method: request?.method ?? leaf.method ?? "unknown",
			timestamp: timestampBase,
		};

		if (!request) {
			return { ...base, status: 0, statusText: "Request data not found", duration: 0, isError: true };
		}

		const settings = resolveSettings(collection, leaf.folderId);

		try {
			const result = await executeRequest(
				request,
				variable?.data ?? [],
				settings,
				effectiveVarId,
				collection.name,
				cliConfig.encryptionKey,
				provider,
			);

			return {
				...base,
				status: result.status,
				statusText: result.statusText,
				duration: result.isError ? 0 : result.duration,
				isError: result.isError,
			};
		} catch (err: any) {
			return { ...base, status: 0, statusText: String(err?.message ?? err), duration: 0, isError: true };
		}
	}

	while (running) {
		const elapsedMs = Date.now() - testStartTime;

		if (shouldStopTest(cfg.loadModel, waveIndex, elapsedMs, cfg.iterations, testDurationMs, rampUpMs)) {
			break;
		}

		const vus = computeVUsForWave(cfg.loadModel, cfg.targetVUs, elapsedMs, rampUpMs, cfg.rampSteps);
		const timestampBase = elapsedMs;

		// Mirrors the UI's buildWavePayload: every VU replays the full selected leaf set.
		const waveJobs: Promise<IPerfResultPoint>[] = [];
		for (let v = 0; v < vus; v++) {
			leaves.forEach((leaf) => {
				waveJobs.push(fireOneRequest(leaf, waveIndex, v, timestampBase));
			});
		}

		const waveResults = await Promise.all(waveJobs);
		results.push(...waveResults);
		waveIndex++;

		if (!isTTY) {
			printPerfProgress(results, Date.now() - testStartTime, waveIndex, isTTY);
		}

		if (!running) {
			break; // SIGINT arrived while this wave was in flight
		}

		if (cfg.thinkTimeMs > 0) {
			await sleep(cfg.thinkTimeMs);
		}
	}

	if (ticker) {
		clearInterval(ticker);
	}
	process.removeListener("SIGINT", sigintHandler);

	const elapsedSec = (Date.now() - testStartTime) / 1000;

	await finalizePerfTest(
		testName,
		cfg,
		results,
		elapsedSec,
		cancelled ? "Cancelled" : "Completed",
		exportOpts,
	);
}
