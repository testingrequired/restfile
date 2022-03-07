import { loadAll } from "js-yaml";

export function asyncLoadAll<T>(content: string) {
  return new Promise<T[]>((resolve, reject) => {
    try {
      const docs: T[] = [];

      loadAll(content, (doc) => {
        docs.push(doc as T);
      });

      resolve(docs);
    } catch (e) {
      reject(e);
    }
  });
}
