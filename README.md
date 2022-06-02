# 💤📄 _restfile_

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

REST request collections in a deterministic human readable/writable file format.

## Spec

See [SPEC.md](SPEC.md) for details on restfile structure, prompts, and templating.

### Example

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

### Executing A Request

```bash
$ restfile -e prod examples/example.restfile.yml geo
# Fill In Request Prompts...
# ipaddr: 1.1.1.1
```

![restfile-init](https://user-images.githubusercontent.com/728215/159113248-f365c185-76c8-44b4-ae77-5aca955e31ae.gif)

#### Tests

If a request has tests defined you can run those by including the `--test` or `-t` flag.

```bash
$ restfile -e prod examples/example.restfile.yml geo --test
```

The test will check the response message to the test message and report differences. It will only check headers defined in the test request. Future versions will do the same for the presence of the body.

#### Dry Run

Display the request but don't execute it. Tests are also not ran.
