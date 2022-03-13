import { RestFile } from "./types";

export function validate(restfile: RestFile): ValidationError[] {
  const errors: ValidationError[] = [];

  errors.push(...validateHasRequests(restfile));
  errors.push(...validateUniqueRequestIds(restfile));

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

function validateUniqueRequestIds(restfile: RestFile) {
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

export interface ValidationError {
  key: string;
  message: string;
}
