import { InputRestfile, RestfileInfoDocument } from ".";
import {
  varTemplatePattern,
  secretGlyph,
  promptTemplatePattern,
  parseDataKeys,
  secretTemplatePattern,
  parseSecretKeys,
} from "./parse";
import { RestfileRequestAuthType } from "./restfile";

export function validate(restfile: InputRestfile): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateRestFileTypes(restfile));

  // Exit early if basic types aren't met
  if (errors.length > 0) {
    return errors;
  }

  errors.push(...validateUniqueRequestIds(restfile));
  errors.push(...validateAllRequestTemplateReferences(restfile));
  errors.push(...validateAllEnvKeysDefinedInRoot(restfile));
  errors.push(...validateNoSecretsInEnvData(restfile));
  errors.push(...validateRequestPrompts(restfile));

  return errors;
}

function validateUniqueRequestIds(restfile: InputRestfile): ValidationError[] {
  const [_, __, ...requests] = restfile;
  const errors: ValidationError[] = [];

  const ids = requests
    .filter((x) => x)
    .map((r) => r.id)
    .sort();

  let duplicates = [];

  for (let i = 0; i < ids.length - 1; i++) {
    if (ids[i + 1] === ids[i]) {
      duplicates.push(ids[i]);
    }
  }

  duplicates.forEach((duplicate) => {
    errors.push({
      key: "requests",
      message: `Duplicate request id: ${duplicate}`,
    });
  });

  return errors;
}

function validateAllRequestTemplateReferences(
  restfile: InputRestfile
): ValidationError[] {
  const [_, __, ...requests] = restfile;
  const errors: ValidationError[] = [];

  const dataKeys = parseDataKeys(restfile);
  const secretKeys = parseSecretKeys(restfile);

  for (const request of requests.filter((x) => x)) {
    // Check request.http for undefined variable references
    for (const match of request.http.matchAll(varTemplatePattern)) {
      if (dataKeys.includes(match[1])) continue;

      errors.push({
        key: `requests.${request.id}.http`,
        message: `Reference to undefined variable: ${match[0]}`,
      });
    }

    // Check request.http for undefined secret references
    for (const match of request.http.matchAll(secretTemplatePattern)) {
      if (secretKeys.includes(match[1] + "!")) continue;

      errors.push({
        key: `requests.${request.id}.http`,
        message: `Reference to undefined secret: ${match[1]}`,
      });
    }

    if (request.headers) {
      // Check request.headers for undefined variable references
      for (const [key, value] of Object.entries(request.headers)) {
        for (const match of value.matchAll(varTemplatePattern)) {
          if (dataKeys.includes(match[1])) continue;

          errors.push({
            key: `requests.${request.id}.headers.${key}`,
            message: `Reference to undefined variable: ${match[0]}`,
          });
        }
      }

      // Check request.headers for undefined secret references
      for (const [key, value] of Object.entries(request.headers)) {
        for (const match of value.matchAll(secretTemplatePattern)) {
          if (secretKeys.includes(match[1] + "!")) continue;
  
          errors.push({
            key: `requests.${request.id}.headers.${key}`,
            message: `Reference to undefined secret: ${match[1]}`,
          });
        }
      }
    }

    if (request.auth) {
      for (const key of Object.keys(request.auth)) {
        if (typeof request.auth[key] === "string") {
          for (const [_, ...matches] of request.auth[key].matchAll(
            varTemplatePattern
          )) {
            const requestVarReferences = Array.from(new Set(matches));
  
            for (const requestVarReference of requestVarReferences) {
              if (dataKeys.includes(requestVarReference)) {
                continue;
              }
  
              errors.push({
                key: `requests.${request.id}.auth.${key}`,
                message: `Referencing undefined variable: {{$ ${requestVarReference}}}`,
              });
            }
          }
          
          for (const [_, ...matches] of request.auth[key].matchAll(
            secretTemplatePattern
          )) {
            const requestSecretReferences = Array.from(new Set(matches));
    
            for (const requestSecretReference of requestSecretReferences) {
              if (secretKeys.includes(requestSecretReference + "!")) {
                continue;
              }
    
              errors.push({
                key: `requests.${request.id}.auth.${key}`,
                message: `Referencing undefined secret: ${requestSecretReference}`,
              });
            }
          }
        }
      }
    }

    if (request.body) {
      // Check request.body for undefined variable references
      // TODO: toString is a cheat here
      for (const match of request.body
        .toString()
        .matchAll(varTemplatePattern)) {
        if (dataKeys.includes(match[1])) continue;

        errors.push({
          key: `requests.${request.id}.body`,
          message: `Reference to undefined variable: ${match[0]}`,
        });
      }

      // Check request.body for undefined secret references
      // TODO: toString is a cheat here
      for (const match of request.body
        .toString()
        .matchAll(secretTemplatePattern)) {
        if (secretKeys.includes(match[1] + "!")) continue;
  
        errors.push({
          key: `requests.${request.id}.body`,
          message: `Reference to undefined secret: ${match[1]}`,
        });
      }
    }

    if (request.tests) {
      // Check request.tests for undefined variable references
      for (const testId of Object.keys(request.tests)) {
        for (const match of request.tests[testId]
          .toString()
          .matchAll(varTemplatePattern)) {
          if (dataKeys.includes(match[1])) continue;

          errors.push({
            key: `requests.${request.id}.tests.${testId}`,
            message: `Reference to undefined variable: ${match[0]}`,
          });
        }
      }

      // Check request.tests for undefined secret references
      for (const testId of Object.keys(request.tests)) {
        for (const match of request.tests[testId]
          .toString()
          .matchAll(secretTemplatePattern)) {
          if (secretKeys.includes(match[1] + "!")) continue;
  
          errors.push({
            key: `requests.${request.id}.tests.${testId}`,
            message: `Reference to undefined secret: ${match[1]}`,
          });
        }
      }
    }
  }

  return errors;
}

