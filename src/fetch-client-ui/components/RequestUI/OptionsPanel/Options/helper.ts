import { ITableData } from "../../../../../fetch-client-core/types/common.types";

export function isAvailable(item: ITableData) {
		return item.isFixed === true && item.key !== "Cookie";
}
