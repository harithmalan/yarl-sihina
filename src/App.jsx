import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Heart, 
  Menu, 
  X, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw, 
  Check, 
  MessageCircle, 
  ChevronDown, 
  Globe, 
  Share2, 
  User, 
  LogOut, 
  Lock, 
  Package,
  ExternalLink 
} from 'lucide-react';
import { productService } from './lib/productService';
import HeroCarousel from './components/HeroCarousel';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import PaymentModal from './components/PaymentModal';
import CoupleOfferSection from './components/CoupleOfferSection';
import AuthModal from './components/AuthModal';
import OrderHistory from './components/OrderHistory';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminApp from './admin/AdminApp';
import './App.css';

const ANNOUNCEMENTS = [
  '✨ FREE Islandwide Delivery on all Couple Sets & orders of 10+ pieces',
  '🇱🇰 Islandwide Cash on Delivery available across Sri Lanka',
  '✦ YARL SIHINA (யாழ் சிஹினா) · Heavyweight Combed Cotton Streetwear'
];

function StorefrontApp() {
  const { user, signOut } = useAuth();
  const [route, setRoute] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        return 'admin';
      }
    }
    return 'store';
  });

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeOrderData, setActiveOrderData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [productsList, setProductsList] = useState(() => productService.getProducts());

  // Listen to product updates (add/delete from admin)
  useEffect(() => {
    const unsubscribe = productService.subscribe(updated => {
      setProductsList(updated);
    });
    return unsubscribe;
  }, []);

  // Sync hash routing
  useEffect(() => {
    const handleHash = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        setRoute('admin');
      } else {
        setRoute('store');
      }
    };
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, []);

  const navigateToAdmin = (e) => {
    if (e) e.preventDefault();
    window.location.hash = '#admin';
    setRoute('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStore = () => {
    window.location.hash = '';
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
    setRoute('store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Rotate announcement bar every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIdx(prev => (prev + 1) % ANNOUNCEMENTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Show header on scroll, hide on top of page
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsHeaderVisible(true);
      } else {
        setIsHeaderVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.totalItemsCount * item.qty), 0);
  }, [cart]);

  const handleAddToCart = (product, selectedSize) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.id === product.id && item.selectedSize === selectedSize);
      if (existingIdx >= 0) {
        const newCart = [...prev];
        newCart[existingIdx].qty += 1;
        return newCart;
      }
      return [...prev, { ...product, selectedSize, qty: 1, cartId: `${product.id}-${Date.now()}-${Math.random()}` }];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQty = (cartId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // Gate checkout behind login
  const handleInitiateOrder = (customerData, math) => {
    if (!user) {
      setIsCartOpen(false);
      setIsAuthModalOpen(true);
      return;
    }
    const orderRef = 'YS-' + Math.floor(1000 + Math.random() * 9000);
    setActiveOrderData({
      ref: orderRef,
      customer: {
        ...customerData,
        name: customerData.name || user?.name || '',
        email: customerData.email || user?.email || ''
      },
      math,
      cartItems: [...cart]
    });
    setIsCartOpen(false);
    setIsModalOpen(true);
  };

  // Filter catalogue products: exclude couple package because it has its own dedicated spotlight section
  const catalogProducts = useMemo(() => {
    return productsList.filter(p => !p.isCouple);
  }, [productsList]);

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter(product => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalogProducts, activeCategory, searchQuery]);

  // If on admin route, render Admin Portal
  if (route === 'admin') {
    return <AdminApp onExitAdmin={navigateToStore} />;
  }

  const showHeader = isHeaderVisible || isCartOpen || isMobileMenuOpen || isUserMenuOpen;

  return (
    <div className="joey-storefront-wrapper">
      {/* Top Header Wrapper (Hidden on first look, slides in on scroll) */}
      <div className={`site-header-wrapper ${showHeader ? 'visible' : 'hidden'}`}>
        {/* 1. Top Announcement Bar */}
        <div className="top-announcement-bar">
          <div className="announcement-content">
            <span>{ANNOUNCEMENTS[announcementIdx]}</span>
          </div>
        </div>

        {/* 2. Main Navigation Header */}
        <header className="main-sticky-header">
        <div className="header-container">
          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-trigger" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav-menu">
            <button 
              className={`nav-item ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('all'); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              All Drops
            </button>
            <button 
              className={`nav-item ${activeCategory === 'tshirt' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('tshirt'); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              T-Shirts
            </button>
            <button 
              className={`nav-item ${activeCategory === 'crop' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('crop'); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Crop Tops
            </button>
            <button 
              className="nav-item"
              onClick={() => { document.getElementById('coupleOfferSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Couple Sets ✦
            </button>
            <a href="#heritageStory" className="nav-item">
              Our Story
            </a>
          </nav>

          {/* Brand Logo */}
          <a href="#" className="brand-logo-section">
            <img src="/img/logo.png" alt="YARL SIHINA Logo" className="brand-logo-img" />
            <div className="brand-logo-titles">
              <span className="brand-main-title">YARL SIHINA</span>
              <span className="brand-sub-title">
                <span className="tamil-calligraphy-brand">யாழ் சிஹினா</span> · CEYLON
              </span>
            </div>
          </a>

          {/* Right Header Actions */}
          <div className="header-action-group">
            {/* Search Toggle */}
            <div className="search-wrap">
              {isSearchOpen && (
                <input 
                  type="text" 
                  placeholder="Search drops..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="header-search-input"
                  autoFocus
                />
              )}
              <button 
                className="header-icon-btn" 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                aria-label="Search"
              >
                <Search size={19} />
              </button>
            </div>

            {/* User Account / Greeting Section */}
            {user ? (
              <div className="header-user-wrap">
                <button 
                  className="header-user-btn" 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label="User account"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="user-avatar-tiny" />
                  ) : (
                    <div className="user-avatar-initials">
                      {user.firstName?.charAt(0) || 'Y'}
                    </div>
                  )}
                  <div className="user-greeting-text">
                    <span className="greeting-tamil">வணக்கம்</span>, 
                    <strong className="greeting-name">{user.firstName}</strong>
                  </div>
                  <ChevronDown size={14} className="user-chevron" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-user-header">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item" 
                      onClick={() => { setIsCartOpen(true); setIsUserMenuOpen(false); }}
                    >
                      <ShoppingBag size={15} />
                      <span>My Shopping Bag ({totalCartCount})</span>
                    </button>
                    <button 
                      className="dropdown-item" 
                      onClick={() => { setIsOrderHistoryOpen(true); setIsUserMenuOpen(false); }}
                    >
                      <Package size={15} />
                      <span>My Orders</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item text-danger" 
                      onClick={() => { signOut(); setIsUserMenuOpen(false); }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="header-signin-btn"
                onClick={() => setIsAuthModalOpen(true)}
              >
                <User size={16} />
                <span>Sign In</span>
              </button>
            )}

            {/* Currency Indicator */}
            <span className="currency-pill">LKR</span>

            {/* Side Bag / Cart Trigger Button */}
            <button 
              className="header-bag-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="View Shopping Bag"
            >
              <ShoppingBag size={20} />
              <span className="header-bag-counter">{totalCartCount}</span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-drawer">
            {/* User Greeting Card in Mobile Drawer */}
            {user ? (
              <div className="mobile-user-card">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="mobile-avatar" />
                ) : (
                  <div className="mobile-avatar-placeholder">
                    {user.firstName?.charAt(0) || 'Y'}
                  </div>
                )}
                <div className="mobile-user-meta">
                  <span className="mobile-greet-tamil">வணக்கம், {user.firstName}! ✨</span>
                  <small className="mobile-user-email">{user.email}</small>
                </div>
              </div>
            ) : (
              <button 
                className="mobile-auth-trigger-btn"
                onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
              >
                <User size={16} />
                <span>Sign In with Google / Facebook</span>
              </button>
            )}

            <button 
              className="mobile-nav-link"
              onClick={() => { setActiveCategory('all'); setIsMobileMenuOpen(false); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              All Drops
            </button>
            <button 
              className="mobile-nav-link"
              onClick={() => { setActiveCategory('tshirt'); setIsMobileMenuOpen(false); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Heritage T-Shirts
            </button>
            <button 
              className="mobile-nav-link"
              onClick={() => { setActiveCategory('crop'); setIsMobileMenuOpen(false); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Crop Tops
            </button>
            <button 
              className="mobile-nav-link"
              onClick={() => { setIsMobileMenuOpen(false); document.getElementById('coupleOfferSection')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              Couple Sets (Free Shipping) ✦
            </button>
            <a 
              href="#heritageStory" 
              className="mobile-nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Our Story
            </a>

            {user && (
              <button 
                className="mobile-nav-link text-danger"
                onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
              >
                <LogOut size={15} style={{ display: 'inline', marginRight: '6px' }} />
                Sign Out
              </button>
            )}
          </div>
        )}
      </header>
      </div>

      {/* 3. Hero Carousel Banner with Uploaded Images */}
      <HeroCarousel 
        onShopClick={(target) => {
          document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 4. Value Highlights Banner (Joey Clothing style) */}
      <section className="joey-features-strip" id="featuresStrip">
        <div className="features-container">
          <div className="feature-cell">
            <div className="feature-icon-circle">
              <Truck size={22} />
            </div>
            <div className="feature-text">
              <h4>Islandwide Delivery</h4>
              <p>Reliable door-to-door dispatch in Sri Lanka</p>
            </div>
          </div>
          <div className="feature-cell">
            <div className="feature-icon-circle">
              <ShieldCheck size={22} />
            </div>
            <div className="feature-text">
              <h4>100% Combed Cotton</h4>
              <p>Ultra-soft, breathable heavyweight fabric</p>
            </div>
          </div>
          <div className="feature-cell">
            <div className="feature-icon-circle">
              <Sparkles size={22} />
            </div>
            <div className="feature-text">
              <h4>Artisan Tailored</h4>
              <p>Celebrating Jaffna culture & contemporary cuts</p>
            </div>
          </div>
          <div className="feature-cell">
            <div className="feature-icon-circle">
              <RotateCcw size={22} />
            </div>
            <div className="feature-text">
              <h4>Protected Advance</h4>
              <p>Just LKR 500/pc advance to secure pieces</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Curated Products Section */}
      <section className="catalog-section" id="productsSection">
        <div className="section-head-wrap">
          <span className="section-tag-kicker">CURATED COLLECTION</span>
          <h2 className="section-main-heading">The Heritage Catalogue</h2>
          <span className="tamil-calligraphy-sub" style={{ fontSize: '1.05rem', color: 'var(--palette-caramel)', marginBottom: '8px' }}>
            பாரம்பரிய ஆடைத் தொகுப்பு
          </span>
          <p className="section-sub-copy">
            Each silhouette embodies timeless island storytelling, crafted for effortless tropical comfort.
          </p>

          {/* Collection Filter Tabs */}
          <div className="filter-pill-bar">
            <button 
              className={`filter-pill ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Drops ({catalogProducts.length})
            </button>
            <button 
              className={`filter-pill ${activeCategory === 'tshirt' ? 'active' : ''}`}
              onClick={() => setActiveCategory('tshirt')}
            >
              Heritage T-Shirts
            </button>
            <button 
              className={`filter-pill ${activeCategory === 'crop' ? 'active' : ''}`}
              onClick={() => setActiveCategory('crop')}
            >
              Crop Tops
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="catalog-grid">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="no-products-found">
            <p>No products found matching your search.</p>
            <button 
              className="btn-reset-filters"
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </section>

      {/* Dedicated High-Impact Couple Offer Spotlight Section */}
      <CoupleOfferSection onAddToCart={handleAddToCart} />

      {/* 6. Editorial Story Banner (Joey Clothing style) */}
      <section className="heritage-story-section" id="heritageStory">
        <div className="story-container">
          <div className="story-text-column">
            <span className="story-kicker">OUR ETHOS · <span className="tamil-calligraphy-flair">யாழ் சிஹினா</span></span>
            <h2 className="story-heading">Rooted In Jaffna, Crafted For The Modern World</h2>
            <p className="story-p">
              YARL SIHINA was born from a desire to merge ancient Tamil heritage with contemporary street culture. 
              Our designs draw inspiration from temple architectural motifs, Thambapanni terracotta soil, and coastal sunsets.
            </p>
            <p className="story-p">
              Similar to ethical slow-fashion collectives, every garment is thoughtfully crafted using premium natural combed fibers, 
              supporting local Sri Lankan garment artisans while creating streetwear you can wear with lasting pride.
            </p>

            <div className="story-stats-grid">
              <div className="story-stat">
                <span className="stat-number">100%</span>
                <span className="stat-label">Combed Natural Cotton</span>
              </div>
              <div className="story-stat">
                <span className="stat-number">1,000+</span>
                <span className="stat-label">Orders Delivered Islandwide</span>
              </div>
              <div className="story-stat">
                <span className="stat-number">2-3 Wks</span>
                <span className="stat-label">Craft & Dispatch Window</span>
              </div>
            </div>
          </div>

          <div className="story-image-column">
            <div className="story-image-card">
              <img src="/img/Hero2.jpg" alt="Craftsmanship and Heritage" className="story-image" />
              <div className="story-image-badge">
                <span><span className="tamil-calligraphy-brand" style={{ color: '#FFFFFF', marginRight: '6px' }}>ஈழம் பாரம்பரியம்</span> · Authentic Ceylon Heritage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="joey-footer">
        <div className="footer-top-container">
          {/* Brand Info */}
          <div className="footer-col brand-col">
            <div className="footer-brand-logo">
              <img src="/img/logo.png" alt="YARL SIHINA" className="footer-logo-img" />
              <span className="footer-brand-title">YARL SIHINA</span>
            </div>
            <p className="footer-desc">
              Ceylon Heritage Streetwear. Merging cultural memory with elevated urban essentials across Sri Lanka.
            </p>
            <div className="footer-social-links">
              <a href="https://web.facebook.com/YarlSihina" target="_blank" rel="noreferrer" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://wa.me/94712599185" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-heading">Collections</h4>
            <ul className="footer-links">
              <li><button onClick={() => { setActiveCategory('all'); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}>All Streetwear</button></li>
              <li><button onClick={() => { setActiveCategory('tshirt'); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}>Heritage T-Shirts</button></li>
              <li><button onClick={() => { setActiveCategory('crop'); document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' }); }}>Crop Tops</button></li>
              <li><button onClick={() => { document.getElementById('coupleOfferSection')?.scrollIntoView({ behavior: 'smooth' }); }}>Signature Couple Set</button></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="footer-col">
            <h4 className="footer-heading">Customer Care</h4>
            <ul className="footer-links">
              <li><a href="#heritageStory">About Our Brand</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Orders are dispatched within 2-3 weeks across Sri Lanka with advance confirmation."); }}>Shipping & Dispatch</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Advance of LKR 500/piece is required to reserve your handcrafted order."); }}>Advance Policy</a></li>
              <li><a href="https://wa.me/94712599185" target="_blank" rel="noreferrer">WhatsApp Support (+94 71 259 9185)</a></li>
            </ul>
          </div>

          {/* Newsletter / Contact */}
          <div className="footer-col newsletter-col">
            <h4 className="footer-heading">Exclusive Drops</h4>
            <p className="footer-newsletter-text">
              Subscribe to get notified first when limited heritage collections and couple packages are released.
            </p>
            <form className="footer-newsletter-form" onSubmit={(e) => { e.preventDefault(); alert("Thank you for joining the YARL SIHINA Heritage Circle!"); }}>
              <input type="email" placeholder="Enter your email" required />
              <button type="submit" aria-label="Subscribe">
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-bottom-container">
            <p>© {new Date().getFullYear()} YARL SIHINA (<span className="tamil-calligraphy">யாழ் சிஹினா</span>). All Rights Reserved. Inspired by Ceylon Heritage.</p>
            <div className="footer-payment-methods">
              <span>Bank Transfer</span>
              <span>Frimi</span>
              <span>Cash on Delivery</span>
              <span>WhatsApp Direct</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 8. Slide Shopping Bag Drawer (Opens ONLY when clicking Bag icon or adding items) */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveFromCart={handleRemoveFromCart}
        onInitiateOrder={handleInitiateOrder}
      />

      {/* 9. Order Confirmation & WhatsApp Payment Modal with Slip Upload */}
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderData={activeOrderData}
      />

      {/* 10. Google & Facebook Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 11. Customer Order History Panel */}
      {isOrderHistoryOpen && (
        <OrderHistory
          user={user}
          onClose={() => setIsOrderHistoryOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StorefrontApp />
    </AuthProvider>
  );
}
