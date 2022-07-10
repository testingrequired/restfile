# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

restfile is a specification for storing REST requests in an easy to read and write file format.

## Features

- Easy to read, write & diff
- HTTP request messages as [requests](#requests)
- HTTP response messages as [tests](#tests)
- [Templating](#templating) such as variables with [environment](#environmental-data) based values, [prompt]() values, and [secrets](#secrets)

## Format

A restfile is a [multi-document](https://yaml.org/spec/1.2.1/#marker/directives%20end/) [YAML](https://yaml.org/) file.

<!-- prettier-ignore -->
```yaml
# Information Document
name: Bare Example
description: Descriptions are optional but helpful.
envs: [local, prod]
---
# Data Document
baseUrl: !!str

local:
  baseUrl: http://localhost
prod:
  baseUrl: http://example.com
---
# Request Document/s
...
```

### Information

The `information` document is the first document in the restfile. It's required and defines the `name`, `description` and a list of enviroment names `envs`.

```typescript
interface InformationDocument {
  name: string;
  description?: string;
  envs: string[];
}
```

### Data

The `data` document is the second document.

```typescript
type DataDocument = Record<string, unknown>;
```

It allows you to define variables and secrets to template into requests.

<!-- prettier-ignore -->
```yaml
name: Data Example
envs: []
---
baseUrl: http://example.com
---
```

#### Environmental Data

Variables can also be assigned enviroment based values.

<!-- prettier-ignore -->
```yaml
name: Data Example
envs: []
---
baseUrl: !!str

local:
  baseUrl: http://localhost
prod:
  baseUrl: http://example.com
---
```

Environment name keys defining variable values but be defined in the environment names `envs` in the `infomation` document. This will cause validation errors otherwise.

<!-- prettier-ignore -->
```yaml
name: Data Example
envs: []
---
baseUrl: !!str

local:
  baseUrl: http://localhost
prod:
  baseUrl: http://example.com
invalidEnv:
  baseUrl: "This will cause validation errors"
---
```

Variables referenced in environment based values must be defined at the root of the `data` document. This will cause validation errors otherwise.

<!-- prettier-ignore -->
```yaml
name: Data Example
envs: []
---
baseUrl: !!str

local:
  baseUrl: http://localhost
  invalidVariable: "This will cause validation errors"
prod:
  baseUrl: http://example.com
---
```

#### Secrets

Secrets are variables that are populated at runtime. The difference from prompts is that secrets aren't provided by the user but programatically e.g. AWS Secrets Manager.

<!-- prettier-ignore -->
```yaml
name: Secrets Example
envs: []]
---
token!: !!str

---
id: example
http: |+
  GET https://example.com HTTP/1.1
  Authorization: Bearer {{! token}}


```

### Requests

All remaining documents in the restfile are request doucments.

```typescript
interface RequestDocument {
  id: string;
  description?: string;
  prompts?: Record<string, string | { default: string }>;
  http: string;
  tests?: Record<string, string>;
}
```

Requests require both an `id`, and `http` request string at a minimum.

<!-- prettier-ignore -->
```yaml
name: Example
description: Show what a bare but complete restfile and request look like
envs: []
---

---
# Example Request
id: get-ip
http: |+
  GET https://get.geojs.io/v1/ip.json HTTP/1.1

```

#### Prompts

Prompts are values inputed by the user when the request runs. Prompts referenced in `request.http` must be defined in `request.prompts`. Prompts defined in `request.prompts` must also be referenced in `request.http`. This will cause validation errors otherwise.

<!-- prettier-ignore -->
```yaml
name: Prompts Example
envs: []]
---

---
id: example
prompts:
  token: !!str
http: |+
  GET https://example.com HTTP/1.1
  Authorization: Bearer {{? token}}


```

#### Templating

Templating allows variables, secrets, prompts to be used in `request.http`: `{{$ varName}}`, `{{! secretName}}`, `{{? promptName}}`

<!-- prettier-ignore -->
```yaml
name: Templating Example
envs: []
---
baseUrl: http://example.com/
---
id: ip
http: |+
  GET {{$baseUrl}} HTTP/1.1

```

#### Tests

Tests are expected HTTP response message strings. Actual assertion logic for tests needs to be defined. The reference implementation will check protocol version, status code, status message and body for equality. Headers that are defined in the test are tested. Headers in the actual response not found in the test are ignored.

<!-- prettier-ignore -->
```yaml
name: Testing Example
envs: []
---
baseUrl: http://example.com/
---
id: ip
http: |+
  GET {{$baseUrl}} HTTP/1.1

tests:
  shouldBeOk: |+
    HTTP/1.1 200 OK

```

### Why YAML

YAML has a number of key features that aligned with the goals of the spec.

#### Multi Document Files

Having the multiple document format allows for flatter

#### Multiline String Support

Writing HTTP request and response message strings is at the core of this idea. While other formats support multiline strings they were combersome for writing HTTP message strings. Using YAML's `|+` this becomes much easier depspite other tradeoffs YAML has.

## Implementation?

The focus is on a format that could and will have implementations written in many languages.
