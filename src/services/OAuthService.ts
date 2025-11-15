import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Complete the web browser session for iOS
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthResult {
  idToken: string | null;
  error: string | null;
}

interface AppleAuthResult {
  identityToken: string | null;
  userIdentifier: string | null;
  email: string | null;
  fullName: { givenName?: string; familyName?: string } | null;
  error: string | null;
}

/**
 * OAuth Service for handling Google and Apple Sign-In
 */
class OAuthService {
  private googleClientId: string | null = null;
  private googleRedirectUri: string | null = null;

  constructor() {
    // Google OAuth configuration
    // In production, set GOOGLE_CLIENT_ID in environment variables
    // For iOS, use the iOS client ID
    // For Android, use the Android client ID (or use the same one if configured)
    if (Platform.OS === 'ios') {
      this.googleClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || null;
    } else {
      this.googleClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || null;
    }

    // Generate redirect URI for OAuth
    // For development, use localhost redirect
    // For production, configure in Google Cloud Console
    this.googleRedirectUri = AuthSession.makeRedirectUri({
      useProxy: true, // Use Expo's proxy for development
    });
  }

  /**
   * Sign in with Google
   * @param role Optional role for registration (doctor/secretary)
   * @param specialization Optional specialization for doctors
   */
  async signInWithGoogle(role?: string, specialization?: string): Promise<GoogleAuthResult> {
    try {
      if (!this.googleClientId) {
        return {
          idToken: null,
          error: 'Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
        };
      }

      // Create OAuth request
      const request = new AuthSession.AuthRequest({
        clientId: this.googleClientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        redirectUri: this.googleRedirectUri!,
        usePKCE: true,
      });

      // Get discovery document (OIDC configuration)
      const discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );

      // Prompt user for authentication
      const result = await request.promptAsync(discovery, {
        useProxy: true,
      });

      if (result.type === 'success') {
        // Extract ID token from result
        const idToken = result.params.id_token;
        
        if (!idToken) {
          return {
            idToken: null,
            error: 'No ID token received from Google',
          };
        }

        return {
          idToken,
          error: null,
        };
      } else if (result.type === 'error') {
        return {
          idToken: null,
          error: result.error?.message || 'Google authentication failed',
        };
      } else {
        // User cancelled
        return {
          idToken: null,
          error: 'User cancelled Google authentication',
        };
      }
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return {
        idToken: null,
        error: error instanceof Error ? error.message : 'Google authentication failed',
      };
    }
  }

  /**
   * Sign in with Apple
   * Only available on iOS devices (iOS 13+)
   * @param role Optional role for registration (doctor/secretary)
   * @param specialization Optional specialization for doctors
   */
  async signInWithApple(role?: string, specialization?: string): Promise<AppleAuthResult> {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      if (!isAvailable) {
        return {
          identityToken: null,
          userIdentifier: null,
          email: null,
          fullName: null,
          error: 'Apple Sign-In is not available on this device. Requires iOS 13+',
        };
      }

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      return {
        identityToken: credential.identityToken || null,
        userIdentifier: credential.user || null,
        email: credential.email || null,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName || undefined,
              familyName: credential.fullName.familyName || undefined,
            }
          : null,
        error: null,
      };
    } catch (error: any) {
      // Handle user cancellation
      if (error.code === 'ERR_CANCELED' || error.code === 'ERR_REQUEST_CANCELED') {
        return {
          identityToken: null,
          userIdentifier: null,
          email: null,
          fullName: null,
          error: 'User cancelled Apple authentication',
        };
      }

      // Handle specific Apple Sign-In errors
      let errorMessage = 'Apple authentication failed';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Apple Sign-In error: ${error.code}`;
      }

      // Check for common configuration issues
      if (errorMessage.includes('authorization attempt failed') || 
          errorMessage.includes('unknown reason')) {
        errorMessage = 'Apple Sign-In is not properly configured. Please ensure:\n\n1. The app is signed with a valid development team\n2. Sign in with Apple capability is enabled in Xcode\n3. Your simulator/device is signed in with an Apple ID\n4. The app was rebuilt after adding Apple Sign-In capability';
      }

      console.error('❌ Apple OAuth error:', error);
      return {
        identityToken: null,
        userIdentifier: null,
        email: null,
        fullName: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if Apple Sign-In is available on the device
   */
  async isAppleSignInAvailable(): Promise<boolean> {
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Check if Google Sign-In is configured
   */
  isGoogleSignInConfigured(): boolean {
    return this.googleClientId !== null;
  }
}

export default new OAuthService();

