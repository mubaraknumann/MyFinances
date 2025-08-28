import { useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthGate = ({ children, onAuthenticated }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkExistingAuth = async () => {
      const savedKey = apiService.getApiKey();
      const savedUrl = apiService.getApiUrl();
      
      if (savedKey && savedUrl) {
        setIsLoading(true);
        try {
          const isValid = await apiService.testConnection();
          if (isValid) {
            setIsAuthenticated(true);
            onAuthenticated && onAuthenticated();
          } else {
            apiService.clearApiKey();
            setError('Saved API key is invalid. Please re-enter.');
          }
        } catch (err) {
          apiService.clearApiKey();
          setError('Connection failed. Please re-enter API key.');
        }
        setIsLoading(false);
      }
      setIsCheckingAuth(false);
    };

    checkExistingAuth();
  }, [onAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }
    
    if (!apiUrl.trim()) {
      setError('Please enter the API URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      apiService.setApiKey(apiKey.trim());
      apiService.setApiUrl(apiUrl.trim());
      const isValid = await apiService.testConnection();
      
      if (isValid) {
        setIsAuthenticated(true);
        onAuthenticated && onAuthenticated();
      } else {
        setError('Invalid API key. Please check and try again.');
        apiService.clearApiKey();
      }
    } catch (err) {
      setError('Connection failed. Please check your API key and try again.');
      apiService.clearApiKey();
    }
    
    setIsLoading(false);
  };

  const handleLogout = () => {
    apiService.clearApiKey();
    apiService.clearApiUrl();
    setIsAuthenticated(false);
    setApiKey('');
    setApiUrl('');
    setError('');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div>
        {children}
        <button
          onClick={handleLogout}
          className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">MyFinances</h1>
            <p className="text-gray-400">Personal Finance Tracker</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-200 mb-2">
                Google Apps Script URL
              </label>
              <input
                type="url"
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/your-script-id/exec"
                className="form-input w-full"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-200 mb-2">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your API key..."
                className="form-input w-full"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;