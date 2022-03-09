import { RestFile, Request, Data } from "./types";

function parseData(data: Data, env: string): Record<string, string> {
  const envData = {};

  Object.entries(data).forEach(([key, value]) => {
    if (data[env][key]) {
      envData[key] = data[env][key];
    } else {
      envData[key] = value;
    }
  });

  return envData;
}

const mapEnvInRequest =
  (env: Record<string, string>) =>
  (inputRequest: Request): Request => {
    const env_rx = /\{\{\$ (.*)\}\}/g;
    const prompt_rx = /\{\{\? (.+) (.+)\}\}/;

    const outputRequest = { ...inputRequest };

    for (const match of outputRequest.http.matchAll(env_rx)) {
      outputRequest.http = outputRequest.http
        .split(`{{$ ${match[1]}}}`)
        .join(env[match[1]]);
    }

    const httpMatches = prompt_rx.exec(outputRequest.http);
    if (httpMatches?.length > 2) {
      outputRequest.http = outputRequest.http
        .split(`{{? ${httpMatches[1]} ${httpMatches[2]}}}`)
        .join(httpMatches[2]);
    }

    return outputRequest;
  };

export function parse(input: RestFile): RestFile {
  const [inputCollection, inputData, ...inputRequests] = input;

  const envData = parseData(inputData, "prod");

  const outputRequests = inputRequests.map(mapEnvInRequest(envData));

  const output: RestFile = [inputCollection, inputData, ...outputRequests];

  return output;
}
