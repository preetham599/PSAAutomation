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
    report.sql = resp.data?.result?.sql || resp.data?.result?.query_object || "NOT RETURNED";

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

Scenario("TC1 — Total Spend Across All Suppliers", async ({ I }) =>
  runEvalTest(I, "What is the total spend across all suppliers?", "TC1")
);

Scenario("TC2 — Total Spend by Supplier", async ({ I }) =>
  runEvalTest(I, "What is the total spend by supplier?", "TC2")
);

Scenario("TC3 — Total Spend by Invoice Region", async ({ I }) =>
  runEvalTest(I, "What is the total spend by invoice region?", "TC3")
);

Scenario("TC4 — Total Spend by L1 Category", async ({ I }) =>
  runEvalTest(I, "What is the total spend by Level 1 category?", "TC4")
);

Scenario("TC5 — Total Spend by L2 Category", async ({ I }) =>
  runEvalTest(I, "What is the total spend by Level 2 category?", "TC5")
);

Scenario("TC6 — Total Spend by L3 Category", async ({ I }) =>
  runEvalTest(I, "What is the total spend by Level 3 category?", "TC6")
);

Scenario("TC7 — Total Spend by L4 Category", async ({ I }) =>
  runEvalTest(I, "What is the total spend by Level 4 category?", "TC7")
);

Scenario("TC8 — Highest Spend Suppliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers have the highest total spend?", "TC8")
);

Scenario("TC9 — Top 10 Suppliers by Spend", async ({ I }) =>
  runEvalTest(I, "What are the top 10 suppliers by spend?", "TC9")
);

Scenario("TC10 — Supplier Spend in NA", async ({ I }) =>
  runEvalTest(I, "What is the total spend for each supplier within North America (NA)?", "TC10")
);

Scenario("TC11 — Supplier Spend in EMEA", async ({ I }) =>
  runEvalTest(I, "What is the total spend for each supplier within EMEA?", "TC11")
);

Scenario("TC12 — Spend by Company Site", async ({ I }) =>
  runEvalTest(I, "What is the total spend by company site?", "TC12")
);

Scenario("TC13 — Unique Supplier Count", async ({ I }) =>
  runEvalTest(I, "How many unique suppliers are there?", "TC13")
);

Scenario("TC14 — Unique Invoice Count", async ({ I }) =>
  runEvalTest(I, "How many unique invoices exist?", "TC14")
);

Scenario("TC15 — Average Invoice Line Amount", async ({ I }) =>
  runEvalTest(I, "What is the average invoice line amount?", "TC15")
);

Scenario("TC16 — Max Invoice Line Amount", async ({ I }) =>
  runEvalTest(I, "What is the maximum invoice line amount?", "TC16")
);

Scenario("TC17 — Min Invoice Line Amount", async ({ I }) =>
  runEvalTest(I, "What is the minimum invoice line amount?", "TC17")
);

Scenario("TC18 — Spend by Currency", async ({ I }) =>
  runEvalTest(I, "What is the total spend by invoice currency?", "TC18")
);

Scenario("TC19 — Spend by Cost Center", async ({ I }) =>
  runEvalTest(I, "What is the total spend by cost center?", "TC19")
);

Scenario("TC20 — Spend by Account Name", async ({ I }) =>
  runEvalTest(I, "What is the total spend by account name?", "TC20")
);

Scenario("TC21 — L1 Category Top Suppliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers contribute the most spend in each Level 1 category?", "TC21")
);

Scenario("TC22 — L1 Category Spend Percentage", async ({ I }) =>
  runEvalTest(I, "What percentage of total spend does each Level 1 category represent?", "TC22")
);

Scenario("TC23 — L2 Category Top Suppliers", async ({ I }) =>
  runEvalTest(I, "What are the top suppliers within each Level 2 category?", "TC23")
);

Scenario("TC24 — Highest Spend L3 Categories", async ({ I }) =>
  runEvalTest(I, "Which Level 3 categories drive the highest spend overall?", "TC24")
);

Scenario("TC25 — Multi L1 Category Suppliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers have spend across multiple Level 1 categories?", "TC25")
);

Scenario("TC26 — Top 5 Supplier Concentration", async ({ I }) =>
  runEvalTest(I, "What is the supplier concentration (top 5 suppliers) by total spend?", "TC26")
);

Scenario("TC27 — Multi-Region Suppliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers are active in more than one invoice region?", "TC27")
);

