import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Sparkles, 
  Shirt, 
  Tag, 
  Check, 
  AlertCircle, 
  X, 
  RotateCcw, 
  Upload, 
  Image as ImageIcon,
  DollarSign,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { productService } from '../../lib/productService';

const AVAILABLE_PRESET_IMAGES = [
  { label: 'T-Shirt Black (Male)', url: '/img/product-1-male.jpeg' },
  { label: 'T-Shirt White (Male)', url: '/img/product-2-male.jpeg' },
  { label: 'T-Shirt Minimal (Male)', url: '/img/product-3-male.jpeg' },
  { label: 'Crop Top Black (Female)', url: '/img/product-1-female.jpeg' },
  { label: 'Crop Top White (Female)', url: '/img/product-1-female-white.jpeg' },
  { label: 'Crop Top Graphic (Female)', url: '/img/product-2-female.jpeg' },
  { label: 'Crop Top Streetwear (Female)', url: '/img/product-3-female.jpeg' },
  { label: 'Couple Set (Front Pose)', url: '/img/couple1.jpg' },
  { label: 'Couple Set (Lifestyle)', url: '/img/couple2.jpg' },
  { label: 'Couple Set (Detail)', url: '/img/couple3.jpg' }
];

const BADGE_PRESETS = ['New Drop', 'Best Seller', 'Trending', 'Signature', 'Limited Edition', 'Free Delivery'];

