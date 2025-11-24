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
  Platform,
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
  BottomTabNavigationProp<MainTabParamList, 'Patients'>,
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
    
    // Apply sorting
    if (activeTab === 'completed') {
      // For completed tab, sort by most recent (updatedAt descending)
      filtered.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA; // Most recent first
      });
    } else {
      // For pending tab, sort alphabetically ascending
      filtered.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    
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
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.doctorName}>
              {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => (navigation as any).navigate('AddPatient')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => handleTabChange('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending
            </Text>
            <Text style={[styles.tabCount, activeTab === 'pending' && styles.activeTabCount]}>
              {patients.filter(patient => (patient.letterCount || 0) === 0).length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
            onPress={() => handleTabChange('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed
            </Text>
            <Text style={[styles.tabCount, activeTab === 'completed' && styles.activeTabCount]}>
              {patients.filter(patient => (patient.letterCount || 0) > 0).length}
            </Text>
          </TouchableOpacity>
        </View>
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
              message="Pull down to refresh"
              actionText=""
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
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  doctorName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    fontWeight: '400',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#000000',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabCount: {
    color: '#FFFFFF',
    opacity: 0.9,
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
    borderRadius: 0,
    padding: 20,
    marginBottom: 0,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  listInfoSection: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  listPatientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  listMRNumber: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listStatusSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    minWidth: 24,
  },
  greenTick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listArrowSection: {
    marginLeft: 0,
  },
  listViewContent: {
    paddingHorizontal: 0,
    paddingBottom: 40,
    paddingTop: 8,
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
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});