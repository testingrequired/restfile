import * as path from "path";
import expect from "expect";
import { Restfile } from "./new_interface";

describe("Integration", () => {
  const specFile = "spec.restfile.yml";

  it("should parse restfile", async () => {
    const specInput = await Restfile.load(
      path.join(path.dirname(__filename), specFile)
    );

    const spec = Restfile.parse(specInput, "prod", {
      secretToken: "expectedSecretToken",
    });

    expect(spec.name).toBe("Example Collection");
    expect(spec.description)
      .toBe(`A simple collection of requests with some environment variables and prompts.
This is a good demonstration of some basic functionality restfiles are aiming for.
`);
    expect(spec.env).toBe("prod");
    expect(spec.envs).toStrictEqual(["prod"]);
    expect(spec.data).toStrictEqual({
      baseUrl: "http://example.com",
      userAgent:
        "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",
    });
    expect(spec.requestIds).toStrictEqual([
      "posts/getPosts",
      "posts/addPost",
      "posts/getPostById",
      "posts/patchPostById",
      "posts/deletePostById",
      "user/status",
    ]);

    const getPostRequest = spec.request("posts/getPosts");
    expect(getPostRequest.id).toBe("posts/getPosts");
    expect(getPostRequest.http).toBe(`GET /posts HTTP/1.1
Host: http://example.com
Accept: application/json
Authorization: Bearer expectedSecretToken
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0

`);
    expect(getPostRequest.tests).toBe(undefined);

    const addPostRequest = spec.request("posts/addPost", {
      postText: "expectedPostText",
      tags: "expected,tags",
    });
    expect(addPostRequest.id).toBe("posts/addPost");
    expect(addPostRequest.http).toBe(`POST /posts HTTP/1.1
Host: http://example.com
Content-Type: application/json
User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
Authorization: Bearer expectedSecretToken

{"date":"2020-01-02 11:00:46 +06:00","text":"expectedPostText","tags":"expected,tags"}

`);
    expect(addPostRequest.tests).toStrictEqual({
      shouldBeOk: `HTTP/1.1 200 OK
content-type: application/json
x-resource-url: http://example.com/posts/1
x-token: expectedSecretToken

{"date":"2020-01-02 11:00:46 +06:00","text":"expectedPostText","tags":"expected,tags","url":"http://example.com/posts/1"}

`,
    });
  });
});
