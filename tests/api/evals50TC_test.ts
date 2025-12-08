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


Scenario("TC1 — Filter by Region", async ({ I }) =>
  runEvalTest(I, "Show me all invoices from the EMEA region.", "TC1")
);

Scenario("TC2 — Aggregation SUM by Region", async ({ I }) =>
  runEvalTest(I, "What is the total invoice amount for NA region?", "TC2")
);

Scenario("TC3 — Join Query for Supplier and Invoice Date", async ({ I }) =>
  runEvalTest(I, "List supplier names and invoice amounts for all invoices issued in Jan 2025.", "TC3")
);

Scenario("TC4 — Sorting by Highest Invoice Amounts", async ({ I }) =>
  runEvalTest(I, "Give me the top 10 highest invoice amounts.", "TC4")
);

Scenario("TC5 — Grouping Invoices by Supplier", async ({ I }) =>
  runEvalTest(I, "Group invoices by supplier and show the total amount per supplier.", "TC5")
);

Scenario("TC6 — Column Not Found Handling", async ({ I }) =>
  runEvalTest(I, "Show invoices where the city is Chicago.", "TC6")
);

Scenario("TC7 — Date Format Validation for Invoices", async ({ I }) =>
  runEvalTest(I, "Show me invoices with invalid date formats or missing dates.", "TC7")
);

Scenario("TC8 — Category Spend for Energy & Utilities", async ({ I }) =>
  runEvalTest(I, "Calculate total spend in energy & utilities category.", "TC8")
);

Scenario("TC9 — Diversity Filter for Minority-Owned Suppliers", async ({ I }) =>
  runEvalTest(I, "List all minority owned suppliers from the NA region.", "TC9")
);

Scenario("TC10 — Region-wise Invoice Count for 2025", async ({ I }) =>
  runEvalTest(I, "Give me the number of invoices per region for 2025 sorted in descending order.", "TC10")
);

Scenario("TC11 — Top Spend Sites in Q4 2024", async ({ I }) =>
  runEvalTest(I, "What are the top five spend sites in the last quarter of 2024?", "TC11")
);

Scenario("TC12 — Logistics Spend Sites in 2024", async ({ I }) =>
  runEvalTest(I, "What are the top 10 spend sites with Logistics category spend in 2024?", "TC12")
);

Scenario("TC13 — Top Category Spend in 2024", async ({ I }) =>
  runEvalTest(I, "What are the top 10 category spend in 2024?", "TC13")
);

Scenario("TC14 — Quarterly Trend of Top Categories Excluding Agriculture in 2024", async ({ I }) =>
  runEvalTest(I, "What is the trend of top of 3 category spend excluding Agriculture by each quarter in 2024?", "TC14")
);

Scenario("TC15 — Common Suppliers Across L1 Categories Excluding Agriculture in 2024", async ({ I }) =>
  runEvalTest(I, "Are there any common suppliers across L1 categories excluding Agriculture in 2024?", "TC15")
);

Scenario("TC16 — Chemical Subcategories and Top Suppliers", async ({ I }) =>
  runEvalTest(I, "What are the various subcategories of Chemical and who are the top five Chemical suppliers?", "TC16")
);

Scenario("TC17 — Top Chemical Suppliers and Supplied Sites", async ({ I }) =>
  runEvalTest(I, "Who are the top 10 chemical suppliers and what sites do they supply to?", "TC17")
);

Scenario("TC18 — Highest Spend Supplier per Quarter in 2024 with Category", async ({ I }) =>
  runEvalTest(I, "What is the name of the highest spend supplier in each quarter of 2024 what is the corresponding L1 category?", "TC18")
);

Scenario("TC19 — Quarter with Highest Total Spend in 2024", async ({ I }) =>
  runEvalTest(I, "What quarter had the highest total spend in 2024?", "TC19")
);

Scenario("TC20 — Highest Spend Suppliers per Quarter in 2024 Excluding Agriculture", async ({ I }) =>
  runEvalTest(I, "What are the names of the highest spend supplier in each quarter of 2024, excluding Agriculture?", "TC20")
);

Scenario("TC21 — Highest Spend Sites per Quarter in 2024", async ({ I }) =>
  runEvalTest(I, "What are the names of the highest spend sites in each quarter of 2024?", "TC21")
);

Scenario("TC22 — Total Non-PO Spend in 2024", async ({ I }) =>
  runEvalTest(I, "What is the total non-PO spend in 2024?", "TC22")
);

Scenario("TC23 — Total Number of Invoices in 2024", async ({ I }) =>
  runEvalTest(I, "What is the total number of invoices in 2024?", "TC23")
);

Scenario("TC24 — Total Number of Purchase Orders in 2024", async ({ I }) =>
  runEvalTest(I, "What is the total number of Purchase Orders in 2024?", "TC24")
);

