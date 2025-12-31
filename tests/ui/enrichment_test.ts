const { I } = inject();
const assert = require("assert");
require("dotenv").config();

const workspacePage = require("../../pages/WorkspacePage");
const enrichmentPage = require("../../pages/EnrichmentPage");
const masterdataPage = require("../../pages/MasterdataPage");
const commonFunctions = require("../../pages/CommonFunctions");

const email = process.env.EMAIL_no;
const password = process.env.PASSWORD_no;

let generatedColumns: string[] = [];

Feature("Enrichment Flow");

// Login once before scenarios
Before(async () => {
  I.amOnPage("https://spendz-dev.awsp.oraczen.xyz/workspaces");
  I.waitForVisible('//input[@placeholder="example@oraczen.ai"]', 30);
  I.fillField('//input[@placeholder="example@oraczen.ai"]', email);
  I.fillField('//input[@type="password"]', password);
  I.click('//button[text()="Login"]');

  I.waitForVisible(workspacePage.btnSettings(), 20);
  I.click(workspacePage.btnSettings());
  I.waitForVisible(masterdataPage.data(), 20);
  I.click(masterdataPage.data());
});

// Cleanup generated columns after each scenario
After(async () => {
  for (const col of generatedColumns) {
    try {
      await commonFunctions.deleteGeneratedColumn(col);
    } catch (e) {
      I.say(`Cleanup failed for column: ${col}`);
    }
  }
  generatedColumns.length = 0;
});

// Single column language enrichment
Scenario("Verify single column language enrichment", async () => {
  // Ensure workspace data page is fully loaded
  I.waitForVisible(enrichmentPage.btnEnrichment(), 30);
  I.waitForEnabled(enrichmentPage.btnEnrichment(), 30);
  I.click(enrichmentPage.btnEnrichment());
  I.click(enrichmentPage.btnSourceDrpDown());
  I.click(enrichmentPage.valueList("invoice_region"));
  I.click(enrichmentPage.btnLanguageDrpDown());
  I.click(enrichmentPage.valueList("thai"));
  I.click(enrichmentPage.btnSubmit());

  await commonFunctions.waitForJobCompletion();

  // Click arrow icon next to generated column
  I.waitForVisible(enrichmentPage.btnNavigateToColumn(), 10);
  I.click(enrichmentPage.btnNavigateToColumn());
  const generatedColumn = await I.grabTextFrom(
    '//p[text()="Target Column(s):"]//span'
  );

  generatedColumns.push(generatedColumn);

  const colIndex = await commonFunctions.getColumnIndex(generatedColumn);
  await commonFunctions.validateFirstNRows(colIndex, "อีเอ็มอีเอ");
});

// Multi-column language enrichment
Scenario("Verify multi-column language enrichment", async () => {
  const sourceColumns = ["supplier_city", "account_majoraccountname"];
  const expectedTranslations: Record<string, string> = {
    supplier_city: "班达尔恩斯特克",
    account_majoraccountname: "玉米产品国际"
  };

  // Ensure workspace data page is fully loaded
  I.waitForVisible(enrichmentPage.btnEnrichment(), 30);
  I.waitForEnabled(enrichmentPage.btnEnrichment(), 30);
  I.click(enrichmentPage.btnEnrichment());
  I.click(enrichmentPage.btnSourceDrpDown());
  sourceColumns.forEach(col => I.click(enrichmentPage.valueList(col)));
  I.click(enrichmentPage.btnLanguageDrpDown());
  I.click(enrichmentPage.valueList("chinese"));
  I.click(enrichmentPage.btnSubmit());

  await commonFunctions.waitForJobCompletion();

  const raw = await I.grabTextFromAll(
    '//p[text()="Target Column(s):"]//span'
  );

  const generatedCols = raw.flatMap(t =>
    t.split(",").map(c => c.trim())
  );

  generatedCols.forEach(col => generatedColumns.push(col));

  for (let i = 0; i < generatedCols.length; i++) {
    const colIndex = await commonFunctions.getColumnIndex(generatedCols[i]);
    await commonFunctions.validateFirstNRows(
      colIndex,
      expectedTranslations[sourceColumns[i]]
    );
  }
});
Scenario("Verify web scraping enrichment - target column displayed", async () => {
  I.waitForVisible(enrichmentPage.btnEnrichment(), 30);
  I.waitForEnabled(enrichmentPage.btnEnrichment(), 30);
  I.click(enrichmentPage.btnEnrichment());

  // Wait for enrichment panel
  I.waitForVisible(enrichmentPage.enrichDrpDown(), 10);

  I.click(enrichmentPage.enrichDrpDown());
  I.click(enrichmentPage.enrichList("Web Scraper"));

  // Wait for prompt UI
  I.waitForVisible(
    enrichmentPage.textInput("Show Detailed Prompt"),
    10
  );

  I.click(enrichmentPage.textInput("Show Detailed Prompt"));
  I.fillField(
    enrichmentPage.txtAreaWithPlaceholder("Enter your prompt"),
    "give suppliers who use these items from /erpcommodity_commodityname"
  );

  // Trigger prompt commit
  I.pressKey("Enter");

  // Wait until Submit becomes enabled
  I.waitForEnabled(enrichmentPage.btnSubmit(), 10);
  I.click(enrichmentPage.btnSubmit());

  // Job completion wait
  await commonFunctions.waitForJobCompletion();

  // Wait for target column metadata
  I.waitForVisible(
    '//p[text()="Target Column(s):"]//span',
    15
  );

  const generatedCols = await I.grabTextFromAll(
    '//p[text()="Target Column(s):"]//span'
  );

  generatedCols.forEach(col => generatedColumns.push(col));

  assert.ok(generatedCols.length > 0, "No target columns were generated");

  const generatedColumn = generatedCols[0];
  I.say(`Generated column: ${generatedColumn}`);

  // Navigate to column (UI visibility)
  I.waitForVisible(enrichmentPage.btnNavigateToColumn(generatedColumn), 10);
  I.click(enrichmentPage.btnNavigateToColumn(generatedColumn));

  // Small visual wait
  I.wait(1);

  // Assert column header visible
  I.waitForVisible(
    `//th//span[normalize-space()="${generatedColumn}"]`,
    20
  );
});

