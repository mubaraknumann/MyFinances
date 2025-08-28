// Transaction tagging system for automated categorization
import { isInternalTransfer, hasExplicitTransferPattern } from './transactionFilters';

/**
 * Determines the transaction type based on various indicators
 */
export const getTransactionType = (transaction, allTransactions = []) => {
  // Check if it's an internal transfer
  if (isInternalTransfer(transaction, allTransactions)) {
    return 'internal';
  }
  
  // Check if it's a bill payment
  if (isBillPayment(transaction)) {
    return 'bill-payment';
  }
  
  // Check if it's income
  if (transaction.Debit_Credit === 'Credit') {
    return 'income';
  }
  
  // Otherwise it's spending
  if (transaction.Debit_Credit === 'Debit') {
    return 'spending';
  }
  
  return 'unknown';
};

/**
 * Determines if transaction is a bill payment
 */
const isBillPayment = (transaction) => {
  const merchant = transaction.Recipient_Merchant?.toLowerCase() || '';
  const rawMessage = transaction.Raw_Message?.toLowerCase() || '';
  
  // Bill payment patterns
  const billPatterns = [
    'electricity', 'gas', 'water', 'internet', 'mobile', 'phone',
    'insurance', 'premium', 'utility', 'bill', 'recharge',
    'reliance jio', 'airtel', 'vodafone', 'bsnl',
    'electricity board', 'bescom', 'kseb', 'mseb',
    'credit card payment', 'loan payment', 'emi payment',
    'cc payment', 'card payment'
  ];
  
  const hasBillPattern = billPatterns.some(pattern => 
    merchant.includes(pattern) || rawMessage.includes(pattern)
  );
  
  return hasBillPattern;
};

/**
 * Gets payment method from transaction data
 */
export const getPaymentMethod = (transaction) => {
  const method = transaction.Transaction_Method?.toLowerCase() || '';
  
  // Map transaction methods to display-friendly names
  const methodMap = {
    'upi': 'UPI',
    'credit card': 'Card',
    'account': 'Account',
    'neft': 'NEFT',
    'rtgs': 'RTGS',
    'imps': 'IMPS',
    'atm': 'ATM',
    'interest': 'Interest'
  };
  
  return methodMap[method] || method.toUpperCase() || 'Other';
};

/**
 * Gets all tags for a transaction
 */
export const getTransactionTags = (transaction, allTransactions = []) => {
  const type = getTransactionType(transaction, allTransactions);
  const method = getPaymentMethod(transaction);
  
  return {
    type,
    method,
    bank: transaction.Bank
  };
};

/**
 * Gets display configuration for transaction type tags
 */
export const getTypeTagConfig = (type) => {
  const configs = {
    'internal': {
      label: 'Internal Transfer',
      color: 'bg-purple-900/50 text-purple-300'
    },
    'bill-payment': {
      label: 'Card Bill',
      color: 'bg-orange-900/50 text-orange-300'
    },
    'income': {
      label: 'Income',
      color: 'bg-green-900/50 text-green-300'
    },
    'spending': {
      label: 'Spending',
      color: 'bg-red-900/50 text-red-300'
    },
    'unknown': {
      label: 'Unknown',
      color: 'bg-gray-700 text-gray-300'
    }
  };
  
  return configs[type] || configs.unknown;
};

/**
 * Gets display configuration for payment method tags
 */
export const getMethodTagConfig = (method) => {
  const configs = {
    'UPI': {
      label: 'UPI',
      color: 'bg-blue-900/50 text-blue-300'
    },
    'Card': {
      label: 'Card',
      color: 'bg-indigo-900/50 text-indigo-300'
    },
    'Account': {
      label: 'Account',
      color: 'bg-teal-900/50 text-teal-300'
    },
    'NEFT': {
      label: 'NEFT',
      color: 'bg-cyan-900/50 text-cyan-300'
    },
    'RTGS': {
      label: 'RTGS',
      color: 'bg-cyan-900/50 text-cyan-300'
    },
    'IMPS': {
      label: 'IMPS',
      color: 'bg-cyan-900/50 text-cyan-300'
    },
    'ATM': {
      label: 'ATM',
      color: 'bg-slate-900/50 text-slate-300'
    },
    'Interest': {
      label: 'Interest',
      color: 'bg-emerald-900/50 text-emerald-300'
    }
  };
  
  return configs[method] || {
    label: method,
    color: 'bg-gray-700 text-gray-300'
  };
};

/**
 * Updates transaction type manually (for editable tags)
 * Uses optimistic updates with background API sync
 */
export const updateTransactionType = async (transactionId, newType) => {
  // Update localStorage immediately for instant UI feedback
  const customTags = JSON.parse(localStorage.getItem('customTransactionTags') || '{}');
  customTags[transactionId] = { ...customTags[transactionId], type: newType };
  localStorage.setItem('customTransactionTags', JSON.stringify(customTags));
  
  // Update backend in background (don't wait for response)
  try {
    const apiService = (await import('../services/api')).default;
    // Fire and forget - update happens in background
    apiService.setTransactionTag(transactionId, 'type', newType).catch(error => {
      console.warn('Background API sync failed for transaction tag:', error);
      // Keep localStorage version - will sync on next page load
    });
  } catch (error) {
    console.warn('Failed to initialize API sync for transaction tag:', error);
    // LocalStorage update already happened, so UI is still responsive
  }
};

/**
 * Gets custom tag overrides from API and local cache
 */
export const getCustomTags = (transactionId, apiTags = {}) => {
  // Prefer API data over localStorage
  if (apiTags && Object.keys(apiTags).length > 0) {
    return apiTags;
  }
  
  // Fall back to localStorage for immediate UI feedback
  const localTags = JSON.parse(localStorage.getItem('customTransactionTags') || '{}');
  return localTags[transactionId] || {};
};

/**
 * Gets final tags with custom overrides applied
 */
export const getFinalTags = (transaction, allTransactions = []) => {
  const autoTags = getTransactionTags(transaction, allTransactions);
  // Use CustomTags from API if available, otherwise fall back to localStorage
  const customTags = transaction.CustomTags || getCustomTags(transaction.Transaction_ID);
  
  return {
    ...autoTags,
    ...customTags
  };
};