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

    // API success validation
    if (!resp.success) {
      report.error = resp.error || "API returned success=false";
      throw new Error(report.error);
    }

    // Validate presence of result field
    if (!resp.data?.result) {
      report.error = "Result object missing in response";
      throw new Error(report.error);
    }

    // Rows capture
    const rows = resp.data?.result?.rows;
    report.rows = Array.isArray(rows) ? rows.length : 0;

    if (report.rows === 0) {
      report.error = "No rows returned for the given query";
      console.log(report.error);
    }

    report.sql = resp.data?.result?.sql || resp.data?.result?.query_object || "NOT RETURNED";
    console.log(`Rows Returned: ${report.rows}`);

    // Retry trace fetch
    const trace = await waitForTrace(session_id);
    if (trace?.id) {
      report.traceId = trace.id;
      report.traceUrl = `https://langfuse.awsp.oraczen.xyz/project/${projectID}/traces/${trace.id}`;
      console.log(`Trace ID: ${trace.id}`);
    } else {
      report.traceId = "-";
      report.traceUrl = "-";
      console.log("Trace not available yet");
    }

    // Eval score
    const score = await langfuse.waitForEvalScoreUsingSession(
      session_id,
      90000,
      2000
    );
    report.evalScore = score;

    report.result = score >= 8 ? "PASS" : "FAIL";
    console.log(`Eval Score: ${score}`);
  } catch (err: any) {
    report.error = err.message || String(err);
    console.log(`Test Failed: ${testCaseName}`);
    console.log(`Error: ${report.error}`);
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

Scenario("TC106 — Tricky: Paid Definition", async ({ I }) =>
  runEvalTest(
    I,
    "Show invoices that are considered paid.",
    "TC106"
  )
);

Scenario("TC107 — Tricky: Region Meaning", async ({ I }) =>
  runEvalTest(
    I,
    "Show spend by region, but use the invoice region, not supplier geography.",
    "TC107"
  )
);

Scenario("TC108 — Tricky: Time Window Vagueness", async ({ I }) =>
  runEvalTest(
    I,
    "What is our recent spend trend?",
    "TC108"
  )
);

Scenario("TC109 — Tricky: High Spend Definition", async ({ I }) =>
  runEvalTest(
    I,
    "List all high value invoices.",
    "TC109"
  )
);

Scenario("TC110 — Tricky: Duplicate Meaning", async ({ I }) =>
  runEvalTest(
    I,
    "Do we have duplicate invoices?",
    "TC110"
  )
);

Scenario("TC111 — Tricky: Supplier Activity Meaning", async ({ I }) =>
  runEvalTest(
    I,
    "Which suppliers are most active?",
    "TC111"
  )
);

Scenario("TC112 — Tricky: Contract Coverage Assumption", async ({ I }) =>
  runEvalTest(
    I,
    "How much of our spend is under contract?",
    "TC112"
  )
);

Scenario("TC113 — Tricky: Quantity vs Value", async ({ I }) =>
  runEvalTest(
    I,
    "Which suppliers supply the most?",
    "TC113"
  )
);

Scenario("TC114 — Tricky: Site Responsibility Confusion", async ({ I }) =>
  runEvalTest(
    I,
    "Which sites are responsible for the highest spend?",
    "TC114"
  )
);

Scenario("TC115 — Tricky: Cost Center Interpretation", async ({ I }) =>
  runEvalTest(
    I,
    "Which cost centers are overspending?",
    "TC115"
  )
);

// ---------- COMPLEX ----------

Scenario("TC116 — Invoice Amount Exceeds PO Amount", async ({ I }) =>
  runEvalTest(I, "Identify suppliers whose invoice amount exceeds purchase order amount by more than 10 percent.", "TC116")
);

Scenario("TC117 — Multi-Region Supplier Spend Split", async ({ I }) =>
  runEvalTest(I, "Show suppliers with invoices in multiple invoice regions and their spend split by region.", "TC117")
);

Scenario("TC118 — Late Paid Invoices (>60 Days)", async ({ I }) =>
  runEvalTest(I, "List invoices where invoice paid date is more than 60 days after invoice date.", "TC118")
);

Scenario("TC119 — Top Suppliers per Region", async ({ I }) =>
  runEvalTest(I, "Show the top suppliers by spend for each invoice region.", "TC119")
);

Scenario("TC120 — Cost Center Spend Growth", async ({ I }) =>
  runEvalTest(I, "Identify cost centers with the highest month over month growth in invoice amount.", "TC120")
);

Scenario("TC121 — Contract vs Non-Contract Spend", async ({ I }) =>
  runEvalTest(I, "Compare contract based invoices versus non contract invoices and their total spend.", "TC121")
);

Scenario("TC122 — Supplier Spend Trend (Top 5)", async ({ I }) =>
  runEvalTest(I, "Show month wise spend trend for the top 5 suppliers.", "TC122")
);

Scenario("TC123 — Duplicate Invoice Numbers", async ({ I }) =>
  runEvalTest(I, "Identify duplicate invoice numbers for the same supplier with different invoice IDs.", "TC123")
);

Scenario("TC124 — PO Utilization by Supplier", async ({ I }) =>
  runEvalTest(I, "Show supplier wise purchase order utilization by comparing invoice amount to PO amount.", "TC124")
);

Scenario("TC125 — High Quantity Low Amount Invoices", async ({ I }) =>
  runEvalTest(I, "List invoices where quantity is high but invoice amount is unusually low.", "TC125")
);

Scenario("TC126 — Multi-Site Supplier Spend", async ({ I }) =>
  runEvalTest(I, "Show suppliers supplying to multiple company sites and their total spend per site.", "TC126")
);

Scenario("TC127 — Split Accounting Impact", async ({ I }) =>
  runEvalTest(I, "Identify invoices with split accounting numbers and calculate total impacted spend.", "TC127")
);

Scenario("TC128 — Spend by Commodity and Supplier", async ({ I }) =>
  runEvalTest(I, "Show invoice spend by commodity name and supplier.", "TC128")
);

Scenario("TC129 — Preferred vs Non-Preferred UOM Spend", async ({ I }) =>
  runEvalTest(I, "Compare spend between preferred versus non preferred units of measure.", "TC129")
);

Scenario("TC130 — Increasing Supplier Invoice Amount Trend", async ({ I }) =>
  runEvalTest(I, "Identify suppliers whose average invoice amount has increased consistently over the last three months.", "TC130")
);

// ---------- EDGE CASES ----------

Scenario("TC131 — Missing Invoice Dates", async ({ I }) =>
  runEvalTest(I, "List invoices with missing invoice date or accounting date.", "TC131")
);

Scenario("TC132 — Zero or Negative Invoice Amounts", async ({ I }) =>
  runEvalTest(I, "Show invoices where invoice amount is zero or negative.", "TC132")
);

Scenario("TC133 — Missing Currency", async ({ I }) =>
  runEvalTest(I, "Identify invoices with missing invoice currency but amount present.", "TC133")
);

Scenario("TC134 — Supplier Missing Contact Details", async ({ I }) =>
  runEvalTest(I, "List suppliers with missing contact email or phone number.", "TC134")
);

Scenario("TC135 — Missing PO Line Number", async ({ I }) =>
  runEvalTest(I, "Show invoices where purchase order exists but PO line number is missing.", "TC135")
);

Scenario("TC136 — Invoice Currency Mismatch", async ({ I }) =>
  runEvalTest(I, "Identify invoices with the same invoice number but different currencies.", "TC136")
);

Scenario("TC137 — Missing Unit of Measure", async ({ I }) =>
  runEvalTest(I, "Show invoices where quantity exists but unit of measure is missing.", "TC137")
);

Scenario("TC138 — Missing Supplier IDs", async ({ I }) =>
  runEvalTest(I, "List invoices linked to missing or inactive supplier IDs.", "TC138")
);

Scenario("TC139 — Invoice Date After Paid Date", async ({ I }) =>
  runEvalTest(I, "Identify invoices where invoice date is after the paid date.", "TC139")
);

Scenario("TC140 — Supplier Country vs Invoice Region Mismatch", async ({ I }) =>
  runEvalTest(I, "Show invoices where supplier country does not match invoice region.", "TC140")
);

Scenario("TC141 — Missing Contract Name", async ({ I }) =>
  runEvalTest(I, "List invoices where contract ID exists but contract name is missing.", "TC141")
);

Scenario("TC142 — Conflicting Supplier Diversity Flags", async ({ I }) =>
  runEvalTest(I, "Identify suppliers with conflicting diversity and certified diversity flags.", "TC142")
);

Scenario("TC143 — High Amount Non-PO Invoices", async ({ I }) =>
  runEvalTest(I, "Show invoices with very high amount but missing purchase order ID.", "TC143")
);

Scenario("TC144 — Missing Supervisor ID", async ({ I }) =>
  runEvalTest(I, "List invoices created by users without supervisor ID.", "TC144")
);

Scenario("TC145 — Duplicate Extra Invoice Keys", async ({ I }) =>
  runEvalTest(I, "Identify invoices with duplicate extra invoice keys.", "TC145")
);

// ---------- FUZZY --------

Scenario("TC146 — Highest Paid Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Who are we paying the most these days?", "TC146")
);

