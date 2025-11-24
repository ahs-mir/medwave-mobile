import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import * as Haptics from 'expo-haptics';
import OAuthService from '../../services/OAuthService';
import { DEV_USER_EMAIL, DEV_USER_PASSWORD, DEV_QUICK_LOGIN_ENABLED } from '@env';

const OAUTH_ENABLED = false;

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  
  const { login, loginWithGoogle, loginWithApple } = useAuth();

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Check if Apple Sign-In is available (iOS 13+)
  useEffect(() => {
    const checkAppleAvailability = async () => {
      if (Platform.OS === 'ios') {
        const available = await OAuthService.isAppleSignInAvailable();
        setIsAppleAvailable(available);
      }
    };
    checkAppleAvailability();
  }, []);

  // Dismiss keyboard when tapping outside
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Haptic feedback for login attempt
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Haptic feedback for successful login
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Login successful, redirecting...');
      } else {
        // Haptic feedback for failed login
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login Failed', result.error || 'Invalid email or password');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth login handlers
  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      const result = await loginWithGoogle();
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Google login successful');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (result.requiresRole) {
          // If role is required, navigate to role selection
          Alert.alert('Complete Registration', 'Please select your role to complete registration', [
            { text: 'OK', onPress: () => navigation.navigate('Register', { provider: 'google' }) }
          ]);
        } else {
          Alert.alert('Google Login Failed', result.error || 'Failed to login with Google');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      const result = await loginWithApple();
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Apple login successful');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (result.requiresRole) {
          Alert.alert('Complete Registration', 'Please select your role to complete registration', [
            { text: 'OK', onPress: () => navigation.navigate('Register', { provider: 'apple' }) }
          ]);
        } else if (result.requiresEmail) {
          Alert.alert('Email Required', 'Please provide your email to complete registration', [
            { text: 'OK', onPress: () => navigation.navigate('Register', { provider: 'apple' }) }
          ]);
        } else {
          Alert.alert('Apple Login Failed', result.error || 'Failed to login with Apple');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login function for development
  const handleQuickLogin = async () => {
    if (!DEV_QUICK_LOGIN_ENABLED || !DEV_USER_EMAIL || !DEV_USER_PASSWORD) {
      Alert.alert('Development Mode', 'Quick login is not configured');
      return;
    }

    // Haptic feedback for quick login
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      const result = await login(DEV_USER_EMAIL, DEV_USER_PASSWORD);
      
      if (result.success) {
        // Haptic feedback for successful login
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('Quick login successful, redirecting...');
      } else {
        // Haptic feedback for failed login
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Quick Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>MedWave</Text>
          <Text style={styles.heroSubtitle}>Medical letter management for healthcare professionals</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelContainer}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                disabled={isLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* OAuth Buttons */}
          {(true || isAppleAvailable) && (
            <View style={styles.oauthSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign-In */}
              <TouchableOpacity 
                style={[
                  styles.oauthButton,
                  styles.googleButton,
                  (isLoading || !OAUTH_ENABLED) && styles.oauthButtonDisabled,
                ]}
                onPress={OAUTH_ENABLED ? handleGoogleLogin : undefined}
                disabled={isLoading || !OAUTH_ENABLED}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 12 }} />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              {isAppleAvailable && (
                <TouchableOpacity 
                  style={[
                    styles.oauthButton,
                    styles.appleButton,
                    (isLoading || !OAUTH_ENABLED) && styles.oauthButtonDisabled,
                  ]}
                  onPress={OAUTH_ENABLED ? handleAppleLogin : undefined}
                  disabled={isLoading || !OAUTH_ENABLED}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={{ marginRight: 12 }} />
                  <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Create Account Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Development Quick Login Button */}
          {DEV_QUICK_LOGIN_ENABLED === 'true' && __DEV__ && (
            <View style={styles.devSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Development</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity 
                style={[styles.quickLoginButton, isLoading && styles.quickLoginButtonDisabled]}
                onPress={handleQuickLogin}
                disabled={isLoading}
              >
                <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.quickLoginButtonText}>Quick Login as Rizwan</Text>
              </TouchableOpacity>
              
              <Text style={styles.devNote}>
                Development mode: Uses pre-configured credentials
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 48,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loginButton: {
    height: 52,
    backgroundColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 8,
  },
  signupText: {
    fontSize: 15,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
  },
  devSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickLoginButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLoginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  quickLoginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  devNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  oauthSection: {
    gap: 12,
    marginTop: 16,
  },
  oauthButton: {
    height: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  oauthButtonDisabled: {
    opacity: 0.5,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '500',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});