function validateNoSecretsInEnvData(
  restfile: InputRestfile
): ValidationError[] {
  const [collection, data] = restfile;
  const errors: ValidationError[] = [];

  if (collection.envs) {
    for (const env of collection.envs) {
      if (!data[env]) {
        continue;
      }

      const secretKeys = Object.keys(data[env]).filter((key) =>
        key.endsWith(secretGlyph)
      );

      for (const secretKey of secretKeys) {
        errors.push({
          key: `data.${env}.${secretKey}`,
          message: "Secrets can not be defined in env data",
        });
      }
    }
  }

  return errors;
}

function validateAllEnvKeysDefinedInRoot(
  restfile: InputRestfile
): ValidationError[] {
  const [collection, data] = restfile;
  const dataKeys = Object.keys(data);

  const errors: ValidationError[] = [];

  if (collection.envs) {
    for (const env of collection.envs) {
      if (!data[env]) {
        continue;
      }

      const envKeys = Object.keys(data[env]);

      for (const envKey of envKeys) {
        if (!dataKeys.includes(envKey) && !envKey.endsWith(secretGlyph)) {
          errors.push({
            key: `data.${env}.${envKey}`,
            message: [
              `Key must be defined in data root if defined in env data.`,
              "",
              `Try adding this to the data document in the restfile:`,
              "",
              `${envKey}: !!str`,
              `${env}:`,
              `  ${envKey}: '${data[env][envKey]}'`,
            ].join("\n"),
          });
        }
      }
    }
  }

  return errors;
}

