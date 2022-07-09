# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

A collection of REST requests in a file format designed to be easy to read/write.

## Goals

- Easy to read and write. Inspired by markdown.
- Writing REST request strings versus a request object
- Explicit. Variables, secrets and prompts must be declared before usage.
- Source control friendly. Diffs should be easy to understand.
- DSL as flat as possible. Less mistakes and frustrations by avoid nested structures.

## Features

- [Variables](#variables)
- [Environments](#environments)
- [Prompts](#prompts)
- [Secrets](#secrets)
- Templating

### Variables

Variables are values that can be used in `request.http` using the templating syntax `{{$ variable}}`

<!-- prettier-ignore -->
```yaml
name: Variables Example
envs: []
---
baseUrl: https://example.com
---
id: example
http: |+
  GET {{$ baseUrl}} HTTP/1.1


```

### Environments

Environments allow variables to be defined with environmental values. The variable must still be defined at the root level to be used in an environment.

<!-- prettier-ignore -->
```yaml
name: Environmental Variables Example
envs: [local, prod]
---
baseUrl: !!str

local:
  baseUrl: http://localhost:8080
prod:
  baseUrl: https://example.com
---
id: example
http: |+
  GET {{$ baseUrl}} HTTP/1.1


```

### Prompts

Prompts are values expected to be supplied at request time. Prompts must be defined in `request.prompts` and used in `request.http`. The templating syntax is `{{? prompt}}`.

<!-- prettier-ignore -->
```yaml
name: Prompts Example
envs: [local, prod]
---
baseUrl: !!str

local:
  baseUrl: http://localhost:8080
prod:
  baseUrl: https://example.com
---
id: example
prompts:
  query: !!str
http: |+
  GET {{$ baseUrl}}?q={{? query}} HTTP/1.1


```

### Secrets

Secrets are variables that are populated at runtime. The difference from prompts is that secrets aren't provided by the user but programatically e.g. AWS Secrets Manager.

Secrets are defined as variables using this syntax `secretVar!: !!str` (the `!` at the end is required) and the templating syntax is `{{! secretVar}}`.

<!-- prettier-ignore -->
```yaml
name: Prompts Example
envs: [local, prod]
---
baseUrl: !!str
token!: !!str

local:
  baseUrl: http://localhost:8080
prod:
  baseUrl: https://example.com
---
id: example
prompts:
  query: !!str
http: |+
  GET {{$ baseUrl}}?q={{? query}} HTTP/1.1
  Authorization: Bearer {{! token}}


```

## Format

A restfile is a multi-document YAML file with documents defining information about [collection](#collection), [data](#data) and [requests](#requests).

### Collection

The `collection` document defines the `name`, `description` and a list of `env` names.

<!-- prettier-ignore -->
```yaml
# Collection
name: Example
description: Example restfile to demonstrate the format
envs: []
---
# Data
---
# Requests
```

### Data

The `data` document defines [variables](#variables) and [secrets](#secrets) to be used in templating [requests](#requests).

<!-- prettier-ignore -->
```yaml
# Collection
name: Example
description: Example restfile to demonstrate the format
envs: []
---
# Data
baseUrl: https://example.com
token!: !!str
---
# Requests
```

### Requests

The rest of the documents are `requests`. Each request requires an `id` and the request defined in `request.http`. Requests can also have a `description` and [prompts](#prompts).

<!-- prettier-ignore -->
```yaml
# Collection
name: Example
description: Example restfile to demonstrate the format
envs: []
---
# Data
baseUrl: https://example.com
token!: !!str
---
# Request 1
id: example-get
http: |+
  GET {{$ baseUrl}} HTTP/1.1
  Authorization: Bearer {{! token}}

---
# Request 2
id: example-post
prompts:
  title: !!str
  url: !!str
http: |+
  POST {{$ baseUrl}} HTTP/1.1
  Authorization: Bearer {{! token}}

  {"title":"{{? title}}","url":"{{? url}}"}

```

## Example

See [SPEC.md](SPEC.md) for full details around structure, prompts, and templating.

<!-- prettier-ignore -->
```yaml
name: Examples
description: |
  A restfile full of examples that can be used with the CLI execute.
envs: [prod]
---
baseUrl: https://get.geojs.io/v1
---
id: ip
http: |+
  GET {{$ baseUrl}}/ip.json HTTP/1.1

---
id: geo
prompts:
  ipaddr:
    default: 8.8.8.8
http: |+
  GET {{$ baseUrl}}/ip/geo.json?ip={{? ipaddr}} HTTP/1.1

tests:
  shouldBeOk: |+
    HTTP/1.1 200 OK
    Access-Control-Allow-Methods: GET
    Access-Control-Allow-Origin: *
    Content-Type: application/json

    [{"organization":"AS15169 GOOGLE","organization_name":"GOOGLE","asn":15169,"area_code":"0","country_code":"US","country_code3":"USA","continent_code":"NA","ip":"8.8.8.8","latitude":"37.751","longitude":"-97.822","accuracy":1000,"country":"United States","timezone":"America\/Chicago"}]

```

## Types

### Input Restfile

```typescript
/**
 * Information about the restfile. Name, description, what environments exist
 */
interface RestfileInfoDocument {
  name: string;
  description?: string;
  envs: string[];
}

/**
 * Input variables (shared and environment) and secrets used in requests
 */
type RestfileDataDocument = Record<string, unknown>;

type RestfileRequestPrompt = {
  default: string;
};

/**
 * An individual REST request
 *
 * Variable, secret and prompt placeholders are present.
 */
interface RestfileRequestDocument {
  id: string;
  description?: string;
  prompts?: Record<string, string | { default: string }>;
  headers?: Record<string, string>;
  body?: Record<string, any> | string;
  http: string;
  tests?: Record<string, string>;
}

/**
 * The format of the input YAML file
 *
 * It's a tuple of the info document, data document, and the remaining
 * documents being requests.
 */
type InputRestfile = [
  RestfileInfoDocument,
  RestfileDataDocument,
  ...RestfileRequestDocument[]
];
```

### Parsed Restfile

```typescript
interface Restfile {
  name: string;
  description: string;
  envs: string[];
  env: string;
  data: Record<string, unknown>;
  requestIds: string[];

  new (
    inputRestfile: InputRestfile,
    env?: string,
    secretData?: Record<string, string>
  ): Restfile;

  request(id: string, promptData?: Record<string, string>): RestfileRequest;
}
```

## Reference Implementation

This repository also contains the reference implementation (written in javascript) for parsing restfiles.

### Installation

1. Clone down this repo. This package isn't published at this time.
2. Run `npm ci`

### Usage

```typescript
import {
  InputRestfile,
  Restfile,
  executeRequest,
} from "@testingrequired/restfile";

let inputRestfile: InputRestfile;

try {
  inputRestfile = await Restfile.load("...");
} catch (e) {
  console.log(`Error loading restfile: ${e.message}`);
  return;
}

const env = "local";

const secretData = {
  secretToken: "secretToken",
};

const restfile = Restfile.parse(inputRestfile, env, secretData);

const request = restfile.request(requestId);

const response = await executeRequest(request);
```

## CLI

The CLI is an example implementation of a restfile client and a consumer of the reference implementation.

### Installation

1. Clone down this repo. This package isn't published at this time.
2. Run `npm ci`
3. Run `npm run global-install`

### Create New Restfile

```bash
$ restfile init ./new.restfile.yml
# Fill in name, description, env names...
```

### Running A Request

```bash
$ restfile run examples/example.restfile.yml geo

GET https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8&junkText=test HTTP/1.1


HTTP/1.1 200 OK
Access-Control-Allow-Methods: GET
Access-Control-Allow-Origin: *
Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0
Connection: close
Content-Encoding: gzip
Content-Type: application/json
Date: Thu, 16 Jun 2022 23:37:22 GMT
Server: cloudflare
Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
Transfer-Encoding: chunked
X-Content-Type-Options: nosniff

[{"country_code3":"USA","continent_code":"NA","latitude":"37.751","longitude":"-97.822","accuracy":1000,"organization_name":"GOOGLE","timezone":"America\/Chicago","asn":15169,"organization":"AS15169 GOOGLE","country_code":"US","area_code":"0","ip":"8.8.8.8","country":"United States"}]
```

#### Tests

If a request has tests defined you can run those by including the `--test` or `-t` flag. It will display a diff between the test's expected response and the actual response.

```bash
$ restfile run examples/example.restfile.yml geo --test

HTTP/1.1 200 OK
Access-Control-Allow-Methods: GET
Access-Control-Allow-Origin: *
Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0
Connection: close
Content-Encoding: gzip
Content-Type: application/json
Date: Thu, 16 Jun 2022 23:39:31 GMT
Server: cloudflare
Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
Transfer-Encoding: chunked
X-Content-Type-Options: nosniff

[{"country_code3":"AUS","continent_code":"OC","latitude":"-33.494","longitude":"143.2104","accuracy":1000,"organization_name":"CLOUDFLARENET","timezone":"Australia\/Sydney","asn":13335,"organization":"AS13335 CLOUDFLARENET","country_code":"AU","area_code":"0","ip":"1.1.1.1","country":"Australia"}]

Test Errors:

shouldBeOk: expect(received).toEqual(expected) // deep equality

- Expected  - 11
+ Received  + 11

  HTTP/1.1 200 OK
  Access-Control-Allow-Methods: GET
  Access-Control-Allow-Origin: *
  Content-Type: application/json

  [
    {
      "accuracy": 1000,
      "area_code": "0",
-     "asn": 15169,
+     "asn": 13335,
-     "continent_code": "NA",
+     "continent_code": "OC",
-     "country": "United States",
+     "country": "Australia",
-     "country_code": "US",
+     "country_code": "AU",
-     "country_code3": "USA",
+     "country_code3": "AUS",
-     "ip": "8.8.8.8",
+     "ip": "1.1.1.1",
-     "latitude": "37.751",
+     "latitude": "-33.494",
-     "longitude": "-97.822",
+     "longitude": "143.2104",
-     "organization": "AS15169 GOOGLE",
+     "organization": "AS13335 CLOUDFLARENET",
-     "organization_name": "GOOGLE",
+     "organization_name": "CLOUDFLARENET",
-     "timezone": "America/Chicago"
+     "timezone": "Australia/Sydney"
    }
  ]
```

The test will check the response message to the test message and report differences. It will only check headers defined in the test request. Future versions will do the same for the presence of the body.

#### Dry Run

The dry run flag (`--dry`, `-d`) will display the request but will not execute it or it's tests.

```bash
$ restfile run -e prod examples/example.restfile.yml geo --dry

GET https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8&junkText=test HTTP/1.1
```

### Repl

The repl lets you run requests and interact with requests/responses in a dynamic way.

```bash
$ restfile repl examples/example.restfile.yml

Loading repl for examples/example.restfile.yml

> await run(requests.ip);
> responseBody;
{ ip: '173.16.197.170' }
> await run(requests.geo, {ipaddr: responseBody.ip});
> responseBody[0].country;
'United States'
```

![restfile-repl2](https://user-images.githubusercontent.com/728215/174259388-ecd4198a-fbeb-4461-a00d-41153fc438dd.gif)

#### Functions

| Function                                                                         | Description                                                                | Example                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| `run(request: RestfileRequest, prompts?: Record<string, string>): Promise<void>` | Run a request                                                              | `await run(requests.geo, {ipaddr:"1.1.1.1"})` |
| `tests(): boolean`                                                               | Run tests against last request ran. Returns tests pass or fail as boolean. | `tests()`                                     |

#### Variables

| Variable             | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `requests`           | An object of the requests from the `restfile` with the request ids as keys e.g. `requests.ip`    |
| `request`            | An object representing the last request made (`undefined` if no requests made)                   |
| `requestString`      | The raw HTTP request string from the last request made (`undefined` if no requests made)         |
| `response`           | An object representing the response from the last request made (`undefined` if no requests made) |
| `responseString`     | The raw HTTP response string from the last request made (`undefined` if no requests made)        |
| `responseBody`       | An object from the parsed response body of the last request (`undefined` if no requests made)    |
| `responseBodyString` | The string response body of the last request (`undefined` if no requests made)                   |
