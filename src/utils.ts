export function sortObject(obj: object | unknown[]): object | unknown[] {
  if (!obj) {
    return obj;
  }

  let sorted: object | unknown[];

  if (obj instanceof Array) {
    sorted = obj.map((item) => sortObject(item as object | unknown[]));
  } else {
    const keys = Object.keys(obj).sort(function (key1, key2) {
      switch (true) {
        case key1.toLowerCase() < key2.toLowerCase():
          return -1;

        case key1.toLowerCase() > key2.toLowerCase():
          return 1;

        default:
          return 0;
      }
    });

    sorted = {};

    for (const index in keys) {
      const key = keys[index];

      sorted[key] =
        typeof obj[key] == "object" ? sortObject(obj[key]) : obj[key];
    }
  }

  return sorted;
}
