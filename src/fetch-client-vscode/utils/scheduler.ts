import { apiFetch, FetchConfig } from "../../fetch-client-core/utils/fetchUtil";
import { CronJob } from "cron";
import {
	getHeadersConfiguration,
	getRunMainRequestOption,
	getTimeOutConfiguration,
	SESSION_ID,
} from "../../fetch-client-core/utils/vscodeConfig";
import {
	GetParentSettingsSync,
	GetVariableByColId,
} from "../db/collectionDBUtil";
import { AutoReqHistory_Repository_Upsert } from "../../fetch-client-core/db/autoRequestHistory.repository";
import { formatDate } from "../../fetch-client-core/helpers/dateTime.helper";
import { GetRequestItem } from "../db/mainDBUtil";
import { GetVariableByIdSync, UpdateVariableSync } from "../db/varDBUtil";
import {
	IAutoRequest,
	IAutoRequestSchedule,
} from "../../fetch-client-core/types/autorequest.types";
import { IReponseModel } from "../../fetch-client-core/types/response.types";
import { setVariable } from "../../fetch-client-core/helpers/tests.helper";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";

const MAX_JOB_DURATION_MINUTES = 600;
const MS_PER_MINUTE = 60_000;

interface IScheduledJob {
	readonly id: string;
	readonly scheduleId: string;
	readonly startTime: Date;
	readonly interval: number;
	readonly duration: number;
	readonly endTime: Date;
	readonly job: CronJob;
	status: "running" | "completed" | "failed" | "stopped" | "scheduled";
}

function buildCronExpression(request: IAutoRequest): string {
	if (request.cron?.trim()) {
		return request.cron.trim();
	}
	return `0 */${request.interval} * * * *`;
}

function getFreshFetchConfig(): FetchConfig {
	return {
		timeOut: getTimeOutConfiguration(),
		headersCase: getHeadersConfiguration(),
		runMainRequest: getRunMainRequestOption(),
	};
}

function getNextRunTime(job: CronJob): string {
	try {
		const next: any = job.nextDate?.();
		if (!next) {
			return "-";
		}
		const jsDate = typeof next.toJSDate === "function" ? next.toJSDate() : next;
		return jsDate instanceof Date ? jsDate.toLocaleString() : "-";
	} catch {
		return "-";
	}
}

export class FCScheduler {
	private static instance: FCScheduler;

	private readonly scheduledJobs: IScheduledJob[] = [];

	public static get Instance(): FCScheduler {
		return this.instance ?? (this.instance = new FCScheduler());
	}

	public async CreateJobs(requests: IAutoRequest[], autoStart: boolean): Promise<void> {
		for (const request of requests) {
			if (!request?.id || !request?.colId || !request?.reqId) {
				continue;
			}
			if (this.scheduledJobs.some((scheduled) => scheduled.id === request.id)) {
				continue;
			}
			try {
				const cronTime = buildCronExpression(request);
				const job = new CronJob(
					cronTime, // cron expression
					async () => {
						await this.executeAPI(request);
					}, // onTick
					null, // onComplete
					false, // start
					null, // timezone
					null, // context
					false, // runOnInit
				);

				const timeNow = new Date();
				const scheduledJob: IScheduledJob = {
					id: request.id,
					scheduleId: request.scheduleId ?? request.id,
					startTime: timeNow,
					interval: request.interval,
					duration: request.duration,
					endTime: new Date(
						timeNow.getTime() + request.duration * MS_PER_MINUTE,
					),
					job,
					status: autoStart ? "running" : "scheduled",
				};

				this.scheduledJobs.push(scheduledJob);

				await AutoReqHistory_Repository_Upsert({
					autoReqId: request.id,
					scheduleId: request.scheduleId ?? request.id,
					colId: request.colId,
					reqId: request.reqId,
					requestName: request.reqName ?? "",
					status: "scheduled",
					scheduleStatus: autoStart ? "running" : "scheduled",
					nextRunTime: getNextRunTime(job),
					ownerSessionId: SESSION_ID,
				});

				if (autoStart) {
					job.start();
					scheduledJob.status = "running";
				}

				await AutoReqHistory_Repository_Upsert({
					autoReqId: request.id,
					scheduleId: request.scheduleId ?? request.id,
					colId: request.colId,
					reqId: request.reqId,
					requestName: request.reqName ?? "",
					status: "running",
					scheduleStatus: autoStart ? "running" : "scheduled",
					nextRunTime: getNextRunTime(job),
					ownerSessionId: SESSION_ID,
				});

			} catch (err) {
				writeLog(`CreateJobs [${request.id}]: ${err}`);

				await AutoReqHistory_Repository_Upsert({
					autoReqId: request.id,
					scheduleId: request.scheduleId ?? request.id,
					colId: request.colId,
					reqId: request.reqId,
					requestName: request.reqName ?? "",
					status: "fail",
					scheduleStatus: "stopped",
					nextRunTime: "-",
					ownerSessionId: SESSION_ID,
				});
			}
		}
	}

