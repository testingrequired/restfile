import { RestFile } from "./types";
import { validate } from "./validate";

describe("validate", () => {
  let restfile: RestFile;

  beforeEach(() => {
    restfile = validRestFile(["prod"]);
  });

  describe("validRestFile", () => {
    it("should pass validation", () => {
      expect(validate(validRestFile(["prod"]), "prod")).toEqual([]);
    });
  });

  it("should validate having no requests defined", () => {
    // Remove any defined requests
    restfile = restfile.slice(0, 2) as RestFile;

    expect(validate(restfile, "prod")).toEqual([
      {
        key: "requests",
        message: "No requests defined",
      },
    ]);
  });

  it("should validate no duplicate request ids", () => {
    restfile.push(
      { id: "1", http: "GET http://example.com/1" },
      { id: "1", http: "GET http://example.com/2" },
      { id: "3", http: "GET http://example.com/3" },
      { id: "3", http: "GET http://example.com/4" }
    );

    expect(validate(restfile, "prod")).toEqual([
      {
        key: "requests",
        message: "Duplicate request id: 1",
      },
      {
        key: "requests",
        message: "Duplicate request id: 3",
      },
    ]);
  });

  it("should validate no requests reference template variables not defined in data", () => {
    restfile.push({
      id: "invalidRequest",
      headers: {
        another: "{{$ alsoDoesntExist}}",
      },
      body: "{{$ lastOneDoesntExist}} {{$ reallyLastOne}}",
      http: `GET http://example.com/1\nCustom: {{$ doesntExist}}`,
    });

    expect(validate(restfile, "prod")).toEqual([
      {
        key: "requests.invalidRequest.http",
        message: "Reference to undefined variable: {{$ doesntExist}}",
      },
      {
        key: "requests.invalidRequest.headers.another",
        message: "Reference to undefined variable: {{$ alsoDoesntExist}}",
      },
      {
        key: "requests.invalidRequest.body",
        message:
          "Reference to undefined variable: {{$ lastOneDoesntExist}} {{$ reallyLastOne}}",
      },
    ]);
  });

  it("should validate no secrets in env specific data", () => {
    const [collection, data] = restfile;

    collection.envs.push("testEnv");

    data.testEnv = {
      "testSecret!": "",
    };

    data["secretValue!"] = "";

    data.prod["invalidSecretValue!"] = "";

    expect(validate(restfile, "prod")).toEqual([
      {
        key: "data.prod.invalidSecretValue!",
        message: "Secrets can not be defined in env data",
      },
      {
        key: "data.testEnv.testSecret!",
        message: "Secrets can not be defined in env data",
      },
    ]);
  });
});

export function validRestFile(envs: string[]): RestFile {
  const collection = { name: "Test", envs };
  const data = {};
  for (const env of envs) {
    data[env] = {};
  }
  const request = { id: "testRequest", http: "" };

  return [collection, data, request];
}
