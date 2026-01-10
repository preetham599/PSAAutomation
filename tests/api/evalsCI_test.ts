import assert from "assert";
import XLSX from "xlsx";
import { SpendAgentClient } from "../../tests/api/spendAgentClient";
import { LangfuseClient } from "../../tests/api/langFuseClient";

Feature("Spend Analyzer API — Evals Flow with Excel Report");

const spendClient = new SpendAgentClient(process.env.BASE_URL!);
const langfuse = new LangfuseClient();
const projectID = process.env.LANGFUSE_PROJECT_ID;

// Stores results for report generation
const evalReport: any[] = [];

async function waitForTrace(sessionId: string, timeout = 60000, interval = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const trace = await langfuse.getTraceFromSession(sessionId);
    if (trace?.id) return trace;
    await new Promise((res) => setTimeout(res, interval));
  }
  return null;
}

async function runEvalTest(I: CodeceptJS.I, prompt: string, testCaseName: string) {
  const report: any = {
    testCase: testCaseName,
    prompt,
    result: "FAIL",
    rows: 0,
    sql: "-",
    evalScore: "-",
    traceId: "-",
    sessionId: "-",
    error: "-",
    timeTakenMs: 0,
  };

  const startTime = Date.now();
  console.log(`\n--- Executing ${testCaseName} ---`);

  try {
    const runId = `Auto-${Date.now()}`;
    const { data: resp, session_id } = await spendClient.invoke(prompt, runId);
    report.sessionId = session_id;

    if (!resp.success) {
      throw new Error(resp.error || "API returned success=false");
    }

    if (!resp.data?.result) {
      throw new Error("Result object missing in response");
    }

    const rows = resp.data?.result?.rows;
    report.rows = Array.isArray(rows) ? rows.length : 0;

    report.sql =
      resp.data?.result?.sql ||
      resp.data?.result?.query_object ||
      "NOT RETURNED";

    const trace = await waitForTrace(session_id);
    if (trace?.id) {
      report.traceId = trace.id;
      report.traceUrl = `https://langfuse.awsp.oraczen.xyz/project/${projectID}/traces/${trace.id}`;
    }

    const score = await langfuse.waitForEvalScoreUsingSession(
      session_id,
      90000,
      2000
    );

    report.evalScore = score;
    report.result = score >= 8 ? "PASS" : "FAIL";
  } catch (err: any) {
    report.error = err.message || String(err);
    console.error(`${testCaseName} failed: ${report.error}`);
  }

  report.timeTakenMs = Date.now() - startTime;
  evalReport.push(report);

  console.log(`${testCaseName} Result: ${report.result}`);
}

Scenario("TC101 — Tricky: Spend vs PO Confusion", async ({ I }) =>
  runEvalTest(
    I,
    "Show me the total spend, but only consider invoices that were never linked to any purchase order.",
    "TC101"
  )
);

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
);

Scenario("TC105 — Tricky: Invoice vs Invoice Line", async ({ I }) =>
  runEvalTest(
    I,
    "How many invoices do we have if I count each line item separately?",
    "TC105"
  )
);

AfterSuite(() => {
  if (!evalReport.length) {
    console.log("No results captured, skipping report generation.");
    process.exitCode = 1;
    return;
  }

  /* ================= CI QUALITY GATE ================= */

  const total = evalReport.length;
  const scored = evalReport.filter(r => typeof r.evalScore === "number");
  const failed = scored.filter(r => r.evalScore < 8);

  const avgScore =
    scored.reduce((sum, r) => sum + r.evalScore, 0) / scored.length;

  const MAX_ALLOWED_FAILURES = Number(process.env.MAX_ALLOWED_FAILURES || 3);
  const MIN_AVG_SCORE = Number(process.env.MIN_AVG_SCORE || 8);

  console.log("\n========== EVAL SUMMARY ==========");
  console.log(`Total Prompts      : ${total}`);
  console.log(`Evaluated Prompts  : ${scored.length}`);
  console.log(`Failed (<8)        : ${failed.length}`);
  console.log(`Average Score      : ${avgScore.toFixed(2)}`);
  console.log("=================================\n");

  const shouldFail =
    failed.length > MAX_ALLOWED_FAILURES || avgScore < MIN_AVG_SCORE;

  if (shouldFail) {
    console.error("CI QUALITY GATE FAILED");
    process.exitCode = 1;
  } else {
    console.log("CI QUALITY GATE PASSED");
    process.exitCode = 0;
  }

  /* ================= EXCEL REPORT ================= */

  console.log("Generating Excel Eval Report...");

  const wsData = evalReport.map((r) => {
    const row: any = {
      "Test Case": r.testCase,
      "Prompt": r.prompt,
      "Result": r.result,
      "Rows Returned": r.rows,
      "Eval Score": r.evalScore,
      "Trace ID": r.traceId,
      "Session ID": r.sessionId,
      "SQL Query": r.sql,
      "Time Taken (ms)": r.timeTakenMs,
      "Error": r.error,
    };

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
