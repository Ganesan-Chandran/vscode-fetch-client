export interface ThunderClientVariableSchema_1_2 {
  clientName: string;
  environmentName: string;
  environmentId: string;
  dateExported: string;
  version: string;
  variables?: (VariablesEntity)[];
  ref: string;
}
export interface VariablesEntity {
  name: string;
  value: string;
}
