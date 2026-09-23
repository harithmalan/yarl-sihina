import React from 'react';
import { Send, X, ShieldCheck, CheckCircle2, MessageCircle } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, orderData }) {
  if (!isOpen || !orderData) return null;

  const { ref, customer, math, cartItems } = orderData;

  const sendToWhatsApp = () => {
    let msg = `*🎨 YARL SIHINA ORDER CONFIRMATION*%0A`;
    msg += `*Order Ref:* #${ref}%0A`;
    msg += `*━━━━━━━━━━━━━━━━━━*%0A`;
    msg += `*CUSTOMER DETAILS*%0A`;
    msg += `*Name:* ${customer.name}%0A`;
    msg += `*Contact:* ${customer.phone}%0A`;
    msg += `*Address:* ${customer.address}%0A`;
    if (customer.notes) msg += `*Notes:* ${customer.notes}%0A`;
    msg += `*━━━━━━━━━━━━━━━━━━*%0A`;
    msg += `*ITEMS ORDERED (%0A`;

    cartItems.forEach(i => {
      msg += `✦ ${i.name} [${i.selectedSize}] × ${i.qty} = LKR ${(i.price * i.qty).toLocaleString()}%0A`;
    });

    msg += `*━━━━━━━━━━━━━━━━━━*%0A`;
    msg += `*PRICE SUMMARY*%0A`;
    msg += `Subtotal: LKR ${math.subtotal.toLocaleString()}%0A`;
    if (math.discountAmount > 0) {
      msg += `Bulk Discount (${Math.round(math.discountPct * 100)}%): -LKR ${math.discountAmount.toLocaleString()}%0A`;
    }
    msg += `Delivery: ${math.hasFreeDelivery ? 'FREE ✓' : 'LKR ' + math.deliveryFee}%0A`;
    if (math.codChecked) msg += `Payment Option: Cash on Delivery (+LKR 200)%0A`;
    msg += `*Grand Total: LKR ${math.grandTotal.toLocaleString()}*%0A`;
    msg += `*Advance To Pay (LKR 500/piece): LKR ${math.requiredAdvance.toLocaleString()}*%0A`;
    msg += `Balance on Delivery: LKR ${math.remainingBalance.toLocaleString()}%0A`;
    msg += `*━━━━━━━━━━━━━━━━━━*%0A`;
    msg += `Hello! I would like to confirm my YARL SIHINA order #${ref}. Please share bank details to transfer the advance of LKR ${math.requiredAdvance.toLocaleString()}. Thank you!`;

    const whatsappURL = `https://wa.me/94770000000?text=${msg}`;
    window.open(whatsappURL, '_blank');
  };

  return (
    <div className="payment-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header-section">
          <div className="modal-icon-badge">
            <CheckCircle2 size={32} />
          </div>
          <span className="modal-kicker">Order Initiated</span>
          <h2 className="modal-order-number">Order #{ref}</h2>
          <p className="modal-subtitle-text">
            Thank you, <strong>{customer.name}</strong>. Your heritage selections are ready to be reserved.
          </p>
        </div>

        <div className="modal-advance-card">
          <div className="advance-row">
            <span className="advance-label">Advance Required (LKR 500/pc)</span>
            <span className="advance-price">LKR {math.requiredAdvance.toLocaleString()}</span>
          </div>
          <div className="advance-divider"></div>
          <div className="advance-subrow">
            <span>Total Order Amount:</span>
            <span>LKR {math.grandTotal.toLocaleString()}</span>
          </div>
          <div className="advance-subrow">
            <span>Remaining Balance Due:</span>
            <span>LKR {math.remainingBalance.toLocaleString()}</span>
          </div>
        </div>

        <div className="modal-steps-box">
          <h4>Next Simple Step:</h4>
          <ol>
            <li>Click <strong>"Connect on WhatsApp"</strong> below to send your order breakdown.</li>
            <li>Our team will instantly reply with Bank Account / Frimi details for the LKR {math.requiredAdvance.toLocaleString()} advance.</li>
            <li>Share your slip to lock in priority crafting and islandwide dispatch!</li>
          </ol>
        </div>

        <div className="modal-action-buttons">
          <button className="btn-modal-whatsapp" onClick={sendToWhatsApp}>
            <MessageCircle size={18} />
            <span>Connect on WhatsApp</span>
          </button>
          <button className="btn-modal-cancel" onClick={onClose}>
            Back to Store
          </button>
        </div>
      </div>
    </div>
  );
}
