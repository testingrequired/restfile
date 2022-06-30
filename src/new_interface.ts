import { HttpZRequestModel } from "http-z";
import { buildHttp, parseHttp } from "./parse";
import { asyncLoadAll } from "./yaml";
import * as fs from "fs/promises";
import { validate, ValidationError } from "./validate";
import { skipValidation } from "yargs";

/**
 * High level information about the restfile
 */
export interface RestfileInfoDocument {
  name: string;
  description?: string;
  envs: string[];
}

/**
 * Input variables (shared and environment) and secrets used in requests
 */
export type RestfileDataDocument = Record<string, unknown>;

type RestfileRequestPrompt = {
  default: string;
};

/**
 * An individual REST request
 *
 * Variable, secret and prompt placeholders are present.
 */
export interface RestfileRequestDocument {
  id: string;
  description?: string;
  prompts?: Record<string, string | RestfileRequestPrompt>;
  headers?: Record<string, string>;
  body?: Record<string, any> | string;
  http: string;
  tests?: Record<string, string>;
}

/**
 * The format of the input YAML file
 *
 * It's a tuple of the info document, data document, and the remaining
 * documents being requests.
 */
export type InputRestfile = [
  RestfileInfoDocument,
  RestfileDataDocument,
  ...RestfileRequestDocument[]
];

export class InputRestfileObject {
  #info: RestfileInfoDocument;
  #data: RestfileDataDocument;
  #requests: RestfileRequestDocument[];

  static from(input: InputRestfile): InputRestfileObject {
    return new InputRestfileObject(input);
  }

  constructor(inputRestfile: InputRestfile) {
    const [info, data, ...requests] = inputRestfile;

    this.#info = info;
    this.#data = data;
    this.#requests = requests;
  }

  get name(): string {
    return this.#info.name;
  }

  get description(): string {
    return this.#info.description;
  }

  get envs(): string[] {
    return this.#info.envs;
  }

  get data(): Record<string, unknown> {
    return this.#data;
  }

  get requestIds(): string[] {
    return this.#requests.map((request) => request.id);
  }

  asInput(): InputRestfile {
    return [this.#info, this.#data, ...this.#requests];
  }

  request(id: string): RestfileRequestDocument | undefined {
    return this.#requests.find((request) => request.id === id);
  }
}

/**
 * A parsed restfile request document (variables, secrets and prompts).
 *
 * Variable, secret and prompt values are present.
 */
export interface RestfileRequest {
  id: string;
  description?: string;
  http: string;
  tests?: Record<string, string>;
}

export interface RestfileLoadOptions {
  encoding?: BufferEncoding;
  skipValidation?: boolean;
}

export class Restfile {
  #input: InputRestfileObject;
  #env: string;
  #data: Record<string, string>;
  #secrets: Record<string, string>;

  static readonly #VAR_GLYPH: string = "$";
  static readonly #SECRET_GLYPH: string = "!";
  static readonly #PROMPT_GLYPH: string = "?";

