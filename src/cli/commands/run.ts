import ClientOAuth2 from "client-oauth2";
import { Select } from "enquirer/lib/prompts";
import { Form, FormPromptOptions } from "enquirer/lib/prompts";
import * as path from "path";
import {
  executeRequest,
  mapFetchResponseToHTTPResponseString,
  runRequestTests,
} from "../..";
import { parseMissingSecretKeys, refTemplatePattern } from "../../parse";

import { InputRestfile, InputRestfileObject, Restfile, RestfileRequest, RestfileRequestDocument } from "../../restfile";

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
    .option("verbose", {
      alias: "v",
      type: "boolean",
      describe: "Show additional information about the request",
      default: false
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
    })
    .option("format-response-body", {
      alias: "f",
      type: "boolean",
      describe: "Attempt to format response body (only supports JSON currently)",
      default: false,
    });

export const handler = async (argv) => {
  if (!argv.filePath) {
    console.log("No restfile specified");
    return;
  }

  // Load the input restfile
  let inputRestfile: InputRestfile;
  
  try {
    const restfilePath = path.join(process.cwd(), argv.filePath);
    inputRestfile = await Restfile.load(restfilePath);
  } catch (e) {
    console.log(`Error loading restfile: ${e.message}`);
    return;
  }

  // Validate the desired environment is present in the restfile
  if (argv.env && !inputRestfile[0].envs.includes(argv.env)) {
    console.log(
      `Invalid env for restfile: ${argv.env} (${inputRestfile[0].envs.join(
        ", "
      )})`
    );

    return;
  }

  // Get secrets from args and prompts
  const secretsData = await getSecretsData(inputRestfile, argv.secrets);

  // Parse the input restfile
  // This returns a flattened version of the restfile
  // The data is loaded according to the desired environment
  // It also loads the secrets
  const restfile = Restfile.parse(inputRestfile, argv.env, secretsData);

  // Validate the resetfile has requests defined
  if (restfile.requestIds.length === 0) {
    console.log("No requests defined");
    return;
  }

  const requestId = await getOrPromptRequestIdToRun(argv.requestId, restfile);

  // Get prompts from prompts
  const promptData = await getPromptsData(inputRestfile, requestId);

  // Parse the request with the prompt data
  const request = restfile.request(requestId, promptData);

  // Refs are values that don't originate from the user e.g. oauth tokens
  const refs: Record<string, string> = await getRefs(request);
  writeRefsToRequestHttp(request, refs);

  if (argv.verbose) {
    console.log(request.http);
  }

  if (argv.dry) {
    return;
  }

  try {
    const response = await executeRequest(request);

    let responseBody = await response.text();

    // Check for the arugment to format the response body if possible
    // Only JSON is supported at this time
    if (argv.f) {
      try {
        const json = JSON.parse(responseBody);
        responseBody = JSON.stringify(json, null, 2);
      } catch (e) {}
    }

    // Take the fetch response and map it to an HTTP response message string
    const httpResponseString = await mapFetchResponseToHTTPResponseString(
      response,
      responseBody
    );
    
    // Display response string for user
    console.log(httpResponseString);
    
    // Run request tests if they are defined
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
};



async function getSecretsData(inputRestfile: InputRestfile, secretsFromArgs: Record<string, string>) {
  const missingSecretKeys = parseMissingSecretKeys(inputRestfile, secretsFromArgs);
  const secretsDataFromPrompts = await getSecretsDataFromPrompts(missingSecretKeys);

  // Merge secrets from args and prompts together
  const secrets = Object.assign({}, secretsFromArgs, secretsDataFromPrompts);
  return secrets;
}

function writeRefsToRequestHttp(request: RestfileRequest, refs: Record<string, string>) {
  for (const [pattern, key] of request.http.matchAll(refTemplatePattern)) {
    const value = refs[key];
    request.http = request.http.split(pattern).join(value);
  }
}

async function getRefs(request: RestfileRequest) {
  const refs: Record<string, string> = {};

  if (request.auth) {
    if (request.auth.type === "oauth2") {
      if (request.auth["grant"] === "client") {
        const client = new ClientOAuth2({
          clientId: request.auth["clientId"],
          clientSecret: request.auth["clientSecret"],
          accessTokenUri: request.auth["accessTokenUri"],
          scopes: request.auth["scopes"].split(",").map(x => x.trim())
        });

        const token = await client.credentials.getToken();

        refs["auth.token"] = token.accessToken;
        refs["auth.header"] = `Authorization: Bearer ${token}`;
      }
    }
  }
  return refs;
}

async function getOrPromptRequestIdToRun(requestId: string, restfile: Restfile) {
  if (!requestId) {
    const prompt = new Select({
      name: "request",
      message: "Select A Request",
      choices: restfile.requestIds,
    });

    requestId = await prompt.run();
  }
  return requestId;
}

async function getSecretsDataFromPrompts(secretKeysToPrompt: string[]) {
  let prompts: FormPromptOptions[] = [];

  for (const key of secretKeysToPrompt) {
    const prompt: FormPromptOptions = {
      name: key,
      message: key,
    };

    prompts.push(prompt);
  }

  let secretsDataFromPrompts: Record<string, string> = {};

  if (prompts.length > 0) {
    const formPrompt = new Form({
      name: "prompts",
      message: "Please Fill In Secrets:",
      choices: prompts,
    });

    secretsDataFromPrompts = await formPrompt.run().then(() => process.stdin.resume());
  }
  return secretsDataFromPrompts;
}

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
      let defaultValue: unknown = (value as any).default;

      if (typeof defaultValue !== "string") {
        defaultValue = defaultValue.toString();
      }

      prompt.initial = defaultValue;
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

function getInputRequestById(inputRestfile: InputRestfile, requestId: string): RestfileRequestDocument {
  // The input restfile object is the same data as the input restfile
  // but provides a method for getting requests by request id
  const inputRestFileObj = InputRestfileObject.from(inputRestfile);

  // Get the request
  let inputRequest = inputRestFileObj.request(requestId);

  // Validate the desired request exists
  if (!inputRequest) {
    throw new Error([
      `Request not found: ${requestId}`,
      `Available Requests:\n\n${inputRestFileObj.requestIds.join("\n")}`,
    ].join("\n"));
  }

  return inputRequest;
}

async function getPromptsData(inputRestfile: InputRestfile, requestId: string) {
  const inputRequest = getInputRequestById(inputRestfile, requestId);

  // Prompt user for the request's prompt data
  let promptData = {};
  if (inputRequest.prompts) {
    promptData = await runRequestPrompts(inputRequest.prompts);
  }

  return promptData;
}