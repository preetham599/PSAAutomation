
class ImportPage {

  btnImport() {return `//button[contains(text(),"Upload Data")]`;}
  fileInput() {return `//input[@type="file"]`;}
  btnUpload() {return `(//button[starts-with(normalize-space(),"Upload")])[2]`;}
  btnNext()  {return '//button//span[contains(text(),"Next")]';}
  btnApproveAndSave()  {return '//button[contains(text(),"Approve")]';}
  uploadSuccess()  {return '//div[contains(text(),"Successfully uploaded")]';}
  processedStatus()  {return '//div[contains(text(),"Processed")]';}
  recordCount()  {return '//span[@data-testid="record-count"]';}
}

module.exports = new ImportPage();
export {};