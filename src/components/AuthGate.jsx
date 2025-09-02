import { useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthGate = ({ children, onAuthenticated }) => {
  const [authUrl, setAuthUrl] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [showUrlSetup, setShowUrlSetup] = useState(false);
  const [needsUrlSetup, setNeedsUrlSetup] = useState(false);

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const savedAuthUrl = localStorage.getItem('authUrl');
        const savedApiUrl = localStorage.getItem('apiUrl');
        const savedUser = localStorage.getItem('googleUser');
        
        console.log('Checking auth - AuthURL:', savedAuthUrl, 'ApiURL:', savedApiUrl, 'User:', savedUser);
        
        if (!savedAuthUrl || !savedApiUrl) {
          // No URLs configured - show setup
          console.log('No URLs found, showing setup');
          setNeedsUrlSetup(true);
          setIsCheckingAuth(false);
          return;
        }
        
        // URLs exist, set them
        setAuthUrl(savedAuthUrl);
        setApiUrl(savedApiUrl);
        apiService.setApiUrl(savedApiUrl);
        
        if (savedUser) {
          // User exists, test API connection to verify they still have access
          console.log('Found saved user, verifying API access');
          const userData = JSON.parse(savedUser);
          
          try {
            apiService.setApiUrl(savedApiUrl);
            const isValid = await apiService.testConnection();
            
            if (isValid) {
              console.log('Auth verification successful');
              setUser(userData);
              setIsAuthenticated(true);
              onAuthenticated && onAuthenticated();
              setIsCheckingAuth(false);
              return;
            } else {
              console.log('API verification failed, clearing user');
              localStorage.removeItem('googleUser');
              setUser(null);
            }
          } catch (err) {
            console.log('API verification error, clearing user:', err);
            localStorage.removeItem('googleUser');
            setUser(null);
          }
        }
        
        // If we get here, URLs exist but no valid user - show login
        console.log('URLs exist but no valid user, showing login');
      } catch (err) {
        console.error('Auth check error:', err);
      }
      setIsCheckingAuth(false);
    };

    checkExistingAuth();
  }, [onAuthenticated]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Opening Google authentication:', authUrl);
      
      // Simply open the Google Apps Script auth URL - Google handles authentication automatically
      const authWindow = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Wait for the popup to complete authentication
      const waitForAuth = new Promise((resolve, reject) => {
        const checkCompleted = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(checkCompleted);
            
            // After popup closes, check if authentication was successful by testing the API
            try {
              apiService.setApiUrl(apiUrl);
              const testResult = await apiService.testConnection();
              
              if (testResult) {
                // Authentication successful - get user data from a summary call
                const summaryResult = await apiService.getSummary('daily');
                
                // Since we don't have user data directly, create minimal user info
                const userData = {
                  email: 'authenticated-user',  // We'll get real email from backend if needed
                  name: 'User',
                  timestamp: Date.now()
                };
                
                localStorage.setItem('googleUser', JSON.stringify(userData));
                resolve(userData);
              } else {
                reject(new Error('Authentication failed'));
              }
            } catch (error) {
              reject(new Error('Authentication failed: ' + error.message));
            }
          }
        }, 1000);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkCompleted);
          if (!authWindow.closed) {
            authWindow.close();
          }
          reject(new Error('Authentication timed out'));
        }, 300000);
      });

      const userData = await waitForAuth;
      
      // Configure API service and test connection
      apiService.setApiUrl(scriptUrl);
      
      const isValid = await apiService.testConnection();
      if (isValid) {
        setUser(userData);
        setIsAuthenticated(true);
        onAuthenticated && onAuthenticated();
      } else {
        localStorage.removeItem('googleUser');
        throw new Error('Could not connect to your API. Please check your Script URL.');
      }
      
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message);
      localStorage.removeItem('googleUser');
    }
    
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('googleUser');
    setIsAuthenticated(false);
    setUser(null);
    setError('');
    // Keep URLs saved
  };

  const handleClearData = () => {
    localStorage.removeItem('googleUser');
    localStorage.removeItem('authUrl');
    localStorage.removeItem('apiUrl');
    setIsAuthenticated(false);
    setUser(null);
    setAuthUrl('');
    setApiUrl('');
    setError('');
    setNeedsUrlSetup(true);
  };

  const handleUrlSetup = async (e) => {
    e.preventDefault();
    if (!authUrl.trim() || !apiUrl.trim()) {
      setError('Please enter both Authentication and API URLs');
      return;
    }

    // Validate URL formats
    const authUrlTrimmed = authUrl.trim();
    const apiUrlTrimmed = apiUrl.trim();
    
    if (!authUrlTrimmed.includes('script.google.com/macros/s/') || !authUrlTrimmed.endsWith('/exec')) {
      setError('Please use the correct Google Apps Script Web App URL format for Authentication URL');
      return;
    }
    
    if (!apiUrlTrimmed.includes('script.google.com/macros/s/') || !apiUrlTrimmed.endsWith('/exec')) {
      setError('Please use the correct Google Apps Script Web App URL format for API URL');
      return;
    }

    // Save URLs permanently
    localStorage.setItem('authUrl', authUrlTrimmed);
    localStorage.setItem('apiUrl', apiUrlTrimmed);
    setNeedsUrlSetup(false);
    
    // Immediately try to authenticate
    handleGoogleSignIn();
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
        <div className="fixed bottom-4 right-4 flex items-center space-x-2">
          {user && (
            <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm">
              {user.name}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
          <button
            onClick={() => setShowUrlSetup(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
        
        {showUrlSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Settings</h3>
              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Auth URL:</strong> {authUrl}</p>
                <p><strong>API URL:</strong> {apiUrl}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleClearData}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  Clear All Data
                </button>
                <button
                  onClick={() => setShowUrlSetup(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  // Show URL setup screen if needed
  if (needsUrlSetup) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">MyFinances</h1>
              <p className="text-gray-400">Personal Finance Tracker</p>
            </div>
            
            <form onSubmit={handleUrlSetup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Authentication URL
                </label>
                <input
                  type="url"
                  value={authUrl}
                  onChange={(e) => setAuthUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/auth-script-id/exec"
                  className="form-input w-full mb-4"
                  required
                />
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  API URL
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/api-script-id/exec"
                  className="form-input w-full"
                  required
                />
                <div className="mt-2 text-xs text-gray-400">
                  <p><strong>One-time setup:</strong> Enter your separate Google Apps Script URLs for authentication and API.</p>
                  <p>These URLs will be saved and reused for future sessions.</p>
                </div>
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
                {isLoading ? 'Setting up...' : 'Save & Continue with Google'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen (URL configured, user not authenticated)
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">MyFinances</h1>
            <p className="text-gray-400">Personal Finance Tracker</p>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Welcome Back!</h2>
              <p className="text-gray-400">Click below to sign in with Google</p>
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <button
              onClick={() => handleGoogleSignIn()}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>
            
            <p className="text-gray-400 text-xs text-center">
              Secure authentication through Google Apps Script
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;