Scenario("TC25 — Top Suppliers by Total Spend", async ({ I }) =>
  runEvalTest(I, "Who are the top 10 suppliers by total spend?", "TC25")
);

Scenario("TC26 — Average Invoice Amount per Supplier", async ({ I }) =>
  runEvalTest(I, "What is the average invoice amount per supplier?", "TC26")
);

Scenario("TC27 — Monthly Spend Trend by Region for Last 12 Months", async ({ I }) =>
  runEvalTest(I, "Show the monthly spend trend by region for the last 12 months.", "TC27")
);

Scenario("TC28 — High-Value Invoices Above Threshold", async ({ I }) =>
  runEvalTest(I, "List all invoices with an amount greater than 250,000 and show the supplier, site, category, and invoice date.", "TC28")
);

Scenario("TC29 — Purchase Order Versus Non-PO Spend Comparison", async ({ I }) =>
  runEvalTest(I, "Compare total spend for Purchase Order invoices versus non-PO invoices.", "TC29")
);

Scenario("TC30 — Duplicate Invoice Detection", async ({ I }) =>
  runEvalTest(I, "Identify potential duplicate invoices based on supplier, invoice number, invoice date, and amount.", "TC30")
);

Scenario("TC31 — Supplier Count and Spend by L1 Category", async ({ I }) =>
  runEvalTest(I, "For each L1 category, show the number of unique suppliers and the total spend.", "TC31")
);

Scenario("TC32 — Sites with Highest Number of Suppliers", async ({ I }) =>
  runEvalTest(I, "Which sites have the highest number of unique suppliers, and what is the total spend at those sites?", "TC32")
);

Scenario("TC33 — Cross-Region Suppliers and Spend by Region", async ({ I }) =>
  runEvalTest(I, "List suppliers that operate in more than one region and show their spend by region.", "TC33")
);

Scenario("TC34 — Top Suppliers per Category and Share of Spend", async ({ I }) =>
  runEvalTest(I, "For each L1 category, show the top 3 suppliers by spend and their share of category spend as a percentage.", "TC34")
);

Scenario("TC35 — Quarter-over-Quarter Spend Growth by Category", async ({ I }) =>
  runEvalTest(I, "Show quarter-over-quarter spend growth by L1 category for the last 4 quarters.", "TC35")
);

Scenario("TC36 — Invoices with Missing Master Data Fields", async ({ I }) =>
  runEvalTest(I, "List invoices that are missing category, supplier region, or site information.", "TC36")
);

Scenario("TC37 — Long-Tail Supplier Spend Contribution", async ({ I }) =>
  runEvalTest(I, "What percentage of total spend is with suppliers outside the top 20 by spend?", "TC37")
);

Scenario("TC38 — Sites with No Spend in Current Year", async ({ I }) =>
  runEvalTest(I, "Which sites had spend in the prior year but have no spend in the current year?", "TC38")
);

Scenario("TC39 — Top Material Descriptions by Spend", async ({ I }) =>
  runEvalTest(I, "List the top 20 material descriptions by total spend and their associated suppliers.", "TC39")
);

Scenario("TC40 — Multi-Category Suppliers Across L1 Categories", async ({ I }) =>
  runEvalTest(I, "List suppliers that appear in more than three L1 categories and show their total spend per category.", "TC40")
);

Scenario("TC41 — Invoice Currency Mix and USD-Equivalent Spend", async ({ I }) =>
  runEvalTest(I, "Show total spend by invoice currency and the equivalent spend converted to USD.", "TC41")
);

Scenario("TC42 — Region and Category Spend Matrix", async ({ I }) =>
  runEvalTest(I, "Build a matrix of total spend by region and L1 category.", "TC42")
);

Scenario("TC43 — Top Sites by Energy and Utilities Spend", async ({ I }) =>
  runEvalTest(I, "What are the top 10 sites by spend in the Energy & Utilities category?", "TC43")
);

Scenario("TC44 — Unit Price Outliers by Material", async ({ I }) =>
  runEvalTest(I, "Identify invoices where the unit price is significantly higher or lower than the average unit price for the same material.", "TC44")
);

Scenario("TC45 — Invoice Aging Buckets by Supplier", async ({ I }) =>
  runEvalTest(I, "Show invoice aging buckets by supplier based on invoice date.", "TC45")
);

Scenario("TC46 — Freight and Logistics Spend by Route", async ({ I }) =>
  runEvalTest(I, "Show total freight and logistics spend by shipping lane or route, including origin site, destination site, and carrier where available.", "TC46")
);

Scenario("TC47 — Category Hierarchy Consistency Check", async ({ I }) =>
  runEvalTest(I, "Identify any records where the combination of L1, L2, L3, and L4 categories appears inconsistent or rarely used.", "TC47")
);

