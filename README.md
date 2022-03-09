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
envs: [prod]
---
baseUrl: http://localhost
userAgent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0

prod:
  baseUrl: http://example.com
---
id: posts/getPosts
description: Get all posts from the blog
http: |
  GET /posts HTTP/1.1
  Host: {{$ baseUrl}}
  Accept: application/json
  user-agent: {{$ userAgent}}
---
id: posts/addPost
description: Add post to blog
http: |
  POST /posts HTTP/1.1
  host: {{$ baseUrl}}
  content-type: application/json
  user-agent: {{$ userAgent}}

  {"date":"2020-01-02 11:00:46 +06:00","text":"Hello World"}
---
id: posts/getPostById
description: Get blog post by id
http: |
  GET /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ baseUrl}}
  accept: application/json
  user-agent: {{$ userAgent}}
---
id: posts/patchPostById
description: Get blog post by id
http: |
  PATCH /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ baseUrl}}
  content-type: application/json
  user-agent: {{$ userAgent}}

  {"text":"Hello World!"}
---
id: posts/deletePostById
description: Delete a blog post
http: |
  DELETE /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ baseUrl}}
  user-agent: {{$ userAgent}}
```
