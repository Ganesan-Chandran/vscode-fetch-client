import { CronJob } from "cron";
import { IAutoRequest } from "../../fetch-client-ui/components/AutoRequest/types";
import { setVariable } from "../../fetch-client-ui/components/TestUI/TestPanel/helper";
import { GetParentSettingsSync, GetVariableByColId } from "../db/collectionDBUtil";
import { GetRequestItem } from "../db/mainDBUtil";
import { GetVariableByIdSync, UpdateVariableSync } from "../db/varDBUtil";
import { apiFetch, FetchConfig } from "../fetchUtil";
import { writeLog } from "../logger/logger";
import { getHeadersConfiguration, getRunMainRequestOption, getTimeOutConfiguration } from "../vscodeConfig";
import { IReponseModel } from "../../fetch-client-ui/components/ResponseUI/redux/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum allowed elapsed time (in minutes) before a job is force-stopped. */
const MAX_JOB_DURATION_MINUTES = 600;

/** Milliseconds in one minute. */
const MS_PER_MINUTE = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Cron field reference:
//   second (0-59), minute (0-59), hour (0-23),
//   day of month (1-31), month (1-12), day of week (0-7)

interface IScheduledJob {
	readonly id: string;
	readonly startTime: Date;
	readonly interval: number;
	readonly duration: number;
	readonly endTime: Date;
	readonly job: CronJob;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a cron expression for the request.
 * Uses the pre-built `cron` field when available; otherwise derives one from
 * `interval` (minutes between ticks).
 */
function buildCronExpression(request: IAutoRequest): string {
	if (request.cron?.trim()) {
		return request.cron.trim();
	}
	return `0 */${request.interval} * * * *`;
}

/**
 * Reads VS Code settings fresh on every call so that user changes to
 * timeout / header-case / run-main-request take effect without restarting
 * the extension.
 */
function getFreshFetchConfig(): FetchConfig {
	return {
		timeOut: getTimeOutConfiguration(),
		headersCase: getHeadersConfiguration(),
		runMainRequest: getRunMainRequestOption(),
	};
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export class FCScheduler {

	private static instance: FCScheduler;

	private readonly scheduledJobs: IScheduledJob[] = [];

	public static get Instance(): FCScheduler {
		return this.instance ?? (this.instance = new FCScheduler());
	}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	public CreateJobs(requests: IAutoRequest[], autoStart: boolean): void {
		for (const request of requests) {
			if (!request?.id || !request?.colId || !request?.reqId) {
				continue;
			}
			try {
				const cronTime = buildCronExpression(request);
				const job = new CronJob(
					cronTime,                                              // cron expression
					async () => { await this.executeAPI(request); },       // onTick
					null,                                                  // onComplete
					autoStart,                                             // start
					null,                                                  // timezone
					null,                                                  // context
					false                                                  // runOnInit
				);

				const timeNow = new Date();
				const scheduledJob: IScheduledJob = {
					id: request.id,
					startTime: timeNow,
					interval: request.interval,
					duration: request.duration,
					endTime: new Date(timeNow.getTime() + request.duration * MS_PER_MINUTE),
					job,
				};

				this.scheduledJobs.push(scheduledJob);
			} catch (err) {
				writeLog(`CreateJobs [${request.id}]: ${err}`);
			}
		}
	}

	public StartJob(id: string): void {
		if (!id) {
			return;
		}
		try {
			const index = this.scheduledJobs.findIndex(j => j.id === id);
			if (index !== -1) {
				this.scheduledJobs[index].job.start();
			}
		} catch (err) {
			writeLog(`StartJob [${id}]: ${err}`);
		}
	}

	public RemoveJob(request: IAutoRequest): void {
		if (!request?.id) {
			return;
		}
		try {
			const index = this.scheduledJobs.findIndex(j => j.id === request.id);
			if (index !== -1) {
				this.scheduledJobs[index].job.stop();
				this.scheduledJobs.splice(index, 1);
			}
		} catch (err) {
			writeLog(`RemoveJob [${request.id}]: ${err}`);
		}
	}

	public StopAllJobs(): void {
		try {
			for (const item of this.scheduledJobs) {
				item.job.stop();
			}
			this.scheduledJobs.length = 0;
		} catch (err) {
			writeLog(`StopAllJobs: ${err}`);
		}
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private async executeAPI(autoReq: IAutoRequest): Promise<void> {
		try {
			const scheduledJob = this.scheduledJobs.find(j => j.id === autoReq.id);
			if (!scheduledJob) {
				return;
			}

			const request = await GetRequestItem(autoReq.reqId);
			if (!request?.id) {
				return;
			}

			const varId = await GetVariableByColId(autoReq.colId);
			const variable = varId ? await GetVariableByIdSync(varId) : null;

			const folderId = autoReq.parentId === autoReq.colId ? "" : autoReq.parentId;
			const parentSettings = await GetParentSettingsSync(autoReq.colId, folderId);

			const res = await apiFetch(request, variable?.data, parentSettings, null, getFreshFetchConfig());
			const resData: IReponseModel = {
				id: request.id,
				response: {
					duration: res.response.duration,
					isError: res.response.isError,
					responseData: res.response.responseData,
					responseType: res.response.responseType,
					size: res.response.size as string,
					status: res.response.status,
					statusText: res.response.statusText,
				},
				headers: res.headers,
				cookies: res.cookies,
				loading: false,
			};

			// NOTE: original guard was `length - 1 > 0` (i.e. length > 1); preserved intentionally.
			if (request.setvar.length - 1 > 0 && variable) {
				const updatedVariable = setVariable(variable, request.setvar, resData);
				await UpdateVariableSync(updatedVariable);
			}

			const nextTime = new Date(Date.now() + scheduledJob.interval * MS_PER_MINUTE);
			const elapsedMinutes = Math.round((nextTime.getTime() - scheduledJob.startTime.getTime()) / MS_PER_MINUTE);
			if (nextTime > scheduledJob.endTime || elapsedMinutes > MAX_JOB_DURATION_MINUTES) {
				scheduledJob.job.stop();
			}
		} catch (err) {
			writeLog(`executeAPI [${autoReq.id}]: ${err}`);
		}
	}
}