	public GetSchedules(requests: IAutoRequest[]): IAutoRequestSchedule[] {
		return requests.map((request) => {
			const job = this.scheduledJobs.find((scheduled) => scheduled.id === request.id);
			return {
				...request,
				scheduleStatus:
					job?.status === "scheduled" ? "stopped" : job?.status ?? "stopped",
				nextRunTime: job?.status === "running" ? getNextRunTime(job.job) : "-",
			};
		});
	}

	public GetActiveJobCount(): number {
		return new Set(
			this.scheduledJobs
				.filter((job) => job.status === "running")
				.map((job) => job.scheduleId),
		).size;
	}

	public IsScheduleActive(scheduleId: string): boolean {
		return this.scheduledJobs.some(
			(job) => job.scheduleId === scheduleId && job.status === "running",
		);
	}

	public StartJob(id: string): void {
		if (!id) {
			return;
		}
		try {
			const index = this.scheduledJobs.findIndex((j) => j.id === id);
			if (index !== -1) {
				this.scheduledJobs[index].job.start();
				this.scheduledJobs[index].status = "running";
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
			const index = this.scheduledJobs.findIndex((j) => j.id === request.id);
			if (index !== -1) {
				this.scheduledJobs[index].job.stop();
				this.scheduledJobs[index].status = "stopped";
			}
		} catch (err) {
			writeLog(`RemoveJob [${request.id}]: ${err}`);
		}
	}

	public StopAllJobs(): void {
		try {
			for (const item of this.scheduledJobs) {
				item.job.stop();
				item.status = "stopped";
			}
		} catch (err) {
			writeLog(`StopAllJobs: ${err}`);
		}
	}


	private async executeAPI(autoReq: IAutoRequest): Promise<void> {
		try {
			const scheduledJob = this.scheduledJobs.find((j) => j.id === autoReq.id);
			if (!scheduledJob) {
				return;
			}

			const request = await GetRequestItem(autoReq.reqId);
			if (!request?.id) {
				return;
			}

			const varId = await GetVariableByColId(autoReq.colId);
			const variable = varId ? await GetVariableByIdSync(varId) : null;

			const folderId =
				autoReq.parentId === autoReq.colId ? "" : autoReq.parentId;
			const parentSettings = await GetParentSettingsSync(
				autoReq.colId,
				folderId,
			);

			const res = await apiFetch(
				request,
				variable?.data,
				parentSettings,
				null,
				getFreshFetchConfig(),
			);

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

			if (request.setvar.length - 1 > 0 && variable) {
				const updatedVariable = setVariable(variable, request.setvar, resData);
				await UpdateVariableSync(updatedVariable);
			}

			const nextTime = new Date(
				Date.now() + scheduledJob.interval * MS_PER_MINUTE,
			);
			const elapsedMinutes = Math.round(
				(nextTime.getTime() - scheduledJob.startTime.getTime()) / MS_PER_MINUTE,
			);
			const completed =
				nextTime > scheduledJob.endTime || elapsedMinutes > MAX_JOB_DURATION_MINUTES;
			const failed = res.response.isError;
			const willStop = completed || failed;

			await AutoReqHistory_Repository_Upsert({
				autoReqId: autoReq.id,
				scheduleId: autoReq.scheduleId ?? autoReq.id,
				colId: autoReq.colId,
				reqId: autoReq.reqId,
				requestName: request.name,
				status: res.response.isError ? "fail" : "success",
				statusCode: res.response.status,
				duration: res.response.duration,
				executedTime: formatDate(),
				scheduleStatus: completed ? "stopped" : "running",
				nextRunTime: willStop ? "-" : getNextRunTime(scheduledJob.job),
				ownerSessionId: SESSION_ID,
			});

			if (willStop) {
				scheduledJob.job.stop();
				scheduledJob.status = failed ? "failed" : "completed";
			}

		} catch (err) {
			writeLog(`executeAPI [${autoReq.id}]: ${err}`);
		}
	}
}
