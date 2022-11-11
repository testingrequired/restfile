# Reference Implementation

restfile is a specification open to implementation in any programming language. The reference implementation library and CLI are written in javascript.

## Installation

1. Clone down this repo. This package isn't published at this time.
2. Run `npm ci`

## Library

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

### Installation

1. Run `npm run global-install` (optional)

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

### Passing Secrets & Prompts as CLI arguments 

You can pass prompt (`-prompts`/`-p`) and secret (`-secrets`/`-s`) data as arguments to the CLI to avoid being prompted for them when running a request.

```bash
$ restfile run restfile.yml get-user-by-id -s.someSecret "f4n2..." -p.userId "user1f..."
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
