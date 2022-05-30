# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

REST request collections in a deterministic human readable/writable file format.

## Goals

- Readable/editable. Inspired by markdown.
- Self contained. Everything outside of secrets are defined in the restfile
- Source control friendly. Diffs should be easy to understand.
- DSL as flat as possible. Less mistakes and frustrations by avoid nested structures.

## Why YAML?

YAML has it's pitfalls but did have some vital features required:

- Clean multiline strings. This is required to be able to defined `request.http` in a clean readable way.
- Multiple documents in the same file. This is at the core of the restfile structure: collection, data, ...requests

## Example

See [spec](SPEC.md) for more information on the format.

## CLI

There is a very basic CLI to view and execute requests.

![restfile-init](https://user-images.githubusercontent.com/728215/159113248-f365c185-76c8-44b4-ae77-5aca955e31ae.gif)

### examples/example.restfile.yml

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

### Installation

1. Clone down this repo. This package isn't published at this time.
2. Run `npm ci`
3. Run `npm run global-install`

### Usage

Generated from the CLI help:

```
restfile <command> [args]

Commands:
  restfile show [requestId]                 Show information about a request
  restfile envs                             Show list of envs defined in
                                            restfile
  restfile execute [requestId]              Execute a request
  [promptsJson]
  restfile validate                         Validate a restfile
  restfile init <newFilePath>               Generate empty restfile

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]                                          [boolean]
```

#### Show

```bash
$ restfile -f examples/example.restfile.yml -e prod show geo
```

```
GET https://get.geojs.io/v1/ip/geo.json?ip={{? ipaddr}} HTTP/1.1
```

#### Execute

```bash
$ restfile -f examples/example.restfile.yml -e prod execute geo
# Fill In Request Prompts...
# ipaddr: 1.1.1.1
```

Output:

```
GET https://get.geojs.io/v1/ip/geo.json?ip=1.1.1.1 HTTP/1.1


HTTP/1.1 200 OK
Access-Control-Allow-Methods: GET
Access-Control-Allow-Origin: *
Connection: close
Content-Encoding: gzip
Content-Type: application/json
...

[{"continent_code":"OC","latitude":"-33.494","accuracy":1000,"organization_name":"CLOUDFLARENET","ip":"1.1.1.1","longitude":"143.2104","organization":"AS13335 CLOUDFLARENET","timezone":"Australia\/Sydney","asn":13335,"area_code":"0","country":"Australia","country_code":"AU","country_code3":"AUS"}]
```

##### With Default Prompt Values

```bash
$ restfile -f examples/example.restfile.yml -e prod execute geo
```

Output:

```
GET https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8 HTTP/1.1


Fetching: https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8
Response: 200
Body:
[{"organization_name":"GOOGLE","accuracy":1000,"asn":15169,"organization":"AS15169 GOOGLE","timezone":"America\/Chicago","longitude":"-97.822","country_code3":"USA","area_code":"0","ip":"8.8.8.8","country":"United States","continent_code":"NA","country_code":"US","latitude":"37.751"}]
```

##### Run Tests

If a request has tests defined you can run those by including the `--test` or `-t` flag.

```bash
$ restfile -f examples/example.restfile.yml -e prod execute geo --test
```

The test will check the response message to the test message and report differences. It will only check headers defined in the test request. Future versions will do the same for the presence of the body.

#### Environment Variables

CLI arguments can be passed using environment variables with this naming syntax: `RESTFILE_ARG_NAME`

```bash
$ RESTFILE_FILE_PATH="./examples/example.restfile.yml" RESTFILE_ENV="prod" restfile show ip
```
