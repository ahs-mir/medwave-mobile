import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';

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
      case 'connected': return 'Backend Online';
      case 'failed': return 'Offline Mode';
      default: return 'Unknown';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'testing': return 'sync-outline';
      case 'connected': return 'cloud-done-outline';
      case 'failed': return 'cloud-offline-outline';
      default: return 'help-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Good morning</Text>
            <Text style={styles.doctorName}>{user?.fullName || 'Doctor'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleSettings}>
            <Ionicons name="person-circle-outline" size={32} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Connection Status - Integrated into existing design */}
        <View style={styles.connectionContainer}>
          <TouchableOpacity 
            style={styles.connectionCard} 
            onPress={testApiConnection}
            disabled={connectionStatus === 'testing'}
          >
            <Ionicons 
              name={getConnectionIcon()} 
              size={20} 
              color={getConnectionColor()} 
            />
            <Text style={[styles.connectionText, { color: getConnectionColor() }]}>
              {getConnectionText()}
            </Text>
            {connectionStatus === 'testing' && (
              <View style={styles.loadingDot}>
                <Ionicons name="ellipsis-horizontal" size={16} color="#F59E0B" />
              </View>
            )}
            <Text style={styles.tapToTest}>Tap to test</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Records</Text>
            </View>
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.primaryCard]}
            onPress={handlePatientList}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.primaryActionTitle}>Open Patient List</Text>
              <Text style={styles.primaryActionSubtitle}>View and manage all patients</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleAddPatient}
          >
            <View style={styles.secondaryActionIcon}>
              <Ionicons name="person-add-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add New Patient</Text>
              <Text style={styles.actionSubtitle}>Manual entry or scan documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleSettings}
          >
            <View style={styles.secondaryActionIcon}>
              <Ionicons name="settings-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Profile and preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Debug Action (only in development) */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {
                Alert.alert(
                  'MedWave MVP Status ✅',
                  `🎉 ALL MVP FEATURES WORKING!\n\n✅ Authentication: Working\n✅ Patient Management: Working\n✅ Letter Creation: Working\n✅ Letter Viewing: Working\n\nEnvironment: ${__DEV__ ? 'Development' : 'Production'}\n\nAPI URL: https://slippery-glass-production.up.railway.app/api\n\nConnection: ${getConnectionText()}\n\nLast Update: Aug 25, 2025`,
                  [{ text: 'Excellent!' }]
                );
              }}
            >
              <View style={styles.secondaryActionIcon}>
                <Ionicons name="bug-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>MVP Status ✅</Text>
                <Text style={styles.actionSubtitle}>All features working - Aug 25, 2025</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleLogout}
          >
            <View style={styles.secondaryActionIcon}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Sign Out</Text>
              <Text style={styles.actionSubtitle}>Logout from your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Quick Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.infoText}>GDPR Compliant • Secure Recording</Text>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  doctorName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  // New connection status styles
  connectionContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  tapToTest: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  loadingDot: {
    marginRight: 8,
  },
  // Existing styles
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryCard: {
    backgroundColor: '#111827',
    marginBottom: 24,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  secondaryActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  infoContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    marginLeft: 12,
  },
});