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
  runRequestTests,
  validate,
} from "../..";
import {
  InputRestfile,
  InputRestfileObject,
  Restfile,
  RestfileRequest,
  RestfileRequestDocument,
} from "../../new_interface";
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

  const restfilePath = path.join(process.cwd(), argv.filePath);

  let inputRestfile: InputRestfile;

  try {
    inputRestfile = await Restfile.load(restfilePath);
  } catch (e) {
    console.log(`Error loading restfile: ${e.message}`);
    return;
  }

  if (argv.env && !inputRestfile[0].envs.includes(argv.env)) {
    console.log(
      `Invalid env for restfile: ${argv.env} (${inputRestfile[0].envs.join(
        ", "
      )})`
    );

    return;
  }

  const secretData = {
    secretToken: "secretToken",
  };

  const restfile = Restfile.parse(inputRestfile, argv.env, secretData);

  const r = repl.start({
    prompt: "> ",
    terminal: true,
  });

  let lastRequestString: string;
  let lastRequest: Request;
  let lastRequestResponseString: string;
  let lastResponseBodyString: string;

  r.context.tests = () => {
    if (!lastRequest) {
      console.log("Please make a request before running tests");
      return;
    }

    if (!lastRequest.tests) {
      console.log("No tests found on last request");
      return;
    }

    const testErrors = runRequestTests(lastRequest, lastRequestResponseString);

    const failure = Object.keys(testErrors).length > 0;

    if (failure) {
      console.log(
        `Test Errors:\n\n${Object.entries(testErrors)
          .map(([testId, e]) => `${testId}: ${e.message}`)
          .join("\n")}`
      );
    } else {
      console.log("All tests passed");
    }

    return !failure;
  };

  r.context.run = async (
    requestId: string,
    promptData: Record<string, string> = {}
  ) => {
    const inputRestFileObj = InputRestfileObject.from(inputRestfile);
    let inputRequest = inputRestFileObj.request(requestId);
    let request: RestfileRequest;

    if (inputRequest.prompts) {
      const requiredPrompts = [];

      for (const key of Object.keys(inputRequest.prompts)) {
        if (!inputRequest.prompts[key].hasOwnProperty("default")) {
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

      request = restfile.request(requestId, promptData);
    } else {
      request = restfile.request(requestId);
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
