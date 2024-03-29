# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

restfile is a specification for storing HTTP requests in an easy to read and write file format.

## Features

- HTTP request messages as [requests](#requests)
- HTTP response messages as [tests](#tests)
- [Templating](#templating) in [requests](#requests) with [variables](#environmental-data), [prompts](#prompts), [secrets](#secrets), and [references](#references)

## Goals

- Easy to read, write
- Flatter structure
- Limited templating syntax
- Diff friendly

## Format

A restfile is a [multi-document](https://yaml.org/spec/1.2.1/#marker/directives%20end/) [YAML](https://yaml.org/) file.

<!-- prettier-ignore -->
```yaml
# Information Document

name: Example User API
description: Descriptions are optional but helpful.
envs: [local, prod]
---
# Data Document

baseUrl: !!str #Variable
secretAccessToken!: !!str #Secret

# Environmental Values
local:
  baseUrl: http://localhost
prod:
  baseUrl: https://api.insertcompanyname.com
---
# Request Document
id: get-users
description: Get all users
http: |+
  GET {{$ baseUrl}}/users HTTP/1.1
  Authorization: Bearer {{! secretAccessToken}}


---
# Request Document
id: get-user-by-id
description: Get user by id
prompts:
  userId: !!str
http: |+
  GET {{$ baseUrl}}/users/{{? userId}} HTTP/1.1
  Authorization: Bearer {{! secretAccessToken}}


---
# Addition Request Documents...
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

<!-- prettier-ignore -->
```yaml
name: Example User API
description: Descriptions are optional but helpful.
envs: [local, prod]
```

### Data

The `data` document is the second document. It allows you to define variables and [secrets](#secrets) available for templating in requests.

```typescript
type DataDocument = Record<string, unknown>;
```

<!-- prettier-ignore -->
```yaml
baseUrl: http://localhost
userId: 99

secretAccessToken!: !!str
```

#### Environmental Data

Variables can also be assigned enviroment based values.

<!-- prettier-ignore -->
```yaml
# Information Document

name: Data Example
envs: [local, prod]
---
# Data Document

baseUrl: !!str # You can also use an empty string e.g. ""

local:
  baseUrl: http://localhost
prod:
  baseUrl: http://example.com
---
```

Environment name keys defining variable values but be defined in the environment names `envs` in the `information` document. Otherwise this will cause validation errors.

<!-- prettier-ignore -->
```yaml
name: Data Example
envs: [local, prod]
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

Variables referenced in environment based values must be defined at the root of the `data` document. Otherwise this will cause validation errors.

<!-- prettier-ignore -->
```yaml
name: Data Example
envs: [local, prod]
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

Secrets `{{! secretName}}` are variables that are populated at runtime. They must be defined in the `data` document with a name appended with `!` e.g. `token!` in data, `{{! token}}` while templating

<!-- prettier-ignore -->
```yaml
name: Secrets Example
envs: []
---
token!: !!str
---
id: example
http: |+
  GET https://example.com HTTP/1.1
  Authorization: Bearer {{! token}}


```

The difference from prompts is that secrets aren't provided by the user but programatically e.g. AWS Secrets Manager.

### Requests

All remaining documents in the restfile are request doucments.

```typescript
interface RequestDocument {
  id: string;
  description?: string;
  auth: Record<string, string>;
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

The `request.http` value must be a valid HTTP request message or an error will be thrown during request execution. It's particularly sensitive around newlines after the headers and body.

As part of the spec these requirements should be looser allowing for requests like this:

<!-- prettier-ignore -->
```yaml
name: Example
envs: []
---

---
# Example Request
id: get-ip
# This will error currently because of the lack of newlines
http: GET https://get.geojs.io/v1/ip.json HTTP/1.1
```

#### Prompts

Prompts are values inputed by the user when the request runs.

- Prompts referenced in `request.http` must be defined in `request.prompts`
- Prompts defined in `request.prompts` must also be referenced in `request.http`

Otherwise this will cause validation errors.

<!-- prettier-ignore -->
```yaml
name: Prompts Example
envs: []
---

---
id: example
prompts:
  token: !!str
http: |+
  GET https://example.com HTTP/1.1
  Authorization: Bearer {{? token}}


```

#### References

In addition to variables, secrets and prompts request templating also provides *references*: `{{@ path.to.ref}}` References are values not provided by the user but to them. See [Auth](#auth) below for an example.

#### Auth

Authentication (e.g. OAuth2, Basic Auth) defines how a request sends it's credentials if any are sent. Currently the only auth type supported is `oauth2` and the only grant type supported is `client`.

The access token is available through a template reference `{{@ auth.token}}`.

<!-- prettier-ignore -->
```yaml
name: Auth example
envs: []
---
# Secrets
clientSecret!:

# Variables
baseUrl: https://example.com
accessTokenUri: https://example.com/v1/token
clientId: exampleClientKey
---
id: get-item-by-id
auth:
  type: oauth2
  grant: client
  accessTokenUri: "{{$ accessTokenUri}}"
  clientId: "{{$ clientId}}"
  clientSecret: "{{! clientSecret}}"
  scopes: profile
prompts:
  itemId:
    default: 123456
http: |+
  GET {{$ baseUrl}}/items/{{? itemId}} HTTP/1.1
  accept: application/json
  authorization: Bearer {{@ auth.token}}
```

#### Templating

Templating allows variables, secrets, prompts to be used in `request.http`: `{{$ varName}}`, `{{! secretName}}`, `{{? promptName}}`, `{{@ refs}}`

<!-- prettier-ignore -->
```yaml
name: Templating Example
envs: []
---
baseUrl: http://example.com/
---
id: ip
http: |+
  GET {{$ baseUrl}} HTTP/1.1


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
  GET {{$ baseUrl}} HTTP/1.1

tests:
  shouldBeOk: |+
    HTTP/1.1 200 OK


```

### Why YAML

YAML has a number of key features that aligned with the goals of the spec.

#### Multi Document Files

Having the multiple document format allows for flatter structure and syntax. Less indentation should make it easier to write and less prone to syntax errors.

#### Multiline String Support

Writing HTTP request and response message strings is at the core of this idea. While other formats support multiline strings they were combersome for writing HTTP message strings. Using YAML's `|+` this becomes much easier depspite other tradeoffs YAML has.

## Implementations?

The focus is on a format that could and will have implementations written in many languages.

There is also a [reference implementation](IMPLEMENTATIONS.md) written in javascript to help test the spec as it's developed.
