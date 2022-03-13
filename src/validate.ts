import { env_rx, parseData } from "./parse";
import { RestFile } from "./types";

export function validate(restfile: RestFile, env: string): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateHasRequests(restfile));
  errors.push(...validateUniqueRequestIds(restfile));
  errors.push(...validateAllRequestTemplateReferences(restfile, env));
  errors.push(...validateNoSecretsInEnvData(restfile));

  return errors;
}

function validateHasRequests(restfile: RestFile): ValidationError[] {
  const [_, __, ...requests] = restfile;
  const errors: ValidationError[] = [];

  if (requests.length == 0) {
    errors.push({
      key: "requests",
      message: "No requests defined",
    });
  }

  return errors;
}

function validateUniqueRequestIds(restfile: RestFile): ValidationError[] {
  const [_, __, ...requests] = restfile;
  const errors: ValidationError[] = [];

  const ids = requests.map((r) => r.id).sort();

  let duplicates = [];

  for (let i = 0; i < ids.length; i++) {
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

export interface ValidationError {
  key: string;
  message: string;
}
