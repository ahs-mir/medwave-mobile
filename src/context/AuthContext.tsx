// src/context/AuthContext.tsx
import React, { createContext, ReactNode, useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import OAuthService from '../services/OAuthService';
import { UserFrontend } from '../types';

interface AuthContextType {
  user: UserFrontend | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresRole?: boolean }>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; role: string; specialization?: string }) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (role?: string, specialization?: string) => Promise<{ success: boolean; error?: string; requiresRole?: boolean }>;
  loginWithApple: (role?: string, specialization?: string) => Promise<{ success: boolean; error?: string; requiresRole?: boolean; requiresEmail?: boolean }>;
  logout: () => void;
  updateProfile: (profileData: { firstName: string; lastName: string; email: string }) => Promise<{ success: boolean; error?: string }>;
}

// 1) Provide a real default so createContext never returns undefined
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  loginWithApple: async () => ({ success: false }),
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

  const register = async (data: { firstName: string; lastName: string; email: string; password: string; role: string; specialization?: string }) => {
    try {
      setLoading(true);
      const response = await ApiService.register(data);
      
      if (response.user && response.token) {
        // Set the token in ApiService for future API calls
        await ApiService.setToken(response.token);
        setUser(response.user);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clear the token from ApiService
    await ApiService.setToken(null);
    setUser(null);
  };

  const loginWithGoogle = async (role?: string, specialization?: string) => {
    try {
      setLoading(true);
      
      // Step 1: Get Google ID token
      const oauthResult = await OAuthService.signInWithGoogle(role, specialization);
      
      if (oauthResult.error || !oauthResult.idToken) {
        return { 
          success: false, 
          error: oauthResult.error || 'Failed to get Google authentication token' 
        };
      }

      // Step 2: Send token to backend
      try {
        const response = await ApiService.loginWithGoogle(oauthResult.idToken, role, specialization);
        
        if (response.error) {
          // Check if role is required for new users
          if (response.error.includes('Role is required') || response.requiresRole) {
            return { 
              success: false, 
              error: response.error, 
              requiresRole: true 
            };
          }
          return { success: false, error: response.error };
        }

        if (response.user && response.token) {
          await ApiService.setToken(response.token);
          setUser(response.user);
          return { success: true };
        }
        
        return { success: false, error: 'Invalid response from server' };
      } catch (err: any) {
        // Check if backend requires role
        if (err?.response?.data?.requiresRole || err?.message?.includes('Role is required')) {
          return { 
            success: false, 
            error: err.response?.data?.error || err.message, 
            requiresRole: true 
          };
        }
        throw err;
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Google authentication failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const loginWithApple = async (role?: string, specialization?: string) => {
    try {
      setLoading(true);
      
      // Step 1: Get Apple authentication
      const oauthResult = await OAuthService.signInWithApple(role, specialization);
      
      if (oauthResult.error || !oauthResult.identityToken || !oauthResult.userIdentifier) {
        return { 
          success: false, 
          error: oauthResult.error || 'Failed to get Apple authentication' 
        };
      }

      // Step 2: Send token to backend
      try {
        const response = await ApiService.loginWithApple(
          oauthResult.identityToken,
          oauthResult.userIdentifier,
          oauthResult.email,
          oauthResult.fullName,
          role,
          specialization
        );
        
        if (response.error) {
          // Check if role or email is required
          if (response.error.includes('Role is required') || response.requiresRole) {
            return { 
              success: false, 
              error: response.error, 
              requiresRole: true 
            };
          }
          if (response.error.includes('Email is required') || response.requiresEmail) {
            return { 
              success: false, 
              error: response.error, 
              requiresEmail: true 
            };
          }
          return { success: false, error: response.error };
        }

        if (response.user && response.token) {
          await ApiService.setToken(response.token);
          setUser(response.user);
          return { success: true };
        }
        
        return { success: false, error: 'Invalid response from server' };
      } catch (err: any) {
        // Check if backend requires role or email
        if (err?.response?.data?.requiresRole || err?.message?.includes('Role is required')) {
          return { 
            success: false, 
            error: err.response?.data?.error || err.message, 
            requiresRole: true 
          };
        }
        if (err?.response?.data?.requiresEmail || err?.message?.includes('Email is required')) {
          return { 
            success: false, 
            error: err.response?.data?.error || err.message, 
            requiresEmail: true 
          };
        }
        throw err;
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Apple authentication failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        loginWithApple,
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
