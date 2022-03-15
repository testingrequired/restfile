#!/bin/env node

import * as fs from "fs/promises";
import * as path from "path";
import { parse } from "./parse";
import { validate } from "./validate";
import { asyncLoadAll } from "./yaml";

(async () => {
  const args = process.argv.slice(2);
  const env = process.env.NODE_ENV ?? "local";

  const [restfile, command, ...params] = args;

  if (!restfile) {
    console.log("No restfile specified");
    return;
  }

  switch (command) {
    case "show":
      {
        const [requestId] = params;

        const spec = await asyncLoadAll(
          await fs.readFile(path.join(process.cwd(), restfile), "utf-8")
        );

        const errors = validate(spec, env);

        if (errors.length > 0) {
          throw new Error(
            `Invalid restfile:\n\n${JSON.stringify(errors, null, 2)}`
          );
        }

        const [_, __, ...requests] = parse(spec, env, {
          secretToken: "secretToken",
        });

        if (!requestId) {
          const requestIds = requests.map((r) => r.id);
          console.log(`Available Requests:\n\n${requestIds.join("\n")}`);
          break;
        }

        const request = requests.find((r) => r.id === requestId);

        if (request) {
          console.log(request.http);
        }
      }

      break;

    case "validate":
      {
        const spec = await asyncLoadAll(
          await fs.readFile(path.join(process.cwd(), restfile), "utf-8")
        );

        const errors = validate(spec, "prod");

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
