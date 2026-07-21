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

  const baseProfile = data || {
    id: authUser.id,
    name: authUser.user_metadata?.name || authUser.email,
    email: authUser.email,
    role: authUser.user_metadata?.role || 'Employee',
    theme: 'light',
    language: 'English (US)',
    two_factor: false
  };

  const profile = {
    ...baseProfile,
    originalRole: authUser.user_metadata?.role || baseProfile.role || 'Employee',
    theme: baseProfile.theme || 'light',
    language: baseProfile.language || 'English (US)',
    deadline_reminders: baseProfile.deadline_reminders !== false,
    high_risk_warnings: baseProfile.high_risk_warnings !== false,
    workload_alerts: baseProfile.workload_alerts !== false,
    weekly_report_ready: baseProfile.weekly_report_ready || false,
    login_alerts: baseProfile.login_alerts !== false,
  };

  if (profile && profile.email) {
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, profile_id, phone, designation, department, emp_code')
        .eq('email', profile.email)
        .maybeSingle();
      if (emp) {
        if (!emp.profile_id) {
          await supabase
            .from('employees')
            .update({ profile_id: profile.id })
            .eq('id', emp.id);
        }

        const updates = {};
        if (!profile.phone && emp.phone) { profile.phone = emp.phone; updates.phone = emp.phone; }
        if (!profile.designation && emp.designation) { profile.designation = emp.designation; updates.designation = emp.designation; }
        if (!profile.department && emp.department) { profile.department = emp.department; updates.department = emp.department; }
        if (!profile.emp_code && emp.emp_code) { profile.emp_code = emp.emp_code; updates.emp_code = emp.emp_code; }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id);
        }
      }
    } catch (err) {
      console.error('Error auto-linking/populating employee record:', err);
    }
  }

  return profile;
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

  const updateProfileRole = async (newRole) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    if (error) throw error;
    setUser((prev) => ({ ...prev, role: newRole, originalRole: newRole }));
  };

  const setPreviewRole = (newRole) => {
    setUser((prev) => prev ? { ...prev, role: newRole } : null);
  };

  const value = useMemo(
    () => ({ user, loading, login, verify2FACode, signup, logout, updateUser, updateProfileRole, setPreviewRole }),
    [user, loading, login, signup, logout, updateUser, updateProfileRole]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
