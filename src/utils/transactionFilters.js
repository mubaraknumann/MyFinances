// Utility functions to filter out internal transfers and non-spending transactions

/**
 * Identifies paired transactions that represent internal transfers
 * Internal transfers create one debit and one credit within a short time window
 */
export const findInternalTransferPairs = (transactions) => {
  const transferTransactionIds = new Set();
  const timeWindowMs = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  // Sort transactions by timestamp for efficient processing
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.Timestamp) - new Date(b.Timestamp)
  );
  
  for (let i = 0; i < sortedTransactions.length; i++) {
    const transaction = sortedTransactions[i];
    
    // Skip if already identified as part of a transfer pair
    if (transferTransactionIds.has(transaction.Transaction_ID)) continue;
    
    const transactionTime = new Date(transaction.Timestamp);
    
    // Look for a matching transaction within the time window
    for (let j = i + 1; j < sortedTransactions.length; j++) {
      const potentialPair = sortedTransactions[j];
      const pairTime = new Date(potentialPair.Timestamp);
      
      // Stop looking if we're beyond the time window
      if (pairTime - transactionTime > timeWindowMs) break;
      
      // Skip if already identified as part of a transfer pair
      if (transferTransactionIds.has(potentialPair.Transaction_ID)) continue;
      
      // Check if this could be a transfer pair
      if (isPotentialTransferPair(transaction, potentialPair)) {
        transferTransactionIds.add(transaction.Transaction_ID);
        transferTransactionIds.add(potentialPair.Transaction_ID);
        break;
      }
    }
  }
  
  return transferTransactionIds;
};

/**
 * Checks if two transactions could be a transfer pair
 */
const isPotentialTransferPair = (tx1, tx2) => {
  // Must have opposite debit/credit types
  if (tx1.Debit_Credit === tx2.Debit_Credit) return false;
  
  // Amount must match exactly for internal transfers
  const amount1 = Math.abs(tx1.Amount);
  const amount2 = Math.abs(tx2.Amount);
  
  if (amount1 !== amount2) return false;
  
  // Check if transaction IDs are the same (strong indicator of internal transfer)
  if (tx1.Transaction_ID && tx2.Transaction_ID && tx1.Transaction_ID === tx2.Transaction_ID) {
    return true;
  }
  
  // Both transactions are from user's banks - this is internal transfer
  const userBanks = ['axis bank', 'hdfc bank', 'hsbc', 'icici bank', 'idfc first bank'];
  const bank1 = tx1.Bank?.toLowerCase()?.trim() || '';
  const bank2 = tx2.Bank?.toLowerCase()?.trim() || '';
  
  const isUserBank1 = userBanks.includes(bank1);
  const isUserBank2 = userBanks.includes(bank2);
  
  // If both are user's banks, it's definitely internal transfer
  if (isUserBank1 && isUserBank2) {
    return true;
  }
  
  // Check raw message for transfer indicators
  const raw1 = tx1.Raw_Message?.toLowerCase() || '';
  const raw2 = tx2.Raw_Message?.toLowerCase() || '';
  
  const transferIndicators = ['transfer', 'credited', 'debited', 'account', 'balance'];
  const hasTransferIndicator1 = transferIndicators.some(indicator => raw1.includes(indicator));
  const hasTransferIndicator2 = transferIndicators.some(indicator => raw2.includes(indicator));
  
  if (hasTransferIndicator1 && hasTransferIndicator2) {
    return true;
  }
  
  // Check merchant names for transfer patterns
  const merchant1 = tx1.Recipient_Merchant?.toLowerCase() || '';
  const merchant2 = tx2.Recipient_Merchant?.toLowerCase() || '';
  
  // Generic transfer merchants (like MUBARAK M)
  const genericTransferMerchants = ['credit', 'debit', 'transfer', 'mubarak m'];
  const hasGenericMerchant1 = genericTransferMerchants.some(pattern => merchant1.includes(pattern));
  const hasGenericMerchant2 = genericTransferMerchants.some(pattern => merchant2.includes(pattern));
  
  if (hasGenericMerchant1 || hasGenericMerchant2) {
    return true;
  }
  
  return false;
};

/**
 * Legacy function for explicit transfer pattern detection
 * Kept for credit card payments and other non-paired transfers
 */
