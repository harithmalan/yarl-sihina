import React from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Truck, 
  TrendingUp, 
  Building2, 
  CreditCard,
  Package,
  ArrowUpRight
} from 'lucide-react';

export default function AnalyticsDashboard({ stats, orders, onSelectOrderForReview }) {
  const pendingOrders = orders.filter(o => o.status === 'slip_review');

  return (
    <div className="analytics-dashboard-panel">
      {/* Top 4 Metric KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Slips Awaiting Review */}
        <div className="kpi-card highlight-attention">
          <div className="kpi-top">
            <span className="kpi-label">Slips Awaiting Review</span>
            <div className="kpi-icon-wrap warning">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value">{stats.pendingSlips}</div>
          <div className="kpi-footer text-warning">
            <span>Requires admin check before dispatch</span>
          </div>
        </div>

        {/* KPI 2: Advance Collected */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Advance Cash Verified</span>
            <div className="kpi-icon-wrap success">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value">LKR {stats.advanceCollected.toLocaleString()}</div>
          <div className="kpi-footer text-success">
            <span>Deposited directly to company banks</span>
          </div>
        </div>

        {/* KPI 3: In-Transit COD Balance */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Outstanding Courier COD</span>
            <div className="kpi-icon-wrap info">
              <Truck size={18} />
            </div>
          </div>
          <div className="kpi-value">LKR {stats.codOutstanding.toLocaleString()}</div>
          <div className="kpi-footer">
            <span>To be collected by Domex / Koombiyo</span>
          </div>
        </div>

        {/* KPI 4: Total Revenue */}
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Total Store Volume</span>
            <div className="kpi-icon-wrap caramel">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">LKR {stats.totalRevenue.toLocaleString()}</div>
          <div className="kpi-footer">
            <span>Across {stats.totalOrders} total orders</span>
          </div>
        </div>
      </div>

      {/* Grid: Pending Slip Queue & Banking Breakdown */}
      <div className="analytics-split-grid">
        {/* Left: Urgent Pending Slips */}
        <div className="analytics-box">
          <div className="box-header">
            <h3>Urgent: Unverified Slips ({pendingOrders.length})</h3>
            <span className="box-subtitle">Customer bank receipts waiting for your confirmation</span>
          </div>

          <div className="pending-slips-list">
            {pendingOrders.length === 0 ? (
              <div className="all-clear-state">
                <CheckCircle2 size={32} className="text-success" />
                <p>All clear! No slips waiting for review.</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="pending-slip-row">
                  <div className="slip-mini-meta">
                    <strong>Order #{order.id}</strong>
                    <span>{order.customer_name} ({order.customer_city || 'Sri Lanka'})</span>
                    <small className="bank-meta-tag">
                      {order.bank_name || 'Bank Transfer'} · Ref: {order.slip_reference || 'N/A'}
                    </small>
                  </div>
                  <div className="slip-action-right">
                    <span className="adv-amount-tag">Adv: LKR {order.advance_required}</span>
                    <button 
                      type="button" 
                      className="mini-review-btn"
                      onClick={() => onSelectOrderForReview(order)}
                    >
                      Review Slip <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Payment Channels & Islandwide Logistics */}
        <div className="analytics-box">
          <div className="box-header">
            <h3>Deposit Accounts & Fulfillment Partners</h3>
            <span className="box-subtitle">Payment methods and courier breakdown</span>
          </div>

          <div className="partner-cards-list">
            <div className="partner-card">
              <Building2 size={18} className="text-caramel" />
              <div className="partner-info">
                <strong>Commercial Bank of Ceylon</strong>
                <span>Primary Advance Collection Account</span>
              </div>
              <span className="badge-active">Active</span>
            </div>

            <div className="partner-card">
              <Building2 size={18} className="text-caramel" />
              <div className="partner-info">
                <strong>Bank of Ceylon (BOC)</strong>
                <span>Secondary Islandwide Branch Deposit</span>
              </div>
              <span className="badge-active">Active</span>
            </div>

            <div className="partner-card">
              <Truck size={18} className="text-caramel" />
              <div className="partner-info">
                <strong>Domex & Koombiyo Logistics</strong>
                <span>Cash on Delivery (COD) & Doorstep Dispatch</span>
              </div>
              <span className="badge-active">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
