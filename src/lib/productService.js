import { products as defaultProducts } from '../data';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { adminApi, isAdminApiAvailable } from './adminApi';

const STORAGE_KEY = 'yarl_catalog_products';
const STOCK_KEY = 'yarl_inventory_stock';
const EVENT_NAME = 'yarl_products_updated';

const toAppProduct = (row) => {
  const image = row.image || row.images?.[0] || '/img/product-1-male.jpeg';
  return {
    id: row.id,
    name: row.name,
    type: row.type || (row.is_couple ? 'Couple Package' : (row.category === 'crop' ? 'Crop Top' : 'T-Shirt')),
    category: row.category,
    badge: row.badge || '',
    price: Number(row.price || 0),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    desc: row.description || '',
    image,
    images: Array.isArray(row.images) && row.images.length ? row.images : [image],
    isCouple: row.is_couple === true,
    totalItemsCount: Number(row.total_items_count || (row.is_couple ? 2 : 1)),
    createdAt: row.created_at,
    isActive: row.is_active !== false
  };
};

const toDbProduct = (product) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  type: product.type,
  badge: product.badge,
  price: product.price,
  original_price: product.originalPrice,
  description: product.desc,
  image: product.image,
  images: product.images || [product.image],
  is_couple: product.isCouple,
  total_items_count: product.totalItemsCount,
  is_active: product.isActive !== false
});

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
   * Fetch the shared production catalog. Falls back to local/demo data offline.
   */
  async loadProducts({ includeInactive = false, admin = false } = {}) {
    if (admin && isAdminApiAvailable()) {
      try {
        const data = await adminApi('products');
        const mapped = (data || []).map(toAppProduct);
        this._persist(mapped.filter(product => product.isActive !== false));
        return includeInactive ? mapped : mapped.filter(product => product.isActive !== false);
      } catch (err) {
        console.warn('Admin product fetch failed, using public/local catalog:', err);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!includeInactive) query = query.eq('is_active', true);

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data || []).map(toAppProduct);
        if (mapped.length > 0) {
          this._persist(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase product fetch failed, using local catalog:', err);
      }
    }

    return this.getProducts();
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

    if (isAdminApiAvailable()) {
      await adminApi('save-product', { method: 'POST', body: { product: newProduct } });
    } else if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').upsert([toDbProduct(newProduct)]);
      if (error) throw error;
    }

    const updated = [newProduct, ...products.filter(product => product.id !== newProduct.id)];
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

    if (isAdminApiAvailable()) {
      await adminApi('save-product', { method: 'POST', body: { product: products[index] } });
    } else if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').update(toDbProduct(products[index])).eq('id', id);
      if (error) throw error;
    }

    this._persist(products);
    this._notify();
    return products[index];
  }

  /**
   * Delete a product by ID
   */
  async deleteProduct(id) {
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== id);

    if (isAdminApiAvailable()) {
      await adminApi('delete-product', { method: 'POST', body: { id } });
    } else if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    }

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

    this._notify();
    return true;
  }

  /**
   * Reset catalog back to initial Ceylon collection
   */
  async resetToDefaults() {
    if (isAdminApiAvailable()) {
      await adminApi('reset-products', { method: 'POST', body: { products: defaultProducts } });
    } else if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('products')
        .upsert(defaultProducts.map(product => toDbProduct({ ...product, isActive: true })));
      if (error) throw error;
    }
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
