export interface Collection {
  name: string;
  description?: string;
}

export interface Data {
  env?: string[];
}

export interface Request {
  name: string;
  description?: string;
  http: string;
  headers?: Record<string, string>;
  body?: object | string;
}

export type Document = Collection | Data | Request;

export type RestFile = [Collection, Data, ...Request[]];
