import React, { useState, useEffect, useCallback } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../navigation/AppStackNavigator';

type PatientListScreenNavigationProp = StackNavigationProp<AppStackParamList>;

export const PatientListScreen = () => {
  const navigation = useNavigation<PatientListScreenNavigationProp>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [patients, setPatients] = useState<PatientFrontend[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientFrontend[]>([]);
  const [patientLetters, setPatientLetters] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      console.log('🔍 Starting to fetch patients...');
      console.log('🔑 Auth state:', { isAuthenticated, authLoading, userId: user?.id });
      
      if (!isAuthenticated) {
        console.log('❌ Not authenticated, skipping patient fetch');
        return;
      }
      
      setLoading(true);
      const fetchedPatients = await ApiService.getPatients();
      console.log('✅ Patients fetched successfully:', fetchedPatients.length);
      setPatients(fetchedPatients);
      setFilteredPatients(fetchedPatients);
      setError(null);
      
      // Fetch letters for all patients to determine completion status
      await fetchPatientLetters(fetchedPatients);
    } catch (err) {
      console.error('❌ Failed to fetch patients:', err);
      setError('Failed to load patients');
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (isAuthenticated) {
      setRefreshing(true);
      try {
        await fetchPatients();
      } finally {
        setRefreshing(false);
      }
    }
  }, [isAuthenticated]);

  // Fetch letters for all patients efficiently
  const fetchPatientLetters = async (patientList: PatientFrontend[]) => {
    try {
      console.log('📝 Starting to fetch patient letters...');
      console.log('👥 Number of patients:', patientList.length);
      console.log('🔑 Auth state in fetchPatientLetters:', { isAuthenticated, authLoading, userId: user?.id });
      
      if (!isAuthenticated) {
        console.log('❌ Not authenticated, skipping letter fetch');
        return;
      }
      
      const lettersMap: {[key: string]: any[]} = {};
      
      // Fetch all letters and organize by patient ID
      try {
        console.log('📤 Calling ApiService.getLetters()...');
        const allLetters = await ApiService.getLetters();
        console.log('📥 Letters response received:', allLetters);
        console.log('📊 Number of letters:', allLetters.length);
        
        // Group letters by patient ID
        allLetters.forEach(letter => {
          const patientId = letter.patientId.toString();
          if (!lettersMap[patientId]) {
            lettersMap[patientId] = [];
          }
          lettersMap[patientId].push(letter);
          console.log(`📋 Letter ${letter.id} assigned to patient ${patientId}`);
        });
        
        // Initialize empty arrays for patients with no letters
        patientList.forEach(patient => {
          if (!lettersMap[patient.id.toString()]) {
            lettersMap[patient.id.toString()] = [];
            console.log(`👤 Patient ${patient.id} (${patient.name}) has no letters`);
          } else {
            const letterCount = lettersMap[patient.id.toString()].length;
            console.log(`👤 Patient ${patient.id} (${patient.name}) has ${letterCount} letters`);
          }
        });
        
      } catch (err) {
        console.error('❌ Error fetching letters:', err);
        console.log('🔄 Initializing empty state for all patients');
        // Initialize empty arrays for all patients
        patientList.forEach(patient => {
          lettersMap[patient.id.toString()] = [];
        });
      }
      
      console.log('📊 Final letters map:', lettersMap);
      setPatientLetters(lettersMap);
      console.log('✅ Patient letters state updated');
      
    } catch (err) {
      console.error('❌ Failed to fetch patient letters:', err);
    }
  };

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

  // Refresh data when screen comes into focus (e.g., after creating a patient or generating a letter)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        console.log('🔄 Screen focused, refreshing patients and letters...');
        // Refresh both patients and letters to ensure new patients appear
        fetchPatients();
      }
    }, [isAuthenticated])
  );

  // Sort and filter patients
  useEffect(() => {
    let processedPatients = [...patients];
    
    // Apply tab filter (pending vs completed) based on letter status
    if (activeTab === 'completed') {
      // Show patients who have generated letters
      processedPatients = processedPatients.filter(patient => {
        const patientLettersList = patientLetters[patient.id.toString()] || [];
        return patientLettersList.length > 0;
      });
    } else {
      // Show patients who have NO letters (pending)
      processedPatients = processedPatients.filter(patient => {
        const patientLettersList = patientLetters[patient.id.toString()] || [];
        return patientLettersList.length === 0;
      });
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      processedPatients = processedPatients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    processedPatients.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    
    setFilteredPatients(processedPatients);
  }, [searchQuery, patients, sortOrder, activeTab, patientLetters]);



  const renderPatientListItem = ({ item, index }: { item: PatientFrontend; index: number }) => {
    // Generate initials from name
    const initials = item.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Check if we should show a section header
    const showSectionHeader = index === 0 || 
      (index > 0 && filteredPatients[index - 1].name.charAt(0).toUpperCase() !== item.name.charAt(0).toUpperCase());

    // Get letter status for this patient
    const patientLettersList = patientLetters[item.id.toString()] || [];
    const hasLetters = patientLettersList.length > 0;

    return (
      <>
        {showSectionHeader && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <TouchableOpacity 
          testID={`patient-item-${index}`}
          style={styles.patientListItem}
          onPress={() => {
            console.log('🔍 Navigating to PatientDetail with:', { patientId: item.id, patient: item });
            navigation.navigate('PatientDetail', { patientId: item.id, patient: item });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.listItemContent}>
            <View style={styles.listAvatar}>
              <Text style={styles.listAvatarText}>{initials}</Text>
            </View>
            
            <View style={styles.listInfoSection}>
              <Text style={styles.listPatientName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.listMRNumber}>MR #{item.id}</Text>
            </View>
            
            <View style={styles.listStatusSection}>
              {/* Simple green tick for patients with letters */}
              {hasLetters && (
                <View testID="completed-patient-checkmark" style={styles.greenTick}>
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                </View>
              )}
            </View>
            
            <View style={styles.listArrowSection}>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.doctorName}>Dr. Rizwan</Text>
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
          
          {/* Sort Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <Ionicons 
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
          
          {/* Add Patient Button */}
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPatientOptions')}
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
          onPress={() => setActiveTab('pending')}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending
            </Text>
            <Text style={[styles.tabCountText, activeTab === 'pending' && styles.activeTabCountText]}>
              ({patients.filter(patient => {
                const patientLettersList = patientLetters[patient.id.toString()] || [];
                return patientLettersList.length === 0;
              }).length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed
            </Text>
            <Text style={[styles.tabCountText, activeTab === 'completed' && styles.activeTabCountText]}>
              ({patients.filter(patient => {
                const patientLettersList = patientLetters[patient.id.toString()] || [];
                return patientLettersList.length > 0;
              }).length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>



      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              // Refetch patients
              fetchPatients();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Patient List */}
      {!loading && !error && (
        <>
          {activeTab === 'completed' && filteredPatients.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Completed Patients</Text>
              <Text style={styles.emptyStateText}>
                Patients will appear here once you generate letters for them{'\n'}
                Pull down to refresh or use the refresh button above
              </Text>
            </View>
          ) : activeTab === 'pending' && filteredPatients.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="people-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Pending Patients</Text>
              <Text style={styles.emptyStateText}>
                All patients have been completed! 🎉{'\n'}
                Great job on your rounds today{'\n'}
                Pull down to refresh or use the refresh button above
              </Text>
            </View>
          ) : (
            <FlatList
              testID="patient-list"
              data={filteredPatients}
              renderItem={renderPatientListItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.patientList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listViewContent}
              refreshing={refreshing}
              onRefresh={onRefresh}
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
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '600',
  },
  tabCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabCountText: {
    color: '#6B7280',
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