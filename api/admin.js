import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'YarlAdmin@2026';

const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const requireAdmin = (req, res) => {
  const provided = req.headers['x-admin-password'];
  if (!provided || provided !== adminPassword) {
    json(res, 401, { error: 'Invalid admin password.' });
    return false;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    json(res, 500, {
      error: 'Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL in Vercel environment variables.'
    });
    return false;
  }

  return true;
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

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const action = req.query.action;

  try {
    if (req.method === 'GET' && action === 'orders') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, { data: data || [] });
    }

    if (req.method === 'GET' && action === 'products') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, { data: data || [] });
    }

    if (req.method === 'POST' && action === 'save-product') {
      const { product } = req.body || {};
      if (!product?.id || !product?.name) return json(res, 400, { error: 'Missing product data.' });

      const { data, error } = await supabase
        .from('products')
        .upsert([toDbProduct(product)])
        .select()
        .single();
      if (error) throw error;
      return json(res, 200, { data });
    }

    if (req.method === 'POST' && action === 'delete-product') {
      const { id } = req.body || {};
      if (!id) return json(res, 400, { error: 'Missing product id.' });

      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      return json(res, 200, { data: true });
    }

    if (req.method === 'POST' && action === 'reset-products') {
      const { products } = req.body || {};
      if (!Array.isArray(products)) return json(res, 400, { error: 'Missing products list.' });

      const { error } = await supabase
        .from('products')
        .upsert(products.map(product => toDbProduct({ ...product, isActive: true })));
      if (error) throw error;
      return json(res, 200, { data: true });
    }

    if (req.method === 'POST' && action === 'update-order') {
      const { id, patch } = req.body || {};
      if (!id || !patch) return json(res, 400, { error: 'Missing order update data.' });

      const { data, error } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return json(res, 200, { data });
    }

    return json(res, 404, { error: 'Unknown admin action.' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Admin operation failed.' });
  }
}

