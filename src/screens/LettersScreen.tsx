import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LetterService from '../services/LetterService';
import ApiService from '../services/ApiService';
import { LetterFrontend } from '../types';
import { AppStackParamList } from '../navigation/AppStackNavigator';

export const LettersScreen = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { user, isAuthenticated } = useAuth();
  const [letters, setLetters] = useState<LetterFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'created' | 'approved' | 'posted'>('all');

  // Filter letters based on selected status
  const filteredLetters = useMemo(() => {
    if (selectedFilter === 'all') return letters;
    return letters.filter(letter => letter.status === selectedFilter);
  }, [letters, selectedFilter]);

  // Helper function to get letter count text
  const getLetterCountText = (count: number) => {
    return `${count} letter${count === 1 ? '' : 's'}`;
  };

  const fetchLetters = async () => {
    try {
      setError(null);
      console.log('📝 Fetching letters for user:', user?.id);
      console.log('🔐 Authentication state:', { isAuthenticated, user: !!user });
      
      // Ensure API service has the current token
      const token = await ApiService.getToken();
      console.log('🔑 Token from ApiService:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('❌ No token available for API calls');
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('🌐 Making API call to fetch letters...');
      console.log('👤 Current user details:', {
        id: user?.id,
        role: user?.role,
        email: user?.email,
        fullName: user?.fullName,
        firstName: user?.firstName,
        lastName: user?.lastName,
        doctorId: user?.doctorId
      });
      
      // Log the complete user object to see what we actually have
      console.log('🔍 Complete user object:', JSON.stringify(user, null, 2));
      
      // Check if user exists and has basic properties
      if (!user) {
        console.error('❌ No user object found!');
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Check if user has a role
      if (!user.role) {
        console.error('❌ User has no role!');
        setError('User role not defined. Please contact support.');
        setLoading(false);
        return;
      }
      
      // For now, let's try to get letters without doctorId restriction
      // We'll use the user's ID and role to determine access
      console.log('🔑 User role:', user.role, 'User ID:', user.id);
      
      console.log('👨‍⚕️ Fetching letters for doctor ID:', user.doctorId);
      
      try {
        console.log('🔍 Attempting to fetch letters using ApiService...');
        
        // Use ApiService instead of direct fetch
        const fetchedLetters = await ApiService.getLetters();
        console.log('📥 Letters from ApiService:', fetchedLetters);
        console.log('✅ Fetched letters successfully:', fetchedLetters.length);
        
        if (fetchedLetters.length > 0) {
          console.log('📄 Sample letter data:', fetchedLetters[0]);
          console.log('🔍 Letter field names:', Object.keys(fetchedLetters[0]));
          console.log('🔍 patientName value:', fetchedLetters[0].patientName);
        } else {
          console.log('📭 No letters found for this doctor');
        }
        
        setLetters(fetchedLetters);
        setError(null);
      } catch (fetchError) {
        console.error('❌ Error fetching letters:', fetchError);
        setError('Failed to fetch letters. Please try again.');
      }
    } catch (err) {
        console.error('❌ Failed to fetch letters:', err);
        console.error('❌ Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace'
        });
        
        // Provide more specific error messages
        let errorMessage = 'Failed to fetch letters';
        if (err instanceof Error) {
          if (err.message.includes('Network') || err.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection.';
          } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Authentication expired. Please log in again.';
          } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
            errorMessage = 'Server error. Please try again later.';
          } else if (err.message.includes('404') || err.message.includes('Not Found')) {
            errorMessage = 'Letters endpoint not found. Please contact support.';
          } else {
            errorMessage = `Error: ${err.message}`;
          }
        }
        
        // Add user-specific debugging info
        if (user?.role) {
          errorMessage += `\n\nDebug Info:\nUser Role: ${user.role}\nUser ID: ${user.id}`;
        }
        
        setError(errorMessage);
      } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('🔄 LettersScreen useEffect triggered:', { isAuthenticated, user: !!user, userId: user?.id });
    
    if (isAuthenticated && user) {
      console.log('✅ User authenticated, fetching letters...');
      fetchLetters();
    } else {
      console.log('❌ User not authenticated, setting error state');
      setLoading(false);
      setError('Please log in to view letters');
    }
  }, [isAuthenticated, user]);

  // Debug: Log the first letter to see the data structure
  useEffect(() => {
    if (letters.length > 0) {
      console.log('🔍 FIRST LETTER DATA STRUCTURE:', {
        id: letters[0].id,
        patientName: letters[0].patientName,
        patient_name: (letters[0] as any).patient_name,
        patientname: (letters[0] as any).patientname,
        status: letters[0].status,
        type: letters[0].type
      });
    }
  }, [letters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLetters();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#64748B';
      case 'created': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'posted': return '#0F172A';
      default: return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return 'create-outline';
      case 'created': return 'checkmark-circle-outline';
      case 'approved': return 'eye-outline';
      case 'posted': return 'paper-plane-outline';
      default: return 'document-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper function to format letter type with proper capitalization
  const formatLetterType = (type: string): string => {
    if (!type) return 'Clinical Letter';
    
    // Handle specific letter types
    switch (type.toLowerCase()) {
      case 'clinical':
        return 'Clinical Letter';
      case 'consultation':
        return 'Consultation Letter';
      case 'referral':
        return 'Referral Letter';
      case 'discharge':
        return 'Discharge Summary';
      case 'soap':
        return 'SOAP Note';
      default:
        // Capitalize first letter of each word
        return type.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
    }
  };

  const renderLetter = ({ item }: { item: any }) => {
    // Add safety checks for missing data
    if (!item) {
      console.error('❌ renderLetter: item is undefined or null');
      return null;
    }

    // Debug: Log the actual letter data structure
    console.log('🔍 Letter item data:', {
      id: item.id,
      patientName: item.patientName,
      patient_name: item.patient_name,
      patientname: item.patientname,
      patient: item.patient,
      patientId: item.patientId,
      patient_id: item.patient_id,
      patientid: item.patientid,
      status: item.status,
      type: item.type,
      // Log all keys to see what's actually available
      allKeys: Object.keys(item)
    });

    // Try multiple possible field names for patient name
    let patientName = item.patientName || 
                     item.patient_name || 
                     item.patientname ||
                     item.patient?.name || 
                     item.patient?.fullName ||
                     item.patient?.firstName + ' ' + item.patient?.lastName ||
                     'Unknown Patient';
    
    const patientId = item.patientId || item.patient_id || item.patientid || item.patient?.id;
    const status = item.status || 'unknown';
    const createdAt = item.createdAt || item.created_at || new Date().toISOString();
    const letterType = item.type || 'Clinical Letter';

    // Clean up patient name
    if (patientName === 'Unknown Patient' && patientId) {
      patientName = `Patient #${patientId}`;
    }

    console.log('🔍 Final patient name:', patientName);

    return (
      <TouchableOpacity 
        style={styles.letterListItem}
        onPress={() => {
          // Navigate to LetterDetail screen
          navigation.navigate('LetterDetail', {
            letter: item,
            patientName: patientName
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.listItemContent}>
          <View style={styles.listInfoSection}>
            <Text style={styles.listPatientName} numberOfLines={1}>
              {patientName}
            </Text>
            <Text style={styles.listLetterType}>{formatLetterType(letterType)}</Text>
            <Text style={styles.listDate}>{formatDate(createdAt)}</Text>
          </View>
          
          <View style={styles.listArrowSection}>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Letters</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading letters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Letters</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to Load Letters</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLetters}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

      if (filteredLetters.length === 0) {
        return (
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Letters</Text>
              <Text style={styles.subtitle}>{getLetterCountText(filteredLetters.length)}</Text>
            </View>

            {/* Filter Controls */}
            <View style={styles.filterContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {[
                  { key: 'all', label: 'All', count: letters.length },
                  { key: 'created', label: 'Draft', count: letters.filter(l => l.status === 'created').length },
                  { key: 'approved', label: 'Approved', count: letters.filter(l => l.status === 'approved').length },
                  { key: 'posted', label: 'Posted', count: letters.filter(l => l.status === 'posted').length }
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      selectedFilter === filter.key && styles.filterChipActive
                    ]}
                    onPress={() => setSelectedFilter(filter.key as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedFilter === filter.key && styles.filterChipTextActive
                    ]}>
                      {filter.label}
                    </Text>
                    <View style={[
                      styles.filterChipCount,
                      selectedFilter === filter.key && styles.filterChipCountActive
                    ]}>
                      <Text style={[
                        styles.filterChipCountText,
                        selectedFilter === filter.key && styles.filterChipCountTextActive
                      ]}>
                        {filter.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.content}>
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>
                  {selectedFilter === 'all' ? 'No Letters Yet' : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Letters`}
                </Text>
                <Text style={styles.emptyDescription}>
                  {selectedFilter === 'all' 
                    ? 'Clinical letters will appear here once they are created.\nThe backend is working but no letters exist yet.'
                    : `No letters with "${selectedFilter}" status found.\nTry selecting a different filter or check back later.`
                  }
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchLetters}>
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        );
      }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Letters</Text>
        <Text style={styles.subtitle}>{getLetterCountText(filteredLetters.length)}</Text>
      </View>

      {/* Filter Controls */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: 'All', count: letters.length },
            { key: 'created', label: 'Draft', count: letters.filter(l => l.status === 'created').length },
            { key: 'approved', label: 'Approved', count: letters.filter(l => l.status === 'approved').length },
            { key: 'posted', label: 'Posted', count: letters.filter(l => l.status === 'posted').length }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(filter.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.key && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.filterChipCount,
                selectedFilter === filter.key && styles.filterChipCountActive
              ]}>
                <Text style={[
                  styles.filterChipCountText,
                  selectedFilter === filter.key && styles.filterChipCountTextActive
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredLetters}
        renderItem={renderLetter}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.lettersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  lettersList: {
    paddingHorizontal: 0,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  letterListItem: {
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
  listInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  listPatientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 1,
  },
  listLetterType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 1,
  },
  listDate: {
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    minWidth: 45,
    justifyContent: 'center',
  },
  statusIcon: {
    marginRight: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  listArrowSection: {
    marginLeft: 6,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScrollContent: {
    alignItems: 'center',
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipCount: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipCountActive: {
    backgroundColor: '#475569',
  },
  filterChipCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  filterChipCountTextActive: {
    color: '#FFFFFF',
  },
});