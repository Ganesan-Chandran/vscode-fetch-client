import { CronJob } from "cron";
import { IAutoRequest } from "../../fetch-client-ui/components/AutoRequest/types";
import { ISettings } from "../../fetch-client-ui/components/SideBar/redux/types";
import { setVariable } from "../../fetch-client-ui/components/TestUI/TestPanel/helper";
import { GetParentSettingsSync, GetVariableByColId } from "../db/collectionDBUtil";
import { GetRequestItem } from "../db/mainDBUtil";
import { GetVariableByIdSync, UpdateVariable } from "../db/varDBUtil";
import { apiFetch, FetchConfig } from "../fetchUtil";
import { writeLog } from "../logger/logger";
import { getHeadersConfiguration, getRunMainRequestOption, getTimeOutConfiguration } from "../vscodeConfig";

// field          allowed values
// -----          --------------
// second         0-59
// minute         0-59
// hour           0-23
// day of month   1-31
// month          1-12 (or names, see below)
// day of week    0-7 (0 or 7 is Sunday, or use names)

interface IJobs {
	id: string;
	startTime: Date;
	interval: number;
	duration: number;
	endTime: Date;
	job: CronJob;
}

export class FCScheduler {

	private static instance: FCScheduler;

	scheduledJobs: IJobs[] = [];
	fetchConfig: FetchConfig = {
		timeOut: getTimeOutConfiguration(),
		headersCase: getHeadersConfiguration(),
		runMainRequest: getRunMainRequestOption()
	};

	public static get Instance() {
		return this.instance || (this.instance = new this());
	}

	public CreateJobs(requests: IAutoRequest[], autoStart: boolean) {
		try {
			requests.forEach(request => {
				if (request?.id && request?.colId && request?.reqId) {
					let cronTime = `0 */${request.interval} * * * *`;
					const job = new CronJob(
						cronTime,  // cron expression
						async () => { await this.executeAPI(request); }, // onTick function
						null, // onComplete
						autoStart, // start
						null, // timezone
						null, // context
						false // runOnInit
					);

					let timeNow = new Date();
					let scheduleJob: IJobs = {
						id: request.id,
						startTime: timeNow,
						interval: request.interval,
						duration: request.duration,
						endTime: new Date(timeNow.getTime() + (request.duration * 60000)),
						job: job
					};

					this.scheduledJobs.push(scheduleJob);
				}
			});
		}
		catch (err) {
			writeLog("CreateJobs: " + err);
		}
	}

	private async executeAPI(autoReq: IAutoRequest) {
		try {
			let parentSettings: ISettings;
			let currentJob = this.scheduledJobs.filter(i => i.id === autoReq.id);

			if (currentJob?.length < 1) {
				return;
			}

			let request = await GetRequestItem(autoReq.reqId);
			if (!request?.id) {
				return;
			}

			let varId = await GetVariableByColId(autoReq.colId);
			let variable = varId ? await GetVariableByIdSync(varId) : null;

			if (autoReq.parentId === autoReq.colId) {
				parentSettings = await GetParentSettingsSync(autoReq.colId, "");
			} else {
				parentSettings = await GetParentSettingsSync(autoReq.colId, autoReq.parentId);
			}

			let res = await apiFetch(request, variable?.data, parentSettings, null, this.fetchConfig);

			if (request.setvar.length - 1 > 0) {
				let updatedVariable = setVariable(variable, request.setvar, res);
				UpdateVariable(updatedVariable, null);
			}

			let nextTime = new Date(new Date().getTime() + (currentJob[0].interval * 60000));
			let milliDiff = nextTime.getTime() - currentJob[0].startTime.getTime();
			if (nextTime > currentJob[0].endTime || Math.round(milliDiff / 60000) > 600) {
				currentJob[0].job.stop();
				return;
			}
		}
		catch (err) {
			writeLog("executeAPI: " + err);
		}
	}

	public StartJob(id: string) {
		try {
			if (id) {
				let index = this.scheduledJobs.findIndex(i => i.id === id);
				if (index !== -1) {
					this.scheduledJobs[index].job.start();
				}
			}
		}
		catch (err) {
			writeLog("StartJob: " + err);
		}
	}

	public RemoveJob(request: IAutoRequest) {
		try {
			if (request?.id) {
				let index = this.scheduledJobs.findIndex(i => i.id === request.id);
				if (index !== -1) {
					this.scheduledJobs[index].job.stop();
					this.scheduledJobs.splice(index, 1);
				}
			}
		}
		catch (err) {
			writeLog("RemoveJob: " + err);
		}
	}

	public StopAllJobs() {
		try {
			this.scheduledJobs.forEach(item => {
				item.job.stop();
			});
			this.scheduledJobs = [];
		}
		catch (err) {
			writeLog("StopAllJobs: " + err);
		}
	}
}