Scenario("TC28 — Avg Spend per Invoice per Supplier", async ({ I }) =>
  runEvalTest(I, "What is the average spend per invoice for each supplier?", "TC28")
);

Scenario("TC29 — Suppliers with Most Invoice Lines", async ({ I }) =>
  runEvalTest(I, "Which suppliers have the highest number of invoice lines?", "TC29")
);

Scenario("TC30 — Spend per Supplier per Region", async ({ I }) =>
  runEvalTest(I, "What is the total spend per supplier per region?", "TC30")
);

Scenario("TC31 — Categories with Most Invoice Lines", async ({ I }) =>
  runEvalTest(I, "Which categories have the highest number of invoice lines?", "TC31")
);

Scenario("TC32 — NA Spend Distribution L1", async ({ I }) =>
  runEvalTest(I, "What is the spend distribution across Level 1 categories for NA?", "TC32")
);

Scenario("TC33 — EMEA Spend Distribution L1", async ({ I }) =>
  runEvalTest(I, "What is the spend distribution across Level 1 categories for EMEA?", "TC33")
);

Scenario("TC34 — Site Dominant Suppliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers dominate spend within each company site?", "TC34")
);

Scenario("TC35 — Supplier L1 Spend Combination", async ({ I }) =>
  runEvalTest(I, "What is the total spend by supplier and Level 1 category combination?", "TC35")
);

Scenario("TC36 — Spend by Accounting Month", async ({ I }) =>
  runEvalTest(I, "What is the total spend by accounting month?", "TC36")
);

Scenario("TC37 — Spend by Invoice Issue Month", async ({ I }) =>
  runEvalTest(I, "What is the total spend by invoice issue date (monthly)?", "TC37")
);

Scenario("TC38 — YoY Spend Change", async ({ I }) =>
  runEvalTest(I, "How has total spend changed year over year?", "TC38")
);

Scenario("TC39 — Increasing Supplier Spend Trend", async ({ I }) =>
  runEvalTest(I, "Which suppliers show increasing spend trends over time?", "TC39")
);

Scenario("TC40 — Monthly L1 Spend Trend", async ({ I }) =>
  runEvalTest(I, "What is the monthly spend trend by Level 1 category?", "TC40")
);

Scenario("TC41 — Avg Invoice Amount by Month", async ({ I }) =>
  runEvalTest(I, "What is the average invoice amount by accounting month?", "TC41")
);

Scenario("TC42 — Highest Spend Months", async ({ I }) =>
  runEvalTest(I, "Which months have the highest total spend?", "TC42")
);

Scenario("TC43 — Supplier Spend by Year", async ({ I }) =>
  runEvalTest(I, "What is the spend by supplier for a given accounting year?", "TC43")
);

Scenario("TC44 — Invoice to Payment Lag", async ({ I }) =>
  runEvalTest(I, "What is the lag between invoice date and paid date on average?", "TC44")
);

Scenario("TC45 — Longest Payment Delay Suppliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers have the longest average payment delays?", "TC45")
);

Scenario("TC46 — Spend per Purchase Order", async ({ I }) =>
  runEvalTest(I, "What is the total spend associated with each purchase order?", "TC46")
);

Scenario("TC47 — PO Exceeding Invoice Amount", async ({ I }) =>
  runEvalTest(I, "Which purchase orders have invoices exceeding the PO amount?", "TC47")
);

Scenario("TC48 — Spend by Contract", async ({ I }) =>
  runEvalTest(I, "What is the total spend by contract ID?", "TC48")
);

Scenario("TC49 — Highest Spend Contracts", async ({ I }) =>
  runEvalTest(I, "Which contracts account for the highest total spend?", "TC49")
);

Scenario("TC50 — PO vs Non-PO Spend", async ({ I }) =>
  runEvalTest(I, "What percentage of spend is associated with a purchase order versus non-PO invoices?", "TC50")
);

Scenario("TC51 — Invoices per PO", async ({ I }) =>
  runEvalTest(I, "How many invoices are linked to each purchase order?", "TC51")
);

Scenario("TC52 — Avg Invoice Amount per PO", async ({ I }) =>
  runEvalTest(I, "What is the average invoice amount per PO?", "TC52")
);

Scenario("TC53 — Suppliers Without PO", async ({ I }) =>
  runEvalTest(I, "Which suppliers frequently invoice without a PO?", "TC53")
);

Scenario("TC54 — Supplier Contract Spend", async ({ I }) =>
  runEvalTest(I, "What is the total spend by supplier and contract combination?", "TC54")
);

