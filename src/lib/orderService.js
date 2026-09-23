import { supabase, isSupabaseConfigured } from './supabaseClient';

const INITIAL_SEED_ORDERS = [
  {
    id: 'YS-8821',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    customer_name: 'Thivagar Vasanthan',
    customer_phone: '+94771234567',
    customer_email: 'thivagar@example.com',
    customer_address: 'No. 45, Temple Road, Nallur, Jaffna',
    customer_city: 'Jaffna',
    notes: 'Please call before delivery. Prefer afternoon delivery.',
    items: [
      {
        id: 'p1_couple',
        title: 'Signature Ceylon Couple Set',
        hisSize: 'L',
        herSize: 'M',
        quantity: 1,
        price: 3100,
        image: '/img/couple1.jpg'
      }
    ],
    total_amount: 3100,
    advance_required: 1000,
    balance_cod: 2100,
    delivery_fee: 0,
    slip_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    slip_reference: 'COMM-TRX-99824',
    bank_name: 'Commercial Bank',
    deposit_date: new Date().toISOString().split('T')[0],
    status: 'slip_review', // slip_review, advance_verified, packing, dispatched, delivered, rejected
    courier_name: '',
    courier_tracking_no: '',
    admin_notes: '',
    verified_at: null
  },
  {
    id: 'YS-8822',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    customer_name: 'Anushya Rajendran',
    customer_phone: '+94769876543',
    customer_email: 'anushya@example.com',
    customer_address: '12/3 Sea Street, Wellawatte, Colombo 06',
    customer_city: 'Colombo',
    notes: 'Gift packing if possible, thank you!',
    items: [
      {
        id: 'p2',
        title: 'Heritage Classic Crop Top',
        size: 'S',
        quantity: 1,
        price: 1650,
        image: '/img/crop-black.png'
      }
    ],
    total_amount: 2000,
    advance_required: 500,
    balance_cod: 1500,
    delivery_fee: 350,
    slip_url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80',
    slip_reference: 'BOC-FT-44120',
    bank_name: 'Bank of Ceylon (BOC)',
    deposit_date: new Date().toISOString().split('T')[0],
    status: 'slip_review',
    courier_name: '',
    courier_tracking_no: '',
    admin_notes: '',
    verified_at: null
  },
  {
    id: 'YS-8819',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    customer_name: 'Kabilan Sivakumar',
    customer_phone: '+94715556677',
    customer_email: 'kabilan@example.com',
    customer_address: 'Kandy Road, Vavuniya',
    customer_city: 'Vavuniya',
    notes: '',
    items: [
      {
        id: 'p1',
        title: 'Heritage Classic T-Shirt',
        size: 'XL',
        quantity: 2,
        price: 3700,
        image: '/img/tshirt-black.png'
      }
    ],
    total_amount: 3700,
    advance_required: 1000,
    balance_cod: 2700,
    delivery_fee: 0,
    slip_url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80',
    slip_reference: 'HNB-ONLINE-7128',
    bank_name: 'Hatton National Bank (HNB)',
    deposit_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'advance_verified',
    courier_name: 'Domex Express',
    courier_tracking_no: 'DMX-9821034',
    admin_notes: 'Advance LKR 1000 confirmed into Commercial Bank account.',
    verified_at: new Date(Date.now() - 43200000).toISOString()
  }
];

// Helper to get local orders
const getLocalOrders = () => {
  try {
    const raw = localStorage.getItem('yarl_all_orders');
    if (!raw) {
      localStorage.setItem('yarl_all_orders', JSON.stringify(INITIAL_SEED_ORDERS));
      return INITIAL_SEED_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SEED_ORDERS;
  }
};

const saveLocalOrders = (orders) => {
  try {
    localStorage.setItem('yarl_all_orders', JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save local orders:', err);
  }
};

export const orderService = {
  // Fetch all orders
  async getOrders() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Supabase fetch failed, falling back to local store:', error);
        return getLocalOrders();
      }
      return data && data.length > 0 ? data : getLocalOrders();
    }
    return getLocalOrders();
  },

  // Create new order with slip
  async createOrder(orderPayload, slipFile = null) {
    let slipUrl = orderPayload.slip_url || '';

    // If a slip file is passed and Supabase is connected
    if (slipFile && isSupabaseConfigured && supabase) {
      try {
        const fileExt = slipFile.name ? slipFile.name.split('.').pop() : 'jpg';
        const fileName = `slip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-slips')
          .upload(fileName, slipFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-slips')
            .getPublicUrl(fileName);
          slipUrl = publicUrl;
        }
      } catch (err) {
        console.warn('Storage upload error, using preview:', err);
      }
    }

    const orderId = 'YS-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
      ...orderPayload,
      id: orderId,
      created_at: new Date().toISOString(),
      slip_url: slipUrl || orderPayload.slip_url,
      status: slipUrl ? 'slip_review' : 'pending_slip'
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orders').insert([newOrder]).select();
        if (!error && data?.[0]) return data[0];
      } catch (err) {
        console.warn('Supabase insert failed, saving to local store:', err);
      }
    }

    // Local storage save
    const current = getLocalOrders();
    const updated = [newOrder, ...current];
    saveLocalOrders(updated);
    return newOrder;
  },

  // Review & Verify Slip
  async verifySlip(orderId, { status = 'advance_verified', adminNotes = '', verifiedBy = 'Admin' }) {
    const patch = {
      status,
      admin_notes: adminNotes,
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update(patch)
          .eq('id', orderId)
          .select();
        if (!error && data?.[0]) return data[0];
      } catch (err) {
        console.warn('Supabase update failed, updating local store:', err);
      }
    }

    const current = getLocalOrders();
    const updated = current.map(ord => ord.id === orderId ? { ...ord, ...patch } : ord);
    saveLocalOrders(updated);
    return updated.find(o => o.id === orderId);
  },

  // Update Courier & Shipping Tracking
  async updateShipping(orderId, { courierName, trackingNo, status = 'dispatched' }) {
    const patch = {
      courier_name: courierName,
      courier_tracking_no: trackingNo,
      status: status
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update(patch)
          .eq('id', orderId)
          .select();
        if (!error && data?.[0]) return data[0];
      } catch (err) {
        console.warn('Supabase shipping update failed:', err);
      }
    }

    const current = getLocalOrders();
    const updated = current.map(ord => ord.id === orderId ? { ...ord, ...patch } : ord);
    saveLocalOrders(updated);
    return updated.find(o => o.id === orderId);
  },

  // Summary statistics for Dashboard
  calculateStats(orders = []) {
    const totalOrders = orders.length;
    const pendingSlips = orders.filter(o => o.status === 'slip_review').length;
    const verifiedOrders = orders.filter(o => o.status === 'advance_verified' || o.status === 'packing').length;
    const dispatchedOrders = orders.filter(o => o.status === 'dispatched').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const advanceCollected = orders
      .filter(o => ['advance_verified', 'packing', 'dispatched', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.advance_required || 0), 0);
    const codOutstanding = orders
      .filter(o => ['advance_verified', 'packing', 'dispatched'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.balance_cod || 0), 0);

    return {
      totalOrders,
      pendingSlips,
      verifiedOrders,
      dispatchedOrders,
      deliveredOrders,
      totalRevenue,
      advanceCollected,
      codOutstanding
    };
  }
};
