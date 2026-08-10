import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cyber_safety_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async (jwtToken) => {
    if (!jwtToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setUser(json.user);
        }
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Auth fetchMe error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe(token);
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Login failed');
    }
    localStorage.setItem('cyber_safety_token', json.token);
    setToken(json.token);
    setUser(json.user);
    return json.user;
  };

  const register = async (email, password, name, role) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Registration failed');
    }
    localStorage.setItem('cyber_safety_token', json.token);
    setToken(json.token);
    setUser(json.user);
    return json.user;
  };

  const logout = () => {
    localStorage.removeItem('cyber_safety_token');
    setToken(null);
    setUser(null);
  };

  const authHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
