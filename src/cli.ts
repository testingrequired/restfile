#!/usr/bin/env node

import * as fs from "fs/promises";
import * as path from "path";
import { parse, parseHttp } from "./parse";
import { RestFile } from "./types";
import { validate } from "./validate";
import { asyncLoadAll } from "./yaml";
import fetch from "node-fetch";
import { mapBodyForFetch, mapHeadersForFetch } from "./execute";
import yargs from "yargs";

(async () => {
  yargs(process.argv.slice(2))
    .scriptName("restfile")
    .env("RESTFILE")
    .usage("$0 -f filePath -e env <command> [args]")
    .option("filePath", {
      alias: "f",
      demandOption: true,
      description: "Path to restfile to load",
      type: "string",
    })
    .command(
      "show <requestId>",
      "Show information about a request",
      (yargs) =>
        yargs
          .option("env", {
            alias: "e",
            type: "string",
            describe: "Environment to load data for",
            demandOption: true,
          })
          .positional("requestId", {
            type: "string",
            demandOption: true,
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

        const errors = validate(restfile, argv.env);

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

        if (!argv.requestId) {
          console.log(`Available Requests:\n\n${requestIds.join("\n")}`);
          return;
        }

        const request = requests.find((r) => r.id === argv.requestId);

        if (request) {
          console.log(request.http);
        } else {
          console.log(
            [
              `Request not found: ${argv.requestId}`,
              `Available Requests:\n\n${requestIds.join("\n")}`,
            ].join("\n")
          );
        }
      }
    )
    .command(
      "envs",
      "Show list of envs defined in restfile",
      () => {},
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

        const parsedRestfile = parse(restfile, argv.env, {
          secretToken: "secretToken",
        });

        const [collection] = parsedRestfile;

        if (!collection.envs) {
          console.log("Restfile does not define envs");
          return;
        }

        console.log(collection.envs.join(", "));
      }
    )
    .command(
      "execute <requestId> [promptsJson]",
      "Execute a request",
      (yargs) =>
        yargs
          .option("env", {
            alias: "e",
            type: "string",
            describe: "Environment to load data for",
            demandOption: true,
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

        const errors = validate(restfile, argv.env);

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
        const availableRequestIds = requestIds.join(", ");

        if (!argv.requestId) {
          console.log(`Available Requests:\n\n${availableRequestIds}`);
          return;
        }

        if (!requestIds.includes(argv.requestId)) {
          console.log(
            `No request with an id of "${argv.requestId}". Please selected one of the following: ${availableRequestIds}`
          );
          return;
        }

        let request = requests_.find((r) => r.id === argv.requestId);

        if (request.prompts) {
          let prompts;

          try {
            prompts = JSON.parse(argv.promptsJson);
          } catch (e) {
            console.log(`Invalid prompts JSON string: ${e.message}`);
            return;
          }

          const [_, __, ...requests] = parse(
            restfile,
            argv.env,
            {
              secretToken: "secretToken",
            },
            prompts
          );

          request = requests.find((r) => r.id === argv.requestId);
        }

        if (request) {
          console.log(request.http);

          const httpObj = parseHttp(request.http);

          const url = httpObj.target;

          console.log(`Fetching: ${url}`);

          const response = await fetch(url, {
            method: httpObj.method,
            body: mapBodyForFetch(httpObj),
            headers: mapHeadersForFetch(httpObj),
          });

          console.log(`Response: ${response.status}`);

          const body = await response.text();

          console.log(`Body:\n${body}`);
        } else {
          console.log(
            [
              `Request not found: ${argv.requestId}`,
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
        yargs.option("env", {
          alias: "e",
          type: "string",
          describe: "Environment to load data for",
          demandOption: true,
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

        const errors = validate(restfile, argv.env);

        if (errors.length > 0) {
          console.log(
            `Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`
          );
        } else {
          console.log("Valid restfile!");
        }
      }
    )
    .demandCommand()
    .help().argv;
})();
