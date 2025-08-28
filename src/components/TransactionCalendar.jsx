import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getActualTransactions } from '../utils/transactionFilters';
import { updateTransactionType } from '../utils/transactionTags';

// Category Editor Component
const CategoryEditor = ({ transaction, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState('');
  const [currentCategory, setCurrentCategory] = useState(transaction.Category);
  
  const hasCategory = currentCategory && currentCategory !== 'Uncategorized';
  
  const handleCategoryEdit = async (newCategory) => {
    try {
      await updateTransactionType(transaction.Transaction_ID, newCategory);
      setCurrentCategory(newCategory);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update category:', error);
      setIsEditing(false);
    }
  };
  
  const categories = [
    'Food & Dining',
    'Shopping', 
    'Entertainment',
    'Transport',
    'Bills & Utilities',
    'Healthcare',
    'Travel',
    'Education',
    'Investment',
    'Other'
  ];
  
  return (
    <div className="mt-1">
      {isEditing ? (
        <select
          value={editingCategory}
          onChange={(e) => handleCategoryEdit(e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="bg-gray-700 border border-gray-600 rounded text-xs px-2 py-1 text-white w-full"
          autoFocus
        >
          <option value="">Select category...</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      ) : (
        <span
          className={`inline-block px-2 py-1 text-xs rounded cursor-pointer hover:opacity-80 ${
            hasCategory 
              ? 'bg-blue-900/50 text-blue-300' 
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
          onClick={() => {
            setEditingCategory(currentCategory || '');
            setIsEditing(true);
          }}
          title="Click to edit category"
        >
          {hasCategory ? currentCategory : 'Uncategorized'}
        </span>
      )}
    </div>
  );
};

const TransactionCalendar = ({ transactions = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get actual transactions (excluding internal transfers)
  const actualTransactions = useMemo(() => getActualTransactions(transactions), [transactions]);

  // Get days for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped = {};
    actualTransactions.forEach(transaction => {
      const date = format(new Date(transaction.Timestamp), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    return grouped;
  }, [actualTransactions]);

  // Get transactions for selected date
  const selectedDateTransactions = selectedDate 
    ? transactionsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getDayData = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayTransactions = transactionsByDate[dateKey] || [];
    
    const spending = dayTransactions
      .filter(t => t.Debit_Credit === 'Debit')
      .reduce((sum, t) => sum + t.Amount, 0);
    
    const income = dayTransactions
      .filter(t => t.Debit_Credit === 'Credit')
      .reduce((sum, t) => sum + t.Amount, 0);

    return {
      transactions: dayTransactions,
      spending,
      income,
      count: dayTransactions.length
    };
  };

  const getDayClasses = (day, dayData) => {
    const baseClasses = "relative p-1 sm:p-2 text-sm cursor-pointer transition-all hover:bg-gray-600 rounded min-h-[60px] sm:min-h-[80px] flex flex-col";
    
    if (!isSameMonth(day, currentDate)) {
      return `${baseClasses} text-gray-500`;
    }
    
    if (selectedDate && isSameDay(day, selectedDate)) {
      return `${baseClasses} bg-blue-600 text-white`;
    }
    
    if (dayData.count > 0) {
      return `${baseClasses} text-white bg-gray-700 hover:bg-gray-600`;
    }
    
    return `${baseClasses} text-gray-300`;
  };

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
        {/* Calendar */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0">
            <h3 className="text-lg font-semibold text-white">Transaction Calendar</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-white min-w-[200px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayData = getDayData(day);
              return (
                <div
                  key={day.toISOString()}
                  className={getDayClasses(day, dayData)}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="font-medium text-center">{format(day, 'd')}</div>
                  {dayData.count > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayData.spending > 0 && (
                        <div className="text-[10px] sm:text-xs text-red-300 truncate">
                          -{formatCurrency(dayData.spending).replace('₹', '₹')}
                        </div>
                      )}
                      {dayData.income > 0 && (
                        <div className="text-[10px] sm:text-xs text-green-300 truncate">
                          +{formatCurrency(dayData.income).replace('₹', '₹')}
                        </div>
                      )}
                      <div className="text-[10px] sm:text-xs text-gray-400">
                        {dayData.count} txn{dayData.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction Details Panel */}
        <div className="w-full lg:w-80">
          {selectedDate ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h4>
              
              {selectedDateTransactions.length > 0 ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-700 rounded">
                    <div>
                      <p className="text-xs text-gray-400">Spent</p>
                      <p className="text-lg font-bold text-red-400">
                        {formatCurrency(
                          selectedDateTransactions
                            .filter(t => t.Debit_Credit === 'Debit')
                            .reduce((sum, t) => sum + t.Amount, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Received</p>
                      <p className="text-lg font-bold text-green-400">
                        {formatCurrency(
                          selectedDateTransactions
                            .filter(t => t.Debit_Credit === 'Credit')
                            .reduce((sum, t) => sum + t.Amount, 0)
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                    {selectedDateTransactions
                      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
                      .map((transaction, index) => (
                      <div key={`${transaction.Transaction_ID}-${index}`} className="p-2 sm:p-3 bg-gray-900 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-white truncate pr-2 flex-1">
                            {transaction.Recipient_Merchant}
                          </span>
                          <span className={`text-xs sm:text-sm font-bold whitespace-nowrap ${
                            transaction.Debit_Credit === 'Credit' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {transaction.Debit_Credit === 'Credit' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.Amount))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 mb-1">
                          <span className="truncate pr-2">{transaction.Transaction_Method} • {transaction.Bank}</span>
                          <span className="whitespace-nowrap">{format(new Date(transaction.Timestamp), 'HH:mm')}</span>
                        </div>
                        <CategoryEditor transaction={transaction} onUpdate={() => {/* No refresh needed */}} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No transactions on this date</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400">Click on a date to view transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionCalendar;