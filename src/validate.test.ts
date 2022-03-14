import { validRestFile } from "./testHelpers";
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

  describe("validate types", () => {
    describe("collection.name", () => {
      it("should validate collection name is defined", () => {
        const [collection] = restfile;

        collection.name = undefined;

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.name",
            message: "Required but not defined",
          },
        ]);
      });

      it("should validate collection name is a string", () => {
        const [collection] = restfile;

        (collection as any).name = 123;

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.name",
            message: "Must be a non zero length string",
          },
        ]);
      });

      it("should validate collection name is a non zero length string", () => {
        const [collection] = restfile;

        collection.name = "";

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.name",
            message: "Must be a non zero length string",
          },
        ]);
      });
    });

    describe("collection.description", () => {
      it("should validate collection description is optional", () => {
        const [collection] = restfile;

        collection.description = undefined;

        expect(validate(restfile, "prod")).toEqual([]);
      });

      it("should validate collection description is a string", () => {
        const [collection] = restfile;

        (collection as any).description = 123;

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.description",
            message: "Must be a non zero length string",
          },
        ]);
      });

      it("should validate collection description is a non zero length string", () => {
        const [collection] = restfile;

        collection.description = "";

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.description",
            message: "Must be a non zero length string",
          },
        ]);
      });
    });

    describe("collection.envs", () => {
      it("should validate collection description is optional", () => {
        const [collection] = restfile;

        collection.envs = undefined;

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.description",
            message: "Must be an array of strings",
          },
        ]);
      });

      it("should validate collection envs can be empty", () => {
        const [collection] = restfile;

        collection.envs = [];

        expect(validate(restfile, "prod")).toEqual([]);
      });

      it("should validate collection envs is an array", () => {
        const [collection] = restfile;

        (collection as any).envs = 123;

        expect(validate(restfile, "prod")).toEqual([
          {
            key: "collection.description",
            message: "Must be an array of strings",
          },
        ]);
      });
    });

    describe("requests", () => {
      describe("request.id", () => {
        // required
        it("should validate request id is defined", () => {
          restfile.push({
            id: undefined,
            http: "GET http://example.com HTTP/1.1",
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: "requests[1].id",
              message: "Required but not defined",
            },
          ]);
        });

        // is non zero length string
        it("should validate request id is non zero length string", () => {
          restfile.push({
            id: "",
            http: "GET http://example.com HTTP/1.1",
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: "requests[1].id",
              message: "Must be a non zero length string",
            },
          ]);
        });

        it("should validate request id is a string", () => {
          restfile.push({
            id: [],
            http: "GET http://example.com HTTP/1.1",
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: "requests[1].id",
              message: "Must be a non zero length string",
            },
          ]);
        });
      });

      describe("request.description", () => {
        // optional
        // is non zero length string
      });

      describe("request.headers", () => {
        it("should validate request headers is an object", () => {
          restfile.push({
            id: "test",
            http: "GET http://example.com HTTP/1.1",
            headers: {},
          });

          expect(validate(restfile, "prod")).toEqual([]);
        });

        it("should validate request headers is an object", () => {
          restfile.push({
            id: "test",
            http: "GET http://example.com HTTP/1.1",
            headers: [],
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: `requests[1].headers`,
              message: "Must be an object",
            },
          ]);
        });

        it("should validate request headers key and values are strings", () => {
          restfile.push({
            id: "test",
            http: "GET http://example.com HTTP/1.1",
            headers: {
              "content-type": "application/json",
            },
          });

          expect(validate(restfile, "prod")).toEqual([]);
        });

        it("should validate request headers values are strings", () => {
          restfile.push({
            id: "test",
            http: "GET http://example.com HTTP/1.1",
            headers: {
              ["content-type"]: [],
            },
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: `requests[1].headers["content-type"] value`,
              message: "Must be a string",
            },
          ]);
        });
      });

      describe("request.http", () => {
        // required
        it("should validate request http is defined", () => {
          restfile.push({
            id: "test",
            http: undefined,
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: "requests[1].http",
              message: "Required but not defined",
            },
          ]);
        });

        // is non zero length string
        it("should validate request http is non zero length string", () => {
          restfile.push({
            id: "test",
            http: "",
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: "requests[1].http",
              message: "Must be a non zero length string",
            },
          ]);
        });

        it("should validate request http is a string", () => {
          restfile.push({
            id: "test",
            http: [],
          });

          expect(validate(restfile, "prod")).toEqual([
            {
              key: "requests[1].http",
              message: "Must be a non zero length string",
            },
          ]);
        });
      });
    });
  });
});
