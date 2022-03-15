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
