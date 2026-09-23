import React, { useState } from 'react';
import { PackageOpen, Trash2 } from 'lucide-react';

export default function Cart({ cartItems, onRemoveFromCart, onInitiateOrder }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    notes: '',
    cod: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateFullOrder = () => {
    let subtotal = 0;
    let totalPieces = 0;
    let hasCoupleOrder = false;

    cartItems.forEach(item => {
      subtotal += (item.price * item.qty);
      totalPieces += item.totalItemsCount * item.qty;
      if (item.isCouple) hasCoupleOrder = true;
    });

    let discountPct = 0;
    if (totalPieces >= 25) discountPct = 0.20;
    else if (totalPieces >= 16) discountPct = 0.15;
    else if (totalPieces >= 10) discountPct = 0.10;

    const discountAmount = Math.round(subtotal * discountPct);
    const discountedSubtotal = subtotal - discountAmount;

    let deliveryFee = 0;
    if (totalPieces > 0) {
      if (hasCoupleOrder || totalPieces >= 10) deliveryFee = 0;
      else deliveryFee = 150;
    }

    const codFee = (formData.cod && totalPieces > 0) ? 200 : 0;
    const grandTotal = discountedSubtotal + deliveryFee + codFee;
    const requiredAdvance = totalPieces * 500;
    const remainingBalance = Math.max(0, grandTotal - requiredAdvance);

    return { 
      totalPieces, 
      subtotal, 
      discountPct, 
      discountAmount, 
      discountedSubtotal, 
      deliveryFee, 
      hasFreeDelivery: (deliveryFee === 0 && totalPieces > 0), 
      codChecked: formData.cod, 
      codFee, 
      grandTotal, 
      requiredAdvance, 
      remainingBalance 
    };
  };

  const math = calculateFullOrder();

  const handleSubmit = () => {
    if (cartItems.length === 0) return;
    if (!formData.name || !formData.phone || !formData.address) {
      alert("Please complete all required fields (Name, Phone, Address).");
      return;
    }
    onInitiateOrder(formData, math);
  };

  if (cartItems.length === 0) {
    return (
      <section className="cart-section">
        <div className="cart-items-container">
          <div className="cart-title cinzel-font">Your Selections</div>
          <div className="empty-cart">
            <PackageOpen size={64} className="empty-icon" />
            <p className="empty-text">Your collection is empty. Explore our heritage pieces.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-section" id="cartSection">
      <div className="cart-items-container">
        <div className="cart-title cinzel-font">Your Selections</div>
        <div>
          {cartItems.map(item => (
            <div key={item.cartId} className="cart-item-row">
              <div className="cart-item-info">
                <strong>{item.name}</strong>
                <div className="cart-item-details">Size: {item.selectedSize} &times; {item.qty} Qty</div>
                <button className="cart-remove-btn" onClick={() => onRemoveFromCart(item.cartId)}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
              <div className="cart-price cinzel-font">LKR {(item.price * item.qty).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="checkout-sidebar">
        <div className="checkout-title cinzel-font">Order Summary</div>
        
        <div className="calculation-row">
          <span className="calculation-label">Total Pieces</span>
          <span className="calculation-value">{math.totalPieces}</span>
        </div>
        
        <div className="calculation-row">
          <span className="calculation-label">Subtotal</span>
          <span className="calculation-value">LKR {math.subtotal.toLocaleString()}</span>
        </div>
        
        {math.discountAmount > 0 && (
          <div className="calculation-row discount-row">
            <span className="calculation-label">Bulk Discount ({Math.round(math.discountPct * 100)}%)</span>
            <span className="calculation-value">- LKR {math.discountAmount.toLocaleString()}</span>
          </div>
        )}
        
        <div className="calculation-row">
          <span className="calculation-label">Delivery</span>
          <span className={`calculation-value ${math.hasFreeDelivery ? 'free-delivery' : ''}`}>
            {math.hasFreeDelivery ? 'FREE' : `LKR ${math.deliveryFee}`}
          </span>
        </div>
        
        {math.codFee > 0 && (
          <div className="calculation-row">
            <span className="calculation-label">COD Fee</span>
            <span className="calculation-value">LKR {math.codFee}</span>
          </div>
        )}
        
        <div className="calculation-row grand-total-row">
          <span>Grand Total</span>
          <span className="cinzel-font">LKR {math.grandTotal.toLocaleString()}</span>
        </div>
        
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" name="name" className="form-input" placeholder="Your name" value={formData.name} onChange={handleInputChange} required />
          </div>
          
          <div className="form-group">
            <label className="form-label">WhatsApp Number *</label>
            <input type="tel" name="phone" className="form-input" placeholder="+94 xxx xxx xxxx" value={formData.phone} onChange={handleInputChange} required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Delivery Address *</label>
            <textarea name="address" className="form-textarea" placeholder="Full address with postal code" value={formData.address} onChange={handleInputChange} required></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">Email (Optional)</label>
            <input type="email" name="email" className="form-input" placeholder="your@email.com" value={formData.email} onChange={handleInputChange} />
          </div>
          
          <div className="form-group">
            <label className="form-label">Special Notes</label>
            <textarea name="notes" className="form-textarea" placeholder="Any special requests?" value={formData.notes} onChange={handleInputChange}></textarea>
          </div>
          
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" name="cod" checked={formData.cod} onChange={handleInputChange} />
              Cash on Delivery (+LKR 200)
            </label>
          </div>
        </div>
        
        <button className="confirm-btn" onClick={handleSubmit}>
          Proceed to Payment
        </button>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>✓ Secure WhatsApp checkout<br/>✓ LKR 500/piece advance payment<br/>📦 Estimated delivery: 2-3 Weeks</p>
        </div>
      </div>
    </section>
  );
}
