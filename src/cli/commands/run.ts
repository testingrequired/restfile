import { Select } from "enquirer/lib/prompts";
import { Form, FormPromptOptions } from "enquirer/lib/prompts";
import * as path from "path";
import {
  executeRequest,
  mapFetchResponseToHTTPResponseString,
  runRequestTests,
} from "../..";
import { parseSecretKeys } from "../../parse";

import { InputRestfile, InputRestfileObject, Restfile } from "../../restfile";

export const command = "run <filePath> [requestId]";

export const description = "Run a request";

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
    })
    .option("secrets", {
      type: "object",
      alias: "s",
      describe: "Pass secrets to request",
      default: {}
    });

async function runRequestPrompts<T = any>(
  inputRequestPrompts: Record<string, unknown>
): Promise<T> {
  let prompts: FormPromptOptions[] = [];

  for (const [key, value] of Object.entries(inputRequestPrompts)) {
    const prompt: FormPromptOptions = {
      name: key,
      message: key,
    };

    if (
      typeof value === "object" &&
      typeof (value as any).default != "undefined"
    ) {
      prompt.initial = (value as any).default;
    }

    prompts.push(prompt);
  }

  const formPrompt = new Form({
    name: "prompts",
    message: "Please Fill In Request Prompts:",
    choices: prompts,
  });

  const promptData = await formPrompt.run();

  return promptData;
}

export const handler = async (argv) => {
  if (!argv.filePath) {
    console.log("No restfile specified");
    return;
  }

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

  const missingSecretKeys = parseSecretKeys(inputRestfile)
    .map(key => key.substring(0, key.length - 1))
    .filter(key => !Object.keys(argv.secrets).includes(key));

  let prompts: FormPromptOptions[] = [];

  for (const key of missingSecretKeys) {
    const prompt: FormPromptOptions = {
      name: key,
      message: key,
    };

    prompts.push(prompt);
  }

  let promptData: Record<string, string> = {}

  if (prompts.length > 0) {
    const formPrompt = new Form({
      name: "prompts",
      message: "Please Fill In Secrets:",
      choices: prompts,
    });
  
    promptData = await formPrompt.run().then( () => process.stdin.resume() );
  }
  
  const secrets = Object.assign({}, argv.secrets, promptData);

  const restfile = Restfile.parse(inputRestfile, argv.env, secrets);

  if (restfile.requestIds.length === 0) {
    console.log("No requests defined");
    return;
  }

  let requestId = argv.requestId;

  if (!requestId) {
    const prompt = new Select({
      name: "request",
      message: "Select A Request",
      choices: restfile.requestIds,
    });

    requestId = await prompt.run();
  }

  const inputRestFileObj = InputRestfileObject.from(inputRestfile);
  let inputRequest = inputRestFileObj.request(requestId);

  if (inputRequest) {
    let promptData = {};
    if (inputRequest.prompts) {
      promptData = await runRequestPrompts(inputRequest.prompts);
    }

    const request = restfile.request(requestId, promptData);

    console.log(request.http);

    if (argv.dry) {
      return;
    }

    try {
      const response = await executeRequest(request);

      const responseBody = await response.text();

      const httpResponseString = await mapFetchResponseToHTTPResponseString(
        response,
        responseBody
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
    } catch (e) {
      console.log(`An unexpected error occured while executing the request: ${e.message}`)
    }
  } else {
    console.log(
      [
        `Request not found: ${requestId}`,
        `Available Requests:\n\n${restfile.requestIds.join("\n")}`,
      ].join("\n")
    );
  }
};
