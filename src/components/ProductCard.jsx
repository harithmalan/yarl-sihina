import React, { useState } from 'react';
import { ShoppingBag, Heart, Check, Sparkles } from 'lucide-react';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProductCard({ product, onAddToCart }) {
  const [size, setSize] = useState('M');
  const [size2, setSize2] = useState('M'); // For couple sets
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    const selectedSizeLabel = product.isCouple ? `T-Shirt: ${size} | Crop: ${size2}` : size;
    onAddToCart(product, selectedSizeLabel);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div className="fashion-product-card">
      <div className="product-media-container">
        <img 
          src={product.image} 
          alt={product.name} 
          className="product-media-img"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="product-badge-group">
          {product.badge && (
            <span className={`product-status-badge ${product.isCouple ? 'couple' : ''}`}>
              {product.badge}
            </span>
          )}
          {product.isCouple && (
            <span className="product-status-badge highlight">2-Piece Bundle</span>
          )}
        </div>

        {/* Wishlist Button */}
        <button 
          className={`product-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={() => setIsWishlisted(!isWishlisted)}
          aria-label="Save to Wishlist"
        >
          <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-card-meta">
          <span className="product-type-label">{product.type}</span>
          <span className="product-stock-tag">In Stock</span>
        </div>

        <h3 className="product-card-title">{product.name}</h3>
        <p className="product-card-description">{product.desc}</p>

        {/* Size Selection */}
        <div className="product-size-section">
          <div className="size-label-row">
            <span className="size-header-text">
              {product.isCouple ? 'T-Shirt Size' : 'Select Size'}: <strong>{size}</strong>
            </span>
          </div>
          <div className="size-pill-group">
            {SIZES.map(s => (
              <button
                key={s}
                type="button"
                className={`size-pill ${size === s ? 'selected' : ''}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {product.isCouple && (
            <div className="second-size-group">
              <div className="size-label-row">
                <span className="size-header-text">Crop Top Size: <strong>{size2}</strong></span>
              </div>
              <div className="size-pill-group">
                {SIZES.map(s => (
                  <button
                    key={`couple-${s}`}
                    type="button"
                    className={`size-pill ${size2 === s ? 'selected' : ''}`}
                    onClick={() => setSize2(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pricing and Action */}
        <div className="product-card-footer">
          <div className="product-price-wrap">
            <span className="current-price">LKR {product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <span className="original-price">LKR {product.originalPrice.toLocaleString()}</span>
            )}
          </div>

          <button 
            type="button"
            className={`btn-add-to-bag ${justAdded ? 'added' : ''}`}
            onClick={handleAddToCart}
            aria-label="Add to bag"
          >
            {justAdded ? (
              <>
                <Check size={16} />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>Add to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
