import http from "k6/http";
import { check, sleep } from "k6";
import { buildPayload } from "./payload";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export function handleSummary(data: any) {
  return {
    "ramp-up-summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

/**
 * Ramp test:
 * Gradually increase users to observe
 * latency, errors, and stability
 */
export const options = {
  stages: [
    { duration: "2m", target: 10 },   // warm-up (baseline)
    { duration: "3m", target: 20 },   // low load
    { duration: "3m", target: 30 },  // medium load
    { duration: "2m", target: 0 },   // cool down
  ],


  thresholds: {
    http_req_failed: ["rate<0.05"],          // <5% errors
    http_req_duration: ["p(95)<60000"],      // p95 < 60s
  },
};

const BASE_URL = __ENV.BASE_URL;

if (!BASE_URL) {
  throw new Error("BASE_URL is not set");
}

export default function () {
  const res = http.post(
    `${BASE_URL}/react/invoke`,
    JSON.stringify(buildPayload("Show top suppliers by spend")),
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: "230s",
    }
  );

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response body exists": (r) => !!r.body,
  });

  // Simulate user think time
  sleep(1);
}
