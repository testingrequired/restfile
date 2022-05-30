import { Collection, Data, InputRestFile, Request } from "./types";
import httpz, { HttpZRequestModel, HttpZResponseModel } from "http-z";

export const varGlyph = "$";
export const secretGlyph = "!";
export const promptGlyph = "?";

export const varTemplatePattern = new RegExp(
  `\{\{\\${varGlyph} (.*?)\}\}`,
  "g"
);
export const secretTemplatePattern = new RegExp(
  `\{\{\\${secretGlyph} (.*?)\}\}`,
  "g"
);
export const promptTemplatePattern = new RegExp(
  `\{\{\\${promptGlyph} (.*?)\}\}`,
  "g"
);

/**
 *
 * @param {InputRestFile} restfile Target RestFile to parse data from
 * @param {string} env Name of environment
 * @returns Object with parsed data
 */
export function parseData(
  restfile: InputRestFile,
  env: string
): Record<string, string> {
  const [collection, data, __] = restfile;

  if (data === null) {
    restfile[1] = {};
  }

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
 * @param {InputRestFile} restfile Target RestFile to parse data from
 * @param {string} env Name of environment
 * @returns Array of data keys
 */
export function parseDataKeys(restfile: InputRestFile): string[] {
  const [collection] = restfile;
  let [_, data] = restfile;

  if (data === null) {
    data = restfile[1] = {};
  }

  const envData = {};

  Object.entries(data).forEach(([key, value]) => {
    // Skip Secrets
    if (key.endsWith(secretGlyph)) {
      return;
    }

    envData[key] = value;
  });

  if (collection.envs && Array.isArray(collection.envs)) {
    collection.envs.forEach((env) => {
      delete envData[env];
    });
  }

  return Object.keys(envData);
}

/**
 *
 * @param {InputRestFile} restfile Target RestFile to parse data from
 * @param {string} env Name of environment
 * @returns Array of secret keys
 */
export function parseSecretKeys(restfile: InputRestFile): string[] {
  let [_, data] = restfile;

  if (data === null) {
    data = restfile[1] = {};
  }

  const envData = {};

  Object.entries(data).forEach(([key, value]) => {
    if (key.endsWith(secretGlyph)) {
      envData[key] = value;
      return;
    }
  });

  return Object.keys(envData);
}

/**
 *
 * @param {InputRestFile} restfile Target RestFile to parse secrets from
 * @param {Record<string, any>} secrets Object with secret values to map from
 * @returns Object with parsed secrets
 */
export function parseSecrets(
  restfile: InputRestFile,
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
  (
    env: Record<string, string>,
    secretData: Record<string, any>,
    prompts?: Record<string, string>
  ) =>
  (inputRequest: Request): Request => {
    const outputRequest = { ...inputRequest };

    // Add headers from the request to http
    if (outputRequest.headers) {
      const http = parseHttp<HttpZRequestModel>(outputRequest.http);

      Object.entries(outputRequest.headers).forEach(([key, value]) => {
        http.headers.push({
          name: key,
          value,
        });
      });

      outputRequest.http = buildHttp(http);
    }

    // Add body from the request to http
    if (outputRequest.body) {
      const http = parseHttp<HttpZRequestModel>(outputRequest.http);

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
    for (const [pattern, key] of outputRequest.http.matchAll(
      varTemplatePattern
    )) {
      outputRequest.http = outputRequest.http.split(pattern).join(env[key]);
    }

    // Replace template secrets in request.http
    for (const [pattern, key] of outputRequest.http.matchAll(
      secretTemplatePattern
    )) {
      outputRequest.http = outputRequest.http
        .split(pattern)
        .join(secretData[key]);
    }

    if (outputRequest.tests) {
      for (const testId of Object.keys(outputRequest.tests)) {
        const test = outputRequest.tests[testId];

        // Replace template variables in request.http
        for (const [pattern, key] of test.matchAll(varTemplatePattern)) {
          outputRequest.tests[testId] = outputRequest.tests[testId]
            .split(pattern)
            .join(env[key]);
        }

        for (const [pattern, key] of test.matchAll(secretTemplatePattern)) {
          debugger;

          outputRequest.tests[testId] = outputRequest.tests[testId]
            .split(pattern)
            .join(secretData[key]);

          debugger;
        }
      }
    }

    if (prompts) {
      // Replace template prompts in request.http
      for (const httpMatches of outputRequest.http.matchAll(
        promptTemplatePattern
      )) {
        if (httpMatches?.length > 1) {
          const pattern = httpMatches[0];
          const promptKey = httpMatches[1];
          let value = prompts[promptKey];

          if (!value) {
            const requestPrompt = outputRequest.prompts[promptKey];

            switch (typeof requestPrompt) {
              case "string":
                value = requestPrompt;
                break;

              default:
                value = requestPrompt.default;
                break;
            }
          }

          outputRequest.http = outputRequest.http.split(pattern).join(value);
        }
      }

      // Replace template prompts in request.tests
      if (outputRequest.tests) {
        for (const testId of Object.keys(outputRequest.tests)) {
          const test = outputRequest.tests[testId];

          for (const matches of test.matchAll(promptTemplatePattern)) {
            if (matches?.length > 1) {
              const pattern = matches[0];
              const promptKey = matches[1];
              let value = prompts[promptKey];

              if (!value) {
                const requestPrompt = outputRequest.prompts[promptKey];

                switch (typeof requestPrompt) {
                  case "string":
                    value = requestPrompt;
                    break;

                  default:
                    value = requestPrompt.default;
                    break;
                }
              }

              outputRequest.tests[testId] = outputRequest.tests[testId]
                .split(pattern)
                .join(value);
            }
          }
        }
      }

      // Run all requests through http parser to standardize
      const http = parseHttp<HttpZRequestModel>(outputRequest.http);
      outputRequest.http = buildHttp(http);
    }

    return outputRequest;
  };

export function parse(
  input: InputRestFile,
  env: string,
  secrets: Record<string, any>,
  prompts?: Record<string, string>
): ParsedRestFile {
  const [inputCollection, inputData, ...inputRequests] = input;

  const envData = parseData(input, env);
  const secretData = parseSecrets(input, secrets);

  const outputRequests = inputRequests
    .filter((x) => x)
    .map((x) => {
      return mapTemplateValuesInRequest(envData, secretData, prompts)(x);
    });

  const output: InputRestFile = [inputCollection, inputData, ...outputRequests];

  return ParsedRestFile.from(output);
}

export function parseHttp<T extends HttpZRequestModel | HttpZResponseModel>(
  inputHttp: string
): T {
  try {
    return httpz.parse(inputHttp.split("\n").join("\r\n")) as T;
  } catch (e) {
    console.log(
      `There was an unexpected error parsing HTTP message: ${e.message}\n\n${inputHttp}`
    );

    throw e;
  }
}

export function buildHttp<T extends HttpZRequestModel | HttpZResponseModel>(
  inputHttp: T
): string {
  try {
    return httpz.build(inputHttp).split("\r\n").join("\n");
  } catch (e) {
    console.log(
      `There was an unexpected error building HTTP message: ${e.message}\n\n${inputHttp}`
    );

    throw e;
  }
}

export class ParsedRestFile {
  #collection: Collection;
  #data: Data;
  #requests: Request[];

  constructor(restfile: InputRestFile) {
    const [collection, data, ...requests] = restfile;

    this.#collection = collection;
    this.#data = data;
    this.#requests = requests;
  }

  get collection(): Collection {
    return this.#collection;
  }

  get data(): Data {
    return this.#data;
  }

  get requests(): Request[] {
    return this.#requests;
  }

  to(): InputRestFile {
    return [this.#collection, this.#data, ...this.#requests];
  }

  static to(parsedRestFile: ParsedRestFile): InputRestFile {
    return [
      parsedRestFile.#collection,
      parsedRestFile.#data,
      ...parsedRestFile.#requests,
    ];
  }

  static from(inputRestFile: InputRestFile): ParsedRestFile {
    return new ParsedRestFile(inputRestFile);
  }
}
