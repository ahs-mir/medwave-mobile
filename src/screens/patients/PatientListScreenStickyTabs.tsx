// Alternative implementation: Sticky Tabs Only
// This version keeps only the tabs sticky and lets everything else scroll away

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/ApiService';
import { PatientFrontend } from '../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../navigation/AppStackNavigator';
import { PatientListSkeleton } from '../../components/PatientListSkeleton';
import { PatientListItem } from '../../components/PatientListItem';
import { LoadingSpinner, EmptyState, ErrorState, SearchEmptyState } from '../../components/LoadingStates';
import * as Haptics from 'expo-haptics';

type PatientListScreenNavigationProp = StackNavigationProp<AppStackParamList>;

export const PatientListScreenStickyTabs = () => {
  const navigation = useNavigation<PatientListScreenNavigationProp>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [patients, setPatients] = useState<PatientFrontend[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [isRefreshingFromNavigation, setIsRefreshingFromNavigation] = useState(false);

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      console.log('🔑 Auth state:', { isAuthenticated, authLoading, userId: user?.id });
      
      if (!isAuthenticated) {
        console.log('❌ Not authenticated, skipping patient fetch');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const fetchedPatients = await ApiService.getPatients();
      console.log('✅ Patients fetched successfully:', fetchedPatients.length);
      
      // Show patients immediately with letter counts
      setPatients(fetchedPatients);
      setFilteredPatients(fetchedPatients);
      setHasInitialLoad(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      setError('Failed to load patients. Please try again.');
      setPatients([]);
      setFilteredPatients([]);
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (isAuthenticated) {
      // Haptic feedback for refresh
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRefreshing(true);
      try {
        await fetchPatients();
      } finally {
        setRefreshing(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Only fetch patients when authentication is complete and user is authenticated
    if (!authLoading && isAuthenticated) {
      console.log('🚀 Auth complete, fetching patients...');
      fetchPatients();
    } else if (!authLoading && !isAuthenticated) {
      console.log('❌ Auth failed, not fetching patients');
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  // Refresh data when screen comes into focus (only if needed)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && needsRefresh) {
        console.log('🔄 Screen focused, refreshing patients due to changes...');
        setIsRefreshingFromNavigation(true);
        fetchPatients().finally(() => {
          setIsRefreshingFromNavigation(false);
          setNeedsRefresh(false);
        });
      }
    }, [isAuthenticated, needsRefresh])
  );

  // Sort and filter patients with memoization
  const processedPatients = useMemo(() => {
    let filtered = [...patients];
    
    // Apply tab filter (pending vs completed) based on letter count
    if (activeTab === 'completed') {
      // Show patients who have generated letters
      filtered = filtered.filter(patient => (patient.letterCount || 0) > 0);
    } else {
      // Show patients who have NO letters (pending)
      filtered = filtered.filter(patient => (patient.letterCount || 0) === 0);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }
    
    // Sort based on tab
    if (activeTab === 'completed') {
      // Sort by most recent first (updatedAt descending)
      return filtered.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA; // Most recent first
      });
    } else {
      // Sort alphabetically by name for pending
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [patients, activeTab, searchQuery]);

  // Update filtered patients when processedPatients changes
  useEffect(() => {
    setFilteredPatients(processedPatients);
  }, [processedPatients]);

  // Handle tab change - immediately show appropriate patients
  const handleTabChange = useCallback((tab: 'pending' | 'completed') => {
    // Haptic feedback for tab change (fire and forget)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  // Optimistically update patient letter count when a letter is created
  const updatePatientLetterCount = useCallback((patientId: number, increment: number) => {
    setPatients(prev => prev.map(patient => 
      patient.id === patientId 
        ? { ...patient, letterCount: (patient.letterCount || 0) + increment }
        : patient
    ));
  }, []);

  // Mark that refresh is needed (called from PatientDetailScreen)
  const markNeedsRefresh = useCallback(() => {
    setNeedsRefresh(true);
  }, []);

  // Memoized navigation handler
  const handlePatientPress = useCallback((patient: PatientFrontend) => {
    // Haptic feedback for patient selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('PatientDetail', { 
      patientId: patient.id, 
      patient,
      onLetterCreated: () => {
        // Haptic feedback for letter creation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Optimistically update the letter count
        updatePatientLetterCount(patient.id, 1);
        // Mark that we need a refresh to get accurate data
        markNeedsRefresh();
      }
    });
  }, [navigation, updatePatientLetterCount, markNeedsRefresh]);

  // Memoized render function for better performance
  const renderPatientListItem = useCallback(({ item, index }: { item: PatientFrontend; index: number }) => {
    // Check if we should show a section header
    const showSectionHeader = index === 0 || 
      filteredPatients[index - 1].name.charAt(0).toUpperCase() !== item.name.charAt(0).toUpperCase();

    return (
      <View key={item.id}>
        {showSectionHeader && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <PatientListItem
          patient={item}
          onPress={handlePatientPress}
          showCompletedIcon={activeTab === 'completed'}
        />
      </View>
    );
  }, [filteredPatients, handlePatientPress]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: PatientFrontend) => item.id.toString(), []);

  // Memoized getItemLayout for better FlatList performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Approximate item height
    offset: 80 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable Header Content */}
      <ScrollView 
        style={styles.headerScrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.doctorName}>
            {user ? 
              (user.firstName && user.lastName && user.firstName !== 'Unknown' && user.lastName !== 'User' ? 
                `${user.firstName} ${user.lastName}` : 
                user.fullName && user.fullName !== 'Unknown User' ? user.fullName : 
                user.email ? user.email.split('@')[0] : 'User') : 
              'User'
            }
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (isAuthenticated) {
                fetchPatients();
              }
            }}
          >
            <Ionicons name="refresh" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPatientOptions')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </ScrollView>

      {/* Sticky Tabs */}
      <View style={styles.stickyTabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => handleTabChange('pending')}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending
            </Text>
            <Text style={[styles.tabCountText, activeTab === 'pending' && styles.activeTabCountText]}>
              ({patients.filter(patient => (patient.letterCount || 0) === 0).length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => handleTabChange('completed')}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed
            </Text>
            <Text style={[styles.tabCountText, activeTab === 'completed' && styles.activeTabCountText]}>
              ({patients.filter(patient => (patient.letterCount || 0) > 0).length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Patient List */}
      {loading && !hasInitialLoad && (
        <PatientListSkeleton />
      )}

      {error && (
        <ErrorState
          title="Failed to Load Patients"
          message={error}
          actionText="Try Again"
          onAction={fetchPatients}
        />
      )}

      {!loading && !error && filteredPatients.length === 0 && searchQuery.trim() !== '' && (
        <SearchEmptyState
          searchQuery={searchQuery}
          actionText="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      )}

      {!loading && !error && filteredPatients.length === 0 && searchQuery.trim() === '' && (
        <EmptyState
          title={activeTab === 'pending' ? 'No Pending Patients' : 'No Completed Patients'}
          message={activeTab === 'pending' 
            ? 'All patients have been processed.' 
            : 'No patients have been completed yet.'
          }
          actionText="Pull down to refresh"
          onAction={onRefresh}
        />
      )}

      {filteredPatients.length > 0 && (
        <FlatList
          testID="patient-list"
          data={filteredPatients}
          renderItem={renderPatientListItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={styles.patientList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listViewContent}
          refreshing={refreshing || isRefreshingFromNavigation}
          onRefresh={onRefresh}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Navigation Refresh Indicator */}
      {isRefreshingFromNavigation && (
        <View style={styles.navigationRefreshIndicator}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.navigationRefreshText}>Updating patient data...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  headerScrollView: {
    maxHeight: 200, // Limit header height
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stickyTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#111827',
    fontWeight: '700',
  },
  tabCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabCountText: {
    color: '#374151',
    fontWeight: '600',
  },
  patientList: {
    flex: 1,
  },
  listViewContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  navigationRefreshIndicator: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    gap: 8,
  },
  navigationRefreshText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default PatientListScreenStickyTabs;
