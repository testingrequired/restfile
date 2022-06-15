import { Select } from "enquirer/lib/prompts";
import { HttpZRequestModel, HttpZResponseModel } from "http-z";
import * as fs from "node:fs/promises";
import path from "node:path";
import repl from "node:repl";
import { Argv } from "yargs";
import { InputRestFile, parse, parseHttp, validate } from "..";
import { runRequestPrompts } from "../cli_prompts";
import {
  executeRequest,
  mapFetchResponseToHTTPResponseString,
} from "../execute";
import { Request } from "../types";
import { asyncLoadAll } from "../yaml";

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

  let lastRequestString: string;
  let lastRequest: Request;
  let lastRequestResponseString: string;

  r.context.$ = {};

  Object.defineProperty(r.context.$, "lastHTTPRequest", {
    get() {
      if (!lastRequestString) {
        return;
      }

      const request = parseHttp<HttpZRequestModel>(lastRequestString);

      return request;
    },
  });

  Object.defineProperty(r.context.$, "lastRequest", {
    get() {
      return lastRequest;
    },
  });

  Object.defineProperty(r.context.$, "lastHTTPResponse", {
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

  r.context.__restfilePath = argv.filePath;
  r.context.__restfile = parsedRestfile;

  r.defineCommand("restfile.run", async (requestId: string) => {
    console.log(`Running request: ${requestId}`);

    const requestIds = parsedRestfile.requests.map((r) => r.id);

    if (!requestId) {
      const prompt = new Select({
        name: "request",
        message: "Select A Request",
        choices: requestIds,
      });

      requestId = await prompt.run().then((rid) => {
        r.displayPrompt();
        r.resume();
        process.stdin.resume();
        return rid;
      });
    }

    let request = parsedRestfile.requests.find((r) => r.id === requestId);

    if (request.prompts) {
      const promptData = await runRequestPrompts(request);

      process.stdin.resume();
      r.displayPrompt();

      const restfileObjSecondPass = parse(
        restfile,
        argv.env,
        {
          secretToken: "secretToken",
        },
        promptData
      );

      request = restfileObjSecondPass.requests.find((r) => r.id === requestId);
    }

    if (request) {
      console.log(request.http);

      lastRequest = request;
      lastRequestString = request.http;

      const response = await executeRequest(request);

      const httpResponseString = await mapFetchResponseToHTTPResponseString(
        response
      );

      lastRequestResponseString = httpResponseString;

      console.log(httpResponseString);
    } else {
      console.log(
        [
          `Request not found: ${requestId}`,
          `Available Requests:\n\n${requestIds.join("\n")}`,
        ].join("\n")
      );
    }

    console.log("DONE!");

    r.displayPrompt();
  });
};
