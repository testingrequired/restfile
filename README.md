# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

A collection of REST requests in a file format designed to be deterministic and easy to read/write.

## Goals

- Easy to read and write. Inspired by markdown.
- Writing REST request strings versus a request object
- Explicit. Variables, secrets and prompts must be declared before usage.
- Source control friendly. Diffs should be easy to understand.
- DSL as flat as possible. Less mistakes and frustrations by avoid nested structures.

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

## CLI

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

# GET https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8&junkText=test HTTP/1.1


# HTTP/1.1 200 OK
# Access-Control-Allow-Methods: GET
# Access-Control-Allow-Origin: *
# Alt-Svc: h3=":443"; ma=86400, h3-29=":443"; ma=86400
# Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0
# Cf-Cache-Status: DYNAMIC
# Cf-Ray: 71c75f7d78412998-ORD
# Connection: close
# Content-Encoding: gzip
# Content-Type: application/json
# Date: Thu, 16 Jun 2022 23:37:22 GMT
# Expect-Ct: max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"
# Nel: {"success_fraction":0,"report_to":"cf-nel","max_age":604800}
# Pragma: no-cache
# Report-To: {"endpoints":[{"url":"https:\/\/a.nel.cloudflare.com\/report\/v3?s=%2BHW19o6aAHkmHy9gDdpIliVkYY%2FYsfM2ZkWvvHHIyyLS6KsNfQvUy1BQtkhfyYYh6HJlL6AexKEHCvWs4a0PJp5ZPhLvjejEyOcVcTi8LbhjAbgHCwkhID24waepYw%3D%3D"}],"group":"cf-nel","max_age":604800}
# Server: cloudflare
# Strict-Transport-Security: max-age=15552000; includeSubDomains; preload
# Transfer-Encoding: chunked
# X-Content-Type-Options: nosniff
# X-Geojs-Location: NYC
# X-Request-Id: 1579acfd7854eeaf9f1543ec7a3cef66-NYC

# [{"country_code3":"USA","continent_code":"NA","latitude":"37.751","longitude":"-97.822","accuracy":1000,"organization_name":"GOOGLE","timezone":"America\/Chicago","asn":15169,"organization":"AS15169 GOOGLE","country_code":"US","area_code":"0","ip":"8.8.8.8","country":"United States"}]
```

#### Tests

If a request has tests defined you can run those by including the `--test` or `-t` flag. It will display a diff between the test's expected response and the actual response.

```bash
$ restfile run examples/example.restfile.yml geo --test
```

The test will check the response message to the test message and report differences. It will only check headers defined in the test request. Future versions will do the same for the presence of the body.

#### Dry Run

The dry run flag (`--dry`, `-d`) will display the request but will not execute it or it's tests.

```bash
$ restfile run -e prod examples/example.restfile.yml geo --dry
```

### Repl

The repl lets you run requests and interact with requests/responses in a dynamic way.

```bash
$ restfile repl examples/example.restfile.yml

Loading repl for examples/example.restfile.yml

> await run(requests.ip);
> responseBody;
# { ip: '173.16.197.170' }
> await run(requests.geo, {ipaddr: responseBody.ip});
> responseBody[0].country;
# 'United States'
```

#### Functions

| Function | Description   | Example                  |
| -------- | ------------- | ------------------------ |
| `run`    | Run a request | `await run(requests.ip)` |

#### Variables

| Variable             | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `restfile`           | The parsed restfile e.g. collection, data and requests                                        |
| `restfilePath`       | Path to the parsed restfile                                                                   |
| `restfileRequest`    | An object representing the restfile request of the last request made                          |
| `requests`           | An object of the requests from the `restfile` with the request ids as keys e.g. `requests.ip` |
| `request`            | An object representing the last request made                                                  |
| `requestString`      | The raw HTTP request string from the last request made                                        |
| `response`           | An object representing the response from the last request made                                |
| `responseString`     | The raw HTTP response string from the last request made                                       |
| `responseBody`       | An object from the parsed response body of the last request                                   |
| `responseBodyString` | The string response body of the last request                                                  |
