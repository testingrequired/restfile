import { RestFile, Request, Data } from "./types";

function parseEnvData(data: Data): Record<string, string> {
  const env = {};

  data.env?.forEach((e) => {
    env[e] = process.env[e];
  });

  return env;
}

const mapEnvInRequest =
  (env: Record<string, string>) =>
  (inputRequest: Request): Request => {
    const env_rx = /\{\{\$ env (.*)\}\}/;
    const prompt_rx = /\{\{\? (.+) (.+)\}\}/;

    const outputRequest = { ...inputRequest };

    if (outputRequest.headers) {
      Object.entries(outputRequest.headers).forEach(([key, value]) => {
        const matches = env_rx.exec(value);

        if (matches?.length > 1) {
          outputRequest.headers[key] = env[matches[1]];
        }
      });
    }

    const httpEnvMatches = env_rx.exec(outputRequest.http);
    if (httpEnvMatches?.length > 1) {
      const [_, ...realMatches] = httpEnvMatches;

      realMatches.forEach((realMatch) => {
        outputRequest.http = outputRequest.http.replace(
          `{{$ env ${realMatch}}}`,
          env[realMatch]
        );
      });
    }

    const httpMatches = prompt_rx.exec(outputRequest.http);

    if (httpMatches?.length > 2) {
      outputRequest.http = outputRequest.http.replace(
        `{{? ${httpMatches[1]} ${httpMatches[2]}}}`,
        httpMatches[2]
      );
    }

    return outputRequest;
  };

export function parse(input: RestFile): RestFile {
  const [inputCollection, inputData, ...inputRequests] = input;

  const env = parseEnvData(inputData);

  const outputRequests = inputRequests.map(mapEnvInRequest(env));

  const output: RestFile = [inputCollection, inputData, ...outputRequests];

  return output;
}
