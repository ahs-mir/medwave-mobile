import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LetterService from '../services/LetterService';
import ApiService from '../services/ApiService';
import { LetterFrontend } from '../types';
import { AppStackParamList } from '../navigation/AppStackNavigator';
import { LettersListSkeleton } from '../components/LettersListSkeleton';
import * as Haptics from 'expo-haptics';

export const LettersScreen = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { user, isAuthenticated } = useAuth();
  const [letters, setLetters] = useState<LetterFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'created' | 'approved' | 'posted'>('all');
  const [sortBy, setSortBy] = useState<'dateCreated' | 'dateUpdated' | 'patientName'>('dateCreated');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter and sort letters
  const filteredLetters = useMemo(() => {
    let filtered = selectedFilter === 'all' ? letters : letters.filter(letter => letter.status === selectedFilter);
    
    // Sort the filtered letters
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'patientName':
          aValue = (a.patientName || a.patient_name || 'Unknown Patient').toLowerCase();
          bValue = (b.patientName || b.patient_name || 'Unknown Patient').toLowerCase();
          break;
        case 'dateUpdated':
          aValue = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at);
          bValue = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at);
          break;
        case 'dateCreated':
        default:
          aValue = new Date(a.createdAt || a.created_at);
          bValue = new Date(b.createdAt || b.created_at);
          break;
      }
      
      if (sortBy === 'patientName') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
      }
    });
    
    return filtered;
  }, [letters, selectedFilter, sortBy, sortOrder]);

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
        // Use ApiService instead of direct fetch
        const fetchedLetters = await ApiService.getLetters();
        
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

  // Refresh letters when screen comes into focus (e.g., after deleting a letter)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user) {
        console.log('🔄 Screen focused - refreshing letters list');
        fetchLetters();
      }
    }, [isAuthenticated, user])
  );

  const onRefresh = () => {
    // Haptic feedback for refresh
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchLetters();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6B7280';
      case 'created': return '#6B7280';
      case 'approved': return '#3B82F6';
      case 'posted': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'draft': return '#F9FAFB';
      case 'created': return '#F9FAFB';
      case 'approved': return '#EFF6FF';
      case 'posted': return '#F0FDF4';
      default: return '#F9FAFB';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'draft': return '#E5E7EB';
      case 'created': return '#E5E7EB';
      case 'approved': return '#DBEAFE';
      case 'posted': return '#BBF7D0';
      default: return '#E5E7EB';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'created': return 'Draft';
      case 'approved': return 'Approved';
      case 'posted': return 'Posted';
      default: return 'Draft';
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
    if (!type) return 'Consultation Letter (With Headings)';
    
    // Handle specific letter types
    switch (type.toLowerCase()) {
      case 'clinical':
        return 'Clinical Letter';
      case 'consultation':
        return 'Consultation Letter (With Headings)';
      case 'consultation-paragraph':
        return 'Consultation (Paragraphs Only)';
      case 'referral':
        return 'Referral Letter';
      case 'discharge':
        return 'Discharge Summary';
      case 'custom':
        return 'Custom Letter';
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
    const letterType = item.type || 'Consultation Letter (With Headings)';

    // Clean up patient name
    if (patientName === 'Unknown Patient' && patientId) {
      patientName = `Patient #${patientId}`;
    }


    return (
      <TouchableOpacity 
        style={styles.letterListItem}
        onPress={() => {
          // Haptic feedback for letter selection
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            <View style={styles.listHeaderRow}>
              <Text style={styles.listPatientName} numberOfLines={1}>
                {patientName}
              </Text>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusBackgroundColor(status),
                  borderColor: getStatusBorderColor(status),
                }
              ]}>
                <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                  {getStatusText(status)}
                </Text>
              </View>
            </View>
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
    return <LettersListSkeleton />;
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
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedFilter(filter.key as any);
                    }}
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Letters</Text>
            <Text style={styles.subtitle}>{getLetterCountText(filteredLetters.length)}</Text>
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(true)}
          >
            <Ionicons name="options-outline" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(filter.key as any);
              }}
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

      {/* Sort/Filter Modal */}
      <Modal
        visible={showSortMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort & Filter</Text>
              <TouchableOpacity
                onPress={() => setShowSortMenu(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Sort Options */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Sort by</Text>
              {[
                { key: 'dateCreated', label: 'Date Created' },
                { key: 'dateUpdated', label: 'Date Updated' },
                { key: 'patientName', label: 'Patient Name' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.modalOption}
                  onPress={() => {
                    setSortBy(option.key as any);
                    setShowSortMenu(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {sortBy === option.key && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Order */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Order</Text>
              {[
                { key: 'desc', label: sortBy === 'patientName' ? 'Z to A' : 'Newest First' },
                { key: 'asc', label: sortBy === 'patientName' ? 'A to Z' : 'Oldest First' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.modalOption}
                  onPress={() => {
                    setSortOrder(option.key as any);
                    setShowSortMenu(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {sortOrder === option.key && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sortButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listPatientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
});