Scenario("TC55 — Contracts with Multiple Suppliers", async ({ I }) =>
  runEvalTest(I, "Which contracts span multiple suppliers?", "TC55")
);

Scenario("TC56 — Pareto Suppliers 80 Percent", async ({ I }) =>
  runEvalTest(I, "Which suppliers account for 80% of total spend?", "TC56")
);

Scenario("TC57 — Fragmented Categories", async ({ I }) =>
  runEvalTest(I, "Which categories are highly fragmented across many suppliers?", "TC57")
);

Scenario("TC58 — High Avg Invoice Outliers", async ({ I }) =>
  runEvalTest(I, "Which suppliers have unusually high average invoice line amounts compared to peers?", "TC58")
);

Scenario("TC59 — Amount per Unit Supplier", async ({ I }) =>
  runEvalTest(I, "What is the spend per invoice line quantity for each supplier?", "TC59")
);

Scenario("TC60 — Supplier Concentration Risk", async ({ I }) =>
  runEvalTest(I, "Which regions show the highest supplier concentration risk based on spend share?", "TC60")
);

Scenario("TC61 — Top Sites Q4 2024", async ({ I }) =>
  runEvalTest(I, "What are the top five spend sites in the last quarter of 2024?", "TC61")
);

Scenario("TC62 — Latest Month Supplier Spend", async ({ I }) =>
  runEvalTest(I, "For each supplier, show spend for the month of their latest accounting date.", "TC62")
);

Scenario("TC63 — Top L2 Categories by Invoice Count", async ({ I }) =>
  runEvalTest(I, "Show the top 5 L2 categories by number of invoices and their total spend.", "TC63")
);

Scenario("TC64 — Supplier Spend per Site Ratio", async ({ I }) =>
  runEvalTest(I, "For each supplier, compute spend per site and show suppliers with ratio above 10.", "TC64")
);

Scenario("TC65 — Quantity Band Price Anomaly", async ({ I }) =>
  runEvalTest(I, "For each material, divide invoices into quantity bands (low, medium, high) and compute average unit price per band. Identify materials where high-quantity band price is higher than low-quantity band price.", "TC65")
);

Scenario("TC66 — Chemical Subcategories", async ({ I }) =>
  runEvalTest(I, "hii What are the various subcategories of Chemical and who are the top five among those suppliers?", "TC66")
);

Scenario("TC67 — Most Frequent Material", async ({ I }) =>
  runEvalTest(I, "Give the most frequent material used by most of the suppliers in EMEA NA SA regions.", "TC67")
);

Scenario("TC68 — Coffee Suppliers Fuzzy", async ({ I }) =>
  runEvalTest(I, "heyyy List all the suppliers who supply cofee among regions EMEA NA SA.", "TC68")
);

Scenario("TC69 — Invalid Invoice Dates", async ({ I }) =>
  runEvalTest(I, "Show me invoices with invalid date formats or missing dates.", "TC69")
);

Scenario("TC70 — Invoice Count per Region 2025", async ({ I }) =>
  runEvalTest(I, "Give me the number of invoices per region for 2025 sorted in descending order.", "TC70")
);

Scenario("TC71 — YoY Supplier Change >50%", async ({ I }) =>
  runEvalTest(I, "Show year-over-year spend change by supplier and highlight extreme changes.", "TC71")
);

Scenario("TC72 — Category Hierarchy Issues", async ({ I }) =>
  runEvalTest(I, "Identify inconsistent or rarely used category hierarchies.", "TC72")
);

Scenario("TC73 — Purchase Orders 2024", async ({ I }) =>
  runEvalTest(I, "What is the total number of Purchase Orders in 2024?", "TC73")
);

Scenario("TC74 — Avg Invoice Amount All Regions", async ({ I }) =>
  runEvalTest(I, "What is the average invoice amount per supplier among all regions?", "TC74")
);

Scenario("TC75 — Spend Outside Top 20", async ({ I }) =>
  runEvalTest(I, "What percentage of total spend is with suppliers outside the top 20?", "TC75")
);

Scenario("TC76 — Top Energy Sites", async ({ I }) =>
  runEvalTest(I, "What are the top 10 sites by spend in the Energy & Utilities category?", "TC76")
);

Scenario("TC77 — Energy Spend NA vs EMEA", async ({ I }) =>
  runEvalTest(I, "Compare 2024 Energy spend between NA and EMEA.", "TC77")
);

