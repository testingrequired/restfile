export interface Collection {
  name: string;
  description?: string;
}

export type Data = Record<string, unknown>;

export interface Request {
  // A unique identifier for this request
  id: string;
  description?: string;
  headers?: Record<string, string>;
  http: string;
}

export type Document = Collection | Data | Request;

export type RestFile = [Collection, Data, ...Request[]];
