import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  MessageCircle, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Hash, 
  User, 
  Phone, 
  MapPin, 
  Package
} from 'lucide-react';

export default function SlipVerificationModal({ order, onClose, onVerify }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Deposit amount does not match or reference number is unreadable. Please upload a clear photo.');
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!order) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    await onVerify(order.id, {
      status: 'advance_verified',
      adminNotes: adminNotes || 'Payment slip verified and approved by admin.'
    });
    setIsProcessing(false);
    onClose();
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onVerify(order.id, {
      status: 'rejected',
      adminNotes: rejectionReason
    });
    setIsProcessing(false);
    onClose();
  };

  // WhatsApp prefilled message
  const customerPhoneClean = order.customer_phone.replace(/\D/g, '');
  const approvedWaMsg = encodeURIComponent(
    `Hello ${order.customer_name},\n\nWe have verified and approved your advance payment slip for YARL SIHINA Order #${order.id}!\n\nYour handcrafted Ceylon streetwear pieces are now entering our tailoring and packing process. We will update you once dispatched with your tracking code.\n\nThank you for choosing YARL SIHINA (யாழ் சிஹினா)!`
  );
  const rejectWaMsg = encodeURIComponent(
    `Hello ${order.customer_name},\n\nRegarding your YARL SIHINA Order #${order.id}:\nWe reviewed your payment slip, but need clarification: "${rejectionReason}".\n\nPlease reply with a clearer photo of the bank transfer slip so we can confirm your reservation.\n\nThank you!`
  );

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-container slip-modal-layout" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="admin-modal-header">
          <div>
            <div className="admin-modal-pill">
              <ShieldCheck size={14} className="text-caramel" />
              <span>SLIP VERIFICATION AUDIT · சரிபார்ப்பு</span>
            </div>
            <h2 className="admin-modal-title">Review Payment Slip · Order #{order.id}</h2>
          </div>
          <button className="admin-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split into Slip Image Preview (Left) and Order Details (Right) */}
        <div className="slip-modal-body">
          {/* Left: Interactive Slip Viewer */}
          <div className="slip-viewer-panel">
            <div className="slip-viewer-toolbar">
              <span className="slip-viewer-title">Bank Deposit Slip</span>
              <div className="zoom-controls">
                <button 
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.2))} 
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span>{Math.round(zoomLevel * 100)}%</span>
                <button 
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))} 
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <a 
                  href={order.slip_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="open-full-btn"
                  title="Open Original"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>

            <div className="slip-image-stage">
              {order.slip_url ? (
                <img 
                  src={order.slip_url} 
                  alt="Customer Payment Slip" 
                  className="slip-preview-img"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              ) : (
                <div className="no-slip-placeholder">
                  <XCircle size={36} className="text-muted" />
                  <p>No slip image attached to this order.</p>
                </div>
              )}
            </div>

            <div className="slip-meta-cards">
              <div className="slip-meta-pill">
                <Building2 size={15} className="text-caramel" />
                <div>
                  <label>Bank Name</label>
                  <strong>{order.bank_name || 'Commercial Bank / BOC'}</strong>
                </div>
              </div>
              <div className="slip-meta-pill">
                <Hash size={15} className="text-caramel" />
                <div>
                  <label>Slip Reference</label>
                  <strong>{order.slip_reference || 'REF-NOT-ENTERED'}</strong>
                </div>
              </div>
              <div className="slip-meta-pill">
                <Calendar size={15} className="text-caramel" />
                <div>
                  <label>Deposit Date</label>
                  <strong>{order.deposit_date || 'Today'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order Summary & Approval Decision */}
          <div className="slip-details-panel">
            {/* Customer Info Card */}
            <div className="admin-card-inner">
              <h3 className="admin-section-heading">Customer Information</h3>
              <div className="info-row">
                <User size={15} className="info-icon" />
                <div>
                  <span className="info-label">Customer Name</span>
                  <p className="info-value">{order.customer_name}</p>
                </div>
              </div>
              <div className="info-row">
                <Phone size={15} className="info-icon" />
                <div>
                  <span className="info-label">WhatsApp Contact</span>
                  <p className="info-value">{order.customer_phone}</p>
                </div>
              </div>
              <div className="info-row">
                <MapPin size={15} className="info-icon" />
                <div>
                  <span className="info-label">Delivery Address</span>
                  <p className="info-value">{order.customer_address}</p>
                </div>
              </div>
              {order.notes && (
                <div className="customer-order-note">
                  <em>“{order.notes}”</em>
                </div>
              )}
            </div>

            {/* Items Ordered */}
            <div className="admin-card-inner">
              <h3 className="admin-section-heading">Items in Order</h3>
              <div className="admin-items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="admin-item-row">
                    <img src={item.image} alt={item.title} className="admin-item-thumb" />
                    <div className="admin-item-meta">
                      <strong>{item.title}</strong>
                      <div className="admin-item-sizing">
                        {item.size && <span className="size-badge">Size: {item.size}</span>}
                        {item.hisSize && <span className="size-badge">His: {item.hisSize}</span>}
                        {item.herSize && <span className="size-badge">Her: {item.herSize}</span>}
                        <span className="qty-badge">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="admin-item-price">
                      LKR {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Verification Breakdown */}
            <div className="admin-financial-box">
              <div className="fin-row">
                <span>Total Order Value:</span>
                <strong>LKR {Number(order.total_amount).toLocaleString()}</strong>
              </div>
              <div className="fin-row highlight-advance">
                <span>Required Advance (Slip Amount):</span>
                <span className="advance-tag">LKR {Number(order.advance_required).toLocaleString()}</span>
              </div>
              <div className="fin-row">
                <span>Remaining Balance on Delivery (COD):</span>
                <strong>LKR {Number(order.balance_cod).toLocaleString()}</strong>
              </div>
            </div>

            {/* Decision Controls */}
            <div className="admin-decision-area">
              {!showRejectPrompt ? (
                <>
                  <label className="admin-field-label">Verification Note (Optional)</label>
                  <input 
                    type="text" 
                    className="admin-input-text"
                    placeholder="e.g. Verified with Commercial Bank App"
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                  />

                  <div className="decision-buttons">
                    <button 
                      type="button" 
                      className="admin-btn approve-btn"
                      onClick={handleApprove}
                      disabled={isProcessing}
                    >
                      <CheckCircle2 size={18} />
                      <span>Approve & Confirm Order</span>
                    </button>

                    <button 
                      type="button" 
                      className="admin-btn reject-toggle-btn"
                      onClick={() => setShowRejectPrompt(true)}
                      disabled={isProcessing}
                    >
                      <XCircle size={18} />
                      <span>Reject Slip</span>
                    </button>
                  </div>

                  {/* Quick WhatsApp Link */}
                  <a 
                    href={`https://wa.me/${customerPhoneClean}?text=${approvedWaMsg}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-wa-quick-btn"
                  >
                    <MessageCircle size={16} />
                    <span>Send Approval WhatsApp Message</span>
                  </a>
                </>
              ) : (
                <div className="reject-prompt-box">
                  <label className="admin-field-label text-danger">Specify Reason for Rejection</label>
                  <textarea 
                    className="admin-textarea"
                    rows={3}
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                  <div className="reject-actions">
                    <button 
                      type="button" 
                      className="admin-btn confirm-reject-btn"
                      onClick={handleReject}
                      disabled={isProcessing}
                    >
                      Confirm Rejection
                    </button>
                    <button 
                      type="button" 
                      className="admin-btn cancel-btn"
                      onClick={() => setShowRejectPrompt(false)}
                    >
                      Cancel
                    </button>
                  </div>
                  <a 
                    href={`https://wa.me/${customerPhoneClean}?text=${rejectWaMsg}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-wa-quick-btn"
                  >
                    <MessageCircle size={16} />
                    <span>Send Rejection Notice to Customer</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
