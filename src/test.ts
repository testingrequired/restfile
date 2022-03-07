import * as fs from "fs/promises";
import * as path from "path";
import { asyncLoadAll } from "./yaml";
import expect from "expect";
import { parse } from "./parse";

describe("test", () => {
  it("test", async () => {
    const spec = await asyncLoadAll(
      await fs.readFile(path.join(process.cwd(), "spec.restfile.yml"), "utf-8")
    );

    const expected = await asyncLoadAll(
      await fs.readFile(
        path.join(process.cwd(), "expected.restfile.yml"),
        "utf-8"
      )
    );

    process.env.BASE_URL = "http://example.com";

    expect(parse(spec)).toEqual(expected);
  });
});
