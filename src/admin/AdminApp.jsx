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
  ExternalLink,
  Shirt,
  AlertTriangle
} from 'lucide-react';
import { orderService } from '../lib/orderService';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import SlipVerificationModal from './components/SlipVerificationModal';
import OrderManagement from './components/OrderManagement';
import InventoryManager from './components/InventoryManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ProductManager from './components/ProductManager';
import './Admin.css';

// Admin password from env — set VITE_ADMIN_PASSWORD in .env.local
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'yarl2026';

export default function AdminApp({ onExitAdmin }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('review');
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminVerified, setIsAdminVerified] = useState(() =>
    sessionStorage.getItem('yarl_admin_session') === 'granted'
  );
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  // null = unknown/not yet checked, true = confirmed admin, false = confirmed NOT admin
  const [isActualAdmin, setIsActualAdmin] = useState(null);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Check if logged-in user has is_admin = TRUE in Supabase profiles
  useEffect(() => {
    const checkAdminRole = async () => {
      setIsCheckingRole(true);

      if (!isSupabaseConfigured || !supabase) {
        // No Supabase configured — dev/preview mode, let password gate decide
        setIsActualAdmin(null);
        setIsCheckingRole(false);
        return;
      }

      if (!user?.id) {
        // Not logged in yet — could still be loading, don't block
        setIsActualAdmin(null);
        setIsCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle(); // maybeSingle() returns null if not found, no error

        if (error) {
          // DB error → fall back to password gate (don't hard block)
          console.warn('Admin role check error:', error.message);
          setIsActualAdmin(null);
        } else if (data === null) {
          // Profile row doesn't exist yet → fall back to password gate
          console.warn('No profile row found — falling back to password gate');
          setIsActualAdmin(null);
        } else {
          // Profile found — check is_admin flag
          setIsActualAdmin(data.is_admin === true);
        }
      } catch (err) {
        console.warn('Admin check exception:', err);
        setIsActualAdmin(null);
      }

      setIsCheckingRole(false);
    };
    checkAdminRole();
  }, [user]);

  // Load ALL orders (admin sees everything)
  const loadOrders = async () => {
    setIsLoading(true);
    const data = await orderService.getOrders();
    setOrders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdminVerified && isActualAdmin) loadOrders();
  }, [isAdminVerified, isActualAdmin]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === ADMIN_PASSWORD) {
      sessionStorage.setItem('yarl_admin_session', 'granted');
      setIsAdminVerified(true);
      setPinError('');
    } else {
      setPinError('Incorrect password. Access denied.');
      setAdminPin('');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('yarl_admin_session');
    setIsAdminVerified(false);
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

  // ── 1. Still checking Supabase role ──────────────────────────
  if (isCheckingRole) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card" style={{ textAlign: 'center' }}>
          <div className="admin-brand-icon"><ShieldCheck size={32} className="text-caramel" /></div>
          <div style={{ marginTop: 16, color: '#B58863', fontSize: 14 }}>Checking access...</div>
        </div>
      </div>
    );
  }

  // ── 2. Logged-in user is confirmed NOT admin → block immediately ───────
  // Only block when isActualAdmin is explicitly FALSE (not null/unknown)
  if (isSupabaseConfigured && isActualAdmin === false) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-brand-icon" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={32} style={{ color: '#ef4444' }} />
          </div>
          <h1 className="admin-login-title">Access Denied</h1>
          <p className="admin-login-desc" style={{ color: '#ef4444', marginBottom: 24 }}>
            You don't have permission to access the Admin Portal. This area is restricted to authorised administrators only.
          </p>
          <button type="button" onClick={onExitAdmin} className="admin-btn approve-btn w-full">
            <ArrowLeft size={16} />
            <span>Return to Store</span>
          </button>
        </div>
      </div>
    );
  }

  // ── 3. Admin not yet password-verified this session ───────────
  if (!isAdminVerified) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-brand-icon">
            <ShieldCheck size={32} className="text-caramel" />
          </div>
          <h1 className="admin-login-title">YARL SIHINA</h1>
          <p className="admin-login-subtitle">Admin Portal</p>
          <p className="admin-login-desc">
            Secure workspace for verifying bank transfer slips and managing Ceylon streetwear orders.
          </p>

          <form onSubmit={handleAdminLogin} className="admin-login-form">
            <div className="admin-field-group">
              <label>Admin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="admin-input-text"
                  placeholder="Enter admin password"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8A9BA8', fontSize: 12 }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
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
            className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Shirt size={16} />
            <span>Products & Drops</span>
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

        {/* TAB: Manage Products & Drops */}
        {activeTab === 'products' && (
          <div className="admin-tab-content">
            <ProductManager />
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
