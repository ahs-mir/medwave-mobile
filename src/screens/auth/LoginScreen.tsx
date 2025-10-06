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

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const { login } = useAuth();

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.patternRow}>
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
        </View>
        <View style={styles.patternRow}>
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
        </View>
        <View style={styles.patternRow}>
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
        </View>
        <View style={styles.patternRow}>
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
        </View>
        <View style={styles.patternRow}>
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
        </View>
        <View style={styles.patternRow}>
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
          <View style={styles.patternDot} />
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior="height"
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity 
            style={styles.content}
            activeOpacity={1}
            onPress={dismissKeyboard}
          >
          <View style={styles.header}>
            <Text style={styles.title}>MedWave</Text>
            <Text style={styles.subtitle}>Medical Assistant</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                disabled={isLoading}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>


          </View>

          <View style={styles.footer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});