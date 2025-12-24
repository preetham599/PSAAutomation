const { I } = inject();
const assert = require("assert");
require("dotenv").config();

const workspacePage = require("../../pages/WorkspacePage");
const enrichmentPage = require("../../pages/EnrichmentPage");
const masterdataPage = require("../../pages/MasterdataPage");

const email = process.env.EMAIL_no;
const password = process.env.PASSWORD_no;

/**
 * Expected column sequence (subsequence validation)
 */
const expectedColumns = [
  "Invoice_region",
  "Invoice_month_year",
  "Supplier_suppliername",
  "Ai_supplier_name",
  "Invoice_description",
  "Ai_invoice_material_desc",
  "Ai_category_l1",
  "Ai_category_l2",
  "Ai_category_l3",
  "Ai_category_l4",
  "Po_amount",
  "Po_amountcurrency",
  "Ai_exchange_rate",
  "Ai_amount_usd",
  "Ai_conversion_rate",
  "Classification_desc",
  "Classification_method",
  "Llm_confidence",
  "Rag_confidence",
  "Account_accountname",
  "Account_chartofaccountsid",
  "Account_chartofaccountsname",
  "Account_companycode",
  "Account_majoraccountid",
  "Account_majoraccountname",
  "Ai_erpcommodity_commodityname",
  "Ai_fd10_fieldname1",
  "Ai_fd3_fieldname",
  "Ai_fd9_fieldname",
  "Ai_part_desc",
  "Ai_po_description",
  "Ai_source_type",
  "Classification_desc_type",
  "Companysite_sitename",
  "Contract_contractname",
  "Costcenter_companycode",
  "Costcenter_costcentername",
  "Costcenter_costcentername_upper",
  "Erpcommodity_commodityname",
  "Erpcommodity_commoditytype",
  "Fd10_fieldname1",
  "Fd3_fieldname",
  "Fd7_fieldname",
  "Fd7_fieldname_desc",
  "Fd9_fieldname",
  "Ingredion_user_supervisorid",
  "Ingredion_user_username",
  "Invoice_accountcompanycode",
  "Invoice_accountid",
  "Invoice_accountingdate",
  "Invoice_amount",
  "Invoice_amountcurrency",
  "Invoice_appaymentterms",
  "Invoice_companysiteid",
  "Invoice_contractid",
  "Invoice_costcentercompanycode",
  "Invoice_costcenterid",
  "Invoice_extrainvoicekey",
  "Invoice_extrainvoicelinekey",
  "Invoice_extrapolinekey",
  "Invoice_invoicedate",
  "Invoice_invoiceid",
  "Invoice_invoicelinenumber",
  "Invoice_invoicenumber",
  "Invoice_linetype",
  "Invoice_paiddate",
  "Invoice_partnumber",
  "Invoice_poid",
  "Invoice_polinenumber",
  "Invoice_quantity",
  "Invoice_splitaccountingnumber",
  "Invoice_supplierid",
  "Invoice_supplierlocationid",
  "Invoice_unitofmeasure",
  "Part_description1",
  "Part_manufacturername",
  "Po_desc",
  "Po_ordereddate",
  "Row_id",
  "Row_num",
  "Supplier_annumber",
  "Supplier_certifieddisabledowned",
  "Supplier_certifieddisadvantaged",
  "Supplier_certifieddiversity",
  "Supplier_certifiedethnicity",
  "Supplier_certifiedhubzone",
  "Supplier_certifiedminorityowned",
  "Supplier_certifiedsba8a",
  "Supplier_certifiedsdb",
  "Supplier_certifiedveteranowned",
  "Supplier_certifiedwomanowned",
  "Supplier_city",
  "Supplier_contactemail",
  "Supplier_contactfirstname",
  "Supplier_contactlastname",
  "Supplier_contactphonenumber",
  "Supplier_country",
  "Supplier_disadvantagedenterprise",
  "Supplier_diversity",
  "Supplier_diversitydisabledowned",
  "Supplier_diversitydvo",
  "Supplier_diversityenterprise",
  "Supplier_diversityethnicity",
  "Supplier_diversityglbtowned",
  "Supplier_diversitygreen",
  "Supplier_diversityhbcu",
  "Supplier_diversityhubzone",
  "Supplier_diversitylaborsurplus",
  "Supplier_diversitysba8a",
  "Supplier_diversitysdb",
  "Supplier_diversitysmallbusiness",
  "Supplier_dunsnumber",
  "Supplier_dvoenterprise",
  "Supplier_ethnicityenterprise",
  "Supplier_faxnumber",
  "Supplier_minorityowned",
  "Supplier_minorityownedenterprise",
  "Supplier_numberofemployees",
  "Supplier_orderroutingtype",
  "Supplier_paymenttype",
  "Supplier_postalcode",
  "Supplier_preferredlanguage",
  "Supplier_state",
  "Supplier_streetaddress",
  "Supplier_supplierid",
  "Supplier_suppliertype",
  "Supplier_veteranowned",
  "Supplier_veteranownedenterprise",
  "Supplier_womanowned",
  "Supplier_womanownedenterprise",
  "Uommap_preferred",
  "Uommap_value"
];

Feature("Enrichment Flow — Column Order Validation");

/**
 * Login once
 */
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

Scenario("Verify expected columns appear in correct sequence", async () => {
  // Navigate to table
  I.waitForVisible(enrichmentPage.btnEnrichment(), 30);


  I.waitForVisible('//th//span[normalize-space()]', 30);

  // Reset horizontal scroll
  await I.executeScript(() => {
    const el = document.querySelector(".ag-body-horizontal-scroll");
    if (el) el.scrollLeft = 0;
  });

  // Grab UI columns
  const actualColumns = await I.grabTextFromAll(
    '//th//span[normalize-space()]'
  );

  const uiColumns = actualColumns.map(col =>
    col.trim().replace(/\s+/g, " ")
  );

  I.say(`UI columns found: ${uiColumns.length}`);

  // Subsequence validation
  let uiIndex = 0;

  for (const expected of expectedColumns) {
    let found = false;

    while (uiIndex < uiColumns.length) {
      if (uiColumns[uiIndex] === expected) {
        I.say(`✔ Found ${expected} at UI position ${uiIndex + 1}`);
        found = true;
        uiIndex++; // move forward for next expected column
        break;
      }
      uiIndex++;
    }

    if (!found) {
      throw new Error(
        `Column "${expected}" not found in correct order`
      );
    }
  }

  I.say("All expected columns are present in correct sequence");
});

export {};
