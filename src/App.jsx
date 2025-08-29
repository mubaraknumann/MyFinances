import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import { loadCustomCategoriesFromBackend } from './utils/categoryManager';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load custom categories when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCustomCategoriesFromBackend().catch(error => {
        console.warn('Failed to load custom categories from backend:', error);
      });
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <AuthGate
        onAuthenticated={() => setIsAuthenticated(true)}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </AuthGate>
    </Router>
  );
}

export default App;