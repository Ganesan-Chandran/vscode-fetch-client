export interface ITableData {
	isFixed?: boolean;
	isChecked?: boolean;
	type?: string;
	key: string;
	value: string;
}

export enum CryptoMode {
	Transit = "Transit",
	Export = "Export"
};
