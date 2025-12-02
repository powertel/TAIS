import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const AUTH_PREFIX = import.meta.env.VITE_AUTH_SERVICE_PREFIX || '/auth-service';
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const expiryTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const refreshingPromise = useRef<Promise<string | null> | null>(null);
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  const parseJwt = (t: string) => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const scheduleExpiryLogout = (tkn: string | null) => {
    if (expiryTimer.current) {
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
    if (!tkn) return;
    const payload = parseJwt(tkn);
    if (payload && payload.exp) {
      const now = Date.now();
      const expMs = payload.exp * 1000;
      const delay = Math.max(expMs - now - 5000, 0);
      expiryTimer.current = window.setTimeout(() => {
        logout();
      }, delay);
    }
  };

  const scheduleProactiveRefresh = (tkn: string | null) => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!tkn) return;
    const payload = parseJwt(tkn);
    if (payload && payload.exp) {
      const now = Date.now();
      const expMs = payload.exp * 1000;
      const leadMs = 60 * 1000; // refresh 1 minute before expiry
      const delay = Math.max(expMs - now - leadMs, 0);
      refreshTimer.current = window.setTimeout(async () => {
        try {
          await refreshAccessToken();
        } catch {}
      }, delay);
    }
  };

  const getActiveStorage = () => (localStorage.getItem('token') || localStorage.getItem('refresh_token')) ? localStorage : sessionStorage;

  const refreshAccessToken = async (): Promise<string | null> => {
    if (refreshingPromise.current) return refreshingPromise.current;
    const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    const endpoints = [
      `${API_BASE_URL}${AUTH_PREFIX}/api/v1/auth/refresh`,
      `${API_BASE_URL}${AUTH_PREFIX}/api/v1/auth/refresh-token`,
      `${API_BASE_URL}${AUTH_PREFIX}/api/v1/auth/token/refresh`,
    ];
    const attempt = async () => {
      for (const url of endpoints) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          const data = await resp.json();
          if (resp.ok) {
            const newAccess: string | null = data?.access_token || data?.access || data?.token || null;
            const newRefresh: string | null = data?.refresh_token || null;
            const storage = getActiveStorage();
            if (newAccess) storage.setItem('token', newAccess);
            if (newRefresh) storage.setItem('refresh_token', newRefresh);
            setToken(newAccess);
            if (newAccess) {
              scheduleExpiryLogout(newAccess);
              scheduleProactiveRefresh(newAccess);
            }
            return newAccess;
          }
        } catch {}
      }
      return null;
    };
    const promise = attempt().finally(() => { refreshingPromise.current = null; });
    refreshingPromise.current = promise;
    return promise;
  };

  const resetIdleTimer = () => {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    if (!token) return;
    idleTimer.current = window.setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT_MS);
  };

  const login = async (username: string, password: string, remember: boolean = true): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const tokenValue: string | null = data?.access_token || data?.access || data?.accessToken || data?.token || null;
        const refreshToken: string | null = data?.refresh_token || null;
        const storage = remember ? localStorage : sessionStorage;
        if (tokenValue) storage.setItem('token', tokenValue);
        if (refreshToken) storage.setItem('refresh_token', refreshToken);

        const userInfo: User = {
          id: data?.id ?? 0,
          username: data?.email ?? username,
          email: data?.email ?? '',
          first_name: data?.firstname ?? data?.first_name ?? '',
          last_name: data?.lastname ?? data?.last_name ?? '',
        };
        storage.setItem('user', JSON.stringify(userInfo));

        setToken(tokenValue);
        setUser(userInfo);
        if (tokenValue) {
          scheduleExpiryLogout(tokenValue);
          scheduleProactiveRefresh(tokenValue);
        }
        resetIdleTimer();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    // Clear stored data
    try {
      if (token) {
        await fetch(`${API_BASE_URL}${AUTH_PREFIX}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch {}

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('refresh_token');

    setToken(null);
    setUser(null);
    if (expiryTimer.current) {
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  };

  const isAuthenticated = !!token;

  // Attach axios interceptors for auth and handle 401 with refresh
  useEffect(() => {
    const reqId = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });
    const resId = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config || {};
        if (status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const newAccess = await refreshAccessToken();
          if (newAccess) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
            return axios(originalRequest);
          } else {
            await logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, [token]);

  // Auto logout/refresh scheduling and sync across tabs
  useEffect(() => {
    scheduleExpiryLogout(token);
    scheduleProactiveRefresh(token);
    resetIdleTimer();
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const onActivity = () => resetIdleTimer();
    activityEvents.forEach(evt => window.addEventListener(evt, onActivity));
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue === null) {
        logout();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      activityEvents.forEach(evt => window.removeEventListener(evt, onActivity));
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
