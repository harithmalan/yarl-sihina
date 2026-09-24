import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  FileCheck2, 
  Package, 
  Layers, 
  ArrowLeft, 
  RefreshCw, 
  Database, 
  Lock, 
  LogOut,
  ExternalLink
} from 'lucide-react';
import { orderService } from '../lib/orderService';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import SlipVerificationModal from './components/SlipVerificationModal';
import OrderManagement from './components/OrderManagement';
import InventoryManager from './components/InventoryManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './Admin.css';

export default function AdminApp({ onExitAdmin }) {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('review'); // 'dashboard', 'review', 'orders', 'inventory'
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('yarl_admin_auth') === 'true';
  });
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Load orders
  const loadOrders = async () => {
    setIsLoading(true);
    const data = await orderService.getOrders();
    setOrders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    // Default demo passcode is 1234 or empty for instant review
    if (adminPin.trim() === '1234' || adminPin.trim() === 'admin' || adminPin.trim() === '') {
      setIsAuthenticated(true);
      localStorage.setItem('yarl_admin_auth', 'true');
      setPinError('');
    } else {
      setPinError('Invalid Passcode. Enter 1234 or leave blank for demo access.');
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('yarl_admin_auth');
  };

  // Verify slip action
  const handleVerifySlip = async (orderId, verificationData) => {
    await orderService.verifySlip(orderId, verificationData);
    await loadOrders();
  };

  // Update shipping action
  const handleUpdateShipping = async (orderId, shippingData) => {
    await orderService.updateShipping(orderId, shippingData);
    await loadOrders();
  };

  const stats = orderService.calculateStats(orders);

  // If not authenticated, show Admin Login Gate
  if (!isAuthenticated) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-brand-icon">
            <ShieldCheck size={32} className="text-caramel" />
          </div>
          <h1 className="admin-login-title">YARL SIHINA</h1>
          <p className="admin-login-subtitle">Admin Portal</p>
          <p className="admin-login-desc">
            Secure workspace for verifying customer bank transfer slips and dispatching Ceylon streetwear orders.
          </p>

          <form onSubmit={handleAdminLogin} className="admin-login-form">
            <div className="admin-field-group">
              <label>Admin Passcode (Default: <code>1234</code>)</label>
              <input 
                type="password" 
                className="admin-input-text"
                placeholder="Enter 1234 or press Continue"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                autoFocus
              />
            </div>

            {pinError && <div className="admin-pin-error">{pinError}</div>}

            <button type="submit" className="admin-btn approve-btn w-full">
              <Lock size={16} />
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <div className="admin-login-footer">
            <button type="button" onClick={onExitAdmin} className="admin-back-link">
              <ArrowLeft size={14} /> Back to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app-root">
      {/* Top Admin Navigation Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-brand-logo">
            <span className="brand-primary">YARL SIHINA</span>
            <span className="brand-badge">ADMIN</span>
          </div>


          {/* Database Connection Pill */}
          <div className={`db-status-pill ${isSupabaseConfigured ? 'connected' : 'demo'}`}>
            <Database size={12} />
            <span>{isSupabaseConfigured ? 'Supabase Live DB' : 'Local Demo Mode'}</span>
          </div>
        </div>

        <div className="admin-header-nav">
          <button 
            type="button" 
            className={`admin-nav-item ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            <FileCheck2 size={16} />
            <span>Slip Review</span>
            {stats.pendingSlips > 0 && (
              <span className="nav-badge-alert">{stats.pendingSlips}</span>
            )}
          </button>

          <button 
            type="button" 
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Package size={16} />
            <span>Orders & Shipping</span>
          </button>

          <button 
            type="button" 
            className={`admin-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Layers size={16} />
            <span>Inventory Matrix</span>
          </button>

          <button 
            type="button" 
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Analytics</span>
          </button>
        </div>

        <div className="admin-header-right">
          <button 
            type="button" 
            className="admin-icon-btn" 
            onClick={loadOrders} 
            title="Refresh Orders"
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>

          <button 
            type="button" 
            className="admin-storefront-btn"
            onClick={onExitAdmin}
            title="View Storefront"
          >
            <ExternalLink size={14} />
            <span>Storefront</span>
          </button>

          <button 
            type="button" 
            className="admin-icon-btn logout-btn" 
            onClick={handleAdminLogout}
            title="Lock Console"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="admin-main-container">
        {/* TAB 1: Slip Review Focus */}
        {activeTab === 'review' && (
          <div className="admin-tab-content">
            <div className="admin-page-hero">
              <div>
                <h1 className="admin-page-title">Bank Slip Verification Hub</h1>
                <p className="admin-page-subtitle">
                  Inspect uploaded receipts, match bank references, and approve orders to unlock tailoring and islandwide dispatch.
                </p>
              </div>
              <div className="hero-quick-counter">
                <span className="counter-number">{stats.pendingSlips}</span>
                <span className="counter-label">Awaiting Verification</span>
              </div>
            </div>

            <OrderManagement 
              orders={orders}
              onSelectOrderForReview={setSelectedOrderForReview}
              onUpdateShipping={handleUpdateShipping}
            />
          </div>
        )}

        {/* TAB 2: Orders & Courier Dispatch */}
        {activeTab === 'orders' && (
          <div className="admin-tab-content">
            <div className="admin-page-hero">
              <div>
                <h1 className="admin-page-title">Fulfillment & Courier Pipeline</h1>
                <p className="admin-page-subtitle">
                  Track orders from advance confirmation to parcel dispatch with Domex, Koombiyo, and Pronto Lanka.
                </p>
              </div>
            </div>

            <OrderManagement 
              orders={orders}
              onSelectOrderForReview={setSelectedOrderForReview}
              onUpdateShipping={handleUpdateShipping}
            />
          </div>
        )}

        {/* TAB 3: Inventory Matrix */}
        {activeTab === 'inventory' && (
          <div className="admin-tab-content">
            <InventoryManager />
          </div>
        )}

        {/* TAB 4: Analytics */}
        {activeTab === 'dashboard' && (
          <div className="admin-tab-content">
            <AnalyticsDashboard 
              stats={stats}
              orders={orders}
              onSelectOrderForReview={setSelectedOrderForReview}
            />
          </div>
        )}
      </main>

      {/* Slip Verification Zoom Modal */}
      {selectedOrderForReview && (
        <SlipVerificationModal 
          order={selectedOrderForReview}
          onClose={() => setSelectedOrderForReview(null)}
          onVerify={handleVerifySlip}
        />
      )}
    </div>
  );
}
