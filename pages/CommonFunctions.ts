const assert = require("assert");
const enrichmentPage = require("./EnrichmentPage");
const translator = require("../src/utils/translator");

class CommonFunctions {

  normalize(text: string): string {
      return text
        .replace(/\s+/g, " ")
        .replace(/[，。]/g, "")
        .trim();
  }

  // Delete generated column if exists
  async deleteGeneratedColumn(columnName: string) {
    const { I } = inject();

    if (!columnName) return;

    const headerXpath = `//th//span[normalize-space()="${columnName}"]`;

    const exists = await I.grabNumberOfVisibleElements(headerXpath);

    if (!exists) {
      I.say(`Column ${columnName} already deleted`);
      return;
    }

    I.say(`Deleting column: ${columnName}`);

    // Open column menu
    I.waitForVisible(enrichmentPage.btnColumnMenu(columnName), 10);
    I.click(enrichmentPage.btnColumnMenu(columnName));

    // Delete flow
    I.waitForVisible(enrichmentPage.btnDeleteColumn(), 10);
    I.click(enrichmentPage.btnDeleteColumn());

    I.waitForVisible('//button[text()="Delete"]', 10);
    I.click('//button[text()="Delete"]');

    // Wait until column header disappears (max 60s)
    I.waitForInvisible(headerXpath, 60);

    I.say(`Column deleted successfully: ${columnName}`);
  }

  async validateGeneratedColumnWithOpenRouter(
    sourceColumnName: string,
    generatedColumnName: string,
    language: string,
    rows = 30
  ): Promise<void> {
    const { I } = inject();
    const sourceColIndex = await this.getColumnIndex(sourceColumnName);
    const targetColIndex = await this.getColumnIndex(generatedColumnName);
    I.say(
      `DEBUG → sourceColumn="${sourceColumnName}", sourceColIndex=${sourceColIndex}`
    );
    I.say(
      `DEBUG → generatedColumn="${generatedColumnName}", targetColIndex=${targetColIndex}`
    );
    for (let row = 1; row <= rows; row++) {
      await this.scrollUntilRowVisible(row);
      const sourceText = (
        await I.grabTextFrom(`//tbody/tr[${row}]/td[${sourceColIndex}]`)
      ).trim();
     const headerAtSourceIndex = await I.grabTextFrom(
       `(//th)[${sourceColIndex}]`
     );

     I.say(
       `DEBUG → Header at sourceColIndex (${sourceColIndex}) = "${headerAtSourceIndex}"`
     );
      const generatedText = (
        await I.grabTextFrom(`//tbody/tr[${row}]/td[${targetColIndex}]`)
      ).trim();

      // Handle empty source rows
      if (!sourceText) {
        assert.ok(
          generatedText === "" || generatedText === "SOURCE TEXT IS EMPTY",
          `Row ${row}: Expected empty output but got "${generatedText}"`
        );
        continue;
      }

      const translated = await translator.translateText(sourceText, language);

      I.say(
        `Row ${row} | Source="${sourceText}" | OR="${translated}" | Generated="${generatedText}"`
      );

      assert.strictEqual(
        this.normalize(generatedText),
        this.normalize(translated),
        `Row ${row}: OpenRouter validation failed`
      );
    }
  }

  // Wait for job completion and expand details
  async waitForJobCompletion() {
    const { I } = inject();

    I.waitForVisible('//div[contains(text(),"completed")]', 180);
    I.waitForVisible(enrichmentPage.btnExpandJobDetails(),60);
    I.click(enrichmentPage.btnExpandJobDetails());
  }

  // Get column index dynamically
  async getColumnIndex(columnName: string): Promise<number> {
    const { I } = inject();

    return (
      (await I.grabNumberOfVisibleElements(
        `//th//span[normalize-space()="${columnName}"]/ancestor::th/preceding-sibling::th`
      )) + 1
    );
  }

  // Scroll until row is visible
  async scrollUntilRowVisible(row: number) {
    const { I } = inject();
    const rowLocator = `//tbody/tr[${row}]`;
    let attempts = 0;

    while (attempts < 15) {
      const visible = await I.grabNumberOfVisibleElements(rowLocator);
      if (visible > 0) return;

      await I.executeScript(() => {
        const el = document.querySelector(".overflow-auto");
        if (el) el.scrollBy(0, 300);
      });

      I.wait(0.5);
      attempts++;
    }
  }

  async waitForRecordCountIncrement(
    beforeCount,
    expectedIncrement,
    timeoutSec = 60,
    pollIntervalSec = 5
  ) {
    const { I } = inject();
    const maxAttempts = Math.ceil(timeoutSec / pollIntervalSec);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const currentCount = await this.getTotalRecordCount();
      I.say(`Polling record count [${attempt}]: ${currentCount}`);

      if (currentCount >= beforeCount + expectedIncrement) {
        return currentCount;
      }

      await new Promise(res => setTimeout(res, pollIntervalSec * 1000));
    }

    throw new Error(
      `Record count did not update within ${timeoutSec}s.
       Before=${beforeCount}
       ExpectedIncrement=${expectedIncrement}`
    );
  }

  async getTotalRecordCount(): Promise<number> {
    const { I } = inject();

    const locator = '//div[contains(@class,"whitespace-nowrap")]//p';
    I.waitForVisible(locator, 30);

    const text = await I.grabTextFrom(locator);
    I.say(`Record counter text: ${text}`);

    const match = text.match(/of\s+([\d,]+)/i);
    if (!match) {
      throw new Error(`Unable to parse record count from "${text}"`);
    }

    return Number(match[1].replace(/,/g, ""));
  }

  async waitForStatusCount(
    locator: string,
    expectedCount: number,
    timeoutSec = 180
  ) {
    const { I } = inject();
    const start = Date.now();

    while ((Date.now() - start) / 1000 < timeoutSec) {
      const count = await I.grabNumberOfVisibleElements(locator);
      if (count === expectedCount) {
        I.say(`Found ${count}/${expectedCount} statuses`);
        return;
      }
      I.wait(2);
    }

    throw new Error(
      `Expected ${expectedCount} elements for ${locator} but not reached`
    );
  }

  // Validate first N rows
  async validateFirstNRows(colIndex: number, expectedValue: string, rows = 30) {
    const { I } = inject();

    for (let row = 1; row <= rows; row++) {
      await this.scrollUntilRowVisible(row);

      const cell = `//tbody/tr[${row}]/td[${colIndex}]`;
      I.waitForVisible(cell, 20);
      const text = await I.grabTextFrom(cell);

      I.say(`Row ${row}: ${text}`);
      assert.ok(text.trim(), `Row ${row} is empty`);
      assert.ok(
        text.includes(expectedValue),
        `Row ${row} mismatch → expected "${expectedValue}", actual "${text}"`
      );
    }
  }
}

module.exports = new CommonFunctions();
export {};