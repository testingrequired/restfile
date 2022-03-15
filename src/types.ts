export interface Collection {
  name: string;
  description?: string;
  envs: string[];
}

export type Data = Record<string, unknown>;

export interface Request {
  // A unique identifier for this request
  id: string;
  description?: string;
  headers?: Record<string, string>;
  body?: Record<string, any> | string;
  http: string;
}

export type Document = Collection | Data | Request;

export type RestFile = [Collection, Data, ...Request[]];
