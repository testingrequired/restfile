export function sortObject(obj: object | unknown[]): object | unknown[] {
  if (!obj) {
    return obj;
  }

  let sortedObj: object | unknown[];

  if (obj instanceof Array) {
    sortedObj = obj.map((item) => sortObject(item as object | unknown[]));
  } else {
    sortedObj = {};
    var keys = Object.keys(obj);
    // console.log(keys);
    keys.sort(function (key1, key2) {
      (key1 = key1.toLowerCase()), (key2 = key2.toLowerCase());
      if (key1 < key2) return -1;
      if (key1 > key2) return 1;
      return 0;
    });

    for (var index in keys) {
      var key = keys[index];
      if (typeof obj[key] == "object") {
        sortedObj[key] = sortObject(obj[key]);
      } else {
        sortedObj[key] = obj[key];
      }
    }
  }

  return sortedObj;
}
