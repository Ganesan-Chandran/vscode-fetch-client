import { ITableData } from "../../../Common/Table/types";

export function isAvailable(item: ITableData) {
		return item.isFixed === true && item.key !== "Cookie";
}
