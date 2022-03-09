export interface Collection {
  name: string;
  description?: string;
}

export type Data = Record<string, unknown>;

export interface Request {
  name: string;
  description?: string;
  http: string;
}

export type Document = Collection | Data | Request;

export type RestFile = [Collection, Data, ...Request[]];
