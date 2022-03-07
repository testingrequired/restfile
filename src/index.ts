import * as fs from "node:fs/promises";
import * as path from "node:path";
import { asyncLoadAll } from "./yaml";

(async () => {
  const rawYaml = await fs.readFile(
    path.join(process.cwd(), "spec.restfile.yml"),
    "utf-8"
  );

  const docs = await asyncLoadAll(rawYaml);

  console.log(docs);
})();
