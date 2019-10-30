/**
 * Creates an Actions menu in Google Spreadsheets.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Actions')
    .addItem('Process Wappalyzer URLs', 'processUrls')
    .addToUi();
};

function prepareSheet(ss) {
 // checks to see if entitySentiment sheet is present; if not, creates new sheet and sets header row
 var sheetName = 'domainReport';
 var domainReport = ss.getSheetByName(sheetName);
 if (domainReport == null) {
  ss.insertSheet(sheetName);
  var domainReport = ss.getSheetByName(sheetName);
  var esHeaderRange = domainReport.getRange(1,1,1,7);
  var esHeader = [['Domain','CMS','Web Server','CDN','PaaS','Reverse Proxy', 'Pages']];
  esHeaderRange.setValues(esHeader);
 }; 
 return domainReport;
}
  
/**
* For each row in the reviewData sheet with a value in "comments" field, 
* will run the retrieveEntitySentiment function
* and copy results into the entitySentiment sheet.
*/

function processUrls() {
  // Setup variables.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheets()[0];
  //var dataSheet = ss.getActiveSheet();
  var rows = dataSheet.getDataRange();
  var numRows = rows.getNumRows();
  var values = rows.getValues();
  var headerRow = values[0];

  // Prepare the report sheet.
  var domainReport = prepareSheet(ss);
  
  // Find domain column
  var domainColumn = headerRow.indexOf('Domain');
  if (domainColumn == -1) {
    Browser.msgBox("Error: Could not find the column named Domain. Please create an empty column with header \"Domain\" on the current tab.");
    return; // bail
  };
  
  
  ss.toast("Analyzing domains...");
  // Process each row 
  for (var i = 1; i < numRows; ++i) {
    var value = values[i];
    var domain = value[domainColumn];
    
    // Call getCategories function for each row that has a domain.
    if (domain) {
        var data = getCategories(domain);
        Logger.log(data);
        // Paste categories into new sheet.
        var row = [];
        row.push(domain, data['1'], data['22'], data['27'], data['31'], data['62'], data['64']);
        domainReport.appendRow(row);
        // Paste "complete" into next column to denote completion of Wappalyzer call
        // dataSheet.getRange(i, domainColumn+1).setValue("complete");
      
        ss.toast(row.join(", "));
        console.log(row);
     }
     Utilities.sleep(2500);// pause in the loop
   }
};

/**
 * Gets Wappalyzer information from domain.
 * @param {String} url The URL of the domain to check.
 * @return {Object} a list of Wappalyzer detected applications.
 */

function getCategories (url) {
  var apiEndpoint = "https://us-central1-wadr-report.cloudfunctions.net/process-domain?url=" + url;

  //  Fetch data
  var response = UrlFetchApp.fetch(apiEndpoint, {muteHttpExceptions: true});
  console.log("responseCode", response.getResponseCode());
  console.log("contentText", response.getContentText());
  console.log("headers", response.getHeaders());
  var res = (parseInt(response.getResponseCode()) !== 200) ? JSON.stringify("{}") : response;
  console.log("response parse", res);
  return JSON.parse(res);
};