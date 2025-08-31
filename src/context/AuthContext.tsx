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
            console.log('🔑 Found stored token, user session restored:', user.email);
            setUser(user);
          } else {
            console.log('❌ Stored token is invalid, clearing it');
            await ApiService.setToken(null);
          }
        } catch (error) {
          console.log('❌ Failed to restore user session, clearing token');
          await ApiService.setToken(null);
        }
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
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
      console.error('❌ Profile update failed:', error);
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
      console.error('❌ Login failed:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clear the token from ApiService
    await ApiService.setToken(null);
    console.log('🔑 Token cleared from ApiService');
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
