import { InputRestfile } from ".";
import { parseData, parseSecrets } from "./parse";
import { validRestFile } from "./testHelpers";

describe("parseData", () => {
  let restfile: InputRestfile;

  beforeEach(() => {
    restfile = validRestFile(["prod"]);
  });

  it("should default if env is undefined", () => {
    const [_, data] = restfile;
    data.foo = "bar";
    data.prod = {
      foo: "baz",
    };

    expect(parseData(restfile, undefined)).toEqual({
      foo: "bar",
    });
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
  let restfile: InputRestfile;

  beforeEach(() => {
    restfile = [
      { name: "Test", envs: ["prod"] },
      {
        "foo!": "",
      },
    ];
  });

  it("should return object of resolved secrets from data document in restfile", () => {
    const secrets = {
      foo: "bar",
      baz: "yet",
    };

    expect(parseSecrets(restfile, secrets)).toEqual({
      foo: "bar",
    });
  });

  it("should exclude secrets not passed in as input", () => {
    const secrets = {};

    expect(parseSecrets(restfile, secrets)).toEqual({});
  });
});
