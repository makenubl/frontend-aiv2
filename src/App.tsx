import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import VendorPortal from './pages/VendorPortal';
import { useAuthStore } from './store/auth.store';
import './styles/ultra-premium.css';
import './styles/global.css';
import './styles/application-detail.css';

function App() {
  console.info('📱 App component mounted');
  const { isAuthenticated, login, logout } = useAuthStore();
  console.info('🔐 Auth status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');

  const handleLogin = async (username: string, password: string) => {
    console.info('🔑 Login attempt for user:', username);
    try {
      const success = await login(username, password);
      if (!success) {
        console.error('❌ Login failed: Invalid credentials');
        throw new Error('Invalid credentials');
      }
      console.info('✅ Login successful');
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated 
                ? <Navigate to="/" replace /> 
                : <LoginPage onLogin={handleLogin} />
            } 
          />
          
          {/* Vendor Portal Routes */}
          <Route path="/portal/*" element={<VendorPortal />} />
          <Route path="/vendor-portal/*" element={<VendorPortal />} />
          
          {/* Main Dashboard (default protected route) */}
          <Route 
            path="/*" 
            element={
              isAuthenticated 
                ? <UnifiedDashboard onLogout={logout} />
                : <Navigate to="/login" replace />
            } 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
