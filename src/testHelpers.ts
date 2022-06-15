import { InputRestFile, Request } from "./types";

export function validRestFile(envs: string[]): InputRestFile {
  const collection = { name: "Test", envs };
  const data = {};
  for (const env of envs) {
    data[env] = {};
  }

  const request = validRequest("testRequest");

  return [collection, data, request];
}

export function validRequest(
  id: string,
  http: string = "GET http://example.com HTTP/1.1"
): Request {
  return {
    id,
    http,
  };
}
