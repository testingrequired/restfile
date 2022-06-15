import { Select } from "enquirer/lib/prompts";
import * as fs from "fs/promises";
import * as path from "path";
import { InputRestFile, parse, validate } from "..";
import { runRequestPrompts } from "../cli_prompts";
import {
  executeRequest,
  mapFetchResponseToHTTPResponseString,
  runRequestTests,
} from "../execute";
import { asyncLoadAll } from "../yaml";

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
    const promptData = await runRequestPrompts(request);

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

    if (argv.dry) {
      return;
    }

    const response = await executeRequest(request);

    const httpResponseString = await mapFetchResponseToHTTPResponseString(
      response
    );

    console.log(httpResponseString);

    if (argv.test) {
      if (!request.tests) {
        console.log("Request has no tests");
        return;
      }

      const testErrors: Record<string, Error> = runRequestTests(
        request,
        httpResponseString
      );

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
