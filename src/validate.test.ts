import { RestFile } from "./types";
import { validate } from "./validate";

describe("validate", () => {
  let restfile: RestFile;

  beforeEach(() => {});

  it("should validate having no requests defined", () => {
    restfile = [
      {
        name: "Test Collection",
      },
      {},
    ];

    expect(validate(restfile)).toEqual([
      {
        key: "requests",
        message: "No requests defined",
      },
    ]);
  });

  it("should validate no duplicate request ids", () => {
    restfile = [
      {
        name: "Test Collection",
      },
      {},
      { id: "1", http: "GET http://example.com/1" },
      { id: "1", http: "GET http://example.com/2" },
      { id: "3", http: "GET http://example.com/3" },
      { id: "3", http: "GET http://example.com/4" },
    ];

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
});
