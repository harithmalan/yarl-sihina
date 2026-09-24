import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, ShieldCheck, ArrowRight, MapPin, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveFromCart,
  onInitiateOrder
}) {
  const { user, savedAddress, saveAddress } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    email: '',
    notes: '',
    cod: false
  });

  const [formErrors, setFormErrors] = useState({});
  const [addressSaved, setAddressSaved] = useState(false);

  // Auto-fill from saved address when drawer opens or user logs in
  useEffect(() => {
    if (isOpen && savedAddress && !formData.address) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || savedAddress.name || '',
        phone: prev.phone || savedAddress.phone || '',
        address: prev.address || savedAddress.address || '',
        city: prev.city || savedAddress.city || '',
      }));
    }
  }, [isOpen, savedAddress]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: false }));
    }
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
      hasCoupleOrder,
      codChecked: formData.cod, 
      codFee, 
      grandTotal, 
      requiredAdvance, 
      remainingBalance 
    };
  };

  const math = calculateFullOrder();
  const freeShippingThreshold = 10;
  const progressPercent = math.hasFreeDelivery ? 100 : Math.min(100, Math.round((math.totalPieces / freeShippingThreshold) * 100));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const errors = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.phone.trim()) errors.phone = true;
    if (!formData.address.trim()) errors.address = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Save delivery address to profile for next time
    if (formData.address.trim() && formData.name.trim()) {
      saveAddress({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
      });
      setAddressSaved(true);
    }

    onInitiateOrder(formData, math);
  };

  const fillSavedAddress = () => {
    if (!savedAddress) return;
    setFormData(prev => ({
      ...prev,
      name: savedAddress.name || prev.name,
      phone: savedAddress.phone || prev.phone,
      address: savedAddress.address || prev.address,
      city: savedAddress.city || prev.city,
    }));
    setFormErrors({});
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Side Cart Drawer */}
      <aside 
        className={`side-cart-drawer ${isOpen ? 'active' : ''}`} 
        aria-label="Shopping Bag Drawer"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-wrap">
            <ShoppingBag size={20} className="drawer-title-icon" />
            <h2 className="drawer-title">Shopping Bag</h2>
            <span className="drawer-count-pill">{math.totalPieces}</span>
          </div>
          <button 
            className="drawer-close-btn" 
            onClick={onClose}
            aria-label="Close Bag"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Delivery Meter */}
        <div className="free-shipping-bar-container">
          <div className="free-shipping-text">
            {math.hasFreeDelivery ? (
              <span>🎉 You’ve unlocked <strong>FREE Islandwide Delivery</strong>!</span>
            ) : (
              <span>
                Add <strong>{Math.max(1, freeShippingThreshold - math.totalPieces)} more</strong> piece{freeShippingThreshold - math.totalPieces === 1 ? '' : 's'} (or 1 Couple Set) for <strong>FREE Delivery</strong>
              </span>
            )}
          </div>
          <div className="shipping-progress-track">
            <div 
              className="shipping-progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Drawer Body */}
        <div className="drawer-content">
          {cartItems.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="drawer-empty-icon-wrap">
                <ShoppingBag size={44} strokeWidth={1.5} />
              </div>
              <h3 className="drawer-empty-title">Your Bag is Empty</h3>
              <p className="drawer-empty-desc">
                Explore our curated heritage streetwear collection and discover your unique style.
              </p>
              <button 
                className="drawer-continue-btn"
                onClick={() => {
                  onClose();
                  document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Discover Collection</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="drawer-filled-wrap">
              {/* Item List */}
              <div className="drawer-items-list">
                {cartItems.map((item) => (
                  <div key={item.cartId} className="drawer-item-card">
                    <div className="drawer-item-img-wrap">
                      <img src={item.image} alt={item.name} className="drawer-item-img" />
                    </div>

                    <div className="drawer-item-details">
                      <div className="drawer-item-top">
                        <h4 className="drawer-item-title">{item.name}</h4>
                        <button 
                          className="drawer-item-trash"
                          onClick={() => onRemoveFromCart(item.cartId)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="drawer-item-size-badge">
                        Size: <span>{item.selectedSize}</span>
                      </div>

                      <div className="drawer-item-bottom">
                        <div className="drawer-qty-stepper">
                          <button 
                            className="qty-btn"
                            onClick={() => onUpdateQty(item.cartId, -1)}
                            disabled={item.qty <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="qty-value">{item.qty}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => onUpdateQty(item.cartId, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div className="drawer-item-price">
                          LKR {(item.price * item.qty).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Delivery Information Form */}
              <div className="drawer-checkout-form-section">
                <div className="drawer-form-header">
                  <h3>Delivery Details</h3>
                  <span className="drawer-required-notice">* Required for Islandwide Delivery</span>
                </div>

                {/* Saved Address Banner */}
                {savedAddress?.address && (
                  <div className="drawer-saved-address-banner">
                    <div className="drawer-saved-address-info">
                      <MapPin size={14} />
                      <div>
                        <span className="drawer-saved-label">Saved Address</span>
                        <span className="drawer-saved-preview">{savedAddress.address}{savedAddress.city ? `, ${savedAddress.city}` : ''}</span>
                      </div>
                    </div>
                    <button type="button" className="drawer-fill-btn" onClick={fillSavedAddress}>
                      Use This
                    </button>
                  </div>
                )}

                {addressSaved && (
                  <div className="drawer-address-saved-confirm">
                    <CheckCircle2 size={13} /> Address saved to your profile
                  </div>
                )}

                <div className="drawer-form-fields">
                  <div className="drawer-input-group">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      placeholder="e.g. Priyantha Silva" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      className={formErrors.name ? 'input-error' : ''}
                      required 
                    />
                  </div>

                  <div className="drawer-input-group">
                    <label>WhatsApp Number *</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="+94 77 123 4567" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      className={formErrors.phone ? 'input-error' : ''}
                      required 
                    />
                  </div>

                  <div className="drawer-input-group">
                    <label>Delivery Address *</label>
                    <textarea 
                      name="address" 
                      placeholder="No. 45, Temple Road, Nallur" 
                      rows={2}
                      value={formData.address} 
                      onChange={handleInputChange} 
                      className={formErrors.address ? 'input-error' : ''}
                      required 
                    />
                  </div>

                  <div className="drawer-input-group">
                    <label>City / District</label>
                    <input 
                      type="text" 
                      name="city" 
                      placeholder="e.g. Jaffna, Colombo, Kandy" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  <div className="drawer-input-group">
                    <label>Special Instructions (Optional)</label>
                    <input 
                      type="text" 
                      name="notes" 
                      placeholder="Nearby landmark, delivery notes" 
                      value={formData.notes} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  <label className="drawer-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="cod" 
                      checked={formData.cod} 
                      onChange={handleInputChange} 
                    />
                    <span>Pay remaining balance via Cash on Delivery (+LKR 200)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer with Calculations & CTA */}
        {cartItems.length > 0 && (
          <div className="drawer-footer">
            <div className="drawer-summary-rows">
              <div className="drawer-summary-row">
                <span>Subtotal ({math.totalPieces} pcs)</span>
                <span>LKR {math.subtotal.toLocaleString()}</span>
              </div>

              {math.discountAmount > 0 && (
                <div className="drawer-summary-row discount">
                  <span>Bulk Discount ({Math.round(math.discountPct * 100)}%)</span>
                  <span>- LKR {math.discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="drawer-summary-row">
                <span>Islandwide Delivery</span>
                <span className={math.hasFreeDelivery ? 'free-tag' : ''}>
                  {math.hasFreeDelivery ? 'FREE' : `LKR ${math.deliveryFee}`}
                </span>
              </div>

              {math.codFee > 0 && (
                <div className="drawer-summary-row">
                  <span>COD Handling</span>
                  <span>LKR {math.codFee}</span>
                </div>
              )}

              <div className="drawer-summary-row total-row">
                <span>Grand Total</span>
                <span className="total-amount">LKR {math.grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Advance payment notice pill */}
            <div className="drawer-advance-box">
              <div className="advance-tag">
                <ShieldCheck size={16} />
                <span>Advance Required: <strong>LKR {math.requiredAdvance.toLocaleString()}</strong> (LKR 500/pc)</span>
              </div>
              <div className="balance-tag">
                Remaining Balance on Delivery: LKR {math.remainingBalance.toLocaleString()}
              </div>
            </div>

            <button 
              className="drawer-checkout-btn"
              onClick={handleSubmit}
            >
              <span>Confirm & Send via WhatsApp</span>
              <ArrowRight size={18} />
            </button>

            <div className="drawer-trust-badges">
              <span>🔒 100% Genuine Cotton</span>
              <span>⚡ Sri Lanka Islandwide Dispatch</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
