import assert from "assert";
import XLSX from "xlsx";
import { SpendAgentClient } from "../../tests/api/spendAgentClient";
import { LangfuseClient } from "../../tests/api/langFuseClient";

Feature("Spend Analyzer API — Evals Flow with Reliability & Quality Gates");

const spendClient = new SpendAgentClient(process.env.BASE_URL!);
const langfuse = new LangfuseClient();
const projectID = process.env.LANGFUSE_PROJECT_ID;

const evalReport: any[] = [];

async function waitForTrace(sessionId: string, timeout = 60000, interval = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const trace = await langfuse.getTraceFromSession(sessionId);
    if (trace?.id) return trace;
    await new Promise(res => setTimeout(res, interval));
  }
  return null;
}

async function runEvalTest(I: CodeceptJS.I, prompt: string, testCaseName: string) {
  const report: any = {
    testCase: testCaseName,
    prompt,
    result: "FAIL",
    failureType: "-",
    rows: 0,
    sql: "-",
    evalScore: "-",
    traceId: "-",
    sessionId: "-",
    error: "-",
    timeTakenMs: 0,
  };

  const start = Date.now();

  try {
    const runId = `Auto-${Date.now()}`;
    const { data: resp, session_id } = await spendClient.invoke(prompt, runId);
    report.sessionId = session_id;

    if (!resp?.success) {
      report.failureType = "REQUEST_ERROR";
      throw new Error(resp?.error || "API success=false");
    }

    if (!resp.data?.result) {
      report.failureType = "INVALID_RESPONSE";
      throw new Error("Missing result object");
    }

    const rows = resp.data.result.rows;
    report.rows = Array.isArray(rows) ? rows.length : 0;
    report.sql = resp.data.result.sql || "-";

    const trace = await waitForTrace(session_id);
    if (!trace?.id) {
      report.failureType = "NO_TRACE";
      throw new Error("Trace not generated");
    }

    report.traceId = trace.id;
    report.traceUrl = `https://langfuse.awsp.oraczen.xyz/project/${projectID}/traces/${trace.id}`;

    const score = await langfuse.waitForEvalScoreUsingSession(session_id, 90000, 2000);

    if (typeof score !== "number") {
      report.failureType = "NO_EVAL_SCORE";
      throw new Error("Eval score not generated");
    }

    report.evalScore = score;

    if (score < 8) {
      report.failureType = "LOW_SCORE";
      report.result = "FAIL";
    } else {
      report.result = "PASS";
    }

  } catch (err: any) {
    report.error = err.message || String(err);
    if (report.failureType === "-") {
      report.failureType = "REQUEST_ERROR";
    }
  }

  report.timeTakenMs = Date.now() - start;
  evalReport.push(report);
}

Scenario("TC101 — Tricky: Spend vs PO Confusion", async ({ I }) =>
  runEvalTest(
    I,
    "Show me the total spend, but only consider invoices that were never linked to any purchase order.",
    "TC101"
  )
);
/*
Scenario("TC102 — Tricky: Date Field Ambiguity", async ({ I }) =>
  runEvalTest(
    I,
    "Show invoices created in Jan 2025 based on accounting timelines.",
    "TC102"
  )
);

Scenario("TC103 — Tricky: Currency Assumption", async ({ I }) =>
  runEvalTest(
    I,
    "What is the total spend assuming everything is already in USD?",
    "TC103"
  )
);

Scenario("TC104 — Tricky: Supplier vs Supplier Location", async ({ I }) =>
  runEvalTest(
    I,
    "Give me total spend by supplier location, not supplier.",
    "TC104"
  )
);*/

Scenario("TC105 — Tricky: Invoice vs Invoice Line", async ({ I }) =>
  runEvalTest(
    I,
    "How many invoices do we have if I count each line item separately?",
    "TC105"
  )
);

AfterSuite(() => {
  const total = evalReport.length;

  //  CLASSIFY FAILURES

  const requestFailures = evalReport.filter(r =>
    ["REQUEST_ERROR", "NO_TRACE", "NO_EVAL_SCORE", "INVALID_RESPONSE"].includes(
      r.failureType
    )
  );

  const qualityFailures = evalReport.filter(
    r => r.failureType === "LOW_SCORE"
  );

  const scored = evalReport.filter(r => typeof r.evalScore === "number");

  const avgScore =
    scored.length > 0
      ? scored.reduce((sum, r) => sum + r.evalScore, 0) / scored.length
      : 0;

  //  THRESHOLDS

  const MAX_REQUEST_FAILURES = Number(
    process.env.MAX_REQUEST_FAILURES || 0
  );
  const MAX_QUALITY_FAILURES = Number(
    process.env.MAX_ALLOWED_FAILURES || 3
  );
  const MIN_AVG_SCORE = Number(
    process.env.MIN_AVG_SCORE || 8.8
  );

  //  FAILURE CATEGORY

  let failureCategory = "NONE";

  if (requestFailures.length > MAX_REQUEST_FAILURES) {
    failureCategory = "RELIABILITY_FAILURE";
  } else if (
    qualityFailures.length > MAX_QUALITY_FAILURES ||
    avgScore < MIN_AVG_SCORE
  ) {
    failureCategory = "QUALITY_FAILURE";
  }

  //  CI SUMMARY

  console.log("\n CI EVAL SUMMARY ");
  console.log(`Total Prompts        : ${total}`);
  console.log(`Request Failures     : ${requestFailures.length}`);
  console.log(`Quality Failures     : ${qualityFailures.length}`);
  console.log(`Average Eval Score   : ${avgScore.toFixed(2)}`);
  console.log(`Failure Category     : ${failureCategory}`);
  console.log("\n");

  //  CI RESULT

  if (failureCategory !== "NONE") {
    console.error(`CI FAILED: ${failureCategory}`);
    process.exitCode = 1;
  } else {
    console.log("CI PASSED: Reliability & Quality Gates Met");
    process.exitCode = 0;
  }

  // ----------- EXCEL REPORT -----------

  console.log("Generating Excel Eval Report...");

  const wsData = evalReport.map(r => {
    const row: any = {
    "Test Case": r.testCase,
    "Prompt": r.prompt,
    "Result": r.result,
    "Failure Type": r.failureType,
    "Eval Score": r.evalScore,
    "Rows Returned": r.rows,
    "Trace ID": r.traceId,
    "Session ID": r.sessionId,
    "SQL Query": r.sql,
    "Time Taken (ms)": r.timeTakenMs,
    "Error": r.error,
    "Trace URL": r.traceUrl || "-"
  };
  // Make Trace URL clickable (same as old setup)
    if (r.traceUrl && r.traceUrl !== "-") {
      row["Trace URL"] = {
        t: "s",
        f: `HYPERLINK("${r.traceUrl}", "Click to View")`,
      };
    } else {
      row["Trace URL"] = "-";
    }

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Eval Results");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = `eval_report_${timestamp}.xlsx`;

  XLSX.writeFile(wb, filePath);
  console.log(`Excel report saved: ${filePath}`);
});
