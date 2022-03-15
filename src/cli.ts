#!/bin/env node

import * as fs from "fs/promises";
import * as path from "path";
import { parse } from "./parse";
import { RestFile } from "./types";
import { validate } from "./validate";
import { asyncLoadAll } from "./yaml";

(async () => {
  const args = process.argv.slice(2);
  const env = process.env.NODE_ENV ?? "local";

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
      console.log(`Available commands: show, validate`);
      break;
  }
})();
