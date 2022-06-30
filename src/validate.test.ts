import { InputRestfile } from "./new_interface";
import { validRestFile } from "./testHelpers";
import { validate } from "./validate";

describe("validate", () => {
  let restfile: InputRestfile;

  beforeEach(() => {
    restfile = validRestFile(["prod"]);
  });

  describe("validRestFile", () => {
    it("should pass validation", () => {
      expect(validate(validRestFile(["prod"]))).toEqual([]);
    });
  });

  it("should validate that undefined collection, data and request documents will display correct validation messages", () => {
    expect(validate([] as any)).toEqual([
      {
        key: "collection.name",
        message: "Required but not defined",
      },
      {
        key: "collection.envs",
        message: "Required but not defined",
      },
    ]);
  });

  it("should validate that null collection, data and request documents will display correct validation messages", () => {
    expect(validate([null, null, null] as any)).toEqual([
      {
        key: "collection.name",
        message: "Required but not defined",
      },
      {
        key: "collection.envs",
        message: "Required but not defined",
      },
    ]);
  });

  it("should validate having no requests defined", () => {
    // Remove any defined requests
    restfile = restfile.slice(0, 2) as InputRestfile;

    expect(validate(restfile)).toEqual([]);
  });

  it("should validate no duplicate request ids", () => {
    restfile.push(
      { id: "1", http: "GET http://example.com/1" },
      { id: "1", http: "GET http://example.com/2" },
      { id: "3", http: "GET http://example.com/3" },
      { id: "3", http: "GET http://example.com/4" }
    );

    expect(validate(restfile)).toEqual([
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
        another: "{{$ doesntExist}}",
      },
      body: "{{$ doesntExist}} {{$ doesntExist}}",
      http: `GET http://example.com/1\nCustom: {{$ doesntExist}}`,
      tests: {
        test: "{{$ doesntExist}}",
      },
    });

    expect(validate(restfile)).toEqual([
      {
        key: "requests.invalidRequest.http",
        message: "Reference to undefined variable: {{$ doesntExist}}",
      },
      {
        key: "requests.invalidRequest.headers.another",
        message: "Reference to undefined variable: {{$ doesntExist}}",
      },
      {
        key: "requests.invalidRequest.body",
        message: "Reference to undefined variable: {{$ doesntExist}}",
      },
      {
        key: "requests.invalidRequest.body",
        message: "Reference to undefined variable: {{$ doesntExist}}",
      },
      {
        key: "requests.invalidRequest.tests.test",
        message: "Reference to undefined variable: {{$ doesntExist}}",
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

    expect(validate(restfile)).toEqual([
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

  it("should validate that all referenced secrets are defined", () => {
    restfile.push({
      id: "test",
      prompts: {},
      http: `GET http://example.com HTTP/1.1
      
      {{! a}}
      `,
      tests: {
        test: `{{! b}}`,
      },
    });

    expect(validate(restfile)).toEqual([
      {
        key: "requests.test.http",
        message: "Reference to undefined secret: a",
      },
      {
        key: "requests.test.tests.test",
        message: "Reference to undefined secret: b",
      },
    ]);
  });

  it("should validate env data not defined in the root", () => {
    const [_, data] = restfile;

    data.prod = {
      foo: "bar",
    };

    expect(validate(restfile)).toEqual([
      {
        key: "data.prod.foo",
        message: [
          "Key must be defined in data root if defined in env data.",
          "",
          "Try adding this to the data document in the restfile:",
          "",
          "foo: !!str",
          "prod:",
          "  foo: 'bar'",
        ].join("\n"),
      },
    ]);
  });

  describe("prompts", () => {
    it("should validate that request.prompts is not an array", () => {
      restfile.push({
        id: "test",
        prompts: [],
        http: "GET http://example.com HTTP/1.1",
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts",
          message: "Must be as an object",
        },
      ]);
    });

    it("should validate that request.prompts is not a string", () => {
      restfile.push({
        id: "test",
        prompts: "",
        http: "GET http://example.com HTTP/1.1",
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts",
          message: "Must be as an object",
        },
      ]);
    });

    it("should validate that request.prompts is not a number", () => {
      restfile.push({
        id: "test",
        prompts: 123,
        http: "GET http://example.com HTTP/1.1",
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts",
          message: "Must be as an object",
        },
      ]);
    });

    it("should validate that defined prompt can not be an array", () => {
      restfile.push({
        id: "test",
        prompts: {
          arr: [],
        },
        http: `GET http://example.com HTTP/1.1
        
        {{? arr}}
        `,
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts.arr",
          message: "Must be a string, number or an object with a default value",
        },
      ]);
    });

    it("should validate that defined prompt has a default value if an object", () => {
      restfile.push({
        id: "test",
        prompts: {
          a: {},
          b: {
            default: "",
          },
        },
        http: `GET http://example.com HTTP/1.1
        
        {{? a}} {{? b}}
        `,
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts.a",
          message: "Must be a string, number or an object with a default value",
        },
      ]);
    });

    it("should validate that all referenced prompts are defined", () => {
      restfile.push({
        id: "test",
        prompts: {},
        http: `GET http://example.com HTTP/1.1
        
        {{? a}}
        `,
        tests: {
          test: `{{? b}}`,
        },
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.http",
          message: "Referencing undefined prompt: a",
        },
        {
          key: "requests.test.tests.test",
          message: "Referencing undefined prompt: b",
        },
      ]);
    });

    it("should validate that all defined prompts are referenced", () => {
      restfile.push({
        id: "test",
        prompts: {
          a: "",
        },
        http: `GET http://example.com HTTP/1.1

        `,
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts.a",
          message: "Defined prompt never referenced",
        },
      ]);

      restfile.push({
        id: "test2",
        prompts: {
          a: "",
        },
        http: `GET http://example.com/{{? a}} HTTP/1.1

        `,
      });

      expect(validate(restfile)).toEqual([
        {
          key: "requests.test.prompts.a",
          message: "Defined prompt never referenced",
        },
      ]);
    });
  });

  describe("validate types", () => {
    describe("collection.name", () => {
      const key = "collection.name";

      it("should validate collection name is defined", () => {
        const [collection] = restfile;

        collection.name = undefined;

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Required but not defined",
          },
        ]);
      });

      it("should validate collection name is a string", () => {
        const [collection] = restfile;

        (collection as any).name = 123;

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Must be a non zero length string",
          },
        ]);
      });

      it("should validate collection name is a non zero length string", () => {
        const [collection] = restfile;

        collection.name = "";

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Must be a non zero length string",
          },
        ]);
      });
    });

    describe("collection.description", () => {
      const key = "collection.description";

      it("should validate collection description is optional", () => {
        const [collection] = restfile;

        collection.description = undefined;

        expect(validate(restfile)).toEqual([]);
      });

      it("should validate collection description is a string", () => {
        const [collection] = restfile;

        (collection as any).description = 123;

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Must be a non zero length string",
          },
        ]);
      });

      it("should validate collection description is a non zero length string", () => {
        const [collection] = restfile;

        collection.description = "";

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Must be a non zero length string",
          },
        ]);
      });
    });

    describe("collection.envs", () => {
      const key = "collection.envs";

      it("should validate collection description is optional", () => {
        const [collection] = restfile;

        collection.envs = undefined;

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Required but not defined",
          },
        ]);
      });

      it("should validate collection envs can be empty", () => {
        const [collection] = restfile;

        collection.envs = [];

        expect(validate(restfile)).toEqual([]);
      });

      it("should validate collection envs is an array", () => {
        const [collection] = restfile;

        (collection as any).envs = 123;

        expect(validate(restfile)).toEqual([
          {
            key,
            message: "Must be an array of strings",
          },
        ]);
      });
    });

    describe("requests", () => {
      describe("request.id", () => {
        const key = "requests[1].id";

        it("should validate request id is defined", () => {
          restfile.push({
            id: undefined,
            http: "GET http://example.com HTTP/1.1",
          });

          expect(validate(restfile)).toEqual([
            {
              key,
              message: "Required but not defined",
            },
          ]);
        });

        it("should validate request id is non zero length string", () => {
          restfile.push({
            id: "",
            http: "GET http://example.com HTTP/1.1",
          });

          expect(validate(restfile)).toEqual([
            {
              key,
              message: "Must be a non zero length string",
            },
          ]);
        });

        it("should validate request id is a string", () => {
          restfile.push({
            id: [],
            http: "GET http://example.com HTTP/1.1",
          });

          expect(validate(restfile)).toEqual([
            {
              key,
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

          expect(validate(restfile)).toEqual([]);
        });

        it("should validate request headers can't be an array", () => {
          restfile.push({
            id: "test",
            http: "GET http://example.com HTTP/1.1",
            headers: [],
          });

          expect(validate(restfile)).toEqual([
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

          expect(validate(restfile)).toEqual([]);
        });

        it("should validate request headers values are strings", () => {
          restfile.push({
            id: "test",
            http: "GET http://example.com HTTP/1.1",
            headers: {
              ["content-type"]: [],
            },
          });

          expect(validate(restfile)).toEqual([
            {
              key: `requests[1].headers["content-type"] value`,
              message: "Must be a string",
            },
          ]);
        });
      });

      describe("request.http", () => {
        const key = "requests[1].http";

        it("should validate request http is defined", () => {
          restfile.push({
            id: "test",
            http: undefined,
          });

          expect(validate(restfile)).toEqual([
            {
              key,
              message: "Required but not defined",
            },
          ]);
        });

        it("should validate request http is non zero length string", () => {
          restfile.push({
            id: "test",
            http: "",
          });

          expect(validate(restfile)).toEqual([
            {
              key,
              message: "Must be a non zero length string",
            },
          ]);
        });

        it("should validate request http is a string", () => {
          restfile.push({
            id: "test",
            http: [],
          });

          expect(validate(restfile)).toEqual([
            {
              key,
              message: "Must be a non zero length string",
            },
          ]);
        });
      });
    });
  });
});
