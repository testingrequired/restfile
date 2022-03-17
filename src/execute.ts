import { HttpZParam, HttpZRequestModel } from "http-z";

export function mapBodyForFetch(httpObj: HttpZRequestModel) {
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

export function mapHeadersForFetch(httpObj) {
  return httpObj.headers.reduce((acc, { name, value }) => {
    return { ...acc, [name]: value };
  }, {});
}
