// =================================================================
// MYFINANCES API BACKEND - CLEAN VERSION (API ONLY)
// =================================================================
// CONFIGURATION - UPDATE THESE VALUES FOR YOUR SETUP
// =================================================================
const SPREADSHEET_ID = 'your-google-sheet-id-here'; // UPDATE: Your Google Sheet ID
const DEST_SHEET_NAME = 'Sheet1'; // UPDATE: Your main transaction sheet name
const CATEGORY_RULES_SHEET_NAME = "Category Rules";
const TRANSACTION_TAGS_SHEET_NAME = "Transaction Tags";
// =================================================================

/**
 * Main entry point for all GET requests. Pure API - no authentication logic.
 */
function doGet(e) {
  try {
    // No authentication handling here - this is pure API
    const cache = CacheService.getScriptCache();
    const cacheKey = JSON.stringify(e.parameter);

    const CACHEABLE_ACTIONS = ['getSummary', 'getFilterOptions', 'getTransactions'];
    if (CACHEABLE_ACTIONS.includes(e.parameter.action)) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return createJsonpResponse(JSON.parse(cached), e.parameter.callback);
      }
    }

    let result = {};
    switch (e.parameter.action) {
      case 'getTransactions': 
        result = getTransactions_(e.parameter); 
        cache.put(cacheKey, JSON.stringify(result), 1800); 
        break;
      case 'getSummary': 
        result = getSummary_(e.parameter); 
        cache.put(cacheKey, JSON.stringify(result), 3600); 
        break;
      case 'getChartData': 
        result = getChartData_(e.parameter); 
        break;
      case 'getFilterOptions': 
        result = getFilterOptions_(); 
        cache.put(cacheKey, JSON.stringify(result), 21600); 
        break;
      case 'setCategoryRule': 
        result = setCategoryRule_(e.parameter); 
        break;
      case 'setTransactionTag': 
        result = setTransactionTag_(e.parameter); 
        break;
      case 'getTransactionTags': 
        result = getTransactionTags_(e.parameter); 
        break;
      case 'getAllTransactionTags': 
        result = getAllTransactionTags_(); 
        break;
      default: 
        result = { error: 'Invalid action specified.' };
    }

    return createJsonpResponse(result, e.parameter.callback);

  } catch (error) {
    Logger.log(`API Error: ${error.toString()}`);
    return createJsonpResponse({ error: error.toString() }, e.parameter.callback);
  }
}