export default function ProductManager() {
  const [products, setProducts] = useState(() => productService.getProducts());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'tshirt',
    price: '',
    originalPrice: '',
    badge: 'New Drop',
    desc: '',
    image: '/img/product-1-male.jpeg'
  });

  // Listen to product updates
  useEffect(() => {
    const unsubscribe = productService.subscribe(updatedList => {
      setProducts(updatedList);
    });
    return unsubscribe;
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'tshirt',
      price: '1750',
      originalPrice: '2100',
      badge: 'New Drop',
      desc: 'Heavyweight organic combed cotton with handcrafted Ceylon heritage motif.',
      image: '/img/product-1-male.jpeg'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || 'tshirt',
      price: String(product.price),
      originalPrice: String(product.originalPrice || Math.round(product.price * 1.25)),
      badge: product.badge || 'Signature',
      desc: product.desc || '',
      image: product.image || '/img/product-1-male.jpeg'
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a product name');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      alert('Please enter a valid retail price');
      return;
    }

    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          category: formData.category,
          price: Number(formData.price),
          originalPrice: Number(formData.originalPrice) || Math.round(Number(formData.price) * 1.25),
          badge: formData.badge.trim(),
          desc: formData.desc.trim(),
          image: formData.image
        });
        showToast(`✓ Updated "${formData.name.trim()}" successfully!`);
      } else {
        await productService.addProduct({
          name: formData.name.trim(),
          category: formData.category,
          price: Number(formData.price),
          originalPrice: Number(formData.originalPrice) || Math.round(Number(formData.price) * 1.25),
          badge: formData.badge.trim(),
          desc: formData.desc.trim(),
          image: formData.image
        });
        showToast(`✓ Added new drop "${formData.name.trim()}" to catalog!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Error saving product: ' + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      await productService.deleteProduct(deletingProduct.id);
      showToast(`Deleted "${deletingProduct.name}" from catalog.`);
      setDeletingProduct(null);
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all catalog products back to the original YARL SIHINA Ceylon collection?')) {
      productService.resetToDefaults();
      showToast('✓ Restored default product catalog.');
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (activeFilter === 'tshirt' && p.category !== 'tshirt') return false;
    if (activeFilter === 'crop' && p.category !== 'crop') return false;
    if (activeFilter === 'couple' && !p.isCouple && p.category !== 'couple') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchBadge = p.badge?.toLowerCase().includes(q);
      const matchDesc = p.desc?.toLowerCase().includes(q);
      return matchName || matchBadge || matchDesc;
    }
    return true;
  });

  const countTshirt = products.filter(p => p.category === 'tshirt').length;
  const countCrop = products.filter(p => p.category === 'crop').length;
  const countCouple = products.filter(p => p.isCouple || p.category === 'couple').length;

  return (
    <div className="product-manager-panel">
      {/* Top Notification Toast */}
      {toastMessage && (
        <div className="admin-toast-banner">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Product Catalog & Drops</h1>
          <p className="admin-page-subtitle">
            Create new Ceylon streetwear releases, update retail pricing, or retire discontinued products.
          </p>
        </div>
        <div className="product-hero-actions">
          <button 
            type="button" 
            className="admin-btn-secondary"
            onClick={handleResetDefaults}
            title="Restore original catalog collection"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button 
            type="button" 
            className="admin-btn approve-btn"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="product-summary-strip">
        <div className="summary-stat-pill">
          <Shirt size={14} className="text-caramel" />
          <span>Total Products: <strong>{products.length}</strong></span>
        </div>
        <div className="summary-stat-pill">
          <span>T-Shirts: <strong>{countTshirt}</strong></span>
        </div>
        <div className="summary-stat-pill">
          <span>Crop Tops: <strong>{countCrop}</strong></span>
        </div>
        <div className="summary-stat-pill">
          <span>Couple Bundles: <strong>{countCouple}</strong></span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="orders-controls-bar">
        <div className="orders-status-tabs">
          <button 
            type="button"
            className={`order-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Drops ({products.length})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeFilter === 'tshirt' ? 'active' : ''}`}
            onClick={() => setActiveFilter('tshirt')}
          >
            T-Shirts ({countTshirt})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeFilter === 'crop' ? 'active' : ''}`}
            onClick={() => setActiveFilter('crop')}
          >
            Crop Tops ({countCrop})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeFilter === 'couple' ? 'active' : ''}`}
            onClick={() => setActiveFilter('couple')}
          >
            Couple Sets ({countCouple})
          </button>
        </div>

        <div className="orders-search-wrapper">
          <Search size={15} className="search-icon" />
          <input 
            type="text"
            className="orders-search-input"
            placeholder="Search by product name, badge, description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="product-empty-state">
          <Shirt size={42} className="text-muted" />
          <h3>No products found</h3>
          <p>No catalog drops match your search or filter criteria.</p>
          <button 
            type="button" 
            className="admin-btn approve-btn mt-2" 
            onClick={handleOpenAddModal}
          >
            <Plus size={14} /> Add Product Now
          </button>
        </div>
      ) : (
        <div className="product-cards-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-admin-card">
              {/* Image banner & badges */}
              <div className="product-card-visual">
                <img src={product.image} alt={product.name} className="product-cover-img" />
                <div className="product-card-top-tags">
                  <span className="cat-pill">
                    {product.isCouple ? 'Couple Set' : (product.category === 'crop' ? 'Crop Top' : 'T-Shirt')}
                  </span>
                  {product.badge && (
                    <span className="badge-pill">{product.badge}</span>
                  )}
                </div>
              </div>

              {/* Product Content Details */}
              <div className="product-card-body">
                <div className="product-title-row">
                  <h3 className="product-heading" title={product.name}>{product.name}</h3>
                </div>

                <p className="product-desc-snippet">{product.desc}</p>

                <div className="product-pricing-strip">
                  <span className="retail-price">LKR {Number(product.price).toLocaleString()}</span>
                  {product.originalPrice && (
                    <span className="compare-price">LKR {Number(product.originalPrice).toLocaleString()}</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="product-card-actions">
                  <button 
                    type="button" 
                    className="product-btn-edit"
                    onClick={() => handleOpenEditModal(product)}
                    title="Edit Product"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>

                  <button 
                    type="button" 
                    className="product-btn-delete"
                    onClick={() => setDeletingProduct(product)}
                    title="Delete Product"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-container product-modal-form" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="admin-modal-pill">
                  <Shirt size={12} /> {editingProduct ? 'Update Product' : 'Catalog Release'}
                </span>
                <h3 className="admin-modal-title">
                  {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Streetwear Drop'}
                </h3>
              </div>
              <button className="admin-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="product-form-body">
              <div className="form-grid-columns">
                {/* Left Column: Details */}
                <div className="form-column">
                  <div className="admin-field-group">
                    <label className="admin-field-label">Product Name *</label>
                    <input 
                      type="text" 
                      className="admin-input-text"
                      placeholder="e.g. Jaffna Maritime Vintage T-Shirt"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="admin-field-group">
                      <label className="admin-field-label">Category *</label>
                      <select 
                        className="admin-select"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="tshirt">T-Shirt (Men/Unisex)</option>
                        <option value="crop">Crop Top (Women)</option>
                        <option value="couple">Couple Set (1 T-Shirt + 1 Crop)</option>
                      </select>
                    </div>

                    <div className="admin-field-group">
                      <label className="admin-field-label">Badge / Ribbon</label>
                      <input 
                        type="text" 
                        className="admin-input-text"
                        placeholder="e.g. Best Seller"
                        value={formData.badge}
                        onChange={e => setFormData({ ...formData, badge: e.target.value })}
                      />
                      <div className="badge-preset-chips">
                        {BADGE_PRESETS.map(badge => (
                          <button 
                            key={badge}
                            type="button" 
                            className="chip-btn"
                            onClick={() => setFormData({ ...formData, badge })}
                          >
                            {badge}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="admin-field-group">
                      <label className="admin-field-label">Retail Price (LKR) *</label>
                      <input 
                        type="number" 
                        className="admin-input-text"
                        placeholder="1750"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        required
                        min="1"
                      />
                    </div>

                    <div className="admin-field-group">
                      <label className="admin-field-label">Compare-at Price (LKR)</label>
                      <input 
                        type="number" 
                        className="admin-input-text"
                        placeholder="2100"
                        value={formData.originalPrice}
                        onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="admin-field-group">
                    <label className="admin-field-label">Product Description</label>
                    <textarea 
                      className="admin-textarea"
                      rows={3}
                      placeholder="Heavyweight 240 GSM organic combed cotton with handcrafted Ceylon heritage print..."
                      value={formData.desc}
                      onChange={e => setFormData({ ...formData, desc: e.target.value })}
                    />
                  </div>
                </div>

                {/* Right Column: Image Selection & Preview */}
                <div className="form-column">
                  <div className="admin-field-group">
                    <label className="admin-field-label">Product Image</label>
                    <div className="product-image-preview-box">
                      <img 
                        src={formData.image} 
                        alt="Product preview" 
                        className="modal-preview-img"
                        onError={(e) => { e.target.src = '/img/product-1-male.jpeg'; }}
                      />
                    </div>
                  </div>

                  <div className="admin-field-group">
                    <label className="admin-field-label">Image Source / URL</label>
                    <input 
                      type="text" 
                      className="admin-input-text"
                      placeholder="e.g. /img/product-1-male.jpeg or https://..."
                      value={formData.image}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                    />
                  </div>

                  <div className="image-upload-row">
                    <label className="image-upload-label">
                      <Upload size={14} />
                      <span>Upload Custom Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>

                  <div className="admin-field-group">
                    <label className="admin-field-label text-xs">Or choose photoshoot preset:</label>
                    <div className="preset-images-scroll">
                      {AVAILABLE_PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`preset-thumb-btn ${formData.image === preset.url ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, image: preset.url })}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="product-form-actions">
                <button 
                  type="button" 
                  className="admin-btn cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>

                <button 
                  type="submit" 
                  className="admin-btn approve-btn"
                >
                  <Check size={16} />
                  <span>{editingProduct ? 'Save Changes' : 'Create Drop'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProduct && (
        <div className="admin-modal-backdrop" onClick={() => setDeletingProduct(null)}>
          <div className="admin-modal-container delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-content">
              <div className="delete-icon-wrap">
                <Trash2 size={28} />
              </div>
              <h3 className="delete-title">Delete Product?</h3>
              <p className="delete-desc">
                Are you sure you want to permanently remove <strong>"{deletingProduct.name}"</strong>? 
                This item will immediately be removed from both the live customer storefront and the warehouse inventory.
              </p>

              <div className="delete-product-preview">
                <img src={deletingProduct.image} alt={deletingProduct.name} />
                <div>
                  <strong>{deletingProduct.name}</strong>
                  <span>LKR {Number(deletingProduct.price).toLocaleString()}</span>
                </div>
              </div>

              <div className="delete-actions-row">
                <button 
                  type="button" 
                  className="admin-btn cancel-btn"
                  onClick={() => setDeletingProduct(null)}
                >
                  Keep Product
                </button>

                <button 
                  type="button" 
                  className="admin-btn confirm-reject-btn"
                  onClick={handleConfirmDelete}
                >
                  <Trash2 size={15} />
                  <span>Yes, Delete Product</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
