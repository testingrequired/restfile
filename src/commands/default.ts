import { Form, FormPromptOptions, Select } from "enquirer/lib/prompts";
import { HttpZBody, HttpZHeader, HttpZRequestModel, HttpZResponseModel } from "http-z";
import { buildHttp, InputRestFile, parse, parseHttp, validate } from "..";
import { sortObject } from "../utils";
import { asyncLoadAll } from "../yaml";
import { mapBodyForFetch, mapHeadersForFetch } from "../execute";
import * as fs from "fs/promises";
import * as path from "path";
import fetch from "node-fetch";
import expect from 'expect';

export const command = "$0 <filePath> [requestId]";

export const description = "Execute a request";

export const builder = (yargs) =>
    yargs
    .positional("filePath", {
        demandOption: true,
        description: "Path to restfile to load",
        type: "string",
    })
    .positional("requestId", {
        type: "string",
        demandOption: true,
        description: "Which request to show",
    })
    .option("env", {
        type: "string",
        alias: "e",
        describe: "Environment to load data for",
    })
    .option("dry", {
        alias: "d",
        type: "boolean",
        describe: "Only show the request but don't execute",
        default: false,
    })
    .option("test", {
        alias: "t",
        type: "boolean",
        describe: "Runs tests",
        default: false,
    });

export const handler = async (argv) => {
    if (!argv.filePath) {
      console.log("No restfile specified");
      return;
    }

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
      console.log(
        `Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`
      );

      return;
    }

    if (argv.env && !restfile[0].envs.includes(argv.env)) {
      console.log(
        `Invalid env for restfile: ${argv.env} (${restfile[0].envs.join(
          ", "
        )})`
      );

      return;
    }

    const parsedRestfile = parse(restfile, argv.env, {
      secretToken: "secretToken",
    });

    const restfileObj = parsedRestfile;

    const requestIds = restfileObj.requests.map((r) => r.id);

    if (requestIds.length === 0) {
      console.log("No requests defined");
      return;
    }

    let requestId = argv.requestId;

    if (!requestId) {
      const prompt = new Select({
        name: "request",
        message: "Select A Request",
        choices: requestIds,
      });

      requestId = await prompt.run();
    }

    let request = restfileObj.requests.find((r) => r.id === requestId);

    if (request.prompts) {
      let prompts: FormPromptOptions[] = [];

      for (const [key, value] of Object.entries(request.prompts)) {
        const prompt: FormPromptOptions = {
          name: key,
          message: key,
        };

        if (
          typeof value === "object" &&
          typeof value.default != "undefined"
        ) {
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

      const restfileObjSecondPass = parse(
        restfile,
        argv.env,
        {
          secretToken: "secretToken",
        },
        promptData
      );

      request = restfileObjSecondPass.requests.find(
        (r) => r.id === requestId
      );
    }

    if (request) {
      console.log(request.http);

      if (argv.dry) {
        return;
      }

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
        headersSize: new TextEncoder().encode(JSON.stringify(headers))
          .length,
        bodySize: new TextEncoder().encode(responseBody).length,
      };

      const httpString = buildHttp<HttpZResponseModel>(httpModel);

      console.log(httpString);

      if (argv.test) {
        if (!request.tests) {
          console.log("Request has no tests");
          return;
        }

        // Normalizes headers for easier comparison
        httpModel = parseHttp<HttpZResponseModel>(httpString);

        const testErrors: Record<string, Error> = {};

        for (let [testId, testHttpString] of Object.entries(
          request.tests
        )) {
          const testHttpModel =
            parseHttp<HttpZResponseModel>(testHttpString);

          httpModel.headers = httpModel.headers.filter((httpHeader) => {
            return testHttpModel.headers
              .map((x) => x.name)
              .includes(httpHeader.name);
          });

          if (httpModel.body?.contentType === "application/json") {
            httpModel.body.text = JSON.stringify(
              sortObject(JSON.parse(httpModel.body.text)),
              null,
              2
            );
            testHttpModel.body.text = JSON.stringify(
              sortObject(JSON.parse(testHttpModel.body.text)),
              null,
              2
            );

            testHttpString = buildHttp<HttpZResponseModel>(testHttpModel);
          }

          const httpModelString = buildHttp<HttpZResponseModel>(httpModel);

          try {
            expect(httpModelString).toEqual(testHttpString);
          } catch (e) {
            testErrors[testId] = e;
          }
        }

        if (Object.keys(testErrors).length > 0) {
          console.log(
            `Test Errors:\n\n${Object.entries(testErrors)
              .map(([testId, e]) => `${testId}: ${e.message}`)
              .join("\n")}`
          );
        }
      }
    } else {
      console.log(
        [
          `Request not found: ${requestId}`,
          `Available Requests:\n\n${requestIds.join("\n")}`,
        ].join("\n")
      );
    }
  };