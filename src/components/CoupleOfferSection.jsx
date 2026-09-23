import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  HeartHandshake, 
  Flame, 
  ArrowRight,
  Eye
} from 'lucide-react';

const COUPLE_IMAGES = [
  {
    id: 1,
    src: '/img/couple1.jpg',
    label: 'Front Pairing',
    alt: 'YARL SIHINA Couple Set Streetwear'
  },
  {
    id: 2,
    src: '/img/couple2.jpg',
    label: 'Lifestyle Mood',
    alt: 'YARL SIHINA Couple Set Lifestyle Look'
  },
  {
    id: 3,
    src: '/img/couple3.jpg',
    label: 'Detail Fit',
    alt: 'YARL SIHINA Couple Set Silhouette'
  }
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function CoupleOfferSection({ coupleProduct, onAddToCart }) {
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [tShirtSize, setTShirtSize] = useState('L');
  const [cropSize, setCropSize] = useState('S');
  const [justAdded, setJustAdded] = useState(false);

  const product = coupleProduct || {
    id: 'p1_couple',
    name: 'Heritage Classic Couple Set',
    type: 'Couple Package',
    category: 'couple',
    price: 3100,
    originalPrice: 3800,
    isCouple: true,
    totalItemsCount: 2,
    image: '/img/couple1.jpg'
  };

  const handleAddCoupleToBag = () => {
    const selectedSizeLabel = `T-Shirt: ${tShirtSize} | Crop: ${cropSize}`;
    onAddToCart({ ...product, image: COUPLE_IMAGES[selectedImgIdx].src }, selectedSizeLabel);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <section className="couple-offer-spotlight" id="coupleOfferSection">
      {/* Background Ambience Glow */}
      <div className="couple-bg-glow glow-1"></div>
      <div className="couple-bg-glow glow-2"></div>

      <div className="couple-spotlight-container">
        {/* Left Side: Interactive Multi-Image Showcase */}
        <div className="couple-media-column">
          <div className="couple-main-stage">
            <img 
              src={COUPLE_IMAGES[selectedImgIdx].src} 
              alt={COUPLE_IMAGES[selectedImgIdx].alt} 
              className="couple-stage-image"
            />
            <div className="couple-stage-overlay"></div>

            {/* Floating Highlight Badges */}
            <div className="couple-float-badge badge-top-left">
              <Truck size={14} className="float-badge-icon" />
              <span>FREE ISLANDWIDE DELIVERY</span>
            </div>

            <div className="couple-float-badge badge-top-right">
              <HeartHandshake size={14} className="float-badge-icon" />
              <span>1 T-SHIRT + 1 CROP TOP</span>
            </div>

            <div className="couple-float-badge badge-bottom-right">
              <Flame size={14} className="float-badge-icon flame" />
              <span>SAVE LKR 700 (18% OFF)</span>
            </div>
          </div>

          {/* Interactive Thumbnails Selector */}
          <div className="couple-thumbnails-row">
            {COUPLE_IMAGES.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className={`couple-thumb-card ${idx === selectedImgIdx ? 'active' : ''}`}
                onClick={() => setSelectedImgIdx(idx)}
                aria-label={`View ${img.label}`}
              >
                <img src={img.src} alt={img.label} className="couple-thumb-img" />
                <span className="couple-thumb-label">{img.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Offer Details & Dual Customizer */}
        <div className="couple-details-column">
          <div className="couple-kicker-wrap">
            <span className="couple-kicker-tag">LIMITED SPECIAL OFFER</span>
            <span className="tamil-calligraphy-brand couple-kicker-tamil">ஜோடி பிரத்யேக சலுகை</span>
          </div>

          <h2 className="couple-headline">The Signature Couple Set</h2>
          <p className="couple-description">
            Two iconic silhouettes in cultural harmony. One Heritage Classic T-Shirt and one Crop Top, 
            both custom-tailored from matching heavyweight combed cotton with Ceylon artisan motifs.
          </p>

          {/* Price & Savings Pill Banner */}
          <div className="couple-price-card">
            <div className="couple-price-main">
              <span className="couple-curr-price cinzel-font">LKR 3,100</span>
              <span className="couple-orig-price">LKR 3,800</span>
            </div>
            <div className="couple-savings-pill">
              <Sparkles size={14} />
              <span>Save LKR 700 + Zero Delivery Fee</span>
            </div>
          </div>

          {/* Dual Size Picker */}
          <div className="couple-customizer-box">
            <div className="customizer-block">
              <div className="customizer-header">
                <span className="customizer-title">1. His T-Shirt Size:</span>
                <span className="customizer-val-pill">{tShirtSize}</span>
              </div>
              <div className="customizer-pills">
                {SIZES.map(s => (
                  <button
                    key={`ts-${s}`}
                    type="button"
                    className={`customizer-pill ${tShirtSize === s ? 'selected' : ''}`}
                    onClick={() => setTShirtSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="customizer-block">
              <div className="customizer-header">
                <span className="customizer-title">2. Her Crop Top Size:</span>
                <span className="customizer-val-pill">{cropSize}</span>
              </div>
              <div className="customizer-pills">
                {SIZES.map(s => (
                  <button
                    key={`crop-${s}`}
                    type="button"
                    className={`customizer-pill ${cropSize === s ? 'selected' : ''}`}
                    onClick={() => setCropSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Perks Row */}
          <div className="couple-perks-grid">
            <div className="perk-item">
              <Truck size={18} className="perk-icon" />
              <div>
                <h5>Free Delivery</h5>
                <p>Doorstep islandwide</p>
              </div>
            </div>

            <div className="perk-item">
              <ShieldCheck size={18} className="perk-icon" />
              <div>
                <h5>LKR 1,000 Advance</h5>
                <p>Balance on delivery</p>
              </div>
            </div>

            <div className="perk-item">
              <Sparkles size={18} className="perk-icon" />
              <div>
                <h5>Matching Combed Cotton</h5>
                <p>100% Breathable fabric</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="button"
            className={`btn-claim-couple ${justAdded ? 'added' : ''}`}
            onClick={handleAddCoupleToBag}
            aria-label="Claim Couple Offer"
          >
            {justAdded ? (
              <>
                <Check size={20} />
                <span>Added to Bag! Unlocking Drawer...</span>
              </>
            ) : (
              <>
                <ShoppingBag size={20} />
                <span>Claim Couple Offer & Add to Bag (LKR 3,100)</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="couple-urgency-note">
            <span className="pulse-dot"></span>
            <span>⚡ Special launch allocation: Free islandwide shipping automatically applied at checkout</span>
          </div>
        </div>
      </div>
    </section>
  );
}
