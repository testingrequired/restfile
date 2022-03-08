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
headers:
  host: "{{$ env BASE_URL}}"
  content-type: application/json
http: |
  POST /posts HTTP/1.1

  {"date":"2020-01-02 11:00:46 +06:00","text":"Hello World"}
---
name: Get Post
description: Get blog post by id
headers:
  host: "{{$ env BASE_URL}}"
  accept: application/json
http: |
  GET /posts/{{? post-id 1}} HTTP/1.1
---
name: Patch Post
description: Get blog post by id
body:
  text: "Hello World!"
headers:
  host: "{{$ env BASE_URL}}"
  content-type: application/json
http: |
  PATCH /posts/{{? post-id 1}} HTTP/1.1
---
name: Delete Post
description: Delete a blog post
headers:
  host: "{{$ env BASE_URL}}"
```

### name

The name of the request.

### description

Some information about the request.

### http

A raw HTTP message string that must include the start line e.g. `GET http://example.com HTTP/1.1`.

It's important that newlines are preserved so the use of [`|`](https://yaml.org/spec/1.2.2/#23-scalars) is recommended.
