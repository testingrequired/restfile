import { HttpZRequestModel, HttpZResponseModel } from "http-z";
import * as fs from "node:fs/promises";
import path from "node:path";
import repl from "node:repl";
import { Argv } from "yargs";
import {
  executeRequest,
  InputRestFile,
  mapFetchResponseToHTTPResponseString,
  parse,
  parseHttp,
  validate,
} from "../..";
import { Request } from "../../types";
import { asyncLoadAll } from "../../yaml";

export const command = "repl <filePath>";

export const description = "Work with restfile in a repl";

interface Arguments {
  filePath: string;
  env?: string;
}

export const builder = (yargs: Argv<Arguments>) =>
  yargs
    .positional("filePath", {
      type: "string",
      description: "Path to restfile",
      demandOption: true,
    })
    .option("env", {
      type: "string",
      alias: "e",
      describe: "Environment to load data for",
    });

export const handler = async (argv: Arguments) => {
  console.log("Loading repl for " + argv.filePath);

  let restfile: InputRestFile;

  try {
    restfile = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), argv.filePath), "utf-8")
    );
  } catch (e) {
    console.log(`Error reading ${argv.filePath}: ${e.message}`);
    return;
  }

  const errors = validate(restfile);

  if (errors.length > 0) {
    console.log(`Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`);

    return;
  }

  if (argv.env && !restfile[0].envs.includes(argv.env)) {
    console.log(
      `Invalid env for restfile: ${argv.env} (${restfile[0].envs.join(", ")})`
    );

    return;
  }

  const parsedRestfile = parse(restfile, argv.env, {
    secretToken: "secretToken",
  });

  const r = repl.start({
    prompt: "> ",
    terminal: true,
  });

  r.context.collection = parsedRestfile.collection;
  r.context.data = parsedRestfile.data;
  r.context.requests = {};

  for (const request of parsedRestfile.requests) {
    r.context.requests[request.id] = request;
  }

  let lastRequestString: string;
  let lastRequest: Request;
  let lastRequestResponseString: string;
  let lastResponseBodyString: string;

  r.context.run = async (
    request: Request,
    promptData: Record<string, string> = {},
    secretData: Record<string, string> = {}
  ) => {
    if (request.prompts) {
      const requiredPrompts = [];

      for (const key of Object.keys(request.prompts)) {
        if (!request.prompts[key].hasOwnProperty("default")) {
          requiredPrompts.push(key);
        }
      }

      const promptDataKeys = Object.keys(promptData);

      const missingKeys = requiredPrompts.filter(
        (key) => !promptDataKeys.includes(key)
      );

      if (missingKeys.length > 0) {
        throw new Error(
          `Prompt data required as second arugment to run if request has prompts: ${missingKeys}`
        );
      }

      console.log(
        `Using prompt data: ${JSON.stringify(Object.entries(promptData))}`
      );

      const restfileObjSecondPass = parse(
        restfile,
        argv.env,
        secretData,
        promptData
      );

      request = restfileObjSecondPass.requests.find((r) => r.id === request.id);
    }

    lastRequest = request;
    lastRequestString = lastRequest.http;
    const response = await executeRequest(request);

    const responseBody = await response.text();
    lastResponseBodyString = responseBody;

    const httpResponseString = await mapFetchResponseToHTTPResponseString(
      response,
      responseBody
    );

    lastRequestResponseString = httpResponseString;

    console.log(lastRequestResponseString);
  };

  Object.defineProperty(r.context, "request", {
    get() {
      if (!lastRequestString) {
        return;
      }

      const request = parseHttp<HttpZRequestModel>(lastRequestString);

      return request;
    },
  });

  Object.defineProperty(r.context, "requestString", {
    get() {
      return lastRequestString;
    },
  });

  Object.defineProperty(r.context, "restfileRequest", {
    get() {
      return lastRequest;
    },
  });

  Object.defineProperty(r.context, "responseString", {
    get() {
      return lastRequestResponseString;
    },
  });

  Object.defineProperty(r.context, "responseBodyString", {
    get() {
      return lastResponseBodyString;
    },
  });

  Object.defineProperty(r.context, "responseBody", {
    get() {
      return JSON.parse(lastResponseBodyString);
    },
  });

  Object.defineProperty(r.context, "response", {
    get() {
      if (!lastRequestResponseString) {
        return;
      }

      const response = parseHttp<HttpZResponseModel>(lastRequestResponseString);

      return {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        body: response.body.text,
        bodySize: response.bodySize,
        headers: response.headers,
        headersSize: response.headersSize,
        cookies: response.cookies,
        json: () => {
          return JSON.parse(response.body.text);
        },
      };
    },
  });
};
