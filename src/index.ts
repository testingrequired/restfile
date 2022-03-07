import * as fs from "node:fs/promises";
import * as path from "node:path";
import { asyncLoadAll } from "./yaml";
import expect from "expect";
import { parse } from "./parse";

(async () => {
  const spec = await asyncLoadAll(
    await fs.readFile(path.join(process.cwd(), "spec.restfile.yml"), "utf-8")
  );

  const expected = await asyncLoadAll(
    await fs.readFile(
      path.join(process.cwd(), "expected.restfile.yml"),
      "utf-8"
    )
  );

  expect(parse(spec)).toEqual(expected);
})();
