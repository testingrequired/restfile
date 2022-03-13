import { parseData, parseSecrets } from "./parse";
import { RestFile } from "./types";

describe("parseData", () => {
  let restfile: RestFile;

  beforeEach(() => {
    restfile = [{ name: "Test", envs: ["prod"] }, {}];
  });

  it("should return object of resolved data from data document in restfile", () => {
    const [_, data] = restfile;
    data.foo = "bar";
    data.prod = {
      foo: "baz",
    };

    expect(parseData(restfile, "prod")).toEqual(data.prod);
  });

  it("should default values if they are defined in the base data and not in env", () => {
    const [_, data] = restfile;
    data.foo = "bar";
    data.prod = {};

    expect(parseData(restfile, "prod")).toEqual({ foo: data.foo });
  });
});

describe("parseSecret", () => {
  let restfile: RestFile;

  beforeEach(() => {
    restfile = [{ name: "Test", envs: ["prod"] }, {}];
  });

  it("should return object of resolved secrets from data document in restfile", () => {
    const [_, data] = restfile;
    data["foo!"] = "";

    const secrets = {
      foo: "bar",
      baz: "yet",
    };

    expect(parseSecrets(restfile, secrets)).toEqual({
      foo: "bar",
    });
  });
});
