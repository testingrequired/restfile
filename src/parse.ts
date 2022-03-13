import { RestFile, Request, Data } from "./types";
import httpz from "http-z";

function parseData(data: Data, env: string): Record<string, string> {
  const envData = {};

  Object.entries(data).forEach(([key, value]) => {
    // Skip Secrets
    if (key.endsWith("!")) {
      return;
    }

    if (data[env]?.[key]) {
      envData[key] = data[env][key];
    } else {
      envData[key] = value;
    }
  });

  return envData;
}

function parseSecrets(
  data: Data,
  secrets: Record<string, any>
): Record<string, string> {
  const secretData = {};

  const secretsKeys = Object.keys(secrets);

  Object.entries(data).forEach(([key, value]) => {
    const strippedKey = key.substring(0, key.length - 1);

    if (secretsKeys.includes(strippedKey)) {
      value = secrets[strippedKey];
    }

    secretData[strippedKey] = value;
  });

  return secretData;
}

const mapEnvInRequest =
  (env: Record<string, string>, secretData: Record<string, any>) =>
  (inputRequest: Request): Request => {
    const env_rx = /\{\{\$ (.*)\}\}/g;
    const secret_rx = /\{\{\! (.*)\}\}/g;
    const prompt_rx = /\{\{\? (.+) (.+)\}\}/;

    const outputRequest = { ...inputRequest };

    // Add headers from the request to http
    if (outputRequest.headers) {
      const http = httpz.parse(outputRequest.http.split("\n").join("\r\n"));

      Object.entries(outputRequest.headers).forEach(([key, value]) => {
        http.headers.push({
          name: key,
          value,
        });
      });

      outputRequest.http = httpz.build(http).split("\r\n").join("\n");

      if (outputRequest.id === "posts/patchPostById") {
        console.log(JSON.stringify(outputRequest.http));
      }
    }

    if (outputRequest.body) {
      try {
        const http = httpz.parse(outputRequest.http.split("\n").join("\r\n"));

        if (!http.body) {
          http.body = {
            text: "",
            contentType: "application/json",
            boundary: "",
            params: [],
          };
        }

        if (typeof outputRequest.body === "string") {
          http.body.text = outputRequest.body;
        } else {
          http.body.text = JSON.stringify(outputRequest.body);
        }

        outputRequest.http = httpz.build(http).split("\r\n").join("\n") + "\n";
      } catch (e) {
        console.log(
          outputRequest.id,
          JSON.stringify(outputRequest.http.split("\n").join("\r\n"))
        );
        throw e;
      }
    }

    // Replace template variables in request.http
    for (const match of outputRequest.http.matchAll(env_rx)) {
      outputRequest.http = outputRequest.http
        .split(`{{$ ${match[1]}}}`)
        .join(env[match[1]]);
    }

    // Replace template secrets in request.http
    for (const match of outputRequest.http.matchAll(secret_rx)) {
      outputRequest.http = outputRequest.http
        .split(`{{! ${match[1]}}}`)
        .join(secretData[match[1]]);
    }

    // Replace template prompts in request.http
    const httpMatches = prompt_rx.exec(outputRequest.http);
    if (httpMatches?.length > 2) {
      outputRequest.http = outputRequest.http
        .split(`{{? ${httpMatches[1]} ${httpMatches[2]}}}`)
        .join(httpMatches[2]);
    }

    // Run all requests through http parser to standardize
    const http = httpz.parse(outputRequest.http.split("\n").join("\r\n"));
    outputRequest.http = httpz.build(http).split("\r\n").join("\n");

    return outputRequest;
  };

export function parse(input: RestFile, secrets: Record<string, any>): RestFile {
  const [inputCollection, inputData, ...inputRequests] = input;

  const envData = parseData(inputData, "prod");
  const secretData = parseSecrets(inputData, secrets);

  const outputRequests = inputRequests.map(
    mapEnvInRequest(envData, secretData)
  );

  const output: RestFile = [inputCollection, inputData, ...outputRequests];

  return output;
}
