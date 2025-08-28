// Add these functions to your Google Apps Script project

// =================================================================
// TRANSACTION TAGS MANAGEMENT
// =================================================================
const TRANSACTION_TAGS_SHEET_NAME = "Transaction Tags";

/**
 * Sets a custom tag for a specific transaction
 */
function setTransactionTag_(params) {
  if (!params.transactionId || !params.tagType || !params.tagValue) {
    throw new Error("Missing required parameters: transactionId, tagType, tagValue");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TRANSACTION_TAGS_SHEET_NAME);
  
  // Create the sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(TRANSACTION_TAGS_SHEET_NAME);
    sheet.appendRow(["Transaction_ID", "Tag_Type", "Tag_Value", "Updated_Date"]);
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  let rowFound = false;

  // Look for existing tag for this transaction and type
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.transactionId && data[i][1] === params.tagType) {
      // Update existing tag
      sheet.getRange(i + 1, 3).setValue(params.tagValue); // Tag_Value
      sheet.getRange(i + 1, 4).setValue(new Date()); // Updated_Date
      rowFound = true;
      break;
    }
  }

  // If no existing tag found, add new row
  if (!rowFound) {
    sheet.appendRow([
      params.transactionId,
      params.tagType,
      params.tagValue,
      new Date()
    ]);
  }

  return { 
    status: 'success', 
    message: `Tag ${params.tagType} set to '${params.tagValue}' for transaction ${params.transactionId}` 
  };
}

/**
 * Gets all custom tags for a specific transaction
 */
function getTransactionTags_(params) {
  if (!params.transactionId) {
    throw new Error("Missing required parameter: transactionId");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TRANSACTION_TAGS_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return {}; // No tags found
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  const tags = {};

  // Find all tags for this transaction
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.transactionId) {
      tags[data[i][1]] = data[i][2]; // tagType: tagValue
    }
  }

  return tags;
}

/**
 * Gets all transaction tags (for bulk operations)
 */
function getAllTransactionTags_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TRANSACTION_TAGS_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return {}; // No tags found
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  const allTags = {};

  // Group tags by transaction ID
  for (let i = 1; i < data.length; i++) {
    const transactionId = data[i][0];
    const tagType = data[i][1];
    const tagValue = data[i][2];

    if (!allTags[transactionId]) {
      allTags[transactionId] = {};
    }
    allTags[transactionId][tagType] = tagValue;
  }

  return allTags;
}

// =================================================================
// UPDATE THE MAIN doGet FUNCTION
// =================================================================
// Add these cases to your existing doGet switch statement:

/*
      case 'setTransactionTag': 
        result = setTransactionTag_(e.parameter); 
        break;
      case 'getTransactionTags': 
        result = getTransactionTags_(e.parameter); 
        break;
      case 'getAllTransactionTags': 
        result = getAllTransactionTags_(); 
        break;
*/

// =================================================================
// ENHANCED getTransactions FUNCTION
// =================================================================
// Update your existing getTransactions_ function to include tag data:

function getTransactions_(params) {
  const { transactions, categoryRules } = getAllData_();
  let data = transactions;

  // Apply existing filters...
  if (params.year) data = data.filter(r => r.Timestamp.getFullYear() == params.year);
  if (params.month) data = data.filter(r => (r.Timestamp.getMonth() + 1) == params.month);
  if (params.q) data = data.filter(r => r.Recipient_Merchant.toLowerCase().includes(params.q.toLowerCase()));
  if (params.bank) data = data.filter(r => r.Bank === params.bank);
  if (params.method) data = data.filter(r => r.Transaction_Method === params.method);
  if (params.type) data = data.filter(r => r.Debit_Credit === params.type);

  // Get all custom tags
  const allTags = getAllTransactionTags_();

  // Apply categories and custom tags to each transaction
  data.forEach(row => {
    // Apply category rules
    row.Category = categoryRules[row.Recipient_Merchant.toLowerCase()] || "Uncategorized";
    
    // Apply custom tags
    row.CustomTags = allTags[row.Transaction_ID] || {};
  });

  return data;
}