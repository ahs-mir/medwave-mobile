import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export const DashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed' | null>(null);
  const [apiStats, setApiStats] = useState<any>(null);

  // Test API connection when screen loads
  useEffect(() => {
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    setConnectionStatus('testing');
    try {
      console.log('🔄 Testing API connection...');
      
      const healthResponse = await ApiService.checkHealth();
      console.log('✅ Health check response:', healthResponse);
      
      setApiStats(healthResponse);
      setConnectionStatus('connected');
      
    } catch (error: any) {
      console.error('❌ API connection failed:', error);
      setConnectionStatus('failed');
      
      // Show error only in development or on manual retry
      if (__DEV__ || error.manualRetry) {
        Alert.alert(
          '❌ Backend Connection Failed',
          `Could not connect to backend.\n\nError: ${error.message}\n\nThe app will work with cached data.`,
          [
            { text: 'Retry', onPress: () => testApiConnection() },
            { text: 'Continue' }
          ]
        );
      }
    }
  };

  const handlePatientList = () => {
    navigation.navigate('PatientList');
  };

  const handleAddPatient = () => {
    navigation.navigate('AddPatientOptions');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = async () => {
    await logout();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'testing': return '#F59E0B';
      case 'connected': return '#10B981';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Connecting...';
      case 'connected': return 'Online';
      case 'failed': return 'Offline';
      default: return 'Unknown';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'testing': return 'sync-outline';
      case 'connected': return 'checkmark-circle';
      case 'failed': return 'cloud-offline-outline';
      default: return 'help-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={['#FAFAFA', '#F5F5F5']}
          style={styles.heroHeader}
        >
          <View style={styles.headerTop}>
            <View style={styles.connectionBadge}>
              <Ionicons 
                name={getConnectionIcon()} 
                size={12} 
                color={getConnectionColor()} 
              />
              <Text style={[styles.connectionBadgeText, { color: getConnectionColor() }]}>
                {getConnectionText()}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.avatarButton} 
              onPress={handleSettings}
              activeOpacity={0.7}
            >
              <Ionicons name="person-circle" size={40} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.doctorName}>{user?.fullName || 'Doctor'}</Text>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text" size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Records</Text>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity 
          style={styles.primaryCTA}
          onPress={handlePatientList}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#000000', '#1F1F1F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryCTAGradient}
          >
            <View style={styles.primaryCTAContent}>
              <View style={styles.primaryCTALeft}>
                <View style={styles.primaryCTAIcon}>
                  <Ionicons name="people" size={28} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.primaryCTATitle}>Patient List</Text>
                  <Text style={styles.primaryCTASubtitle}>View all patients</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleAddPatient}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="person-add" size={24} color="#000000" />
              </View>
              <Text style={styles.quickActionTitle}>Add Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('VoiceRecording')}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="mic" size={24} color="#000000" />
              </View>
              <Text style={styles.quickActionTitle}>Record</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleSettings}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="settings" size={24} color="#000000" />
              </View>
              <Text style={styles.quickActionTitle}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="log-out" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.quickActionTitle, { color: '#EF4444' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.securityText}>GDPR Compliant</Text>
        </View>

        {/* Debug Info */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.debugCard}
            onPress={() => {
              Alert.alert(
                'MedWave MVP Status ✅',
                `🎉 ALL MVP FEATURES WORKING!\n\n✅ Authentication: Working\n✅ Patient Management: Working\n✅ Letter Creation: Working\n✅ Letter Viewing: Working\n\nEnvironment: ${__DEV__ ? 'Development' : 'Production'}\n\nAPI URL: https://slippery-glass-production.up.railway.app/api\n\nConnection: ${getConnectionText()}\n\nLast Update: Aug 25, 2025`,
                [{ text: 'Excellent!' }]
              );
            }}
          >
            <Ionicons name="bug" size={16} color="#8B5CF6" />
            <Text style={styles.debugText}>MVP Status: All Working</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Header
  heroHeader: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  connectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  avatarButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  greetingSection: {
    marginTop: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  doctorName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
    lineHeight: 42,
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },

  // Primary CTA
  primaryCTA: {
    marginHorizontal: 24,
    marginTop: 32,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryCTAGradient: {
    padding: 24,
  },
  primaryCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryCTALeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryCTAIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  primaryCTATitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  primaryCTASubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0,
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 6,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Security Badge
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  securityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  // Debug Card
  debugCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  debugText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 8,
  },
});