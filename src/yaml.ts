import { loadAll } from "js-yaml";
import {
  InputRestfile,
  RestfileDataDocument,
  RestfileInfoDocument,
  RestfileRequestDocument,
} from "./new_interface";

export function asyncLoadAll(content: string) {
  return new Promise<InputRestfile>((resolve, reject) => {
    try {
      const docs: Document[] = [];

      loadAll(content, (doc) => {
        docs.push(doc as Document);
      });

      const [document, data, ...requests] = docs as unknown as [
        RestfileInfoDocument,
        RestfileDataDocument,
        ...RestfileRequestDocument[]
      ];

      resolve([document, data, ...requests]);
    } catch (e) {
      reject(e);
    }
  });
}
