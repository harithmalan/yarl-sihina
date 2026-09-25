import React, { useState, useEffect } from 'react';
import { X, Package, Clock, ChevronRight, ShieldCheck, Truck, CheckCircle2, XCircle, FileText, Image, Download } from 'lucide-react';
import { orderService } from '../lib/orderService';
import OrderReceipt from './OrderReceipt';

const statusConfig = {
  pending_slip:      { label: 'Pending Slip',        color: '#6b7280', icon: Clock },
  slip_review:       { label: 'Slip Under Review',   color: '#f59e0b', icon: Clock },
  advance_verified:  { label: 'Advance Verified',    color: '#22c55e', icon: ShieldCheck },
  packing:           { label: 'Packing',             color: '#8b5cf6', icon: Package },
  ready_to_ship:     { label: 'Ready to Ship',       color: '#3b82f6', icon: Package },
  dispatched:        { label: 'Dispatched',          color: '#3b82f6', icon: Truck },
  out_for_delivery:  { label: 'Out for Delivery',    color: '#f59e0b', icon: Truck },
  delivered:         { label: 'Delivered',           color: '#22c55e', icon: CheckCircle2 },
  rejected:          { label: 'Rejected',            color: '#ef4444', icon: XCircle },
  cancelled:         { label: 'Cancelled',           color: '#6b7280', icon: XCircle },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function OrderHistory({ user, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      const all = await orderService.getOrders();
      // Filter: only show this customer's orders (match by email or customer_id)
      const mine = all.filter(o =>
        (user?.id && o.customer_id === user.id) ||
        (user?.email && o.customer_email === user.email)
      );
      setOrders(mine.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setLoading(false);
    };
    if (user) loadOrders();
  }, [user]);

  if (!user) return null;

  return (
    <>
      <div className="order-history-overlay" onClick={onClose}>
        <div className="order-history-panel" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="order-history-header">
            <div className="order-history-title-wrap">
              <Package size={18} />
              <h2 className="order-history-title">My Orders</h2>
            </div>
            <button className="order-history-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="order-history-body">
            {loading ? (
              <div className="order-history-empty">
                <div className="order-history-spinner" />
                <p>Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="order-history-empty">
                <Package size={44} strokeWidth={1.2} />
                <h3>No Orders Yet</h3>
                <p>Your completed orders will appear here.</p>
              </div>
            ) : (
              <div className="order-history-list">
                {orders.map(order => {
                  const cfg = statusConfig[order.status] || { label: order.status, color: '#B58863', icon: Package };
                  const StatusIcon = cfg.icon;
                  const items = Array.isArray(order.items) ? order.items : [];

                  return (
                    <div key={order.id} className="order-history-card">
                      {/* Card Top Row */}
                      <div className="order-card-top">
                        <div className="order-card-left">
                          <span className="order-card-id">#{order.id}</span>
                          <span className="order-card-date">{fmtDate(order.created_at)}</span>
                        </div>
                        <span className="order-card-status-badge" style={{ background: cfg.color + '18', color: cfg.color, borderColor: cfg.color + '40' }}>
                          <StatusIcon size={11} />
                          {cfg.label}
                        </span>
                      </div>

                      {/* Items preview */}
                      <div className="order-card-items">
                        {items.slice(0, 2).map((item, i) => (
                          <div key={i} className="order-card-item-row">
                            <span className="order-card-item-name">{item.title || item.name}</span>
                            <span className="order-card-item-size">
                              {item.hisSize ? `His ${item.hisSize} / Her ${item.herSize}` : item.size}
                            </span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <span className="order-card-more">+{items.length - 2} more items</span>
                        )}
                      </div>

                      {/* Totals & CTA */}
                      <div className="order-card-footer">
                        <div className="order-card-amounts">
                          <span className="order-card-total">LKR {Number(order.total_amount).toLocaleString()}</span>
                          {order.courier_tracking_no && (
                            <span className="order-card-tracking">📦 {order.courier_name} · {order.courier_tracking_no}</span>
                          )}
                        </div>
                        <button
                          className="order-card-receipt-btn"
                          onClick={() => setSelectedReceipt(order)}
                        >
                          <FileText size={13} />
                          Receipt
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <OrderReceipt
          order={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </>
  );
}
