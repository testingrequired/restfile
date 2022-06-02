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

![restfile](https://user-images.githubusercontent.com/728215/171736440-29ef2be6-c3d0-44ca-8d42-41b1ad3ba9e0.gif)

#### Tests

If a request has tests defined you can run those by including the `--test` or `-t` flag. It will display a diff between the test's expected response and the actual response.

```bash
$ restfile -e prod examples/example.restfile.yml geo --test
```

![restfile-test](https://user-images.githubusercontent.com/728215/171737072-e822248b-24e5-473a-94ae-dcd994b1add1.gif)

The test will check the response message to the test message and report differences. It will only check headers defined in the test request. Future versions will do the same for the presence of the body.

#### Dry Run

Display the request but don't execute it. Tests are also not ran.
