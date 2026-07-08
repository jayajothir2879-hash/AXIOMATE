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
    };
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = await loadProfile(session?.user);
      setUser(profile);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = await loadProfile(session?.user);
      setUser(profile);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
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
    () => ({ user, loading, login, signup, logout, updateUser }),
    [user, loading, login, signup, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
