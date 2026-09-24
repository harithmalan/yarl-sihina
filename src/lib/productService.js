import { products as defaultProducts } from '../data';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'yarl_catalog_products';
const STOCK_KEY = 'yarl_inventory_stock';
const EVENT_NAME = 'yarl_products_updated';

class ProductService {
  /**
   * Fetch all active products from storage or defaults
   */
  getProducts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading products from localStorage:', e);
    }

    // Default seed
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    } catch {}
    return defaultProducts;
  }

  /**
   * Add a new product to the catalog
   */
  async addProduct(data) {
    const products = this.getProducts();

    const isCouple = data.category === 'couple';
    const newProduct = {
      id: data.id || `p_${Date.now()}`,
      name: data.name.trim(),
      type: isCouple ? 'Couple Package' : (data.category === 'crop' ? 'Crop Top' : 'T-Shirt'),
      category: data.category || 'tshirt',
      badge: data.badge ? data.badge.trim() : 'New Drop',
      price: Number(data.price) || 1750,
      originalPrice: Number(data.originalPrice) || Math.round(Number(data.price || 1750) * 1.25),
      desc: data.desc?.trim() || 'Heavyweight premium organic Ceylon cotton streetwear drop.',
      image: data.image || '/img/product-1-male.jpeg',
      images: isCouple ? [data.image || '/img/couple1.jpg'] : undefined,
      isCouple,
      totalItemsCount: isCouple ? 2 : 1,
      createdAt: new Date().toISOString()
    };

    const updated = [newProduct, ...products];
    this._persist(updated);

    // Initialize inventory stock for this new product
    try {
      const stockRaw = localStorage.getItem(STOCK_KEY);
      const stock = stockRaw ? JSON.parse(stockRaw) : {};
      stock[newProduct.id] = data.initialStock || {
        XS: 15,
        S: 25,
        M: 40,
        L: 35,
        XL: 20,
        XXL: 10
      };
      localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
    } catch {}

    // Optional Supabase sync
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').upsert([{
          id: newProduct.id,
          name: newProduct.name,
          category: newProduct.category,
          price: newProduct.price,
          original_price: newProduct.originalPrice,
          badge: newProduct.badge,
          images: [newProduct.image],
          is_couple: newProduct.isCouple
        }]);
      } catch (err) {
        console.warn('Supabase product sync warning:', err);
      }
    }

    this._notify();
    return newProduct;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id, updates) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const isCouple = updates.category !== undefined 
      ? updates.category === 'couple' 
      : products[index].isCouple;

    products[index] = {
      ...products[index],
      ...updates,
      type: isCouple ? 'Couple Package' : (updates.category === 'crop' ? 'Crop Top' : 'T-Shirt'),
      isCouple,
      totalItemsCount: isCouple ? 2 : 1,
      price: Number(updates.price ?? products[index].price),
      originalPrice: Number(updates.originalPrice ?? products[index].originalPrice)
    };

    this._persist(products);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').update({
          name: products[index].name,
          category: products[index].category,
          price: products[index].price,
          original_price: products[index].originalPrice,
          badge: products[index].badge
        }).eq('id', id);
      } catch (err) {
        console.warn('Supabase product update error:', err);
      }
    }

    this._notify();
    return products[index];
  }

  /**
   * Delete a product by ID
   */
  async deleteProduct(id) {
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== id);
    this._persist(updated);

    // Clean up inventory stock
    try {
      const stockRaw = localStorage.getItem(STOCK_KEY);
      if (stockRaw) {
        const stock = JSON.parse(stockRaw);
        delete stock[id];
        localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
      }
    } catch {}

    // Optional Supabase sync
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase product delete warning:', err);
      }
    }

    this._notify();
    return true;
  }

  /**
   * Reset catalog back to initial Ceylon collection
   */
  resetToDefaults() {
    this._persist(defaultProducts);
    this._notify();
    return defaultProducts;
  }

  /**
   * Event subscribe helper
   */
  subscribe(callback) {
    const handler = () => callback(this.getProducts());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }

  _persist(products) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products to localStorage:', e);
    }
  }

  _notify() {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export const productService = new ProductService();
export default productService;
