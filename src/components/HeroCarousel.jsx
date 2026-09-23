import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Sparkles } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    image: '/img/Hero1.jpg',
    tag: 'NEW ARRIVALS · 2026',
    title: 'Heritage Streetwear Reimagined',
    subtitle: 'Where ancient Tamil craftsmanship meets contemporary urban luxury.',
    cta: 'Explore Collection',
    target: 'productsSection'
  },
  {
    id: 2,
    image: '/img/Hero2.jpg',
    tag: 'SIGNATURE DROP',
    title: 'Crafted For Island Life',
    subtitle: 'Ultra-breathable combed cotton tailored for everyday style and modern expression.',
    cta: 'Shop T-Shirts',
    target: 'productsSection'
  },
  {
    id: 3,
    image: '/img/hero3.jpg',
    tag: 'EXCLUSIVE PAIRING',
    title: 'Heritage Couple Packages',
    subtitle: 'Matching silhouette pairings with complimentary islandwide shipping across Sri Lanka.',
    cta: 'Shop Couple Sets',
    target: 'productsSection'
  },
  {
    id: 4,
    image: '/img/hero4.jpg',
    tag: 'EDITORIAL LOOKBOOK',
    title: 'Rooted In Jaffna Soul',
    subtitle: 'Bold motifs inspired by Thambapanni terracotta, architecture, and golden sunsets.',
    cta: 'View Drop',
    target: 'productsSection'
  }
];

export default function HeroCarousel({ onShopClick }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % SLIDES.length);
  };

  return (
    <div 
      className="hero-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Featured Collections Carousel"
    >
      <div className="hero-slides-track">
        {SLIDES.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            aria-hidden={index !== currentSlide}
          >
            <div className="hero-slide-bg">
              <img 
                src={slide.image} 
                alt={slide.title} 
                className="hero-slide-img" 
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="hero-slide-overlay"></div>
            </div>

            <div className="hero-slide-content">
              <div className="hero-pill-badge">
                <Sparkles size={13} className="hero-pill-icon" />
                <span>{slide.tag}</span>
              </div>
              <h1 className="hero-slide-title">{slide.title}</h1>
              <p className="hero-slide-desc">{slide.subtitle}</p>
              
              <div className="hero-slide-actions">
                <button 
                  className="hero-btn-primary"
                  onClick={() => onShopClick ? onShopClick(slide.target) : document.getElementById(slide.target)?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span>{slide.cta}</span>
                  <ArrowUpRight size={17} />
                </button>
                <button 
                  className="hero-btn-secondary"
                  onClick={() => document.getElementById('heritageStory')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Our Heritage
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        className="hero-nav-arrow prev" 
        onClick={prevSlide}
        aria-label="Previous Slide"
      >
        <ChevronLeft size={22} />
      </button>
      <button 
        className="hero-nav-arrow next" 
        onClick={nextSlide}
        aria-label="Next Slide"
      >
        <ChevronRight size={22} />
      </button>

      {/* Slide Indicators / Dots */}
      <div className="hero-indicators">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            className={`hero-dot ${idx === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
