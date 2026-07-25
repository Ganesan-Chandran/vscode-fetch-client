import { ITestResult, IPreFetchResponse } from "./response.types";

export interface RunResult {
  id: string;
  name: string;
  method: string;
  url: string;
  parent?: string;
  status: number;
  statusText: string;
  duration: number;
  size: number;
  responseData: string;
  responseType?: { isBinaryFile: boolean; format: string };
  isError: boolean;
  testResults: ITestResult[];
  preFetchResponses?: IPreFetchResponse[];
}