Scenario("TC48 — Year-over-Year Spend Change by Supplier", async ({ I }) =>
  runEvalTest(I, "Show year-over-year spend change by supplier for the last two completed years and highlight suppliers with more than 50 percent increase or decrease.", "TC48")
);

Scenario("TC49 — Top Categories by Spend per Region", async ({ I }) =>
  runEvalTest(I, "For each region, list the top 5 L1 categories by total spend.", "TC49")
);

Scenario("TC50 — Comprehensive Spend Overview by Category", async ({ I }) =>
  runEvalTest(I, "Provide a summary of total spend, number of invoices, number of suppliers, and number of sites, broken down by L1 category.", "TC50")
);
Scenario("TC51 — Top 5 Suppliers in Energy Category NA vs EMEA Trend", async ({ I }) =>
  runEvalTest(I, "Compare 2024 spend for top 5 suppliers in Energy category between NA and EMEA regions.", "TC51")
);

Scenario("TC52 — Region vs Site Region Mismatch Spend", async ({ I }) =>
  runEvalTest(I, "List invoices where supplier region and site region mismatch along with spend impact.", "TC52")
);

Scenario("TC53 — Minority-Owned Multi-Region Supplier Trend", async ({ I }) =>
  runEvalTest(I, "Show month-wise spend for minority-owned suppliers serving more than 2 regions in 2024.", "TC53")
);

Scenario("TC54 — Material Unit Price Variation >20%", async ({ I }) =>
  runEvalTest(I, "Identify suppliers with more than 20 percent price variation for the same material across different sites.", "TC54")
);

Scenario("TC55 — PO Invoices Missing Goods Receipt", async ({ I }) =>
  runEvalTest(I, "Show invoices with PO but missing goods receipt date, and calculate the total impacted spend.", "TC55")
);

Scenario("TC56 — Freight Cost by Route for Top Materials", async ({ I }) =>
  runEvalTest(I, "Give the top 10 materials by total freight cost including origin and destination sites.", "TC56")
);

Scenario("TC57 — Suppliers Providing Logistics & IT Services", async ({ I }) =>
  runEvalTest(I, "Show suppliers that provide both Logistics and IT services with total spend by category.", "TC57")
);

Scenario("TC58 — Non-PO Aging >90 Days by Site", async ({ I }) =>
  runEvalTest(I, "Site-wise breakdown of Non-PO invoices aging more than 90 days.", "TC58")
);

Scenario("TC59 — Currency Mismatch Variance in USD", async ({ I }) =>
  runEvalTest(I, "Find invoices where invoice currency differs from PO currency and show USD variance.", "TC59")
);

Scenario("TC60 — Top Regional Suppliers Spend Split", async ({ I }) =>
  runEvalTest(I, "Region-wise spend split for suppliers that appear in top 20 by spend in any region.", "TC60")
);

Scenario("TC61 — Outlier Pricing by Category", async ({ I }) =>
  runEvalTest(I, "List categories where more than 30 percent of invoices are above the average unit price.", "TC61")
);

Scenario("TC62 — Volume vs Value Spend Growth", async ({ I }) =>
  runEvalTest(I, "Compare quarterly spend growth for suppliers with declining volume but increasing value.", "TC62")
);

Scenario("TC63 — Duplicate Material Description Detection", async ({ I }) =>
  runEvalTest(I, "Identify invoices with duplicate material description but different material codes.", "TC63")
);

Scenario("TC64 — Cross-Continent Supplier Spend Split", async ({ I }) =>
  runEvalTest(I, "Show top 10 suppliers by spend that supply to both EMEA and APAC with their share per region.", "TC64")
);

Scenario("TC65 — Spend vs Line Item Trend by Category", async ({ I }) =>
  runEvalTest(I, "Provide category spend trend versus number of invoice line items for the last 8 quarters.", "TC65")
);

Scenario("TC66 — High Non-PO Ratio Suppliers", async ({ I }) =>
  runEvalTest(I, "Highlight suppliers where more than 50 percent spend is Non-PO and show the PO versus Non-PO ratio for 2024.", "TC66")
);

Scenario("TC67 — Contract vs Spot Purchase Spend", async ({ I }) =>
  runEvalTest(I, "Site-wise contract versus spot purchase spend share for top 50 suppliers.", "TC67")
);

Scenario("TC68 — Missing Supplier Diversity Inference", async ({ I }) =>
  runEvalTest(I, "Show invoices with missing supplier diversity flag but matching other known diverse suppliers.", "TC68")
);

Scenario("TC69 — Supplier Site Coverage Decline", async ({ I }) =>
  runEvalTest(I, "Find suppliers that increased quarterly spend but reduced site coverage in 2024.", "TC69")
);

Scenario("TC70 — Price Arbitrage Savings Opportunities", async ({ I }) =>
  runEvalTest(I, "Identify top 5 highest savings opportunities by comparing material price differences across regions.", "TC70")
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
