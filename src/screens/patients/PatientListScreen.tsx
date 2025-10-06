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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/ApiService';
import { PatientFrontend } from '../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppStackParamList } from '../../navigation/AppStackNavigator';
import { MainTabParamList } from '../../navigation/MainTabNavigator';
import { PatientListSkeleton } from '../../components/PatientListSkeleton';
import { PatientListItem } from '../../components/PatientListItem';
import { LoadingSpinner, EmptyState, ErrorState, SearchEmptyState } from '../../components/LoadingStates';
import PatientStateService from '../../services/PatientStateService';
import * as Haptics from 'expo-haptics';

type PatientListScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<AppStackParamList>
>;

export const PatientListScreen = () => {
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
  const [isRefreshingFromNavigation, setIsRefreshingFromNavigation] = useState(false);
  const lastFetchTimeRef = useRef<number>(0);
  

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
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
      
      // Filter patients based on current tab using letter counts from API
      const filteredByTab = fetchedPatients.filter(patient => {
        if (activeTab === 'completed') {
          return (patient.letterCount || 0) > 0;
        } else {
          return (patient.letterCount || 0) === 0;
        }
      });
      
      setFilteredPatients(filteredByTab);
      setHasInitialLoad(true);
      lastFetchTimeRef.current = Date.now();
      setLoading(false);
    } catch (err) {
      console.error('❌ Failed to fetch patients:', err);
      setError('Failed to load patients');
      setPatients([]);
      setFilteredPatients([]);
      setLoading(false);
    }
  }, [isAuthenticated, activeTab]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (isAuthenticated) {
      // Haptic feedback for refresh (fire and forget)
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
    if (!authLoading && isAuthenticated && !hasInitialLoad) {
      console.log('🚀 Auth complete, fetching patients...');
      fetchPatients();
    } else if (!authLoading && !isAuthenticated) {
      console.log('❌ Auth failed, not fetching patients');
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, hasInitialLoad, fetchPatients]);

  // Refresh data when screen comes into focus (only after initial load)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && hasInitialLoad) {
        // Only fetch if PatientStateService indicates we need refresh or data is stale
        const needsRefreshFromService = PatientStateService.shouldRefreshList();
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        const isStale = timeSinceLastFetch > 5 * 60 * 1000; // 5 minutes
        
        if (needsRefreshFromService || isStale) {
          setIsRefreshingFromNavigation(true);
          fetchPatients().finally(() => {
            setIsRefreshingFromNavigation(false);
            PatientStateService.clearRefreshFlag();
          });
        }
      }
    }, [isAuthenticated, hasInitialLoad, fetchPatients])
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
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting (alphabetically ascending)
    filtered.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    return filtered;
  }, [searchQuery, patients, activeTab]);

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




  // Memoized callback for letter creation
  const createLetterCreatedCallback = useCallback((patientId: number) => {
    return () => {
      // Haptic feedback for letter creation (fire and forget)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Optimistically update the letter count
      updatePatientLetterCount(patientId, 1);
      // Mark that we need a refresh to get accurate data
      PatientStateService.markPatientUpdated(patientId.toString());
    };
  }, [updatePatientLetterCount]);

  // Memoized navigation handler
  const handlePatientPress = useCallback((patient: PatientFrontend) => {
    // Haptic feedback for patient selection (fire and forget)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('PatientDetail', { 
      patientId: patient.id, 
      patient,
      onLetterCreated: createLetterCreatedCallback(patient.id)
    });
  }, [navigation, createLetterCreatedCallback]);

  // Memoized render function for better performance
  const renderPatientListItem = useCallback(({ item, index }: { item: PatientFrontend; index: number }) => {
    // Check if we should show a section header
    const showSectionHeader = index === 0 || 
      (index > 0 && filteredPatients[index - 1].name.charAt(0).toUpperCase() !== item.name.charAt(0).toUpperCase());

    // Get letter status for this patient using letterCount from API
    const hasLetters = (item.letterCount || 0) > 0;

    return (
      <PatientListItem
        patient={item}
        index={index}
        hasLetters={hasLetters}
        showSectionHeader={showSectionHeader}
        onPress={handlePatientPress}
      />
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.doctorName}>
            {user?.fullName || user?.email?.split('@')[0] || 'User'}
          </Text>
        </View>
        <View style={styles.headerControls}>
          {/* Refresh Button */}
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
          
          
          {/* Add Patient Button */}
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => (navigation as any).navigate('AddPatient')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
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



      {/* Loading State - Show skeleton for initial load or navigation refresh */}
      {(loading && !hasInitialLoad) || (isRefreshingFromNavigation && hasInitialLoad) ? (
        <PatientListSkeleton />
      ) : null}

      {/* Error State */}
      {error && !loading && (
        <ErrorState 
          message={error}
          onRetry={() => {
            setError(null);
            fetchPatients();
          }}
        />
      )}

      {/* Patient List */}
      {!loading && !error && hasInitialLoad && !isRefreshingFromNavigation && (
        <>
          {/* Search Empty State */}
          {searchQuery.trim() !== '' && filteredPatients.length === 0 && (
            <SearchEmptyState 
              query={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          )}

          {/* Tab Empty States */}
          {searchQuery.trim() === '' && activeTab === 'completed' && filteredPatients.length === 0 && (
            <EmptyState
              icon="checkmark-circle-outline"
              title="No Completed Patients"
              message="Patients will appear here once you generate letters for them"
              actionText="Pull down to refresh"
              onAction={onRefresh}
            />
          )}

          {searchQuery.trim() === '' && activeTab === 'pending' && filteredPatients.length === 0 && (
            <EmptyState
              icon="people-outline"
              title="No Pending Patients"
              message="All patients have been completed! 🎉\nGreat job on your rounds today"
              actionText="Pull down to refresh"
              onAction={onRefresh}
            />
          )}

          {/* Patient List */}
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


        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    overflow: 'hidden',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },


  patientList: {
    flex: 1,
  },


  // List View Styles
  patientListItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 2,
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  listInfoSection: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listPatientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 1,
  },
  listMRNumber: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  listStatusSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    minWidth: 20,
  },
  greenTick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  listArrowSection: {
    marginLeft: 6,
  },
  listViewContent: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  lettersLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  lettersLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
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
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});