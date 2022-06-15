import { Argv } from "yargs";
import repl from "node:repl";
import { buildHttp, InputRestFile, parse, parseHttp, validate } from "..";
import { asyncLoadAll } from "../yaml";
import path from "node:path";
import * as fs from "node:fs/promises";
import { Form, FormPromptOptions, Select } from "enquirer/lib/prompts";
import {
  HttpZBody,
  HttpZHeader,
  HttpZRequestModel,
  HttpZResponseModel,
} from "http-z";
import { mapBodyForFetch, mapHeadersForFetch } from "../execute";
import fetch from "node-fetch";
import { Request } from "../types";

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
      let prompts: FormPromptOptions[] = [];

      for (const [key, value] of Object.entries(request.prompts)) {
        const prompt: FormPromptOptions = {
          name: key,
          message: key,
        };

        if (typeof value === "object" && typeof value.default != "undefined") {
          prompt.initial = value.default;
        }

        prompts.push(prompt);
      }

      const formPrompt = new Form({
        name: "prompts",
        message: "Please Fill In Request Prompts:",
        choices: prompts,
      });

      const promptData = await formPrompt.run();

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

      const httpObj = parseHttp<HttpZRequestModel>(request.http);

      const response = await fetch(httpObj.target, {
        method: httpObj.method,
        body: mapBodyForFetch(httpObj),
        headers: mapHeadersForFetch(httpObj),
      });

      const responseBody = await response.text();

      const headers: HttpZHeader[] = [];

      for (const [name, value] of response.headers.entries()) {
        headers.push({ name, value });
      }

      const body = await (async () => {
        const body: HttpZBody = {
          contentType: response.headers.get("content-type"),
          text: responseBody,
          boundary: "",
          params: [],
        };

        return body;
      })();

      let httpModel: HttpZResponseModel = {
        protocolVersion: "HTTP/1.1",
        statusCode: response.status,
        statusMessage: response.statusText,
        body,
        headers,
        headersSize: new TextEncoder().encode(JSON.stringify(headers)).length,
        bodySize: new TextEncoder().encode(responseBody).length,
      };

      const httpString = buildHttp<HttpZResponseModel>(httpModel);
      lastRequestResponseString = httpString;

      console.log(httpString);
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
