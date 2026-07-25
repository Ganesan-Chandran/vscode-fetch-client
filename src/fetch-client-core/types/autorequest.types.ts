export interface IAutoRequest {
	id: string;
	scheduleId?: string;
	colId: string;
	reqId: string;
	reqName?: string;
	parentId: string;
	interval: number;
	duration: number;
	status: boolean;
	cron: string;
	createdTime: string;
}

export interface IAutoRequestHistory {
	id: string;
	autoReqId: string;
	scheduleId?: string;
	colId: string;
	reqId: string;
	requestName: string;
	status: "running" | "success" | "fail" | "scheduled";
	statusCode?: number;
	duration?: number;
	executedTime?: string;
	scheduleStatus: "running" | "stopped" | "scheduled";
	nextRunTime?: string;
	ownerSessionId?: string;
}

export interface IAutoRequestSchedule extends IAutoRequest {
	scheduleStatus: "running" | "completed" | "failed" | "stopped" | "scheduled";
	nextRunTime?: string;
}