function validateRestFileTypes(restfile: InputRestfile): ValidationError[] {
  const [collection = {} as RestfileInfoDocument, data, ...requests] = restfile;
  const errors: ValidationError[] = [];

  switch (typeof collection?.name) {
    case "undefined":
      errors.push({
        key: "collection.name",
        message: "Required but not defined",
      });
      break;

    case "string":
      if (collection.name.length === 0) {
        errors.push({
          key: "collection.name",
          message: "Must be a non zero length string",
        });
      }
      break;

    default:
      errors.push({
        key: "collection.name",
        message: "Must be a non zero length string",
      });
      break;
  }

  switch (typeof collection?.description) {
    case "undefined":
      break;

    case "string":
      if (collection.description.length === 0) {
        errors.push({
          key: "collection.description",
          message: "Must be a non zero length string",
        });
      }
      break;

    default:
      errors.push({
        key: "collection.description",
        message: "Must be a non zero length string",
      });
      break;
  }

  for (const [i, request] of requests.filter((x) => x).entries()) {
    switch (typeof request?.id) {
      case "undefined":
        errors.push({
          key: `requests[${i}].id`,
          message: "Required but not defined",
        });
        break;

      case "string":
        if (request.id.length === 0) {
          errors.push({
            key: `requests[${i}].id`,
            message: "Must be a non zero length string",
          });
        }
        break;

      default:
        errors.push({
          key: `requests[${i}].id`,
          message: "Must be a non zero length string",
        });
        break;
    }

    switch (typeof request?.http) {
      case "undefined":
        errors.push({
          key: `requests[${i}].http`,
          message: "Required but not defined",
        });
        break;

      case "string":
        if (request.http.length === 0) {
          errors.push({
            key: `requests[${i}].http`,
            message: "Must be a non zero length string",
          });
        }
        break;

      default:
        errors.push({
          key: `requests[${i}].http`,
          message: "Must be a non zero length string",
        });
        break;
    }

    if (typeof request.auth !== "undefined") {
      if (Array.isArray(request.auth) || typeof request.auth !== "object") {
        errors.push({
          key: `requests.${request.id}.auth`,
          message: "Must be as an object",
        });
  
        return errors;
      }

      if (typeof request.auth.type === "undefined") {
        errors.push({
          key: `requests.${request.id}.auth.type`,
          message: "Required but not defined",
        });
      } else {
        const valueKeys = Object.values(RestfileRequestAuthType);

        if (!valueKeys.includes(request.auth.type as RestfileRequestAuthType)) {
          errors.push({
            key: `requests.${request.id}.auth.type`,
            message: `Must be one of the following values: ${valueKeys.join(", ")}`,
          });
        }

        if (typeof request.auth.grant === "undefined") {
          errors.push({
            key: `requests.${request.id}.auth.grant`,
            message: "Required but not defined",
          });
        } else if (request.auth.grant !== "client") {
          errors.push({
            key: `requests.${request.id}.auth.grant`,
            message: "Must be one of the following values: client",
          });
        }

        if (typeof request.auth.clientId === "undefined") {
          errors.push({
            key: `requests.${request.id}.auth.clientId`,
            message: "Required but not defined",
          });
        } else if(typeof request.auth.clientId !== "string") {
          errors.push({
            key: `requests.${request.id}.auth.clientId`,
            message: "Must be a string",
          });
        }

        if (typeof request.auth.clientSecret === "undefined") {
          errors.push({
            key: `requests.${request.id}.auth.clientSecret`,
            message: "Required but not defined",
          });
        } else if(typeof request.auth.clientSecret !== "string") {
          errors.push({
            key: `requests.${request.id}.auth.clientSecret`,
            message: "Must be a string",
          });
        }

        if (typeof request.auth.accessTokenUri === "undefined") {
          errors.push({
            key: `requests.${request.id}.auth.accessTokenUri`,
            message: "Required but not defined",
          });
        } else if(typeof request.auth.accessTokenUri !== "string") {
          errors.push({
            key: `requests.${request.id}.auth.accessTokenUri`,
            message: "Must be a string",
          });
        }

        if(typeof request.auth.scopes !== "undefined" 
            && typeof request.auth.scopes !== "string") {
          errors.push({
            key: `requests.${request.id}.auth.scopes`,
            message: "Must be a string",
          });
        }
      }
    }

    if (request?.headers) {
      if (
        typeof request.headers === "object" &&
        !Array.isArray(request.headers)
      ) {
        for (const [key, value] of Object.entries(request.headers)) {
          if (typeof value !== "string") {
            errors.push({
              key: `requests[${i}].headers["${key}"] value`,
              message: "Must be a string",
            });
          }
        }
      } else {
        errors.push({
          key: `requests[${i}].headers`,
          message: "Must be an object",
        });
      }
    }
  }

  if (!collection?.envs) {
    errors.push({
      key: "collection.envs",
      message: "Required but not defined",
    });
  } else {
    if (!Array.isArray(collection?.envs)) {
      errors.push({
        key: "collection.envs",
        message: "Must be an array of strings",
      });
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  return errors;
}

function validateRequestPrompts(restfile: InputRestfile): ValidationError[] {
  const [_, __, ...requests] = restfile;

  const errors: ValidationError[] = [];

  for (const request of requests.filter((x) => x)) {
    if (typeof request.prompts === "undefined") {
      continue;
    }

    if (Array.isArray(request.prompts) || typeof request.prompts !== "object") {
      errors.push({
        key: `requests.${request.id}.prompts`,
        message: "Must be as an object",
      });

      return errors;
    }

    for (const [_, ...matches] of request.http.matchAll(
      promptTemplatePattern
    )) {
      const requestPromptReferences = Array.from(new Set(matches));

      for (const requestPromptReference of requestPromptReferences) {
        if (Object.keys(request.prompts).includes(requestPromptReference)) {
          continue;
        }

        errors.push({
          key: `requests.${request.id}.http`,
          message: `Referencing undefined prompt: ${requestPromptReference}`,
        });
      }
    }

    if (request.auth) {
      for (const key of Object.keys(request.auth)) {
        for (const [_, ...matches] of request.auth[key].matchAll(
          promptTemplatePattern
        )) {
          const requestPromptReferences = Array.from(new Set(matches));

          for (const requestPromptReference of requestPromptReferences) {
            if (Object.keys(request.prompts).includes(requestPromptReference)) {
              continue;
            }

            errors.push({
              key: `requests.${request.id}.auth.${key}`,
              message: `Referencing undefined prompt: ${requestPromptReference}`,
            });
          }
        }
      }
    }

    if (request.tests) {
      for (const testId of Object.keys(request.tests)) {
        for (const [_, ...matches] of request.tests[testId].matchAll(
          promptTemplatePattern
        )) {
          const requestPromptReferences = Array.from(new Set(matches));

          for (const requestPromptReference of requestPromptReferences) {
            if (Object.keys(request.prompts).includes(requestPromptReference)) {
              continue;
            }

            errors.push({
              key: `requests.${request.id}.tests.${testId}`,
              message: `Referencing undefined prompt: ${requestPromptReference}`,
            });
          }
        }
      }
    }

    for (const requestPromptsKey of Object.keys(request.prompts)) {
      let requestPromptReferences = [];

      for (const [_, ...matches] of JSON.stringify(request).matchAll(
        promptTemplatePattern
      )) {
        if (!requestPromptReferences.includes(matches[0])) {
          requestPromptReferences.push(matches[0]);
        }
      }

      if (requestPromptReferences.includes(requestPromptsKey)) {
        continue;
      }

      debugger;

      errors.push({
        key: `requests.${request.id}.prompts.${requestPromptsKey}`,
        message: "Defined prompt never referenced",
      });
    }

    for (const [key, value] of Object.entries(request.prompts)) {
      if (typeof value === "string") {
        continue;
      }

      if (value.hasOwnProperty("default")) {
        continue;
      }

      errors.push({
        key: `requests.${request.id}.prompts.${key}`,
        message: "Must be a string, number or an object with a default value",
      });
    }
  }

  return errors;
}

export interface ValidationError {
  key: string;
  message: string;
}