Scenario("Verify currency convertor - target column displayed", async () => {
  // Open enrichment panel
  I.waitForVisible(enrichmentPage.btnEnrichment(), 30);
  I.waitForEnabled(enrichmentPage.btnEnrichment(), 30);
  I.click(enrichmentPage.btnEnrichment());

  // Wait for enrichment dropdown
  I.waitForVisible(enrichmentPage.enrichDrpDown(), 10);
  I.click(enrichmentPage.enrichDrpDown());

  // Select Currency Convertor
  I.waitForVisible(enrichmentPage.enrichList("Currency Convertor"), 10);
  I.click(enrichmentPage.enrichList("Currency Convertor"));

  // Wait for currency form to load
  I.waitForVisible(enrichmentPage.currencySrcColDrpDown(), 10);

  // Select source amount column
  I.click(enrichmentPage.currencySrcColDrpDown());
  I.waitForVisible(enrichmentPage.valueList("invoice_amount"), 10);
  I.click(enrichmentPage.valueList("invoice_amount"));

  // Select associated currency column
  I.waitForVisible(enrichmentPage.associatedCurrencyColDrpDown(), 10);
  I.click(enrichmentPage.associatedCurrencyColDrpDown());
  I.waitForVisible(enrichmentPage.valueList("invoice_amountcurrency"), 10);
  I.click(enrichmentPage.valueList("invoice_amountcurrency"));

  // Select target currency
  I.waitForVisible(enrichmentPage.currencyDrpDown(), 10);
  I.click(enrichmentPage.currencyDrpDown());
  I.waitForVisible(enrichmentPage.valueList("INR"), 10);
  I.click(enrichmentPage.valueList("INR"));

  // Submit
  I.waitForEnabled(enrichmentPage.btnSubmit(), 10);
  I.click(enrichmentPage.btnSubmit());

  // Wait for job completion
  await commonFunctions.waitForJobCompletion();

  // Wait for target column metadata
  I.waitForVisible(
    '//p[text()="Target Column(s):"]//span',
    15
  );

  // Capture generated columns
  const generatedCols = await I.grabTextFromAll(
    '//p[text()="Target Column(s):"]//span'
  );

  generatedCols.forEach(col => generatedColumns.push(col));

  assert.ok(generatedCols.length > 0, "No target columns were generated");

  const generatedColumn = generatedCols[0];
  I.say(`Generated column: ${generatedColumn}`);

  // Navigate to generated column
  I.waitForVisible(
    enrichmentPage.btnNavigateToColumn(generatedColumn),
    10
  );
  I.click(enrichmentPage.btnNavigateToColumn(generatedColumn));

  // Assert column header visible
  I.waitForVisible(
    `//th//span[normalize-space()="${generatedColumn}"]`,
    20
  );
});

export {};
