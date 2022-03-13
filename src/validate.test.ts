import { RestFile } from "./types";
import { validate } from "./validate";

describe("validate", () => {
  let restfile: RestFile;

  beforeEach(() => {
    restfile = [
      { name: "Test", envs: ["prod"] },
      {},
      { id: "testRequest", http: "" },
    ];
  });

  it("should validate having no requests defined", () => {
    // Remove any defined requests
    restfile = restfile.slice(0, 2) as RestFile;

    expect(validate(restfile)).toEqual([
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
