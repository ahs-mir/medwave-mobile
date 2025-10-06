import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import StorageService from '../services/StorageService';
import ProfileEditModal from '../components/ProfileEditModal';

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const storedKey = await StorageService.getOpenAIKey();
      if (storedKey) {
        setApiKey(storedKey);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setIsLoading(true);
    try {
      await StorageService.setOpenAIKey(apiKey.trim());
      Alert.alert('Success', 'API key saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  const removeApiKey = async () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure you want to remove your API key? This will disable AI features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removeOpenAIKey();
              setApiKey('');
              Alert.alert('Success', 'API key removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove API key');
            }
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      icon: 'person-outline',
      title: 'Profile',
      description: 'Manage your account information',
      onPress: () => setShowProfileModal(true),
    },
    {
      icon: 'document-text-outline',
      title: 'Privacy Policy',
      description: 'View our privacy policy',
      onPress: () => Alert.alert(
        'Privacy Policy',
        'MedWave is committed to protecting your privacy and the security of patient data. All medical information is encrypted and stored securely. We do not share patient data with third parties without explicit consent.',
        [{ text: 'OK' }]
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color="#6B7280" />
          </View>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>{user?.role}</Text>
        </View>

        {/* API Key Section */}
        <View style={styles.settingsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={20} color="#374151" />
            <Text style={styles.sectionTitle}>OpenAI API Key</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Required for AI-powered features like voice transcription and letter generation
          </Text>
          
          <View style={styles.apiKeyContainer}>
            <View style={styles.apiKeyInputContainer}>
              <TextInput
                style={styles.apiKeyInput}
                placeholder="Enter your OpenAI API key"
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Ionicons
                  name={showApiKey ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.apiKeyButtons}>
              <TouchableOpacity
                style={[styles.apiKeyButton, styles.saveButton]}
                onPress={saveApiKey}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              
              {apiKey && (
                <TouchableOpacity
                  style={[styles.apiKeyButton, styles.removeButton]}
                  onPress={removeApiKey}
                  disabled={isLoading}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          {settingsOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingsItem}
              onPress={option.onPress}
            >
              <View style={styles.settingsItemLeft}>
                <Ionicons name={option.icon as any} size={24} color="#374151" />
                <View style={styles.settingsItemText}>
                  <Text style={styles.settingsItemTitle}>{option.title}</Text>
                  <Text style={styles.settingsItemDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  userInfo: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  apiKeyContainer: {
    gap: 16,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  apiKeyInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 12,
  },
  apiKeyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  apiKeyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    marginLeft: 12,
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingsItemDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default SettingsScreen;
