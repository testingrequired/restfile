# restfile

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

Define collections of REST requests in a deterministic file format.

See [spec](SPEC.md).

## Example

```yaml
name: Example Collection
description: >
  A simple collection of requests with some environment variables and prompts.

  This is a good demonstration of some basic functionality restfiles are aiming for.
---
env:
  - BASE_URL
---
name: Get Posts
description: Get all posts from the blog
http: |
  GET /posts HTTP/1.1
  Host: {{$ env BASE_URL}}
  Accept: application/json
---
name: Add Post
description: Add post to blog
http: |
  POST /posts HTTP/1.1
  host: {{$ env BASE_URL}}
  content-type: application/json

  {"date":"2020-01-02 11:00:46 +06:00","text":"Hello World"}
---
name: Get Post
description: Get blog post by id
http: |
  GET /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ env BASE_URL}}
  accept: application/json
---
name: Patch Post
description: Get blog post by id
http: |
  PATCH /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ env BASE_URL}}
  content-type: application/json

  {"text":"Hello World!"}
---
name: Delete Post
description: Delete a blog post
http: |
  DELETE /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ env BASE_URL}}
```
