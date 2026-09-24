import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// ─── Address helpers (localStorage cache) ─────────────────────────
const ADDRESS_KEY = 'yarl_saved_address';
export const getSavedAddress = () => {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
export const saveAddressLocally = (addr) => {
  try { localStorage.setItem(ADDRESS_KEY, JSON.stringify(addr)); } catch {}
};

// ─── Profile shape from Supabase user ─────────────────────────────
const parseUserProfile = (supabaseUser) => {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  const fullName = meta.full_name || meta.name || supabaseUser.email?.split('@')[0] || 'Member';
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: fullName,
    firstName: fullName.split(' ')[0],
    avatar: meta.avatar_url || meta.picture || null,
    provider: meta.provider || 'email',
    emailConfirmed: !!supabaseUser.email_confirmed_at,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('yarl_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [savedAddress, setSavedAddress] = useState(() => getSavedAddress());

  const persistUser = (profile) => {
    if (profile) {
      localStorage.setItem('yarl_auth_user', JSON.stringify(profile));
    } else {
      localStorage.removeItem('yarl_auth_user');
    }
    setUser(profile);
  };

  // ─── Sync with Supabase session ─────────────────────────────────
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) persistUser(parseUserProfile(session.user));
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          persistUser(parseUserProfile(session.user));
          // Load saved address from profiles table
          loadProfileAddress(session.user.id);
        } else {
          persistUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  // ─── Load address from Supabase profiles ────────────────────────
  const loadProfileAddress = async (userId) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, default_address, default_city')
        .eq('id', userId)
        .single();
      if (data?.default_address) {
        const addr = {
          name: data.full_name || '',
          phone: data.phone || '',
          address: data.default_address || '',
          city: data.default_city || '',
        };
        saveAddressLocally(addr);
        setSavedAddress(addr);
      }
    } catch { /* silent */ }
  };

  // ─── Save / update address in profile ───────────────────────────
  const saveAddress = async ({ name, phone, address, city }) => {
    const addr = { name, phone, address, city };
    saveAddressLocally(addr);
    setSavedAddress(addr);

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: name,
          phone: phone,
          default_address: address,
          default_city: city,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch { /* silent — already saved locally */ }
    }
  };

  // ─── Google OAuth ────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } else {
      const mockUser = {
        id: 'user_google_' + Date.now(), email: 'harith@example.com',
        name: 'Harith Malan', firstName: 'Harith',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        provider: 'google', emailConfirmed: true,
      };
      persistUser(mockUser);
      return mockUser;
    }
  };

  // ─── Facebook OAuth ──────────────────────────────────────────────
  const signInWithFacebook = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } else {
      const mockUser = {
        id: 'user_fb_' + Date.now(), email: 'malan.fb@example.com',
        name: 'Malan Thasan', firstName: 'Malan',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
        provider: 'facebook', emailConfirmed: true,
      };
      persistUser(mockUser);
      return mockUser;
    }
  };

  // ─── Email / Password Sign-In ────────────────────────────────────
  const signInWithEmail = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        const profile = parseUserProfile(data.user);
        persistUser(profile);
        await loadProfileAddress(data.user.id);
        return profile;
      }
    } else {
      // Preview mode fallback
      const mockUser = {
        id: 'user_email_' + Date.now(), email,
        name: email.split('@')[0], firstName: email.split('@')[0],
        avatar: null, provider: 'email', emailConfirmed: true,
      };
      persistUser(mockUser);
      return mockUser;
    }
  };

  // ─── Email / Password Sign-Up ────────────────────────────────────
  const signUpWithEmail = async (email, password, fullName) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, provider: 'email' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Supabase returns the user but email is unconfirmed — caller shows verify screen
      return data;
    } else {
      // Preview mode: auto-confirm
      const mockUser = {
        id: 'user_email_' + Date.now(), email,
        name: fullName, firstName: fullName.split(' ')[0],
        avatar: null, provider: 'email', emailConfirmed: false,
      };
      persistUser(mockUser);
      return mockUser;
    }
  };

  // ─── Password Reset Email ────────────────────────────────────────
  const resetPassword = async (email) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    }
    // In preview mode: silently succeed (email shown to user as "sent")
  };

  // ─── Sign Out ─────────────────────────────────────────────────────
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    persistUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      savedAddress,
      saveAddress,
      signInWithGoogle,
      signInWithFacebook,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
      isConfigured: isSupabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