// Helper function to create JSONP responses
function createJsonpResponse(data, callback) {
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

  if (callback) {
    // JSONP response
    const jsonpContent = `${callback}(${jsonData});`;
    return ContentService.createTextOutput(jsonpContent).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // Regular JSON response
    return ContentService.createTextOutput(jsonData).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * =================================================================
 * Helper Function to get all transactions and category rules
 * =================================================================
 */
function getAllData_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(DEST_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${DEST_SHEET_NAME}" not found.`);

  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values.shift();

  const transactions = values.map(row => {
    let obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    obj.Timestamp = new Date(obj.Timestamp);
    return obj;
  });

  const categorySheet = ss.getSheetByName(CATEGORY_RULES_SHEET_NAME);
  const categoryRules = {};
  if (categorySheet && categorySheet.getLastRow() > 1) {
    const rulesData = categorySheet.getDataRange().getValues();
    rulesData.slice(1).forEach(row => {
      if (row[0]) categoryRules[row[0].toLowerCase()] = row[1];
    });
  }

  return { transactions, categoryRules };
}

/**
 * =================================================================
 * API Endpoint Functions
 * =================================================================
 */

function getTransactions_(params) {
  const { transactions, categoryRules } = getAllData_();
  let data = transactions;

  // Date range filtering
  if (params.startDate && params.endDate) {
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    data = data.filter(r => {
      const txnDate = new Date(r.Timestamp);
      return txnDate >= startDate && txnDate <= endDate;
    });
  }

  // Legacy date filtering
  if (params.year) data = data.filter(r => r.Timestamp.getFullYear() == params.year);
  if (params.month) data = data.filter(r => (r.Timestamp.getMonth() + 1) == params.month);

  // Bank filtering
  if (params.banks && params.banks.trim()) {
    const bankList = params.banks.split(',').map(b => b.trim());
    data = data.filter(r => bankList.includes(r.Bank));
  }
  if (params.bank) data = data.filter(r => r.Bank === params.bank);

  // Transaction method filtering
  if (params.methods && params.methods.trim()) {
    const methodList = params.methods.split(',').map(m => m.trim());
    data = data.filter(r => methodList.includes(r.Transaction_Method));
  }
  if (params.method) data = data.filter(r => r.Transaction_Method === params.method);

  // Transaction type filtering
  if (params.types && params.types.trim()) {
    const typeList = params.types.split(',').map(t => t.trim());
    data = data.filter(r => typeList.includes(r.Debit_Credit));
  }
  if (params.type) data = data.filter(r => r.Debit_Credit === params.type);

  // Text search filtering
  if (params.q) data = data.filter(r => r.Recipient_Merchant.toLowerCase().includes(params.q.toLowerCase()));

  // Get all custom tags
  const allTags = getAllTransactionTags_();

  data.forEach(row => {
    row.Category = categoryRules[row.Recipient_Merchant.toLowerCase()] || "Uncategorized";
    row.CustomTags = allTags[row.Transaction_ID] || {};
  });

  Logger.log(`getTransactions_: Filtered ${transactions.length} transactions to ${data.length} results`);
  
  // Handle batching for large responses
  const batchSize = parseInt(params.batchSize) || 0;
  const batchNumber = parseInt(params.batchNumber) || 0;
  
  if (batchSize > 0) {
    const startIndex = batchNumber * batchSize;
    const endIndex = startIndex + batchSize;
    const batchedData = data.slice(startIndex, endIndex);
    
    return {
      transactions: batchedData,
      totalCount: data.length,
      batchNumber: batchNumber,
      batchSize: batchSize,
      hasMore: endIndex < data.length
    };
  }
  
  return data;
}

function getSummary_(params) {
  const { transactions } = getAllData_();
  const now = new Date();
  let data = transactions;

  if (params.period === 'daily') data = data.filter(r => r.Timestamp.getDate() === now.getDate() && r.Timestamp.getMonth() === now.getMonth() && r.Timestamp.getFullYear() === now.getFullYear());
  else if (params.period === 'monthly') data = data.filter(r => r.Timestamp.getMonth() === now.getMonth() && r.Timestamp.getFullYear() === now.getFullYear());
  else if (params.period === 'yearly') data = data.filter(r => r.Timestamp.getFullYear() === now.getFullYear());

  let totalSpend = 0, totalIncome = 0;
  data.forEach(r => {
    if (r.Debit_Credit === 'Debit') totalSpend += r.Amount;
    else if (r.Debit_Credit === 'Credit') totalIncome += r.Amount;
  });

  return { 
    totalSpend: parseFloat(totalSpend.toFixed(2)), 
    totalIncome: parseFloat(totalIncome.toFixed(2)), 
    netFlow: parseFloat((totalIncome - totalSpend).toFixed(2)), 
    transactionCount: data.length
  };
}

function getChartData_(params) {
  const data = getTransactions_(params);

  if (params.chartType === 'spendingByCategory') {
    const spendByCategory = {};
    data.filter(r => r.Debit_Credit === 'Debit').forEach(r => {
      const category = r.Category;
      spendByCategory[category] = (spendByCategory[category] || 0) + r.Amount;
    });
    return Object.entries(spendByCategory).map(([name, value]) => ({ 
      name, 
      value: parseFloat(value.toFixed(2)) 
    })).sort((a, b) => b.value - a.value);
  }

  if (params.chartType === 'spendingOverTime') {
    const spendByDay = {};
    data.filter(r => r.Debit_Credit === 'Debit').forEach(r => {
      const day = Utilities.formatDate(r.Timestamp, "GMT", "yyyy-MM-dd");
      spendByDay[day] = (spendByDay[day] || 0) + r.Amount;
    });
    return Object.entries(spendByDay).map(([date, amount]) => ({ 
      date, 
      amount: parseFloat(amount.toFixed(2)) 
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return { error: 'Invalid chartType specified' };
}

function getFilterOptions_() {
  const { transactions } = getAllData_();
  const banks = [...new Set(transactions.map(r => r.Bank))];
  const methods = [...new Set(transactions.map(r => r.Transaction_Method))];
  const types = [...new Set(transactions.map(r => r.Debit_Credit))];
  return { 
    banks: banks.sort(), 
    methods: methods.sort(), 
    types: types.sort() 
  };
}

function setCategoryRule_(params) {
  if (!params.merchant || !params.category) {
    throw new Error("Both 'merchant' and 'category' parameters are required.");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CATEGORY_RULES_SHEET_NAME) || ss.insertSheet(CATEGORY_RULES_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Recipient_Merchant", "Category"]);
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  const merchantLower = params.merchant.toLowerCase();
  let ruleExists = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === merchantLower) {
      sheet.getRange(i + 1, 2).setValue(params.category);
      ruleExists = true;
      break;
    }
  }

  if (!ruleExists) {
    sheet.appendRow([params.merchant, params.category]);
  }

  // Clear relevant caches
  const cache = CacheService.getScriptCache();
  cache.removeAll(['getTransactions', 'getChartData', 'getFilterOptions', 'getSummary']);

  return { 
    status: 'success', 
    message: `Rule set: '${params.merchant}' is now categorized as '${params.category}'.` 
  };
}

/**
 * =================================================================
 * TRANSACTION TAGS MANAGEMENT
 * =================================================================
 */

function setTransactionTag_(params) {
  if (!params.transactionId || !params.tagType || !params.tagValue) {
    throw new Error("Missing required parameters: transactionId, tagType, tagValue");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TRANSACTION_TAGS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(TRANSACTION_TAGS_SHEET_NAME);
    sheet.appendRow(["Transaction_ID", "Tag_Type", "Tag_Value", "Updated_Date"]);
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  let rowFound = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.transactionId && data[i][1] === params.tagType) {
      sheet.getRange(i + 1, 3).setValue(params.tagValue);
      sheet.getRange(i + 1, 4).setValue(new Date());
      rowFound = true;
      break;
    }
  }

  if (!rowFound) {
    sheet.appendRow([
      params.transactionId,
      params.tagType,
      params.tagValue,
      new Date()
    ]);
  }

  const cache = CacheService.getScriptCache();
  cache.removeAll(['getTransactions', 'getAllTransactionTags']);

  return { 
    status: 'success', 
    message: `Tag ${params.tagType} set to '${params.tagValue}' for transaction ${params.transactionId}` 
  };
}

function getTransactionTags_(params) {
  if (!params.transactionId) {
    throw new Error("Missing required parameter: transactionId");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TRANSACTION_TAGS_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return {};
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  const tags = {};

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.transactionId) {
      tags[data[i][1]] = data[i][2];
    }
  }

  return tags;
}

function getAllTransactionTags_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TRANSACTION_TAGS_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return {};
  }

  const range = sheet.getDataRange();
  const data = range.getValues();
  const allTags = {};

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
// SETUP INSTRUCTIONS:
// =================================================================
// 
// 1. Update SPREADSHEET_ID with your actual Google Sheet ID
// 2. Update DEST_SHEET_NAME with your main transaction sheet name
// 3. Deploy as Web App: Execute as "Me", Access "Anyone"
// 
// This is a PURE API backend - no authentication logic included.
// Authentication should be handled separately.
// =================================================================