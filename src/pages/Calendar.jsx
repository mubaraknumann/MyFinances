import { useState, useEffect } from 'react';
import apiService from '../services/api';
import TransactionCalendar from '../components/TransactionCalendar';

const Calendar = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await apiService.getTransactions();
        setTransactions(data);
      } catch (err) {
        setError(err.message || 'Failed to load transactions');
        console.error('Calendar error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
        <h3 className="text-red-400 font-medium mb-2">Error Loading Calendar</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TransactionCalendar transactions={transactions} />
    </div>
  );
};

export default Calendar;