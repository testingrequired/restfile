#!/usr/bin/env node

import * as fs from "fs/promises";
import * as path from "path";
import { buildHttp, parse, parseHttp } from "./parse";
import { RestFile } from "./types";
import { validate } from "./validate";
import { asyncLoadAll } from "./yaml";
import fetch from "node-fetch";
import { mapBodyForFetch, mapHeadersForFetch } from "./execute";
import yargs from "yargs";
import { List, Select, Form, FormPromptOptions } from "enquirer/lib/prompts";
import {
  HttpZBody,
  build,
  HttpZResponseModel,
  HttpZHeader,
  HttpZRequestModel,
} from "http-z";
import expect from "expect";

(async () => {
  yargs(process.argv.slice(2))
    .scriptName("restfile")
    .env("RESTFILE")
    .usage("$0 <command> [args]")
    .command(
      "show [requestId]",
      "Show information about a request",
      (yargs) =>
        yargs
          .option("filePath", {
            alias: "f",
            demandOption: true,
            description: "Path to restfile to load",
            type: "string",
          })
          .option("env", {
            alias: "e",
            type: "string",
            describe: "Environment to load data for",
            demandOption: true,
          })
          .positional("requestId", {
            type: "string",
            description: "Which request to show",
          }),
      async (argv) => {
        if (!argv.filePath) {
          console.log("No restfile specified");
          return;
        }

        let restfile: RestFile;

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

        const [_, __, ...requests] = parse(restfile, argv.env, {
          secretToken: "secretToken",
        });

        const requestIds = requests.map((r) => r.id);

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

        const request = requests.find((r) => r.id === requestId);

        if (request) {
          console.log(request.http);
        } else {
          console.log(
            [
              `Request not found: ${requestId}`,
              `Available Requests:\n\n${requestIds.join("\n")}`,
            ].join("\n")
          );
        }
      }
    )
    .command(
      "envs",
      "Show list of envs defined in restfile",
      (yargs) =>
        yargs.option("filePath", {
          alias: "f",
          demandOption: true,
          description: "Path to restfile to load",
          type: "string",
        }),
      async (argv) => {
        let restfile: RestFile;

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
        }

        const [collection] = restfile;

        if (!collection.envs) {
          console.log("Restfile does not define envs");
          return;
        }

        console.log(collection.envs.join(", "));
      }
    )
    .command(
      "execute [requestId] [promptsJson]",
      "Execute a request",
      (yargs) =>
        yargs
          .option("filePath", {
            alias: "f",
            demandOption: true,
            description: "Path to restfile to load",
            type: "string",
          })
          .option("env", {
            alias: "e",
            type: "string",
            describe: "Environment to load data for",
            demandOption: true,
          })
          .option("test", {
            alias: "t",
            type: "boolean",
            describe: "Runs tests",
            default: false,
          })
          .positional("requestId", {
            type: "string",
            demandOption: true,
            description: "Which request to show",
          })
          .positional("promptsJson", {
            default: "{}",
            type: "string",
            description: "The prompts answers in the form of a JSON string",
          }),
      async (argv) => {
        if (!argv.filePath) {
          console.log("No restfile specified");
          return;
        }

        let restfile: RestFile;

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
        }

        const parsedRestfile = parse(restfile, argv.env, {
          secretToken: "secretToken",
        });

        const [_, __, ...requests_] = parsedRestfile;

        const requestIds = requests_.map((r) => r.id);

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

        let request = requests_.find((r) => r.id === requestId);

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

          const [_, __, ...requests] = parse(
            restfile,
            argv.env,
            {
              secretToken: "secretToken",
            },
            promptData
          );

          request = requests.find((r) => r.id === requestId);
        }

        if (request) {
          console.log(request.http);

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
            }

            // Normalizes headers for easier comparison
            httpModel = parseHttp<HttpZResponseModel>(httpString);

            const testErrors: Record<string, Error> = {};

            for (const [testId, testHttp] of Object.entries(request.tests)) {
              const testHttpModel = parseHttp<HttpZResponseModel>(testHttp);

              httpModel.headers = httpModel.headers.filter((httpHeader) => {
                return testHttpModel.headers
                  .map((x) => x.name)
                  .includes(httpHeader.name);
              });

              try {
                httpModel.headersSize = expect.any(Number) as any;
                httpModel.bodySize = expect.any(Number) as any;
                expect(testHttpModel).toMatchObject(httpModel as any);
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
      }
    )
    .command(
      "validate",
      "Validate a restfile",
      (yargs) =>
        yargs.option("filePath", {
          alias: "f",
          demandOption: true,
          description: "Path to restfile to load",
          type: "string",
        }),
      async (argv) => {
        if (!argv.filePath) {
          console.log("No restfile specified");
          return;
        }

        let restfile: RestFile;

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
        } else {
          console.log("Valid restfile!");
        }
      }
    )
    .command(
      "init <newFilePath>",
      "Generate empty restfile",
      (yargs) =>
        yargs.positional("newFilePath", {
          type: "string",
          description: "Path to save new restfile to",
        }),
      async (argv) => {
        const documentDataForm = new Form({
          name: "document",
          message: "Please provide the following information:",
          choices: [
            { name: "name", message: "Name" },
            { name: "description", message: "Description (Optional)" },
          ],
        });

        const documentData = await documentDataForm.run();

        // envs

        const envDataList = new List({
          name: "envs",
          message: "Type comma-separated env names",
        });

        const envData = await envDataList.run();

        // vars

        // secrets

        // requests?

        // id
        // description
        // http

        const fileContent = [
          `name: ${documentData.name}`,
          ...(documentData.description
            ? [`description: ${documentData.description}`]
            : []),
          `envs: [${envData.join(", ")}]`,
          "---",
          "",
          "---",
          "",
          "",
        ].join("\n");

        try {
          await fs.writeFile(argv.newFilePath, fileContent);
          console.log(`Initialized new restfile: ${argv.newFilePath}`);
        } catch (e) {
          console.log(
            `Error inititalizing new restfile: ${argv.newFilePath}\n\n ${e.message}`
          );
        }
      }
    )
    .demandCommand()
    .help().argv;
})();