Scenario("TC147 — Slow Paying Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which suppliers are slow to get paid?", "TC147")
);

Scenario("TC148 — Problematic Invoices (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Show me problematic invoices from last quarter.", "TC148")
);

Scenario("TC149 — Multi-Site Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which suppliers are spread across many sites?", "TC149")
);

Scenario("TC150 — Overbilling Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Do we have suppliers billing too much compared to their purchase orders?", "TC150")
);

Scenario("TC151 — Regional Spend Concentration (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Where is most of our money going region wise?", "TC151")
);

Scenario("TC152 — High Value Invoices (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which invoices look suspiciously high?", "TC152")
);

Scenario("TC153 — Overpaying Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Are we overpaying any supplier recently?", "TC153")
);

Scenario("TC154 — Messy Invoice Data Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which suppliers have messy invoice data?", "TC154")
);

Scenario("TC155 — High Volume Low Value Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Show suppliers that handle big volumes but low value.", "TC155")
);

Scenario("TC156 — Stuck Payments (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which invoices are stuck in payment?", "TC156")
);

Scenario("TC157 — Supplier Concentration Risk (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Do we rely too much on a few suppliers?", "TC157")
);

Scenario("TC158 — Cost Center Spread Suppliers (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which suppliers work with many cost centers?", "TC158")
);

Scenario("TC159 — Inconsistent Billing Patterns (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Any suppliers with inconsistent billing patterns?", "TC159")
);

Scenario("TC160 — Active Suppliers Over Time (Fuzzy)", async ({ I }) =>
  runEvalTest(I, "Which suppliers are most active month after month?", "TC160")
);

AfterSuite(() => {
  if (!evalReport.length) {
    console.log("No results captured, skipping report generation.");
    return;
  }

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

  // Make Trace URL clickable
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
