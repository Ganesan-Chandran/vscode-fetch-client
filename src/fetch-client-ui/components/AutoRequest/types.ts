export interface IAutoRequest {
	id: string;
	colId: string;
	reqId: string;
	parentId: string;
	interval: number;
	duration: number;
	status: boolean;
	cron: string;
	createdTime: string;
}
