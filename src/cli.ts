#!/bin/env node

import * as fs from "fs/promises";
import * as path from "path";
import { parse, parseHttp } from "./parse";
import { RestFile } from "./types";
import { validate } from "./validate";
import { asyncLoadAll } from "./yaml";
import fetch from "node-fetch";

(async () => {
  const args = process.argv.slice(2);
  const env = process.env.NODE_ENV;

  if (typeof env === "undefined") {
    console.log("NODE_ENV not set. Exiting.");
    return;
  }

  const [restfilePath, command, ...params] = args;

  if (!restfilePath) {
    console.log("No restfile specified");
    return;
  }

  let restfile: RestFile;

  try {
    restfile = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), restfilePath), "utf-8")
    );
  } catch (e) {
    console.log(`Error reading ${restfilePath}: ${e.message}`);
    return;
  }

  const errors = validate(restfile, env);

  if (errors.length > 0) {
    console.log(`Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`);
    return;
  }

  switch (command) {
    case "show":
      {
        const [requestId] = params;

        const [_, __, ...requests] = parse(restfile, env, {
          secretToken: "secretToken",
        });

        const requestIds = requests.map((r) => r.id);

        if (!requestId) {
          console.log(`Available Requests:\n\n${requestIds.join("\n")}`);
          break;
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

      break;

    case "execute":
      {
        const [requestId, promptsJson = "{}"] = params;

        const parsedRestfile = parse(restfile, env, {
          secretToken: "secretToken",
        });

        const [_, __, ...requests_] = parsedRestfile;

        const requestIds = requests_.map((r) => r.id);

        if (!requestId) {
          console.log(`Available Requests:\n\n${requestIds.join("\n")}`);
          break;
        }

        let request = requests_.find((r) => r.id === requestId);

        if (request.prompts) {
          let prompts;

          try {
            prompts = JSON.parse(promptsJson);
          } catch (e) {
            console.log(`Invalid prompts JSON string: ${e.message}`);
            break;
          }

          const [_, __, ...requests] = parse(
            restfile,
            env,
            {
              secretToken: "secretToken",
            },
            prompts
          );

          request = requests.find((r) => r.id === requestId);
        }

        if (request) {
          console.log(request.http);

          const httpObj = parseHttp(request.http);

          const url = httpObj.target;

          console.log(`Fetching: ${url}`);

          const response = await fetch(url, {
            method: httpObj.method,
            body: httpObj.body?.text,
          });

          console.log(`Response: ${response.status}`);

          const body = await response.text();

          console.log(`Body:\n${body}`);
        } else {
          console.log(
            [
              `Request not found: ${requestId}`,
              `Available Requests:\n\n${requestIds.join("\n")}`,
            ].join("\n")
          );
        }
      }

      break;

    case "validate":
      {
        if (errors.length > 0) {
          console.log(
            `Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`
          );
        } else {
          console.log("Valid restfile!");
        }
      }

      break;

    default:
      console.log(`Available commands: show, validate, execute`);
      break;
  }
})();