  static readonly #VAR_TEMPLATE_PATTERN = new RegExp(
    `\{\{\\${Restfile.#VAR_GLYPH} (.*?)\}\}`,
    "g"
  );
  static readonly #SECRET_TEMPLATE_PATTERN = new RegExp(
    `\{\{\\${Restfile.#SECRET_GLYPH} (.*?)\}\}`,
    "g"
  );
  static readonly #PROMPT_TEMPLATE_PATTERN = new RegExp(
    `\{\{\\${Restfile.#PROMPT_GLYPH} (.*?)\}\}`,
    "g"
  );

  static async load(
    path: string,
    options: RestfileLoadOptions = {
      encoding: "utf-8",
    }
  ): Promise<InputRestfile> {
    const inputRestFile = await asyncLoadAll(
      await fs.readFile(path, options.encoding)
    );

    if (!skipValidation) {
      const errors = Restfile.validate(inputRestFile);

      if (errors.length > 0) {
        throw new Error(
          `Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`
        );
      }
    }

    return inputRestFile;
  }

  static validate(inputRestFile: InputRestfile): ValidationError[] {
    return validate(inputRestFile);
  }

  static parse(
    inputRestfile: InputRestfile,
    env: string = undefined,
    secretData: Record<string, string> = {}
  ): Restfile {
    return new Restfile(inputRestfile, env, secretData);
  }

  constructor(
    inputRestfile: InputRestfile,
    env: string = undefined,
    secretData: Record<string, string> = {}
  ) {
    this.#input = InputRestfileObject.from(inputRestfile);
    this.#env = env;
    this.#secrets = this.parseSecrets(inputRestfile, secretData);
    this.#data = this.parseRestfileData(inputRestfile, this.#env);
  }

  get name(): string {
    return this.#input.name;
  }

  get description(): string {
    return this.#input.description;
  }

  get envs(): string[] {
    return this.#input.envs;
  }

  get env(): string {
    return this.#env;
  }

  get data(): Record<string, unknown> {
    return this.#data;
  }

  get requestIds(): string[] {
    return this.#input.requestIds;
  }

  asInput(): InputRestfile {
    return this.#input.asInput();
  }

  request(
    id: string,
    promptData: Record<string, string> = {}
  ): RestfileRequest {
    const requestDocument = this.#input.request(id);

    if (typeof requestDocument === "undefined") {
      throw new Error(`No request with an id '${id}' was found!!!`);
    }

    return this.parseRequest(requestDocument, promptData);
  }

  private parseRequest(
    requestDocument: RestfileRequestDocument,
    promptData: Record<string, string> = {}
  ): RestfileRequest {
    const { prompts, tests } = requestDocument;
    let http = requestDocument.http;

    if (requestDocument.headers) {
      const httpObj = parseHttp<HttpZRequestModel>(http);

      Object.entries(requestDocument.headers).forEach(([key, value]) => {
        httpObj.headers.push({
          name: key,
          value,
        });
      });

      http = buildHttp(httpObj);
    }

    for (const [pattern, key] of http.matchAll(
      Restfile.#VAR_TEMPLATE_PATTERN
    )) {
      http = http.split(pattern).join(this.#data[key]);
    }

    for (const [pattern, key] of http.matchAll(
      Restfile.#SECRET_TEMPLATE_PATTERN
    )) {
      http = http.split(pattern).join(this.#secrets[key]);
    }

    if (prompts) {
      // Replace template prompts in request.http
      for (const httpMatches of http.matchAll(
        Restfile.#PROMPT_TEMPLATE_PATTERN
      )) {
        if (httpMatches?.length > 1) {
          const pattern = httpMatches[0];
          const promptKey = httpMatches[1];
          let value = promptData[promptKey];

          if (!value) {
            const requestPrompt = requestDocument.prompts[promptKey];

            switch (typeof requestPrompt) {
              case "string":
                value = requestPrompt;
                break;

              default:
                value = requestPrompt.default;
                break;
            }
          }

          http = http.split(pattern).join(value);
        }
      }
    }

    if (tests) {
      for (const testId of Object.keys(requestDocument.tests)) {
        const test = requestDocument.tests[testId];

        // Replace template variables in request.http
        for (const [pattern, key] of test.matchAll(
          Restfile.#VAR_TEMPLATE_PATTERN
        )) {
          requestDocument.tests[testId] = requestDocument.tests[testId]
            .split(pattern)
            .join(this.#data[key]);
        }

        for (const [pattern, key] of test.matchAll(
          Restfile.#SECRET_TEMPLATE_PATTERN
        )) {
          debugger;

          requestDocument.tests[testId] = requestDocument.tests[testId]
            .split(pattern)
            .join(this.#secrets[key]);

          debugger;
        }

        for (const matches of test.matchAll(
          Restfile.#PROMPT_TEMPLATE_PATTERN
        )) {
          if (matches?.length > 1) {
            const pattern = matches[0];
            const promptKey = matches[1];
            let value = promptData[promptKey];

            if (!value) {
              const requestPrompt = requestDocument.prompts[promptKey];

              switch (typeof requestPrompt) {
                case "string":
                  value = requestPrompt;
                  break;

                default:
                  value = requestPrompt.default;
                  break;
              }
            }

            requestDocument.tests[testId] = requestDocument.tests[testId]
              .split(pattern)
              .join(value);
          }
        }

        // Run all requests through http parser to standardize
        http = buildHttp(parseHttp<HttpZRequestModel>(http));
      }
    }

    return {
      id: requestDocument.id,
      description: requestDocument.description,
      http,
      tests,
    };
  }

  /**
   *
   * @param {InputRestfile} restfile Target RestFile to parse secrets from
   * @param {Record<string, any>} secrets Object with secret values to map from
   * @returns Object with parsed secrets
   */
  private parseSecrets(
    restfile: InputRestfile,
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

  private parseRestfileData(
    inputRestfile: InputRestfile,
    env: string
  ): Record<string, string> {
    const [collection, data, __] = inputRestfile;

    if (data === null) {
      inputRestfile[1] = {};
    }

    const envData = {};

    Object.entries(data).forEach(([key, value]) => {
      // Skip Secrets
      if (key.endsWith(Restfile.#SECRET_GLYPH)) {
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
}

const inputRestfile: InputRestfile = [
  {
    name: "",
    description: "",
    envs: [],
  },
  {
    testing: "yes",
  },
];

const rf = new Restfile(inputRestfile, "prod");
