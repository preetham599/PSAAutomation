import http from "k6/http";
import { check, sleep } from "k6";
import { buildPayload } from "./payload";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export function handleSummary(data: any) {
  return {
    "parllel-summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

export const options = {
  vus: 5,
  duration: "5m",
  thresholds: {
      http_req_failed: ["rate<0.01"],
      http_req_duration: ["p(95)<60000"],
  },
};

const BASE_URL: string = __ENV.BASE_URL as string;

if (!BASE_URL) {
  throw new Error("BASE_URL is not set");
}

export default function () {
  const response = http.post(
    `${BASE_URL}/react/invoke`,
    JSON.stringify(buildPayload("List the top suppliers and their spend amounts for the Chemicals category.")),
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: "230s",
    }
  );

  check(response, {
    "status is 200": (r) => r.status === 200,
    "response body exists": (r) => !!r.body,
  });

  sleep(1);
}
