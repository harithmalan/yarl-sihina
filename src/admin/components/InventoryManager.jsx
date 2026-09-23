import React, { useState } from 'react';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Check, 
  Sparkles,
  Link2
} from 'lucide-react';
import { products as initialProducts } from '../../data';

export default function InventoryManager() {
  const [stockData, setStockData] = useState(() => {
    try {
      const saved = localStorage.getItem('yarl_inventory_stock');
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default stock matrix
    const matrix = {};
    initialProducts.forEach(p => {
      matrix[p.id] = {
        XS: 12,
        S: 25,
        M: 40,
        L: 35,
        XL: 20,
        XXL: 8
      };
    });
    return matrix;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleStockChange = (productId, size, delta) => {
    setStockData(prev => {
      const currentVal = prev[productId]?.[size] || 0;
      const updatedVal = Math.max(0, currentVal + delta);
      const nextState = {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [size]: updatedVal
        }
      };
      localStorage.setItem('yarl_inventory_stock', JSON.stringify(nextState));
      return nextState;
    });
  };

  const getTotalStock = (productId) => {
    const sizes = stockData[productId] || {};
    return Object.values(sizes).reduce((sum, v) => sum + v, 0);
  };

  return (
    <div className="inventory-management-panel">
      {/* Header Info */}
      <div className="inventory-header-bar">
        <div>
          <h2 className="admin-section-title">Product Catalog & Size Matrix</h2>
          <p className="admin-section-subtitle">
            Manage live warehouse inventory for individual Ceylon pieces and bundled couple sets.
          </p>
        </div>
      </div>

      {/* Couple Set Note */}
      <div className="couple-inventory-notice">
        <Link2 size={16} className="text-caramel" />
        <div>
          <strong>Linked Couple Bundle Inventory</strong>: 
          <span> Orders for the Signature Couple Set automatically reserve 1 Men's T-Shirt and 1 Women's Crop Top in the respective sizes.</span>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="inventory-grid">
        {initialProducts.map(product => {
          const totalUnits = getTotalStock(product.id);
          const isLowStock = totalUnits < 30;

          return (
            <div key={product.id} className="inventory-card">
              <div className="inv-card-top">
                <img src={product.image} alt={product.title} className="inv-product-thumb" />
                <div className="inv-product-info">
                  <div className="inv-cat-tag">{product.category.toUpperCase()}</div>
                  <h3 className="inv-title">{product.title}</h3>
                  <div className="inv-price">LKR {product.price.toLocaleString()}</div>
                  <div className="inv-stock-pill">
                    {totalUnits === 0 ? (
                      <span className="stock-badge badge-out">Out of Stock</span>
                    ) : isLowStock ? (
                      <span className="stock-badge badge-low">
                        <AlertTriangle size={12} /> Low Stock ({totalUnits} pcs)
                      </span>
                    ) : (
                      <span className="stock-badge badge-ok">
                        <Check size={12} /> Healthy Stock ({totalUnits} pcs)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Size Matrix Controls */}
              <div className="size-matrix-wrapper">
                <label className="matrix-title">Warehouse Stock by Size</label>
                <div className="size-matrix-grid">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                    const count = stockData[product.id]?.[size] ?? 10;
                    return (
                      <div key={size} className="matrix-size-cell">
                        <span className="cell-size-label">{size}</span>
                        <span className="cell-count-value">{count}</span>
                        <div className="cell-steppers">
                          <button 
                            type="button" 
                            className="cell-step-btn"
                            onClick={() => handleStockChange(product.id, size, -1)}
                            disabled={count <= 0}
                          >
                            <Minus size={12} />
                          </button>
                          <button 
                            type="button" 
                            className="cell-step-btn"
                            onClick={() => handleStockChange(product.id, size, 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
