# restfile spec

## File Format

The tentative file format is multi-document YAML. Each file represents a collection of REST requests. The file defines how requests are made. A client would then read the restfile and do the work to make the request.

## Templating

Templating is used to ensure the restfile is generic.

### Variables

Variables are defined in the data document can be accessed using `{{$ variable}}` e.g. `{{$ baseUrl}}`.

### Secrets

Secrets are defined (without a value) in the data document as well and can be accessed using `{{! variable}}` e.g. `{{! baseUrl}}`. These will be provided at runtime by the client implementation.

### Prompts

Prompts are defined in each request and use the `{{? prompt}}` syntax e.g. `{{? id}}`.

## Example

<!-- prettier-ignore -->
```yaml
name: Example Collection
description: >
  A simple collection of requests with some environment variables and prompts.

  This is a good demonstration of some basic functionality restfiles are aiming for.
envs: [prod]
---
baseUrl: !!str
userAgent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
secretToken!: !!str

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
  Authorization: Bearer {{! secretToken}}

---
id: posts/addPost
description: Add post to blog
prompts:
  postText: !!str
  tags:
    default: "defaultTag"
http: |+
  POST /posts HTTP/1.1
  host: {{$ baseUrl}}
  content-type: application/json
  user-agent: {{$ userAgent}}
  Authorization: Bearer {{! secretToken}}

  {"date":"2020-01-02 11:00:46 +06:00","text":"{{? postText}}","tags":"{{? tags}}"}
---
id: posts/getPostById
description: Get blog post by id
http: |+
  GET /posts/1 HTTP/1.1
  host: {{$ baseUrl}}
  accept: application/json
  user-agent: {{$ userAgent}}
  Authorization: Bearer {{! secretToken}}

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
  Authorization: Bearer {{! secretToken}}

  {"text": "Hello World!"}
---
id: posts/deletePostById
description: Delete a blog post
http: |+
  DELETE /posts/1 HTTP/1.1
  host: {{$ baseUrl}}
  user-agent: {{$ userAgent}}
  Authorization: Bearer {{! secretToken}}

---
id: user/status
description: Update user status
body: online
http: |+
  PATCH /user/status HTTP/1.1
  host: {{$ baseUrl}}
  content-type: text/plain
  user-agent: {{$ userAgent}}
  Authorization: Bearer {{! secretToken}}


```

## Document 0: Collection Information

Information about the collection as a whole.

### name

Name of the collection. Required.

### description

A summary of what the collection is and notes about usage. Optional.

### envs

A list of string env names used get variables from the data document. Required. Must have at least one env defined.

## Document 1: Data

Templating variables and secrets are defined here. Variables can be defined at the root level and within each env.

This document can't be empty and must at a minimum defined as

```yaml
---
{} # Empty object required else document is null
---
```

The validator will inform you if your data document is null.

## Documents 2..n: Requests

The remaining documents are requests in the collection.

### id

The id of the request. Must be unique within the restfile.

### description

Some information about the request.

### http

A raw HTTP message string that must include the start line e.g. `GET http://example.com HTTP/1.1`.

It's important that newlines are preserved so the use of [`|+`](https://yaml.org/spec/1.2.2/#23-scalars) is required.

### headers/body

Both `request.headers` and `request.body` allow you to define override how `request.http` is generated. The `request.headers` are merged with the existing ones in `request.http` but `request.body` overwrites the body.
