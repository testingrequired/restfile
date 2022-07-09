import { InputRestfile, RestfileRequestDocument } from ".";

export function validRestFile(envs: string[]): InputRestfile {
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
): RestfileRequestDocument {
  return {
    id,
    http,
  };
}
