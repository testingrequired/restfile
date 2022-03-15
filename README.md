# restfile

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

Define collections of REST requests in a deterministic file format.

See [spec](SPEC.md).

## Example

<!-- prettier-ignore -->
```yaml
name: Example Collection
description: >
  A simple collection of requests with some environment variables and prompts.

  This is a good demonstration of some basic functionality restfiles are aiming for.

  These requests are purely for demo purposes and do not work.
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
http: |+
  POST /posts HTTP/1.1
  host: {{$ baseUrl}}
  content-type: application/json
  user-agent: {{$ userAgent}}
  Authorization: Bearer {{! secretToken}}

  {"date":"2020-01-02 11:00:46 +06:00","text":"Hello World"}
---
id: posts/getPostById
description: Get blog post by id
http: |+
  GET /posts/{{? post-id 1}} HTTP/1.1
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

This will translate to:

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
  Host: http://example.com
  Accept: application/json
  Authorization: Bearer expectedToken
  User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0

---
id: posts/addPost
description: Add post to blog
http: |
  POST /posts HTTP/1.1
  Host: http://example.com
  Content-Type: application/json
  User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
  Authorization: Bearer expectedToken

  {"date":"2020-01-02 11:00:46 +06:00","text":"Hello World"}
---
id: posts/getPostById
description: Get blog post by id
http: |+
  GET /posts/1 HTTP/1.1
  Host: http://example.com
  Accept: application/json
  User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
  Authorization: Bearer expectedToken

---
id: posts/patchPostById
description: Get blog post by id
body:
  text: Hello World!!
http: |+
  PATCH /posts/1 HTTP/1.1
  Host: http://example.com
  Content-Type: application/json
  User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
  Authorization: Bearer expectedToken

  {"text":"Hello World!!"}
---
id: posts/deletePostById
description: Delete a blog post
http: |+
  DELETE /posts/1 HTTP/1.1
  Host: http://example.com
  User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
  Authorization: Bearer expectedToken

---
id: user/status
description: Update user status
body: online
http: |+
  PATCH /user/status HTTP/1.1
  Host: http://example.com
  Content-Type: text/plain
  User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0
  Authorization: Bearer expectedToken

  online

```

## CLI

There is a very basic CLI to view and execute requests.

### example.restfile.yml

<!-- prettier-ignore -->
```yaml
name: Examples
description: |
  A restfile full of examples that can be used with the CLI execute.
envs: [prod]
---
{}
---
id: ip
http: |+
  GET https://get.geojs.io/v1/ip/country.json?ip=8.8.8.8 HTTP/1.1


```

### Usage

#### Show

```bash
$ NODE_ENV=prod npm run cli -- example.restfile.yml show ip
```

```
GET https://get.geojs.io/v1/ip/country.json?ip=8.8.8.8 HTTP/1.1
```

#### Execute

```bash
$ NODE_ENV=prod npm run cli -- example.restfile.yml execute ip
```

```
Fetching: https://get.geojs.io/v1/ip/country.json?ip=8.8.8.8
Response: 200
Body:
[{"country":"US","country_3":"USA","ip":"8.8.8.8","name":"United States"}]
```
