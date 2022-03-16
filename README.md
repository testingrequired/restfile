# restfile

[![restfile](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/restfile-ts/actions/workflows/ci.yml)

Define collections of REST requests in a deterministic file format.

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
  GET https://get.geojs.io/v1/ip.json HTTP/1.1

---
id: geo
prompts:
  ipaddr:
    default: 8.8.8.8
http: |+
  GET https://get.geojs.io/v1/ip/geo.json?ip={{? ipaddr}} HTTP/1.1


```

### Usage

#### Show

```bash
$ NODE_ENV=prod npm run cli -- example.restfile.yml show geo
```

```
GET https://get.geojs.io/v1/ip/geo.json?ip={{? ipaddr}} HTTP/1.1
```

#### Execute

```bash
$ NODE_ENV=prod npm run cli -- example.restfile.yml execute geo '{\"ipaddr\":\"1.1.1.1\"}'
```

```
GET https://get.geojs.io/v1/ip/geo.json?ip=1.1.1.1 HTTP/1.1


Fetching: https://get.geojs.io/v1/ip/geo.json?ip=1.1.1.1
Response: 200
Body:
[{"organization_name":"CLOUDFLARENET","accuracy":1000,"asn":13335,"organization":"AS13335 CLOUDFLARENET","timezone":"Australia\/Sydney","longitude":"143.2104","country_code3":"AUS","area_code":"0","ip":"1.1.1.1","country":"Australia","continent_code":"OC","country_code":"AU","latitude":"-33.494"}]
```

##### With Default Prompt Values

```bash
$ NODE_ENV=prod npm run cli -- example.restfile.yml execute geo
```

```
GET https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8 HTTP/1.1


Fetching: https://get.geojs.io/v1/ip/geo.json?ip=8.8.8.8
Response: 200
Body:
[{"organization_name":"GOOGLE","accuracy":1000,"asn":15169,"organization":"AS15169 GOOGLE","timezone":"America\/Chicago","longitude":"-97.822","country_code3":"USA","area_code":"0","ip":"8.8.8.8","country":"United States","continent_code":"NA","country_code":"US","latitude":"37.751"}]
```
