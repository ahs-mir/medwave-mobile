// src/context/AuthContext.tsx
import React, { createContext, ReactNode, useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import { UserFrontend } from '../types';

interface AuthContextType {
  user: UserFrontend | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (profileData: { firstName: string; lastName: string; email: string }) => Promise<{ success: boolean; error?: string }>;
}

// 1) Provide a real default so createContext never returns undefined
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ success: false }),
  logout: () => {},
  updateProfile: async () => ({ success: false }),
});
AuthContext.displayName = 'AuthContext';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserFrontend | null>(null);
  const [isLoading, setLoading] = useState(true); // Start with loading true

  // Check if user is already authenticated on app start
  const initializeAuth = async () => {
    try {
      setLoading(true);
      const token = await ApiService.getToken();
      
      if (token) {
        // Try to restore user session by fetching user profile
        try {
          const user = await ApiService.getCurrentUser();
          if (user) {
            setUser(user);
          } else {
            await ApiService.setToken(null);
          }
        } catch (error) {
          await ApiService.setToken(null);
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData: { firstName: string; lastName: string; email: string }) => {
    try {
      setLoading(true);
      const updatedUser = await ApiService.updateUserProfile(profileData);
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Profile update failed' };
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth when component mounts
  useEffect(() => {
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await ApiService.login(email, password);
      
      if (response.user && response.token) {
        // Set the token in ApiService for future API calls
        await ApiService.setToken(response.token);
        setUser(response.user);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clear the token from ApiService
    await ApiService.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// custom hook for consumers
export const useAuth = () => React.useContext(AuthContext);
