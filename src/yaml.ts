import { loadAll } from "js-yaml";
import { Collection, Data, Document, Request, InputRestFile } from "./types";

export function asyncLoadAll(content: string) {
  return new Promise<InputRestFile>((resolve, reject) => {
    try {
      const docs: Document[] = [];

      loadAll(content, (doc) => {
        docs.push(doc as Document);
      });

      const [document, data, ...requests] = docs as unknown as [
        Collection,
        Data,
        ...Request[]
      ];

      resolve([document, data, ...requests]);
    } catch (e) {
      reject(e);
    }
  });
}
