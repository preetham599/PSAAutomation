const { I } = inject();
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const workspacePage = require("../../pages/WorkspacePage");
const masterdataPage = require("../../pages/MasterdataPage");
const importPage = require("../../pages/ImportPage");
const commonFunctions = require("../../pages/CommonFunctions");

const email = process.env.EMAIL_no;
const password = process.env.PASSWORD_no;

Feature("Data Ingestion");

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

Scenario("Upload files and validate record count increment", async () => {
  const expectedIncrementPerFile = 100;

  // BEFORE count
  const beforeCount = await commonFunctions.getTotalRecordCount();
  I.say(`Before upload count: ${beforeCount}`);

  I.waitForVisible(importPage.btnImport(), 30);
  I.click(importPage.btnImport());

  // Relative path from project root
  const importDir = "TestData/ImportFiles";

  const files = fs
    .readdirSync(importDir)
    .filter(file => file.endsWith(".csv"));

  if (files.length === 0) {
    throw new Error("No CSV files found in TestData/ImportFiles");
  }

  const totalFiles = files.length;
  I.say(`Total CSV files: ${totalFiles}`);

  I.waitForVisible(importPage.btnUpload(), 20);

  for (const file of files) {
    const relativeFilePath = path.join(importDir, file);
    I.attachFile(importPage.fileInput(), relativeFilePath);
    I.say(`Attached: ${relativeFilePath}`);
  }

  I.click(importPage.btnUpload());

  await commonFunctions.waitForStatusCount(
    importPage.uploadSuccess(),
    totalFiles
  );

  I.click(importPage.btnNext());

  await commonFunctions.waitForStatusCount(
    importPage.processedStatus(),
    totalFiles
  );
  I.click(importPage.btnNext());
  I.waitForVisible(importPage.btnApproveAndSave(), 20);
  I.click(importPage.btnApproveAndSave());
  I.waitForVisible(importPage.btnImport(), 40);
  const expectedIncrement = 100;
  // AFTER count
  const afterCount = await commonFunctions.waitForRecordCountIncrement(
    beforeCount,
    expectedIncrement,
    60,   // wait up to 60 seconds
    5     // poll every 5 seconds
  );

  I.say(`After upload count (updated): ${afterCount}`);


  if (afterCount !== beforeCount + expectedIncrement) {
    throw new Error(
      `Record count mismatch:
       Before=${beforeCount}
       After=${afterCount}
       ExpectedIncrement=${expectedIncrement}`
    );
  }

  I.say("Record count increment validated successfully");
});

export {};
