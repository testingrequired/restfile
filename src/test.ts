import * as fs from "fs/promises";
import * as path from "path";
import { asyncLoadAll } from "./yaml";
import expect from "expect";
import { parse } from "./parse";

describe("test", () => {
  const specFile = "spec.restfile.yml";
  const expectedFile = "expected.restfile.yml";

  it("test", async () => {
    const spec = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), specFile), "utf-8")
    );

    const expected = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), expectedFile), "utf-8")
    );

    const actual = parse(spec);

    expect(actual).toEqual(expected);
  });
});
