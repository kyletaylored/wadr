/**
 * Performs entity sentiment analysis on english text data in a sheet using Cloud Natural Language (cloud.google.com/natural-language/).
 */

var COLUMN_NAME = {
  COMMENTS: 'comments',
  LANGUAGE: 'language_detected',
  TRANSLATION: 'comments_english',
  ENTITY: 'entity_sentiment',
  ID: 'id'
};

/**
 * Creates a ML Tools menu in Google Spreadsheets.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ML Tools')
    .addItem('Mark Entities and Sentiment', 'markEntitySentiment')
    .addToUi();
};

function prepareSheet() {
  
}
  

/**
* For each row in the reviewData sheet with a value in "comments" field, 
* will run the retrieveEntitySentiment function
* and copy results into the entitySentiment sheet.
*/

function markEntitySentiment() {
  // set variables for reviewData sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheetByName('reviewData');
  var rows = dataSheet.getDataRange();
  var numRows = rows.getNumRows();
  var values = rows.getValues();
  var headerRow = values[0];
  
  // checks to see if entitySentiment sheet is present; if not, creates new sheet and sets header row
  var entitySheet = ss.getSheetByName('entitySentiment');
  if (entitySheet == null) {
   ss.insertSheet('entitySentiment');
   var entitySheet = ss.getSheetByName('entitySentiment');
   var esHeaderRange = entitySheet.getRange(1,1,1,6);
   var esHeader = [['Review ID','Entity','Salience','Sentiment Score','Sentiment Magnitude','Number of mentions']];
   esHeaderRange.setValues(esHeader);
  };
  
  // find the column index for comments, language_detected, comments_english
  var commentsColumnIdx = headerRow.indexOf(COLUMN_NAME.COMMENTS);
  var languageColumnIdx = headerRow.indexOf(COLUMN_NAME.LANGUAGE);
  var translationColumnIdx = headerRow.indexOf(COLUMN_NAME.TRANSLATION);
  var entityColumnIdx = headerRow.indexOf(COLUMN_NAME.ENTITY);
  var idColumnIdx = headerRow.indexOf(COLUMN_NAME.ID);
  if (entityColumnIdx == -1) {
    Browser.msgBox("Error: Could not find the column named " + COLUMN_NAME.ENTITY + ". Please create an empty column with header \"entity_sentiment\" on the reviewData tab.");
    return; // bail
  };
  
  
  ss.toast("Analyzing entities and sentiment...");
  // Process each row 
  for (var i = 0; i < numRows; ++i) {
    var value = values[i];
    var commentEnCellVal = value[translationColumnIdx];
    var entityCellVal = value[entityColumnIdx];
    var reviewId = value[idColumnIdx];
    
    // Call retrieveEntitySentiment function for each row that has comments and also an empty entity_sentiment cell
    if(commentEnCellVal && !entityCellVal) {
        var nlData = retrieveEntitySentiment(commentEnCellVal);
        // Paste each entity and sentiment score into entitySentiment sheet
        var newValues = []
        for each (var entity in nlData.entities) {
          var row = [reviewId, entity.name, entity.salience, entity.sentiment.score, entity.sentiment.magnitude, entity.mentions.length
                    ];
          newValues.push(row);
        }
        if(newValues.length) {
          entitySheet.getRange(entitySheet.getLastRow() + 1, 1, newValues.length, newValues[0].length).setValues(newValues);
        }
        // Paste "complete" into entity_sentiment column to denote completion of NL API call
        dataSheet.getRange(i+1, entityColumnIdx+1).setValue("complete");
     }
   }
};

/**
 * Gets Wappalyzer information from domain.
 * @param {String} url The URL of the domain to check.
 * @return {Object} a list of Wappalyzer detected applications.
 */

function retrieveEntitySentiment (url) {
  var cloudUrl = "https://api-thing.google-cloud-functions.net";
  var apiEndpoint = cloudUrl + '?url=' + apiKey;

  //  Fetch data
  var response = UrlFetchApp.fetch(apiEndpoint);
  return JSON.parse(response);
};