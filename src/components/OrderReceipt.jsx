import React, { useRef } from 'react';
import { X, Download, Image, FileText, ShieldCheck, MapPin, Phone, Mail, Package } from 'lucide-react';

// Format date nicely
const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
};

export default function OrderReceipt({ order, onClose }) {
  const receiptRef = useRef(null);

  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];

  // ── Download as Image (PNG) ──────────────────────────────────
  const downloadAsImage = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `YARL-SIHINA-Receipt-${order.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ── Download as PDF ──────────────────────────────────────────
  const downloadAsPDF = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`YARL-SIHINA-Receipt-${order.id}.pdf`);
  };

  const statusLabels = {
    pending_slip: 'Pending Slip',
    slip_review: 'Slip Under Review',
    advance_verified: 'Advance Verified ✓',
    packing: 'Packing in Progress',
    ready_to_ship: 'Ready to Ship',
    dispatched: 'Dispatched',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered ✓',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    refund_pending: 'Refund Pending',
    refunded: 'Refunded',
  };

  const statusColors = {
    advance_verified: '#22c55e',
    delivered: '#22c55e',
    dispatched: '#3b82f6',
    out_for_delivery: '#f59e0b',
    slip_review: '#f59e0b',
    packing: '#8b5cf6',
    rejected: '#ef4444',
    cancelled: '#6b7280',
  };

  const statusColor = statusColors[order.status] || '#B58863';

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal-container" onClick={e => e.stopPropagation()}>
        {/* Action Bar */}
        <div className="receipt-action-bar">
          <span className="receipt-action-title">Order Receipt</span>
          <div className="receipt-action-btns">
            <button className="receipt-dl-btn image-btn" onClick={downloadAsImage}>
              <Image size={15} />
              <span>Save Image</span>
            </button>
            <button className="receipt-dl-btn pdf-btn" onClick={downloadAsPDF}>
              <FileText size={15} />
              <span>Save PDF</span>
            </button>
            <button className="receipt-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══ RECEIPT CARD (this gets captured) ═══ */}
        <div className="receipt-card" ref={receiptRef}>
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-brand">
              <div className="receipt-brand-logo">YARL SIHINA</div>
              <div className="receipt-brand-tamil">யாழ் சிஹினா</div>
              <div className="receipt-brand-tagline">Heritage Ceylon Streetwear · Sri Lanka 🇱🇰</div>
            </div>
            <div className="receipt-stamp">
              <ShieldCheck size={20} />
              <span>ORDER RECEIPT</span>
            </div>
          </div>

          {/* Order ID + Date + Status */}
          <div className="receipt-meta-row">
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Order Reference</span>
              <span className="receipt-meta-value receipt-order-id">#{order.id}</span>
            </div>
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Order Date</span>
              <span className="receipt-meta-value">{fmt(order.created_at)}</span>
            </div>
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Status</span>
              <span className="receipt-status-badge" style={{ background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Customer Info */}
          <div className="receipt-section">
            <div className="receipt-section-title">Delivery Details</div>
            <div className="receipt-info-grid">
              <div className="receipt-info-item">
                <Package size={13} className="receipt-info-icon" />
                <span>{order.customer_name}</span>
              </div>
              <div className="receipt-info-item">
                <Phone size={13} className="receipt-info-icon" />
                <span>{order.customer_phone}</span>
              </div>
              {order.customer_email && (
                <div className="receipt-info-item">
                  <Mail size={13} className="receipt-info-icon" />
                  <span>{order.customer_email}</span>
                </div>
              )}
              <div className="receipt-info-item">
                <MapPin size={13} className="receipt-info-icon" />
                <span>{order.customer_address}{order.customer_city ? `, ${order.customer_city}` : ''}</span>
              </div>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Items Table */}
          <div className="receipt-section">
            <div className="receipt-section-title">Order Items</div>
            <table className="receipt-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.title || item.name}</td>
                    <td>
                      {item.hisSize ? `His: ${item.hisSize} / Her: ${item.herSize}` : (item.size || '—')}
                    </td>
                    <td>{item.quantity || item.qty || 1}</td>
                    <td>LKR {Number(item.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="receipt-divider" />

          {/* Payment Breakdown */}
          <div className="receipt-section">
            <div className="receipt-section-title">Payment Summary</div>
            <div className="receipt-payment-rows">
              <div className="receipt-payment-row">
                <span>Subtotal</span>
                <span>LKR {Number(order.total_amount).toLocaleString()}</span>
              </div>
              {Number(order.delivery_fee) > 0 && (
                <div className="receipt-payment-row">
                  <span>Delivery Fee</span>
                  <span>LKR {Number(order.delivery_fee).toLocaleString()}</span>
                </div>
              )}
              {Number(order.delivery_fee) === 0 && (
                <div className="receipt-payment-row discount-row">
                  <span>Delivery</span>
                  <span>FREE 🎉</span>
                </div>
              )}
              <div className="receipt-payment-row advance-row">
                <span>Advance Paid (Bank Transfer)</span>
                <span>LKR {Number(order.advance_required).toLocaleString()}</span>
              </div>
              <div className="receipt-payment-row cod-row">
                <span>Balance (Cash on Delivery)</span>
                <span>LKR {Number(order.balance_cod).toLocaleString()}</span>
              </div>
              <div className="receipt-payment-divider" />
              <div className="receipt-payment-row total-row">
                <span>Grand Total</span>
                <span>LKR {Number(order.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Bank Payment Info */}
          {order.bank_name && (
            <>
              <div className="receipt-divider" />
              <div className="receipt-section">
                <div className="receipt-section-title">Bank Transfer Details</div>
                <div className="receipt-bank-info">
                  <div className="receipt-bank-row"><span>Bank</span><strong>{order.bank_name}</strong></div>
                  {order.slip_reference && <div className="receipt-bank-row"><span>Reference</span><strong>{order.slip_reference}</strong></div>}
                  {order.deposit_date && <div className="receipt-bank-row"><span>Deposit Date</span><strong>{fmt(order.deposit_date)}</strong></div>}
                </div>
              </div>
            </>
          )}

          {/* Courier Info */}
          {order.courier_name && (
            <>
              <div className="receipt-divider" />
              <div className="receipt-section">
                <div className="receipt-section-title">Shipping Details</div>
                <div className="receipt-bank-info">
                  <div className="receipt-bank-row"><span>Courier</span><strong>{order.courier_name}</strong></div>
                  {order.courier_tracking_no && <div className="receipt-bank-row"><span>Tracking No.</span><strong>{order.courier_tracking_no}</strong></div>}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="receipt-footer">
            <div className="receipt-footer-brand">YARL SIHINA · யாழ் சிஹினா</div>
            <div className="receipt-footer-text">
              Thank you for choosing YARL SIHINA.<br />
              For support: WhatsApp +94 712 599 185 · yarl.sihina.shop
            </div>
            <div className="receipt-footer-note">
              This is a digital order receipt. Keep this for your records.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
