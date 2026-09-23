import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Check saved local session (for demo or persistent mock)
    try {
      const saved = localStorage.getItem('yarl_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Parse display name and first name
  const parseUserProfile = (supabaseUser, fallbackProvider = 'google') => {
    if (!supabaseUser) return null;
    const meta = supabaseUser.user_metadata || {};
    const fullName = meta.full_name || meta.name || supabaseUser.email?.split('@')[0] || 'Member';
    const firstName = fullName.split(' ')[0];
    const avatar = meta.avatar_url || meta.picture || null;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: fullName,
      firstName: firstName,
      avatar: avatar,
      provider: meta.provider || fallbackProvider
    };
  };

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Check active Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const profile = parseUserProfile(session.user);
          setUser(profile);
          localStorage.setItem('yarl_auth_user', JSON.stringify(profile));
        }
        setLoading(false);
      });

      // Listen for auth changes (redirects, logouts)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const profile = parseUserProfile(session.user);
          setUser(profile);
          localStorage.setItem('yarl_auth_user', JSON.stringify(profile));
        } else {
          setUser(null);
          localStorage.removeItem('yarl_auth_user');
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Local fallback mode
      setLoading(false);
    }
  }, []);

  // Continue with Google
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } else {
      // Instant interactive mock login for preview
      const mockUser = {
        id: 'user_google_' + Date.now(),
        email: 'harith@example.com',
        name: 'Harith Malan',
        firstName: 'Harith',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        provider: 'google'
      };
      setUser(mockUser);
      localStorage.setItem('yarl_auth_user', JSON.stringify(mockUser));
      return mockUser;
    }
  };

  // Continue with Facebook
  const signInWithFacebook = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } else {
      // Instant interactive mock login for preview
      const mockUser = {
        id: 'user_fb_' + Date.now(),
        email: 'malan.fb@example.com',
        name: 'Malan Thasan',
        firstName: 'Malan',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
        provider: 'facebook'
      };
      setUser(mockUser);
      localStorage.setItem('yarl_auth_user', JSON.stringify(mockUser));
      return mockUser;
    }
  };

  // Sign out
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('yarl_auth_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signInWithFacebook,
      signOut,
      isConfigured: isSupabaseConfigured
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