Scenario("TC78 — Region Mismatch Spend", async ({ I }) =>
  runEvalTest(I, "List invoices where supplier region and site region mismatch.", "TC78")
);

Scenario("TC79 — Declining Volume Rising Value", async ({ I }) =>
  runEvalTest(I, "Compare quarterly spend growth for suppliers with declining volume but increasing value.", "TC79")
);

Scenario("TC80 — Duplicate Material Codes", async ({ I }) =>
  runEvalTest(I, "Identify invoices with duplicate material description but different material codes.", "TC80")
);

Scenario("TC81 — Spend vs Line Items Trend", async ({ I }) =>
  runEvalTest(I, "Provide category spend trend versus invoice line items.", "TC81")
);

Scenario("TC82 — Common Suppliers Excluding Agriculture", async ({ I }) =>
  runEvalTest(I, "Are there any common suppliers across L1 categories excluding Agriculture in 2024?", "TC82")
);

Scenario("TC83 — Invoice Count 2024", async ({ I }) =>
  runEvalTest(I, "What is the total number of invoices in 2024?", "TC83")
);

Scenario("TC84 — High Value Invoices", async ({ I }) =>
  runEvalTest(I, "List all invoices with amount greater than 250,000.", "TC84")
);

Scenario("TC85 — Sites with Most Suppliers", async ({ I }) =>
  runEvalTest(I, "Which sites have the highest number of unique suppliers?", "TC85")
);

Scenario("TC86 — Multi Region Supplier Spend", async ({ I }) =>
  runEvalTest(I, "List suppliers operating in multiple regions with spend split.", "TC86")
);

Scenario("TC87 — Reduced Site Coverage Suppliers", async ({ I }) =>
  runEvalTest(I, "Find suppliers that increased spend but reduced site coverage in 2024.", "TC87")
);

Scenario("TC88 — Jan 2025 Invoices", async ({ I }) =>
  runEvalTest(I, "List supplier names and invoice amounts for Jan 2025.", "TC88")
);

Scenario("TC89 — Sites with No Current Spend", async ({ I }) =>
  runEvalTest(I, "Which sites had spend in prior year but none in current year?", "TC89")
);

Scenario("TC90 — Freight Spend by Route", async ({ I }) =>
  runEvalTest(I, "Show freight and logistics spend by route.", "TC90")
);

Scenario("TC91 — Minority Supplier Monthly Spend", async ({ I }) =>
  runEvalTest(I, "Show month-wise spend for minority-owned suppliers in 2024.", "TC91")
);

Scenario("TC92 — Logistics and IT Suppliers", async ({ I }) =>
  runEvalTest(I, "Show suppliers providing both Logistics and IT services.", "TC92")
);

Scenario("TC93 — Contract vs Spot Spend", async ({ I }) =>
  runEvalTest(I, "Site-wise contract versus spot purchase spend share.", "TC93")
);

Scenario("TC94 — Top Invoice Amounts", async ({ I }) =>
  runEvalTest(I, "Give me the top 10 highest invoice amounts.", "TC94")
);

Scenario("TC95 — Specific Invoice ID", async ({ I }) =>
  runEvalTest(I, "List of invoices with invoice id 5124028511.", "TC95")
);

Scenario("TC96 — Hydrogen OEM Suppliers", async ({ I }) =>
  runEvalTest(I, "For OEM part Hydrogen, list suppliers and consolidation opportunities.", "TC96")
);

Scenario("TC97 — Corn Suppliers", async ({ I }) =>
  runEvalTest(I, "List unique suppliers who supply corn and associated spend.", "TC97")
);

Scenario("TC98 — Top 3 Suppliers per L1", async ({ I }) =>
  runEvalTest(I, "For each L1 category, show top 3 suppliers and spend share.", "TC98")
);

Scenario("TC99 — Group Invoices by Supplier", async ({ I }) =>
  runEvalTest(I, "Group invoices by supplier and show total amount.", "TC99")
);

Scenario("TC100 — Suppliers in EMEA and NA", async ({ I }) =>
  runEvalTest(I, "heyy! List all suppliers from EMEA and North America.", "TC100")
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
    process.env.MAX_ALLOWED_FAILURES || 8
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
  XLSX.utils.book_append_sheet(wb, ws, "Evalsss Results");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = `eval_report_${timestamp}.xlsx`;

  XLSX.writeFile(wb, filePath);
  console.log(`Excel report saved: ${filePath}`);
});