export const hasExplicitTransferPattern = (transaction) => {
  const merchant = transaction.Recipient_Merchant?.toLowerCase()?.trim() || '';
  const category = transaction.Category?.toLowerCase() || '';
  
  // Only mark as transfer if merchant is exactly 'debit' AND it's not a legitimate expense
  // Check raw message to confirm it's actually a transfer, not just a generic debit
  if (merchant === 'debit') {
    const rawMessage = transaction.Raw_Message?.toLowerCase() || '';
    // If raw message contains specific transfer indicators, mark as transfer
    // Otherwise, it might be a legitimate expense with generic merchant name
    const internalTransferWords = ['credited to', 'debited from', 'transfer to', 'transfer from'];
    const hasInternalTransferIndicator = internalTransferWords.some(word => rawMessage.includes(word));
    
    if (hasInternalTransferIndicator) {
      return true;
    }
    // If no clear transfer indicator, treat as legitimate expense
    return false;
  }
  
  // Specific transfer patterns in merchant names
  const transferPatterns = [
    'credit card payment',
    'cc payment', 
    'card payment',
    'payment to credit card',
    'credit card bill',
    'cc payment to xx', // Pattern like "CC Payment to XX1150"
    'auto transfer',
    'scheduled transfer'
  ];

  // Check if transaction is a credit card payment
  const method = transaction.Transaction_Method?.toLowerCase() || '';
  const rawMessage = transaction.Raw_Message?.toLowerCase() || '';
  
  // If transaction method is Credit Card, it's definitely not income
  if (method === 'credit card') {
    return true;
  }
  
  // Check raw message for credit card payment indicators
  const creditCardIndicators = [
    'credit card',
    'card ending with',
    'available limit',
    'payment received towards your credit card',
    'payment of rs',
    'cardmember'
  ];
  
  const hasCreditCardIndicator = creditCardIndicators.some(indicator => 
    rawMessage.includes(indicator)
  );
  
  if (hasCreditCardIndicator) {
    return true; // This is a credit card payment, exclude it
  }
  
  // Specific check for "Payment Received" pattern
  if (merchant === 'payment received' && method === 'credit card') {
    return true;
  }
  
  const hasTransferPattern = transferPatterns.some(pattern => 
    merchant.includes(pattern)
  );
  
  // Check if category indicates internal transfer
  const transferCategories = [
    'credit card payment',
    'loan payment',
    'investment transfer'
  ];
  
  const hasTransferCategory = transferCategories.some(cat => 
    category.includes(cat)
  );
  
  return hasTransferPattern || hasTransferCategory;
};

/**
 * Main function to identify if a transaction is an internal transfer
 * Uses both paired transaction detection and explicit pattern matching
 */
export const isInternalTransfer = (transaction, allTransactions) => {
  // Get all paired transfer transaction IDs
  const transferPairs = findInternalTransferPairs(allTransactions);
  
  // Check if this transaction is part of a detected pair
  const isInPair = transferPairs.has(transaction.Transaction_ID);
  
  // For SPENDING: Only exclude if it's actually a paired transfer
  // Credit card payments, EMI, loans are legitimate expenses - don't exclude from spending
  if (transaction.Debit_Credit === 'Debit') {
    return isInPair; // Only exclude if paired, not for explicit patterns
  }
  
  // For INCOME: Exclude both paired transfers AND explicit patterns (credit card payments, etc.)
  const hasExplicitPattern = hasExplicitTransferPattern(transaction);
  
  return isInPair || hasExplicitPattern;
};

/**
 * Filters transactions to exclude internal transfers for spending/income calculations
 * Respects both automatic detection and manual user tags
 */
export const getActualTransactions = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return [];
  return transactions.filter(transaction => {
    // Check for manual user tag first - check both API data and localStorage
    const userTaggedAsInternal = transaction.CustomTags?.type === 'internal';
    
    // Also check localStorage for immediate updates
    let localTaggedAsInternal = false;
    try {
      const localTags = JSON.parse(localStorage.getItem('customTransactionTags') || '{}');
      localTaggedAsInternal = localTags[transaction.Transaction_ID]?.type === 'internal';
    } catch (e) {
      // Ignore localStorage errors
    }
    
    if (userTaggedAsInternal || localTaggedAsInternal) {
      return false; // Exclude if manually tagged as internal
    }
    
    // Fall back to automatic detection
    return !isInternalTransfer(transaction, transactions);
  });
};

/**
 * Calculates actual spending (excluding internal transfers)
 */
export const getActualSpending = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  const actualTransactions = getActualTransactions(transactions);
  return actualTransactions
    .filter(t => t && t.Debit_Credit === 'Debit' && typeof t.Amount === 'number')
    .reduce((sum, t) => sum + t.Amount, 0);
};

/**
 * Calculates actual income (excluding internal transfers)
 */
export const getActualIncome = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  const actualTransactions = getActualTransactions(transactions);
  return actualTransactions
    .filter(t => t && t.Debit_Credit === 'Credit' && typeof t.Amount === 'number')
    .reduce((sum, t) => sum + t.Amount, 0);
};

/**
 * Gets net flow excluding internal transfers
 */
export const getActualNetFlow = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  const actualIncome = getActualIncome(transactions);
  const actualSpending = getActualSpending(transactions);
  return actualIncome - actualSpending;
};

/**
 * Gets transaction count excluding internal transfers
 */
export const getActualTransactionCount = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  return getActualTransactions(transactions).length;
};