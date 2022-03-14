import { env_rx, parseData } from "./parse";
import { RestFile } from "./types";

export function validate(restfile: RestFile, env: string): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateRestFileTypes(restfile));

  // Exit early if basic types aren't met
  if (errors.length > 0) {
    return errors;
  }

  errors.push(...validateUniqueRequestIds(restfile));
  errors.push(...validateAllRequestTemplateReferences(restfile, env));
  errors.push(...validateNoSecretsInEnvData(restfile));

  return errors;
}

function validateUniqueRequestIds(restfile: RestFile): ValidationError[] {
  const [_, __, ...requests] = restfile;
  const errors: ValidationError[] = [];

  const ids = requests.map((r) => r.id).sort();

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
  restfile: RestFile,
  env: string
): ValidationError[] {
  const [_, __, ...requests] = restfile;
  const errors: ValidationError[] = [];

  const data = parseData(restfile, env);
  const dataKeys = Object.keys(data);

  for (const request of requests) {
    for (const match of request.http.matchAll(env_rx)) {
      if (dataKeys.includes(match[1])) continue;

      errors.push({
        key: `requests.${request.id}.http`,
        message: `Reference to undefined variable: ${match[0]}`,
      });
    }

    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        for (const match of value.matchAll(env_rx)) {
          if (dataKeys.includes(match[1])) continue;

          errors.push({
            key: `requests.${request.id}.headers.${key}`,
            message: `Reference to undefined variable: ${match[0]}`,
          });
        }
      }
    }

    if (request.body) {
      // TODO: toString is a cheat here
      for (const match of request.body.toString().matchAll(env_rx)) {
        if (dataKeys.includes(match[1])) continue;

        errors.push({
          key: `requests.${request.id}.body`,
          message: `Reference to undefined variable: ${match[0]}`,
        });
      }
    }
  }

  return errors;
}

function validateNoSecretsInEnvData(restfile: RestFile): ValidationError[] {
  const [collection, data] = restfile;
  const errors: ValidationError[] = [];

  if (collection.envs) {
    for (const env of collection.envs) {
      const secretKeys = Object.keys(data[env]).filter((key) =>
        key.endsWith("!")
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

function validateRestFileTypes(restfile: RestFile): ValidationError[] {
  const [collection, data, ...requests] = restfile;
  const errors: ValidationError[] = [];

  if (typeof collection === "undefined" || collection === null) {
    errors.push({
      key: "collection",
      message: "Required but not defined",
    });
  }

  if (typeof data === "undefined" || data === null) {
    errors.push({
      key: "data",
      message: "Required but not defined",
    });
  }

  if (requests === null || requests.length == 0) {
    errors.push({
      key: "requests",
      message: "No requests defined",
    });
  }

  if (errors.length > 0) {
    return errors;
  }

  switch (typeof collection.name) {
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

  switch (typeof collection.description) {
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

  for (const [i, request] of requests.entries()) {
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

    if (request?.headers) {
      if (
        typeof request.headers === "object" &&
        !Array.isArray(request.headers)
      ) {
        for (const [key, value] of Object.entries(request.headers)) {
          if (typeof key !== "string") {
            errors.push({
              key: `requests[${i}].headers[${key}] header`,
              message: "Must be a string",
            });
          }

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

  if (!Array.isArray(collection.envs)) {
    errors.push({
      key: "collection.envs",
      message: "Must be an array of strings",
    });
  }

  return errors;
}

export interface ValidationError {
  key: string;
  message: string;
}