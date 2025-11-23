import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  refreshPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

// This is a mock implementation - in a real app, you would fetch permissions from your Django backend
export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const { token, user, isAuthenticated } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const fetchPermissions = async () => {
    if (!token || !user) {
      setPermissions([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/me/permissions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      const perms = Array.isArray(data.permissions) ? data.permissions : []
      setPermissions(perms)
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPermissions();
    } else {
      setPermissions([]);
    }
  }, [isAuthenticated, token, user]);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const refreshPermissions = () => {
    fetchPermissions();
  };

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, refreshPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};