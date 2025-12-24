
class EnrichmentPage {

  btnEnrichment(){return `//button[@aria-label="Floating action button"]`}
  enrichDrpDown(){return `//button[@role="combobox" and contains(@dir,"ltr")]`}
  enrichList(name){return `[role="option"]:has-text("${name}")`}
  textInput(name){return `//span[text()="${name}"]`}
  btnExpandJobDetails(){return `//button[contains(text(),"Tool")]//*[local-name()="svg" and contains(@class,"down")]`}
  btnNavigateToColumn(){return `//button//*[local-name()="svg" and contains(@class,"arrow-right")]`}
  txtAreaWithPlaceholder(name){return `//textarea[@placeholder="${name}"]`}
  btnColumnMenu(name){return `//span[text()="${name}"]//parent::div//following-sibling::div//button`}
  btnDeleteColumn(){return `//div[@role="menuitem" and contains(text(),"Delete Column")]`}
  btnSourceDrpDown(){return `//div//span[text()="Select Column(s)"]//ancestor::button`}
  currencySrcColDrpDown(){return `//div//span[text()="Convert"]//following-sibling::span[text()="Select Column"]//ancestor::button`}
  associatedCurrencyColDrpDown(){return `//div//span[text()="Column:"]//following-sibling::span[text()="Select Column"]//ancestor::button`}
  currencyDateColDrpDown(){return `//div//span[text()="Date:"]//following-sibling::span[text()="Select Column"]//ancestor::button`}
  currencyDrpDown(){return `//div//span[text()="Select Currency"]//ancestor::button`}
  btnLanguageDrpDown(){return `//div//span[text()="Select language"]//ancestor::button`}
  valueList(name){return `//div[@aria-label="Suggestions"]//div[@data-value="${name}"]`}
  btnSubmit(){return `//button[@type="submit"]`}
}

module.exports = new EnrichmentPage();
