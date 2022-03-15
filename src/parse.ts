import { RestFile, Request } from "./types";
import httpz, { HttpZRequestModel } from "http-z";

export const varGlyph = "$";
export const secretGlyph = "!";
export const promptGlyph = "?";

export const varTemplatePattern = new RegExp(`\{\{\\${varGlyph} (.*)\}\}`, "g");
export const secretTemplatePattern = new RegExp(
  `\{\{\\${secretGlyph} (.*)\}\}`,
  "g"
);
export const promptTemplatePattern = new RegExp(
  `\{\{\\${promptGlyph} (.*)\}\}`,
  "g"
);

/**
 *
 * @param {RestFile} restfile Target RestFile to parse data from
 * @param {string} env Name of environment
 * @returns Object with parsed data
 */
export function parseData(
  restfile: RestFile,
  env: string
): Record<string, string> {
  const [collection, data, __] = restfile;

  const envData = {};

  Object.entries(data).forEach(([key, value]) => {
    // Skip Secrets
    if (key.endsWith(secretGlyph)) {
      return;
    }

    if (data[env]?.[key]) {
      envData[key] = data[env][key];
    } else {
      envData[key] = value;
    }
  });

  if (collection.envs && Array.isArray(collection.envs)) {
    collection.envs.forEach((env) => {
      delete envData[env];
    });
  }

  return envData;
}

/**
 *
 * @param {RestFile} restfile Target RestFile to parse secrets from
 * @param {Record<string, any>} secrets Object with secret values to map from
 * @returns Object with parsed secrets
 */
export function parseSecrets(
  restfile: RestFile,
  secrets: Record<string, any>
): Record<string, string> {
  const [_, data, __] = restfile;

  const secretData = {};

  const secretsKeys = Object.keys(secrets);

  Object.entries(data).forEach(([key, value]) => {
    const strippedKey = key.substring(0, key.length - 1);

    if (secretsKeys.includes(strippedKey)) {
      value = secrets[strippedKey];
      secretData[strippedKey] = value;
    }
  });

  return secretData;
}

const mapTemplateValuesInRequest =
  (env: Record<string, string>, secretData: Record<string, any>) =>
  (inputRequest: Request): Request => {
    const outputRequest = { ...inputRequest };

    // Add headers from the request to http
    if (outputRequest.headers) {
      const http = parseHttp(outputRequest.http);

      Object.entries(outputRequest.headers).forEach(([key, value]) => {
        http.headers.push({
          name: key,
          value,
        });
      });

      outputRequest.http = buildHttp(http);

      if (outputRequest.id === "posts/patchPostById") {
        console.log(JSON.stringify(outputRequest.http));
      }
    }

    if (outputRequest.body) {
      const http = parseHttp(outputRequest.http);

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

      outputRequest.http = buildHttp(http) + "\n";
    }

    // Replace template variables in request.http
    for (const match of outputRequest.http.matchAll(varTemplatePattern)) {
      outputRequest.http = outputRequest.http
        .split(`{{${varGlyph} ${match[1]}}}`)
        .join(env[match[1]]);
    }

    // Replace template secrets in request.http
    for (const match of outputRequest.http.matchAll(secretTemplatePattern)) {
      outputRequest.http = outputRequest.http
        .split(`{{${secretGlyph} ${match[1]}}}`)
        .join(secretData[match[1]]);
    }

    // Replace template prompts in request.http
    const httpMatches = promptTemplatePattern.exec(outputRequest.http);
    if (httpMatches?.length > 2) {
      outputRequest.http = outputRequest.http
        .split(`{{${promptGlyph} ${httpMatches[1]} ${httpMatches[2]}}}`)
        .join(httpMatches[2]);
    }

    // Run all requests through http parser to standardize
    const http = parseHttp(outputRequest.http);
    outputRequest.http = buildHttp(http);

    return outputRequest;
  };

export function parse(
  input: RestFile,
  env: string,
  secrets: Record<string, any>
): RestFile {
  const [inputCollection, inputData, ...inputRequests] = input;

  const envData = parseData(input, env);
  const secretData = parseSecrets(input, secrets);

  const outputRequests = inputRequests.map(
    mapTemplateValuesInRequest(envData, secretData)
  );

  const output: RestFile = [inputCollection, inputData, ...outputRequests];

  return output;
}

function parseHttp(inputHttp: string): HttpZRequestModel {
  try {
    return httpz.parse(inputHttp.split("\n").join("\r\n")) as HttpZRequestModel;
  } catch (e) {
    console.log(
      `There was an unexpected error parsing HTTP message: ${e.message}\n\n${inputHttp}`
    );

    throw e;
  }
}

function buildHttp(inputHttp: HttpZRequestModel): string {
  try {
    return httpz.build(inputHttp).split("\r\n").join("\n");
  } catch (e) {
    console.log(
      `There was an unexpected error building HTTP message: ${e.message}\n\n${inputHttp}`
    );

    throw e;
  }
}
