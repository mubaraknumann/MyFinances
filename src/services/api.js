const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxS9gCrwuSM0TANgypycym3cWibpPrscFpikJ5Y6CHvDCTfCnkx3fPyzlrksCIdGkDZYQ/exec';

class ApiService {
  constructor() {
    this.apiKey = localStorage.getItem('apiKey');
    this.cache = new Map();
    this.CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('apiKey', key);
  }

  getApiKey() {
    return this.apiKey || localStorage.getItem('apiKey');
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('apiKey');
  }

  async makeRequest(action, params = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Check cache for cacheable actions (filterOptions, transactions without batching)
    const cacheKey = `${action}-${JSON.stringify(params)}`;
    if (action === 'getFilterOptions' || (action === 'getTransactions' && !params.batchSize)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`Using cached data for ${action}`);
        return cached.data;
      }
    }

    // Use JSONP to bypass CORS issues with Google Apps Script
    return new Promise((resolve, reject) => {
      console.log(`Making API request: ${action}...`);
      const startTime = Date.now();
      const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      
      const url = new URL(API_BASE_URL);
      url.searchParams.set('action', action);
      url.searchParams.set('apiKey', apiKey);
      url.searchParams.set('callback', callbackName);
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      });

      // Capture context for cache access
      const self = this;
      
      // Create callback function
      window[callbackName] = function(data) {
        const duration = Date.now() - startTime;
        console.log(`API request ${action} completed in ${duration}ms`);
        delete window[callbackName];
        document.body.removeChild(script);
        
        if (data.error) {
          if (data.error.includes('Unauthorized')) {
            reject(new Error('Invalid API key - please check your credentials'));
          } else {
            reject(new Error(`Backend error: ${data.error}`));
          }
        } else {
          // Cache filteroptions and complete transactions (not individual batches)
          if (action === 'getFilterOptions' || (action === 'getTransactions' && !params.batchSize)) {
            self.cache.set(cacheKey, {
              data,
              timestamp: Date.now()
            });
          }
          resolve(data);
        }
      };

      // Create script element for JSONP
      const script = document.createElement('script');
      script.src = url.toString();
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('Network error - failed to load script'));
      };
      
      document.body.appendChild(script);
      
      // Cleanup after timeout
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          document.body.removeChild(script);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async getTransactions(filters = {}) {
    // Check cache for complete transaction sets first
    const cacheKey = `getTransactions-complete-${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached complete transaction set');
      return cached.data;
    }

    try {
      // Try to get all transactions at once
      const result = await this.makeRequest('getTransactions', filters);
      
      // Cache successful complete results
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // If we get "Argument too large" error, retry with batching
      if (error.message.includes('Argument too large')) {
        console.log('Response too large, switching to batched loading...');
        const batchedResult = await this.getTransactionsBatched(filters);
        
        // Cache successful batched results
        this.cache.set(cacheKey, {
          data: batchedResult,
          timestamp: Date.now()
        });
        
        return batchedResult;
      }
      throw error;
    }
  }

  async getTransactionsBatched(filters = {}, batchSize = 150) {
    const allTransactions = [];
    let batchNumber = 0;
    let hasMore = true;

    console.log('Loading transactions in batches...');

    while (hasMore) {
      try {
        const batchParams = {
          ...filters,
          batchSize: batchSize,
          batchNumber: batchNumber
        };

        const batchResult = await this.makeRequest('getTransactions', batchParams);
        
        if (batchResult.transactions) {
          // Batched response format
          allTransactions.push(...batchResult.transactions);
          hasMore = batchResult.hasMore;
          console.log(`Loaded batch ${batchNumber + 1}: ${batchResult.transactions.length} transactions (${allTransactions.length}/${batchResult.totalCount} total)`);
        } else {
          // Fallback: if backend doesn't support batching, treat as single batch
          allTransactions.push(...batchResult);
          hasMore = false;
          console.log(`Loaded ${batchResult.length} transactions in fallback mode`);
        }

        batchNumber++;
        
        // Safety check to prevent infinite loops
        if (batchNumber > 20) {
          console.warn('Reached maximum batch limit (20), stopping...');
          break;
        }
      } catch (batchError) {
        console.error(`Error loading batch ${batchNumber}:`, batchError);
        // If even batched requests fail, return what we have so far
        break;
      }
    }

    console.log(`Finished loading ${allTransactions.length} transactions using batched approach`);
    return allTransactions;
  }

  async getSummary(period) {
    if (!period) {
      throw new Error('Period is required');
    }
    return this.makeRequest('getSummary', { period });
  }

  async getChartData(chartType, filters = {}) {
    if (!chartType) {
      throw new Error('Chart type is required');
    }
    return this.makeRequest('getChartData', { chartType, ...filters });
  }

  async getFilterOptions() {
    return this.makeRequest('getFilterOptions');
  }

  async setCategoryRule(merchant, category) {
    if (!merchant || !category) {
      throw new Error('Merchant and category are required');
    }
    return this.makeRequest('setCategoryRule', { merchant, category });
  }

  async setTransactionTag(transactionId, tagType, tagValue) {
    if (!transactionId || !tagType || !tagValue) {
      throw new Error('Transaction ID, tag type, and tag value are required');
    }
    return this.makeRequest('setTransactionTag', { transactionId, tagType, tagValue });
  }

  async getTransactionTags(transactionId) {
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }
    return this.makeRequest('getTransactionTags', { transactionId });
  }

  async testConnection() {
    try {
      await this.getSummary('daily');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new ApiService();