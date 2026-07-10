// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

async function loadProfile(authUser) {
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    console.error('Could not load profile:', error.message);
  }

  if (!data) {
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email,
      email: authUser.email,
      role: authUser.user_metadata?.role || 'Employee',
      theme: 'light',
      language: 'English (US)',
      two_factor: false
    };
  }

  return {
    ...data,
    theme: data.theme || 'light',
    language: data.language || 'English (US)',
    deadline_reminders: data.deadline_reminders !== false,
    high_risk_warnings: data.high_risk_warnings !== false,
    workload_alerts: data.workload_alerts !== false,
    weekly_report_ready: data.weekly_report_ready || false,
    login_alerts: data.login_alerts !== false,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = await loadProfile(session?.user);
      if (profile) {
        document.documentElement.classList.toggle('dark', (profile.theme || 'light') === 'dark');
      }
      setUser(profile);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await loadProfile(session?.user);
      if (profile) {
        document.documentElement.classList.toggle('dark', (profile.theme || 'light') === 'dark');
      }
      setUser(profile);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password, bypass2FA = false) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await loadProfile(data.user);
    
    if (profile?.two_factor && !bypass2FA) {
      await supabase.auth.signOut();
      const api = (await import('../lib/api')).default;
      await api.post('/auth/send-2fa', { email });
      return { twoFactorRequired: true };
    }

    if (profile) {
      document.documentElement.classList.toggle('dark', (profile.theme || 'light') === 'dark');
      if (profile.login_alerts !== false) {
        const api = (await import('../lib/api')).default;
        api.post('/auth/send-login-alert', { email, userAgent: navigator.userAgent }).catch(console.error);
      }
    }
    setUser(profile);
    return profile;
  };

  const verify2FACode = async (email, code) => {
    const api = (await import('../lib/api')).default;
    await api.post('/auth/verify-2fa', { email, code });
  };

  const signup = async ({ name, email, password, role }) => {
    const redirectUrl = new URL('/login?confirmation=success', globalThis.location.origin).toString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (u) => setUser(u);

  const value = useMemo(
    () => ({ user, loading, login, verify2FACode, signup, logout, updateUser }),
    [user, loading, login, signup, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
