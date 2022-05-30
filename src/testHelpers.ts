import { InputRestFile } from "./types";

export function validRestFile(envs: string[]): InputRestFile {
  const collection = { name: "Test", envs };
  const data = {};
  for (const env of envs) {
    data[env] = {};
  }
  const request = {
    id: "testRequest",
    http: "GET http://example.com HTTP/1.1",
  };

  return [collection, data, request];
}
