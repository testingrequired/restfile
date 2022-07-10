# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

restfile is a specification for storing REST requests in an easy to read and write file format.

## Features

- Easy to read and write
- Easy to diff for source control
- Templating such as [variables](#variables) with [environment](#environments) based values, [prompt/input](#prompts) data, and [secrets](#secrets)

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

### Data

The `data` document is the second document. It allows you to define variables and secrets to template into requests.

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
prompts:
  query: !!str
http: |+
  GET https://example.com HTTP/1.1
  Authorization: Bearer {{! token}}


```

### Requests

All remaining documents in the restfile are request doucments. Requests require both an `id`, and `http` request string at a minimum.

<!-- prettier-ignore -->
```yaml
name: Example Request
description: Show what a bare but complete restfile and request look like
envs: []
---

---
id: ip
http: |+
  GET https://get.geojs.io/v1/ip.json HTTP/1.1

```

#### Templating

Templating allows variables, secrets, prompts to be used in request `http` strings: `{{$ varName}}`, `{{! secretName}}`, `{{? promptName}}`

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
