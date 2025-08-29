import { useState, useEffect } from 'react';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import apiService from '../services/api';
import CategoryModal from '../components/CategoryModal';
import TransactionTags from '../components/TransactionTags';
import { format } from 'date-fns';
import { getActualSpending, getActualIncome, getActualNetFlow, getActualTransactionCount, getActualTransactions, isInternalTransfer } from '../utils/transactionFilters';
import { getPaymentMethod } from '../utils/transactionTags';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [filterOptions, setFilterOptions] = useState({ banks: [], methods: [], types: [] });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    banks: [],
    methods: [],
    types: []
  });
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryModal, setCategoryModal] = useState({ isOpen: false, merchant: '', transactionId: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'Timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(50);
  const [localTagUpdates, setLocalTagUpdates] = useState({});

  const handleTagUpdate = (transactionId, updatedTags) => {
    setLocalTagUpdates(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        ...updatedTags
      }
    }));
  };

  useEffect(() => {
    const initializeReports = async () => {
      await fetchFilterOptions();
      // Set default date range to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const defaultFilters = {
        startDate: format(startOfMonth, 'yyyy-MM-dd'),
        endDate: format(now, 'yyyy-MM-dd'),
        banks: [],
        methods: [],
        types: []
      };
      
      setFilters(defaultFilters);
      
      // Auto-apply filters with default date range
      applyFiltersWithData(defaultFilters);
    };
    
    initializeReports();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const options = await apiService.getFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMultiSelectChange = (key, value) => {
    setFilters(prev => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [key]: newValues
      };
    });
  };

  const handleSelectAll = (key, allOptions) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].length === allOptions.length ? [] : [...allOptions]
    }));
  };

  // Sorting functionality
  const handleSort = (key) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortTransactions = (transactions, sortConfig) => {
    if (!sortConfig.key) return transactions;
    
    return [...transactions].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Special handling for different data types
      if (sortConfig.key === 'Timestamp') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (sortConfig.key === 'Amount') {
        aVal = Math.abs(parseFloat(aVal) || 0);
        bVal = Math.abs(parseFloat(bVal) || 0);
      } else if (typeof aVal === 'string') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }
      
      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const applyFiltersWithData = async (filtersToUse = filters) => {
    if (!filtersToUse.startDate || !filtersToUse.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let filteredTransactions;
      
      // Try server-side filtering first (more efficient)
      try {
        // Only include non-empty parameters to reduce URL length
        const filterParams = {
          startDate: filtersToUse.startDate,
          endDate: filtersToUse.endDate
        };
        
        // Only add filter parameters if they have values
        if (filtersToUse.banks.length > 0) {
          filterParams.banks = filtersToUse.banks.join(',');
        }
        if (filtersToUse.methods.length > 0) {
          filterParams.methods = filtersToUse.methods.join(',');
        }
        if (filtersToUse.types.length > 0) {
          filterParams.types = filtersToUse.types.join(',');
        }
        
        filteredTransactions = await apiService.getTransactions(filterParams);
        console.log('Using server-side filtering');
        
      } catch (serverError) {
        // If server-side filtering fails (e.g., URL too long), fall back to client-side
        console.warn('Server-side filtering failed, falling back to client-side filtering:', serverError.message);
        
        const allTransactions = await apiService.getTransactions();
        
        // Apply client-side filtering
        filteredTransactions = allTransactions.filter(transaction => {
          const transactionDate = format(new Date(transaction.Timestamp), 'yyyy-MM-dd');
          const dateMatch = transactionDate >= filtersToUse.startDate && transactionDate <= filtersToUse.endDate;
          
          const bankMatch = filtersToUse.banks.length === 0 || filtersToUse.banks.includes(transaction.Bank);
          const methodMatch = filtersToUse.methods.length === 0 || filtersToUse.methods.includes(transaction.Transaction_Method);
          const typeMatch = filtersToUse.types.length === 0 || filtersToUse.types.includes(transaction.Debit_Credit);
          
          return dateMatch && bankMatch && methodMatch && typeMatch;
        });
        
        console.log('Using client-side filtering as fallback');
      }

      setTransactions(filteredTransactions);
      
      // Reset pagination to first page when data changes
      setCurrentPage(1);
      
      // Calculate summary from filtered transactions (excluding internal transfers)
      const totalSpend = getActualSpending(filteredTransactions);
      const totalIncome = getActualIncome(filteredTransactions);
      const netFlow = getActualNetFlow(filteredTransactions);
      const transactionCount = getActualTransactionCount(filteredTransactions);

      setSummary({
        totalSpend,
        totalIncome,
        netFlow,
        transactionCount
      });

      // Process category data for pie chart (excluding internal transfers)
      const actualTransactions = getActualTransactions(filteredTransactions);
      const categoryMap = {};
      actualTransactions
        .filter(t => t.Debit_Credit === 'Debit')
        .forEach(transaction => {
          const category = transaction.Category || 'Uncategorized';
          categoryMap[category] = (categoryMap[category] || 0) + transaction.Amount;
        });

      const processedCategoryData = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value
      }));

      setCategoryData(processedCategoryData);

    } catch (err) {
      setError(err.message || 'Failed to load report data');
      console.error('Reports error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying new filters
    applyFiltersWithData(filters);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const pieChartData = categoryData ? {
    labels: categoryData.map(item => item.name),
    datasets: [
      {
        data: categoryData.map(item => item.value),
        backgroundColor: [
          '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
          '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ],
        borderColor: '#374151',
        borderWidth: 2,
      },
    ],
  } : null;

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#f3f4f6',
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'Spending by Category',
        color: '#f3f4f6',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${context.label}: ₹${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const handleCategorize = (merchant, transactionId) => {
    setCategoryModal({ isOpen: true, merchant, transactionId });
  };

  const handleCategoryUpdate = async (merchant, category) => {
    try {
      await apiService.setCategoryRule(merchant, category);
      
      // Update transactions with new category
      const updatedTransactions = transactions.map(transaction => 
        transaction.Recipient_Merchant === merchant 
          ? { ...transaction, Category: category }
          : transaction
      );
      setTransactions(updatedTransactions);
      
      // Recalculate category data for pie chart (excluding internal transfers)
      const actualUpdatedTransactions = getActualTransactions(updatedTransactions);
      const categoryMap = {};
      actualUpdatedTransactions
        .filter(t => t.Debit_Credit === 'Debit')
        .forEach(transaction => {
          const cat = transaction.Category || 'Uncategorized';
          categoryMap[cat] = (categoryMap[cat] || 0) + transaction.Amount;
        });

      const processedCategoryData = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value
      }));

      setCategoryData(processedCategoryData);
      
    } catch (error) {
      console.error('Failed to update category:', error);
      setError('Failed to update category');
    }
  };

  // Calculate pagination
  // Apply sorting before pagination
  const sortedTransactions = sortTransactions(transactions, sortConfig);
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(sortedTransactions.length / transactionsPerPage);

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-600/50 select-none ${className}`}
      onClick={() => handleSort(field)}
      title={`Sort by ${children}`}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="text-gray-400 text-xs">
          {sortConfig.key === field ? (
            sortConfig.direction === 'asc' ? '↑' : '↓'
          ) : '↕'}
        </span>
      </div>
    </th>
  );

  // Pagination component
  const PaginationControls = () => (
    totalPages > 1 && (
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-gray-700 text-white rounded disabled:opacity-50 hover:bg-gray-600"
        >
          Previous
        </button>
        <span className="text-sm text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm bg-gray-700 text-white rounded disabled:opacity-50 hover:bg-gray-600"
        >
          Next
        </button>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      {/* Modern Filter Bar */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          {/* Date Range */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-end gap-2">
            {/* Banks Filter */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">Banks</label>
              <button
                onClick={() => handleSelectAll('banks', filterOptions.banks)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  filters.banks.length === filterOptions.banks.length 
                    ? 'bg-blue-600 text-white' 
                    : filters.banks.length > 0
                    ? 'bg-blue-900 text-blue-200 border border-blue-600'
                    : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filters.banks.length === 0 ? 'All Banks' : 
                 filters.banks.length === filterOptions.banks.length ? 'All Banks' :
                 `${filters.banks.length} Banks`}
              </button>
            </div>

            {/* Methods Filter */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">Methods</label>
              <button
                onClick={() => handleSelectAll('methods', filterOptions.methods)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  filters.methods.length === filterOptions.methods.length 
                    ? 'bg-green-600 text-white' 
                    : filters.methods.length > 0
                    ? 'bg-green-900 text-green-200 border border-green-600'
                    : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filters.methods.length === 0 ? 'All Methods' : 
                 filters.methods.length === filterOptions.methods.length ? 'All Methods' :
                 `${filters.methods.length} Methods`}
              </button>
            </div>

            {/* Types Filter */}
            <div className="relative">
              <label className="block text-xs text-gray-400 mb-1">Types</label>
              <div className="flex gap-1">
                <button
                  onClick={() => handleFilterChange('types', filters.types.includes('Credit') ? [] : ['Credit'])}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    filters.types.includes('Credit')
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Income
                </button>
                <button
                  onClick={() => handleFilterChange('types', filters.types.includes('Debit') ? [] : ['Debit'])}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    filters.types.includes('Debit')
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Spending
                </button>
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={applyFilters}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              'Apply Filters'
            )}
          </button>
        </div>

        {/* Active Filter Tags */}
        {(filters.banks.length > 0 && filters.banks.length < filterOptions.banks.length) ||
         (filters.methods.length > 0 && filters.methods.length < filterOptions.methods.length) ? (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
            {filters.banks.length > 0 && filters.banks.length < filterOptions.banks.length && (
              <div className="flex flex-wrap gap-1">
                {filters.banks.map(bank => (
                  <span key={bank} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                    {bank}
                    <button
                      onClick={() => handleMultiSelectChange('banks', bank)}
                      className="hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {filters.methods.length > 0 && filters.methods.length < filterOptions.methods.length && (
              <div className="flex flex-wrap gap-1">
                {filters.methods.map(method => (
                  <span key={method} className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs">
                    {method}
                    <button
                      onClick={() => handleMultiSelectChange('methods', method)}
                      className="hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {summary && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">Total Spend</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(summary.totalSpend)}
                </p>
              </div>
            </div>
            
            <div className="card">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
            </div>
            
            <div className="card">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">Net Flow</p>
                <p className={`text-2xl font-bold ${
                  summary.netFlow >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(summary.netFlow)}
                </p>
              </div>
            </div>
            
            <div className="card">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">Transactions</p>
                <p className="text-2xl font-bold text-white">
                  {summary.transactionCount}
                </p>
              </div>
            </div>
          </div>

          {/* Category and Payment Method Charts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            {categoryData && categoryData.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 text-white">Category Breakdown</h3>
                <div className="h-80">
                  <Pie data={pieChartData} options={pieChartOptions} />
                </div>
              </div>
            )}

            {/* Payment Method Pie Chart */}
            {(() => {
              // Calculate payment method spending
              const actualTxns = getActualTransactions(transactions);
              const spendingTransactions = actualTxns.filter(t => 
                t.Debit_Credit === 'Debit' && !isInternalTransfer(t, actualTxns)
              );
              
              const methodSpending = spendingTransactions.reduce((acc, transaction) => {
                const method = getPaymentMethod(transaction);
                acc[method] = (acc[method] || 0) + Math.abs(parseFloat(transaction.Amount) || 0);
                return acc;
              }, {});

              const methodChartData = {
                labels: Object.keys(methodSpending),
                datasets: [{
                  data: Object.values(methodSpending),
                  backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
                    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
                    '#EC4899', '#6366F1'
                  ],
                  borderColor: '#1F2937',
                  borderWidth: 2
                }]
              };

              return Object.keys(methodSpending).length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4 text-white">Payment Method Breakdown</h3>
                  <div className="h-80">
                    <Doughnut 
                      data={methodChartData} 
                      options={{
                        ...pieChartOptions,
                        plugins: {
                          ...pieChartOptions.plugins,
                          legend: {
                            ...pieChartOptions.plugins.legend,
                            position: 'right'
                          }
                        }
                      }} 
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Transaction Table */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Filtered Transactions ({transactions.length})
              </h3>
              <PaginationControls />
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr className="table-header">
                    <SortableHeader field="Timestamp">Date</SortableHeader>
                    <SortableHeader field="Recipient_Merchant">Merchant</SortableHeader>
                    <SortableHeader field="Amount">Amount</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Tags
                    </th>
                    <SortableHeader field="Category">Category</SortableHeader>
                    <SortableHeader field="Bank">Bank</SortableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {currentTransactions.map((transaction, index) => (
                    <tr key={`${transaction.Transaction_ID}-${transaction.Timestamp}-${transaction.Amount}-${index}`} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap table-cell">
                        {formatDate(transaction.Timestamp)}
                      </td>
                      <td className="px-6 py-4 table-cell">
                        <div className="max-w-xs truncate" title={transaction.Recipient_Merchant}>
                          {transaction.Recipient_Merchant}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                        transaction.Debit_Credit === 'Credit' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.Debit_Credit === 'Credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.Amount))}
                      </td>
                      <td className="px-6 py-4 table-cell">
                        <TransactionTags 
                          transaction={{
                            ...transaction,
                            CustomTags: {
                              ...transaction.CustomTags,
                              ...localTagUpdates[transaction.Transaction_ID]
                            }
                          }} 
                          allTransactions={transactions}
                          editable={true}
                          size="sm"
                          onTagUpdate={handleTagUpdate}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap table-cell">
                        <button
                          onClick={() => handleCategorize(transaction.Recipient_Merchant, transaction.Transaction_ID)}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                            transaction.Category === 'Uncategorized' 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70'
                          }`}
                        >
                          {transaction.Category}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap table-cell">
                        {transaction.Bank}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length > 0 && (
                <div className="px-6 py-4 text-center text-gray-400 text-sm border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span>Showing {indexOfFirstTransaction + 1}-{Math.min(indexOfLastTransaction, transactions.length)} of {transactions.length} transactions</span>
                    <PaginationControls />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={categoryModal.isOpen}
        merchant={categoryModal.merchant}
        onClose={() => setCategoryModal({ isOpen: false, merchant: '', transactionId: '' })}
        onSave={handleCategoryUpdate}
      />
    </div>
  );
};

export default Reports;