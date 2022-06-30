import {
  HttpZBody,
  HttpZHeader,
  HttpZParam,
  HttpZRequestModel,
  HttpZResponseModel,
} from "http-z";
import { buildHttp, parseHttp } from ".";
import fetch, { Response } from "node-fetch";
import { sortObject } from "./utils";
import expect from "expect";
import { RestfileRequest } from "./new_interface";

export function executeRequest(request: RestfileRequest): Promise<Response> {
  const httpObj = parseHttp<HttpZRequestModel>(request.http);

  return fetch(httpObj.target, {
    method: httpObj.method,
    body: mapBodyForFetch(httpObj),
    headers: mapHeadersForFetch(httpObj),
  });
}

function mapBodyForFetch(httpObj: HttpZRequestModel) {
  if (!httpObj.body) {
    return undefined;
  }

  if (httpObj.body.contentType === "application/x-www-form-urlencoded") {
    const formData = new URLSearchParams();

    for (const param of httpObj.body.params as HttpZParam[]) {
      formData.append(param.name, param.value);
    }

    return formData;
  } else {
    return httpObj.body.text;
  }
}

function mapHeadersForFetch(httpObj) {
  return httpObj.headers.reduce((acc, { name, value }) => {
    return { ...acc, [name]: value };
  }, {});
}

export function runRequestTests(
  request: RestfileRequest,
  httpResponseString: string
): Record<string, Error> {
  const httpModel = parseHttp<HttpZResponseModel>(httpResponseString);

  const testErrors: Record<string, Error> = {};

  for (let [testId, testHttpString] of Object.entries(request.tests)) {
    const testHttpModel = parseHttp<HttpZResponseModel>(testHttpString);

    httpModel.headers = httpModel.headers.filter((httpHeader) => {
      return testHttpModel.headers.map((x) => x.name).includes(httpHeader.name);
    });

    if (httpModel.body?.contentType === "application/json") {
      httpModel.body.text = JSON.stringify(
        sortObject(JSON.parse(httpModel.body.text)),
        null,
        2
      );
      testHttpModel.body.text = JSON.stringify(
        sortObject(JSON.parse(testHttpModel.body.text)),
        null,
        2
      );

      testHttpString = buildHttp<HttpZResponseModel>(testHttpModel);
    }

    const httpModelString = buildHttp<HttpZResponseModel>(httpModel);

    try {
      expect(httpModelString).toEqual(testHttpString);
    } catch (e) {
      testErrors[testId] = e;
    }

    return testErrors;
  }
}

export async function mapFetchResponseToHTTPResponseString(
  response: Response,
  responseBody: string
): Promise<string> {
  const headers: HttpZHeader[] = [];

  for (const [name, value] of response.headers.entries()) {
    headers.push({ name, value });
  }

  const body: HttpZBody = {
    contentType: response.headers.get("content-type"),
    text: responseBody,
    boundary: "",
    params: [],
  };

  let httpModel: HttpZResponseModel = {
    protocolVersion: "HTTP/1.1",
    statusCode: response.status,
    statusMessage: response.statusText,
    body,
    headers,
    headersSize: new TextEncoder().encode(JSON.stringify(headers)).length,
    bodySize: new TextEncoder().encode(responseBody).length,
  };

  const httpString = buildHttp<HttpZResponseModel>(httpModel);

  return httpString;
}
