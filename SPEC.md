# restfile spec

## File Format

The tentative file format is multi-document YAML. Each file represents a collection of REST requests. The file defines how requests are made. A client would then read the restfile and do the work to make the request.

## Templating

Templating is used to ensure the restfile is generic.

### Variables

Variables can be accessed using `{{$ scope variable}}` e.g. `{{$ env BASE_URL}}`.

### Prompts

The use of `{{? "Post Id"}}` indicates prompting the user for this information. This defaults to a string.

## Document 0: Collection Information

Information about the collection as a whole.

<!-- prettier-ignore -->
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
headers:
  user-agent: "{{$ userAgent}}"
http: |+
  GET /posts HTTP/1.1
  Host: {{$ baseUrl}}
  Accept: application/json

---
id: posts/addPost
description: Add post to blog
http: |+
  POST /posts HTTP/1.1
  host: {{$ baseUrl}}
  content-type: application/json
  user-agent: {{$ userAgent}}

  {"date":"2020-01-02 11:00:46 +06:00","text":"Hello World"}
---
id: posts/getPostById
description: Get blog post by id
http: |+
  GET /posts/{{? post-id 1}} HTTP/1.1
  host: {{$ baseUrl}}
  accept: application/json
  user-agent: {{$ userAgent}}

---
id: posts/patchPostById
description: Get blog post by id
body:
  text: Hello World!!
http: |+
  PATCH /posts/1 HTTP/1.1
  host: {{$ baseUrl}}
  content-type: application/json
  user-agent: {{$ userAgent}}

  {"text": "Hello World!"}
---
id: posts/deletePostById
description: Delete a blog post
http: |+
  DELETE /posts/1 HTTP/1.1
  host: {{$ baseUrl}}
  user-agent: {{$ userAgent}}
---
id: user/status
description: Update user status
body: online
http: |+
  PATCH /user/status HTTP/1.1
  host: {{$ baseUrl}}
  content-type: text/plain
  user-agent: {{$ userAgent}}


```

### name

The name of the request.

### description

Some information about the request.

### http

A raw HTTP message string that must include the start line e.g. `GET http://example.com HTTP/1.1`.

It's important that newlines are preserved so the use of [`|`](https://yaml.org/spec/1.2.2/#23-scalars) is recommended.
