# restfile spec

This document will outline the goals, general format as well as the templating logic (e.g. variables, secrets, prompts) of restfiles.

## Goals

- Easy to read and write. Inspired by markdown.
- Explicit. Variables, secrets and prompts must be declared before usage.
- Source control friendly. Diffs should be easy to understand.
- DSL as flat as possible. Less mistakes and frustrations by avoid nested structures.

## Why YAML?

YAML has it's pitfalls but did have some vital features required:

- Clean multiline strings. This is required to be able to defined `request.http` in a clean readable way.
- Multiple documents in the same file. This is at the core of the restfile structure: collection, data, ...requests

## Format

A restfile is a multi-document YAML file following this document structure:

1. Collection Information (name, description, environments)
2. Data (variables, secrets)
3. First Request
4. Second Request
5. ...

```YAML
# Collection Information
name: Example
description: A simple restfile for demonstration purposes
envs: []
---
# Data
baseUrl: https://webhook.site/f4cae200-3d96-4ed7-8be9-dea2789c53f4
---
id: first-request
http: |+
  POST {{$ baseUrl}} HTTP/1.1

  first request body

---
id: second-request
http: |+
  POST {{$ baseUrl}} HTTP/1.1

  second request body

---
id: third-request
http: |+
  POST {{$ baseUrl}} HTTP/1.1

  third request body

```

### Collection Information

Information about the collection as a whole.

#### name

Name of the collection. Required.

#### description

A summary of what the collection is and notes about usage. Optional.

#### envs

A list of string env names used get variables from the data document. Required. Must have at least one env defined.

### Data

Templating variables and secrets are defined here. Variables can be defined at the root level and within each env.

This document can't be empty and must at a minimum defined as

```yaml
---
{} # Empty object required else document is null
---
```

### Requests

The remaining documents are requests in the collection.

#### id

The id of the request. Must be unique within the restfile.

#### description

Some information about the request.

#### http

A raw HTTP message string that must include the start line e.g. `GET http://example.com HTTP/1.1`.

It's important that newlines are preserved so the use of [`|+`](https://yaml.org/spec/1.2.2/#23-scalars) is required.

#### headers/body

Both `request.headers` and `request.body` allow you to define override how `request.http` is generated. The `request.headers` are merged with the existing ones in `request.http` but `request.body` overwrites the body.

## Templating

Templating can be used in restfiles to reference variables, secrets and values from prompts.

### Variables

Variables are defined in the `data` document can be accessed using `{{$ variable}}` e.g. `{{$ baseUrl}}`.

### Secrets

Secrets are defined (without a value) in the `data` document as well and can be accessed using `{{! variable}}` e.g. `{{! baseUrl}}`. These will be provided at runtime by the client implementation.

### Prompts

Prompts are defined in each `request` and use the `{{? prompt}}` syntax e.g. `{{? id}}`.
