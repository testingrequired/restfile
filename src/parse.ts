import { RestFile, Request } from "./types";

export function parse(input: RestFile): RestFile {
  const [inputCollection, inputData, ...inputRequests] = input;

  const env_rx = /\{\{\$ env (.*)\}\}/;
  const prompt_rx = /\{\{\? (.+) (.+)\}\}/;

  const env = {};

  inputData.env?.forEach((e) => {
    env[e] = process.env[e];
  });

  const outputRequests = inputRequests.map((inputRequest) => {
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
  });

  const output: RestFile = [inputCollection, inputData, ...outputRequests];

  return output;
}
