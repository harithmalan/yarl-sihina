import React, { useState } from 'react';
import { 
  Send, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  MessageCircle, 
  UploadCloud, 
  Building2, 
  Calendar, 
  Hash, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import { orderService } from '../lib/orderService';

export default function PaymentModal({ isOpen, onClose, orderData, onOrderCompleted }) {
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [bankName, setBankName] = useState('Commercial Bank');
  const [slipReference, setSlipReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [uploadError, setUploadError] = useState('');

  if (!isOpen || !orderData) return null;

  const { ref, customer, math, cartItems } = orderData;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file (JPG or PNG).');
        return;
      }
      setUploadError('');
      setSlipFile(file);
      const reader = new FileReader();
      reader.onload = () => setSlipPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitSlip = async (e) => {
    e.preventDefault();
    if (!slipPreview && !slipFile) {
      setUploadError('Please upload an image of your bank deposit or transfer slip.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError('');

      const orderPayload = {
        id: ref || 'YS-' + Math.floor(1000 + Math.random() * 9000),
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || '',
        customer_address: customer.address,
        customer_city: customer.city || 'Sri Lanka',
        notes: customer.notes || '',
        items: cartItems.map(item => ({
          id: item.id,
          title: item.name || item.title,
          size: item.selectedSize || item.size,
          hisSize: item.hisSize || null,
          herSize: item.herSize || null,
          quantity: item.qty,
          price: item.price,
          image: item.image
        })),
        total_amount: math.grandTotal,
        advance_required: math.requiredAdvance,
        balance_cod: math.remainingBalance,
        delivery_fee: math.deliveryFee,
        slip_url: slipPreview,
        slip_reference: slipReference || 'REF-' + Date.now().toString().slice(-6),
        bank_name: bankName,
        deposit_date: new Date().toISOString().split('T')[0]
      };

      const created = await orderService.createOrder(orderPayload, slipFile);
      setSubmittedOrder(created);
      if (onOrderCompleted) onOrderCompleted(created);
    } catch (err) {
      setUploadError('Failed to submit slip: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendToWhatsApp = () => {
    let msg = `*🎨 YARL SIHINA ORDER CONFIRMATION*%0A`;
    msg += `*Order Ref:* #${ref}%0A`;
    msg += `*Customer:* ${customer.name} (${customer.phone})%0A`;
    msg += `*Total:* LKR ${math.grandTotal.toLocaleString()}%0A`;
    msg += `*Advance Required:* LKR ${math.requiredAdvance.toLocaleString()}%0A`;
    msg += `Hello! I have placed order #${ref} on Yarl Sihina and am transferring the advance.`;

    const whatsappURL = `https://wa.me/94712599185?text=${msg}`;
    window.open(whatsappURL, '_blank');
  };

  return (
    <div className="payment-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="payment-modal-container slip-upload-modal-size" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {!submittedOrder ? (
          <>
            {/* Modal Header */}
            <div className="modal-header-section">
              <div className="modal-icon-badge">
                <ShieldCheck size={28} />
              </div>
              <span className="modal-kicker">Order #{ref} · Advance Confirmation</span>
              <h2 className="modal-order-number">Upload Bank Payment Slip</h2>
              <p className="modal-subtitle-text">
                Transfer the advance of <strong>LKR {math.requiredAdvance.toLocaleString()}</strong> to reserve your Ceylon pieces.
              </p>
            </div>

            {/* Bank Accounts Grid */}
            <div className="modal-bank-info-box">
              <span className="bank-info-label">Official Yarl Sihina Accounts:</span>
              <div className="bank-accounts-grid">
                <div className="bank-account-item">
                  <strong>Commercial Bank</strong>
                  <div className="acc-number">8820019283</div>
                  <small>Yarl Sihina Apparel · Jaffna Branch</small>
                </div>
                <div className="bank-account-item">
                  <strong>Bank of Ceylon (BOC)</strong>
                  <div className="acc-number">7710048291</div>
                  <small>Yarl Sihina Apparel · Nallur Branch</small>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {uploadError && (
              <div className="auth-error-banner" style={{ margin: '12px 0' }}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Slip Upload Form */}
            <form onSubmit={handleSubmitSlip} className="slip-upload-form">
              {/* Drag/Drop Image Input */}
              <div className="slip-dropzone-wrapper">
                <label className="slip-dropzone-label">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange} 
                    className="slip-file-input"
                  />
                  {slipPreview ? (
                    <div className="slip-preview-container">
                      <img src={slipPreview} alt="Slip Preview" className="slip-thumbnail" />
                      <div className="slip-preview-overlay">
                        <span>Click to Change Slip</span>
                      </div>
                    </div>
                  ) : (
                    <div className="slip-placeholder-box">
                      <UploadCloud size={32} className="text-caramel" />
                      <strong>Tap or Click to Upload Payment Slip</strong>
                      <small>Upload receipt from Commercial Bank, BOC, Frimi, or online banking (JPG, PNG)</small>
                    </div>
                  )}
                </label>
              </div>

              {/* Bank & Reference Row */}
              <div className="slip-meta-inputs-grid">
                <div className="slip-input-group">
                  <label>Deposit Bank</label>
                  <select 
                    value={bankName} 
                    onChange={e => setBankName(e.target.value)}
                    className="slip-form-select"
                  >
                    <option value="Commercial Bank">Commercial Bank</option>
                    <option value="Bank of Ceylon (BOC)">Bank of Ceylon (BOC)</option>
                    <option value="Hatton National Bank (HNB)">Hatton National Bank</option>
                    <option value="Frimi / Digital Bank">Frimi / Online App</option>
                  </select>
                </div>

                <div className="slip-input-group">
                  <label>Transfer Reference / Slip No.</label>
                  <input 
                    type="text" 
                    placeholder="e.g. COMM-88910"
                    value={slipReference}
                    onChange={e => setSlipReference(e.target.value)}
                    className="slip-form-input"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="modal-action-buttons">
                <button 
                  type="submit" 
                  className="btn-modal-submit-slip"
                  disabled={isSubmitting}
                >
                  <CheckCircle2 size={18} />
                  <span>{isSubmitting ? 'Uploading Slip...' : 'Submit Slip for Admin Approval'}</span>
                </button>

                <button 
                  type="button" 
                  className="btn-modal-whatsapp" 
                  onClick={sendToWhatsApp}
                >
                  <MessageCircle size={18} />
                  <span>Send via WhatsApp Instead</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Order Submitted Confirmation Screen */
          <div className="slip-submitted-success">
            <div className="modal-icon-badge success-glow">
              <CheckCircle2 size={40} className="text-success" />
            </div>
            <h2 className="success-title">Payment Slip Received!</h2>
            <p className="success-order-id">Order Ref: <strong>#{submittedOrder.id}</strong></p>
            <p className="success-desc">
              Your slip has been sent directly to the **YARL SIHINA Admin Team**. Once verified (usually within 15–30 minutes), your pieces will be tailored and dispatched.
            </p>

            <div className="success-action-box">
              <a 
                href="/admin" 
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = '#admin';
                  window.location.reload();
                }}
                className="btn-admin-preview"
              >
                <Eye size={16} />
                <span>View Slip in Admin Hub (Review Queue)</span>
              </a>

              <button className="btn-modal-cancel" onClick={onClose}>
                Done & Return to Store
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
