// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  useEffect(() => {
    // Load user from token if it exists
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('authToken', newToken);
      api.defaults.headers.Authorization = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      
      return userData;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const signup = async ({ name, email, password, role }) => {
    try {
      const response = await api.post('/auth/signup', { name, email, password, role });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('authToken', newToken);
      api.defaults.headers.Authorization = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      
      return userData;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('authToken');
      delete api.defaults.headers.Authorization;
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (u) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
