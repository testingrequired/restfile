import * as fs from "fs/promises";
import * as path from "path";
import { asyncLoadAll } from "./yaml";
import expect from "expect";
import { parse } from "./parse";
import { validate } from "./validate";

describe("test", () => {
  const specFile = "spec.restfile.yml";
  const expectedFile = "expected.restfile.yml";
  const secrets = {
    secretToken: "expectedToken",
  };

  it("test", async () => {
    const spec = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), specFile), "utf-8")
    );

    const expected = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), expectedFile), "utf-8")
    );

    const errors = validate(spec);

    expect(errors.length).toBe(0);

    const actual = parse(spec, secrets);

    expect(actual).toEqual(expected);
  });
});
