import { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import apiService from '../services/api';
import { format, subDays, addDays } from 'date-fns';
import { getActualSpending, getActualIncome, getActualNetFlow, getActualTransactionCount, getActualTransactions } from '../utils/transactionFilters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [dailySummary, setDailySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartPeriod, setChartPeriod] = useState(0); // 0 = last 14 days, 1 = previous 14 days, etc.
  const [chartMode, setChartMode] = useState('spending'); // 'spending' or 'income'
  const [advancedKPIs, setAdvancedKPIs] = useState(null);
  const [categoryChartData, setCategoryChartData] = useState(null);
  const [trendChartData, setTrendChartData] = useState(null);
  const [comparisonChartData, setComparisonChartData] = useState(null);

  // Calculate advanced KPIs
  const calculateAdvancedKPIs = (transactions) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();

    // Filter for current month actual transactions (excluding internal transfers)
    const monthlyTransactions = getActualTransactions(transactions.filter(t => {
      const transactionDate = new Date(t.Timestamp);
      return transactionDate >= startOfMonth && transactionDate <= now;
    }));

    const monthlySpending = monthlyTransactions
      .filter(t => t.Debit_Credit === 'Debit')
      .reduce((sum, t) => sum + t.Amount, 0);
    
    const monthlyIncome = monthlyTransactions
      .filter(t => t.Debit_Credit === 'Credit')
      .reduce((sum, t) => sum + t.Amount, 0);

    // 1. Average Daily Spending
    const averageDailySpending = daysPassed > 0 ? monthlySpending / daysPassed : 0;

    // 2. Largest Expense Category
    const categorySpending = {};
    monthlyTransactions
      .filter(t => t.Debit_Credit === 'Debit')
      .forEach(t => {
        const category = t.Category || 'Uncategorized';
        categorySpending[category] = (categorySpending[category] || 0) + t.Amount;
      });
    
    const largestCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0] || ['No data', 0];

    // 3. Savings Rate % 
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlySpending) / monthlyIncome * 100) : 0;

    // 4. Bills & Recurring Expenses (using bill payment detection)
    const billsAmount = monthlyTransactions
      .filter(t => {
        const merchant = t.Recipient_Merchant?.toLowerCase() || '';
        const rawMessage = t.Raw_Message?.toLowerCase() || '';
        const billPatterns = [
          'electricity', 'gas', 'water', 'internet', 'mobile', 'phone',
          'insurance', 'premium', 'utility', 'bill', 'recharge',
          'reliance jio', 'airtel', 'vodafone', 'bsnl',
          'electricity board', 'bescom', 'kseb', 'mseb',
          'credit card payment', 'loan payment', 'emi payment',
          'cc payment', 'card payment'
        ];
        return billPatterns.some(pattern => 
          merchant.includes(pattern) || rawMessage.includes(pattern)
        ) && t.Debit_Credit === 'Debit';
      })
      .reduce((sum, t) => sum + t.Amount, 0);

    return {
      averageDailySpending,
      largestCategory: {
        name: largestCategory[0],
        amount: largestCategory[1]
      },
      savingsRate,
      billsAmount
    };
  };

  // Generate category breakdown chart data
  const generateCategoryChartData = (transactions) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = getActualTransactions(transactions.filter(t => {
      const transactionDate = new Date(t.Timestamp);
      return transactionDate >= startOfMonth && transactionDate <= now && t.Debit_Credit === 'Debit';
    }));

    const categorySpending = {};
    monthlyTransactions.forEach(t => {
      const category = t.Category || 'Uncategorized';
      categorySpending[category] = (categorySpending[category] || 0) + t.Amount;
    });

    const sortedCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8); // Top 8 categories

    const colors = [
      '#EF4444', '#F97316', '#EAB308', '#22C55E', 
      '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
    ];

    return {
      labels: sortedCategories.map(([name]) => name),
      datasets: [{
        data: sortedCategories.map(([, amount]) => amount),
        backgroundColor: colors,
        borderColor: colors.map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
  };

  // Generate monthly trend data
  const generateTrendChartData = (transactions) => {
    const actualTransactions = getActualTransactions(transactions);
    const months = [];
    const now = new Date();
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: format(date, 'MMM yyyy'),
        date: date
      });
    }

    const monthlyData = months.map(month => {
      const nextMonth = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 1);
      const monthTransactions = actualTransactions.filter(t => {
        const tDate = new Date(t.Timestamp);
        return tDate >= month.date && tDate < nextMonth;
      });

      const spending = monthTransactions
        .filter(t => t.Debit_Credit === 'Debit')
        .reduce((sum, t) => sum + t.Amount, 0);
      
      const income = monthTransactions
        .filter(t => t.Debit_Credit === 'Credit')
        .reduce((sum, t) => sum + t.Amount, 0);

      return { spending, income };
    });

    return {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Spending',
          data: monthlyData.map(m => m.spending),
          borderColor: '#EF4444',
          backgroundColor: '#EF444420',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Income',
          data: monthlyData.map(m => m.income),
          borderColor: '#22C55E',
          backgroundColor: '#22C55E20',
          tension: 0.1,
          fill: false
        }
      ]
    };
  };

  // Load initial data only once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Only fetch transactions, we'll calculate summaries client-side
        const transactions = await apiService.getTransactions();

        // Filter out internal transfers and recalculate summaries
        const today = format(new Date(), 'yyyy-MM-dd');
        const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
        
        // Get today's transactions (excluding internal transfers)
        const todayTransactions = transactions.filter(t => {
          const transactionDate = format(new Date(t.Timestamp), 'yyyy-MM-dd');
          return transactionDate === today;
        });
        const actualTodayTransactions = getActualTransactions(todayTransactions);
        
        // Get this month's transactions (excluding internal transfers)
        const thisMonthTransactions = transactions.filter(t => {
          const transactionDate = format(new Date(t.Timestamp), 'yyyy-MM-dd');
          return transactionDate >= startOfMonth;
        });
        const actualThisMonthTransactions = getActualTransactions(thisMonthTransactions);

        // Recalculate daily summary excluding internal transfers
        const filteredDailySummary = {
          totalSpend: getActualSpending(todayTransactions),
          totalIncome: getActualIncome(todayTransactions),
          netFlow: getActualNetFlow(todayTransactions),
          transactionCount: getActualTransactionCount(todayTransactions)
        };

        // Get filtered transactions (excluding internal transfers)
        const actualTransactions = getActualTransactions(thisMonthTransactions);
        
        // Separate into income and spending
        const incomeTransactions = actualTransactions.filter(t => t.Debit_Credit === 'Credit');
        const spendingTransactions = actualTransactions.filter(t => t.Debit_Credit === 'Debit');
        
        console.log('=== MONTHLY INCOME & SPENDING BREAKDOWN ===');
        console.log(`Total August transactions: ${thisMonthTransactions.length}`);
        console.log(`After filtering internal transfers: ${actualTransactions.length}`);
        console.log(`\nINCOME TRANSACTIONS (${incomeTransactions.length}):`);
        incomeTransactions
          .sort((a, b) => b.Amount - a.Amount)
          .forEach((t, i) => {
            const date = new Date(t.Timestamp).toLocaleDateString();
            console.log(`${i+1}. ₹${t.Amount.toLocaleString()} - ${t.Recipient_Merchant} - ${t.Bank} - ${date} - ${t.Transaction_Method}`);
          });
        
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.Amount, 0);
        console.log(`\nTOTAL INCOME: ₹${totalIncome.toLocaleString()}`);
        
        console.log(`\nSPENDING TRANSACTIONS (${spendingTransactions.length}):`);
        spendingTransactions
          .sort((a, b) => b.Amount - a.Amount)
          .slice(0, 20) // Show top 20 spending transactions
          .forEach((t, i) => {
            const date = new Date(t.Timestamp).toLocaleDateString();
            console.log(`${i+1}. ₹${t.Amount.toLocaleString()} - ${t.Recipient_Merchant} - ${t.Bank} - ${date} - ${t.Transaction_Method}`);
          });
        
        const totalSpending = spendingTransactions.reduce((sum, t) => sum + t.Amount, 0);
        console.log(`\nTOTAL SPENDING: ₹${totalSpending.toLocaleString()}`);
        console.log(`NET FLOW: ₹${(totalIncome - totalSpending).toLocaleString()}`);
        console.log('===============================================');

        // Recalculate monthly summary excluding internal transfers
        const filteredMonthlySummary = {
          totalSpend: totalSpending,
          totalIncome: totalIncome,
          netFlow: totalIncome - totalSpending,
          transactionCount: actualTransactions.length
        };

        setDailySummary(filteredDailySummary);
        setMonthlySummary(filteredMonthlySummary);
        setAllTransactions(transactions);
        
        // Calculate and set advanced KPIs
        const kpis = calculateAdvancedKPIs(transactions);
        setAdvancedKPIs(kpis);
        
        // Generate chart data
        setCategoryChartData(generateCategoryChartData(transactions));
        setTrendChartData(generateTrendChartData(transactions));

      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Update chart when period or mode changes (no API calls)
  useEffect(() => {
    if (allTransactions.length > 0) {
      const processedChartData = processTransactionsForChart(allTransactions);
      setChartData(processedChartData);
    }
  }, [chartPeriod, chartMode, allTransactions]);

  const processTransactionsForChart = (transactions) => {
    // Calculate the start date for the current period
    const baseDate = new Date();
    const startDate = subDays(baseDate, (chartPeriod * 14) + 13);
    
    // Generate 14 days for current period
    const periodDays = [];
    for (let i = 0; i < 14; i++) {
      const date = format(addDays(startDate, i), 'yyyy-MM-dd');
      periodDays.push(date);
    }

    // Process transactions by day
    const dailyData = {};
    periodDays.forEach(date => {
      dailyData[date] = { spending: 0, income: 0 };
    });

    // Filter out internal transfers and aggregate transactions
    const actualTransactions = getActualTransactions(transactions);
    actualTransactions.forEach(transaction => {
      const transactionDate = format(new Date(transaction.Timestamp), 'yyyy-MM-dd');
      if (dailyData[transactionDate]) {
        if (transaction.Debit_Credit === 'Debit') {
          dailyData[transactionDate].spending += transaction.Amount;
        } else if (transaction.Debit_Credit === 'Credit') {
          dailyData[transactionDate].income += transaction.Amount;
        }
      }
    });

    const chartLabels = periodDays.map(date => format(new Date(date), 'MMM dd'));
    
    // Show either spending or income based on toggle
    const dataValues = periodDays.map(date => 
      chartMode === 'spending' ? dailyData[date].spending : dailyData[date].income
    );

    const isSpending = chartMode === 'spending';
    
    return {
      labels: chartLabels,
      datasets: [
        {
          label: isSpending ? 'Daily Spending' : 'Daily Income',
          data: dataValues,
          backgroundColor: isSpending ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)',
          borderColor: isSpending ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getPeriodTitle = () => {
    if (chartPeriod === 0) return `Last 14 Days ${chartMode === 'spending' ? 'Spending' : 'Income'}`;
    const startDate = subDays(new Date(), (chartPeriod * 14) + 13);
    const endDate = subDays(new Date(), chartPeriod * 14);
    return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')} ${chartMode === 'spending' ? 'Spending' : 'Income'}`;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#f3f4f6',
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: getPeriodTitle(),
        color: '#f3f4f6',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return '₹' + value.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
      },
      x: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">₹</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Spend Today</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(dailySummary?.totalSpend)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">₹</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Spend This Month</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(monthlySummary?.totalSpend)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">₹</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Income This Month</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(monthlySummary?.totalIncome)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional KPI Card - Net Flow */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                (monthlySummary?.netFlow || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <span className="text-white font-bold text-sm">
                  {(monthlySummary?.netFlow || 0) >= 0 ? '↑' : '↓'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Net Flow This Month</p>
              <p className={`text-2xl font-bold ${
                (monthlySummary?.netFlow || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(monthlySummary?.netFlow)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">#</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Transactions This Month</p>
              <p className="text-2xl font-bold text-white">
                {monthlySummary?.transactionCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Average Daily Spending */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Avg Daily Spend</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(advancedKPIs?.averageDailySpending || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Largest Category */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">🏆</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Top Category</p>
              <p className="text-lg font-bold text-white truncate" title={advancedKPIs?.largestCategory?.name}>
                {advancedKPIs?.largestCategory?.name || 'No data'}
              </p>
              <p className="text-sm text-gray-400">
                {formatCurrency(advancedKPIs?.largestCategory?.amount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                (advancedKPIs?.savingsRate || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <span className="text-white font-bold text-xs">💰</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Savings Rate</p>
              <p className={`text-2xl font-bold ${
                (advancedKPIs?.savingsRate || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(advancedKPIs?.savingsRate || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Bills & Recurring */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">📄</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Bills & Recurring</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(advancedKPIs?.billsAmount || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart with Navigation and Toggle */}
      <div className="card">
        <div className="flex flex-col space-y-3 mb-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-2">
            <button
              onClick={() => setChartPeriod(chartPeriod + 1)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-300 bg-blue-900/50 rounded hover:bg-blue-900/70 transition-colors"
            >
              <span>←</span> Previous 14 Days
            </button>
            <button
              onClick={() => setChartPeriod(Math.max(0, chartPeriod - 1))}
              disabled={chartPeriod === 0}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-300 bg-blue-900/50 rounded hover:bg-blue-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next 14 Days <span>→</span>
            </button>
          </div>
          
          {/* Spending/Income Toggle */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-400 hidden sm:inline">Show:</span>
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setChartMode('spending')}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  chartMode === 'spending'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Spending
              </button>
              <button
                onClick={() => setChartMode('income')}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  chartMode === 'income'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Income
              </button>
            </div>
          </div>
        </div>
        <div className="h-80">
          {chartData ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">No chart data available</p>
            </div>
          )}
        </div>
      </div>

      {/* New Advanced Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Breakdown Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Spending by Category</h3>
            <span className="text-sm text-gray-400">This Month</span>
          </div>
          <div className="h-80">
            {categoryChartData ? (
              <Doughnut 
                data={categoryChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: '#D1D5DB',
                        usePointStyle: true,
                        padding: 20,
                        font: {
                          size: 12
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const value = new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(context.parsed);
                          return `${context.label}: ${value}`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No category data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">6-Month Trend</h3>
            <span className="text-sm text-gray-400">Income vs Spending</span>
          </div>
          <div className="h-80">
            {trendChartData ? (
              <Line 
                data={trendChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: '#D1D5DB'
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const value = new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(context.parsed.y);
                          return `${context.dataset.label}: ${value}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: { color: '#9CA3AF' },
                      grid: { color: '#374151' }
                    },
                    y: {
                      ticks: { 
                        color: '#9CA3AF',
                        callback: (value) => {
                          return new Intl.NumberFormat('en-IN', {
                            notation: 'compact',
                            compactDisplay: 'short'
                          }).format(value);
                        }
                      },
                      grid: { color: '#374151' }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No trend data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;