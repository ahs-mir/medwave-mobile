import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RenderHtml from 'react-native-render-html';
import { LetterFrontend, PatientFrontend } from '../../types';
import SimpleStreamingService from '../../services/SimpleStreamingService';
import ApiService from '../../services/ApiService';

interface LetterDetailScreenProps {
  navigation: any;
  route: {
    params: {
      letter: LetterFrontend;
      patientName?: string;
      patient?: any;
      letterId?: number;
    };
  };
}

export const LetterDetailScreen: React.FC<LetterDetailScreenProps> = ({ navigation, route }) => {
  const { letter: initialLetter, patientName: routePatientName, patient } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [letter, setLetter] = useState<LetterFrontend>(initialLetter);
  
  // Extract patient name from various sources
  const patientName = routePatientName || 
                      patient?.name || 
                      letter.patientName || 
                      letter.patient_name ||
                      'Unknown Patient';
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientFrontend | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const hasFetchedContent = useRef(false);

  // Fetch full letter content if it's missing
  useEffect(() => {
    const fetchLetterContent = async () => {
      // Only fetch once, and only if content is missing
      if (hasFetchedContent.current || letter.content || !letter.id) {
        return;
      }
      
      hasFetchedContent.current = true;
      setLoadingLetter(true);
      try {
        const fullLetter = await ApiService.getLetter(letter.id);
        setLetter(fullLetter);
      } catch (error) {
        console.error('Failed to fetch letter content:', error);
      } finally {
        setLoadingLetter(false);
      }
    };

    fetchLetterContent();
  }, [letter.id, letter.content]);

  // Fetch patient details on component mount
  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (letter.patientId) {
        try {
          const patient = await ApiService.getPatient(letter.patientId);
          setPatientDetails(patient);
        } catch (error) {
          console.error('Failed to fetch patient details:', error);
        } finally {
          setLoadingPatient(false);
        }
      } else {
        setLoadingPatient(false);
      }
    };

    fetchPatientDetails();
  }, [letter.patientId]);

  // Close overflow menu when component loses focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setShowOverflowMenu(false);
    });
    return unsubscribe;
  }, [navigation]);

  const handleDeleteLetter = async () => {
    Alert.alert(
      'Delete Letter',
      'Are you sure you want to delete this letter? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await SimpleStreamingService.deleteLetter(letter.id);
              if (success) {
                Alert.alert('Success', 'Letter deleted successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Error', 'Failed to delete letter. Please try again.');
              }
            } catch (error) {
              console.error('Delete letter error:', error);
              Alert.alert('Error', 'Failed to delete letter. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLetterType = (type: string) => {
    if (!type) return 'Consultation Letter';
    
    // Convert to title case
    return type
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#6B7280'; // Gray
      case 'created':
        return '#10B981'; // Green
      case 'approved':
        return '#3B82F6'; // Blue
      case 'posted':
        return '#10B981'; // Green
      default:
        return '#6B7280';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#F9FAFB'; // Lighter gray
      case 'created':
        return '#F0FDF4'; // Very light green
      case 'approved':
        return '#EFF6FF'; // Very light blue (bg-blue-50)
      case 'posted':
        return '#F0FDF4'; // Very light green
      default:
        return '#F9FAFB';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#E5E7EB'; // Gray border
      case 'created':
        return '#BBF7D0'; // Light green border
      case 'approved':
        return '#DBEAFE'; // Light blue border (border-blue-200)
      case 'posted':
        return '#BBF7D0'; // Light green border
      default:
        return '#E5E7EB';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return 'document-outline';
      case 'created':
        return 'checkmark-circle';
      case 'approved':
        return 'checkmark-done';
      case 'posted':
        return 'send';
      default:
        return 'document-outline';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Action handlers
  const handleApprove = async () => {
    Alert.alert(
      'Approve Letter',
      'Are you sure you want to approve this letter?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setIsApproving(true);
              const success = await ApiService.updateLetterStatus(letter.id, 'approved');
              if (success) {
                Alert.alert('Success', 'Letter approved successfully');
                // Update the letter status locally
                setLetter({ ...letter, status: 'approved' });
                // Navigate back to refresh the letters list
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to approve letter. Please try again.');
              }
            } catch (error) {
              console.error('Error approving letter:', error);
              Alert.alert('Error', 'Failed to approve letter. Please try again.');
            } finally {
              setIsApproving(false);
            }
          }
        }
      ]
    );
  };


  const handlePost = async () => {
    Alert.alert(
      'Post Letter',
      'Are you sure you want to post this letter?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: async () => {
            try {
              setIsPosting(true);
              const success = await ApiService.updateLetterStatus(letter.id, 'posted');
              if (success) {
                Alert.alert('Success', 'Letter posted successfully');
                // Update the letter status locally
                setLetter({ ...letter, status: 'posted' });
                // Navigate back to refresh the letters list
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to post letter. Please try again.');
              }
            } catch (error) {
              console.error('Error posting letter:', error);
              Alert.alert('Error', 'Failed to post letter. Please try again.');
            } finally {
              setIsPosting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {patientName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {formatLetterType(letter.type)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowOverflowMenu(!showOverflowMenu)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusMetadata}>
          Created {formatDate(letter.createdAt)}
        </Text>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: getStatusBackgroundColor(letter.status),
            borderColor: getStatusBorderColor(letter.status)
          }
        ]}>
          <Text style={[styles.statusText, { color: getStatusColor(letter.status) }]}>
            {getStatusText(letter.status)}
          </Text>
        </View>
      </View>
        
        {/* Overflow Menu */}
        {showOverflowMenu && (
          <>
            <TouchableOpacity 
              style={styles.menuBackdrop} 
              activeOpacity={1}
              onPress={() => setShowOverflowMenu(false)}
            />
            <View style={styles.overflowMenu}>
              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  handleDeleteLetter();
                }}
                disabled={isDeleting}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.overflowMenuText}>Delete Letter</Text>
                {isDeleting && <ActivityIndicator size="small" color="#EF4444" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            </View>
          </>
        )}

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        onScrollBeginDrag={() => setShowOverflowMenu(false)}
      >

        {/* Letter Content */}
        <View style={styles.contentArea}>
            {loadingLetter ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.loadingText}>Loading content...</Text>
              </View>
            ) : letter.content ? (
              <RenderHtml
                contentWidth={width - 64} // Account for px-4 safe padding
                source={{ html: letter.content }}
                baseStyle={styles.htmlContent}
                tagsStyles={{
                  p: { 
                    fontSize: 16,
                    color: '#374151',
                    lineHeight: 26,
                    marginBottom: 16,
                    letterSpacing: -0.1,
                  },
                  h1: { 
                    fontSize: 18,
                    fontWeight: '600',
                    marginBottom: 8,
                    color: '#111827',
                    marginTop: 24,
                    letterSpacing: -0.3,
                  },
                  h2: { 
                    fontSize: 17,
                    fontWeight: '600',
                    marginBottom: 8,
                    color: '#111827',
                    marginTop: 24,
                    letterSpacing: -0.3,
                  },
                  h3: { 
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 8,
                    color: '#111827',
                    marginTop: 20,
                    letterSpacing: -0.2,
                  },
                  strong: {
                    fontWeight: '600',
                    color: '#111827',
                  },
                  b: {
                    fontWeight: '600',
                    color: '#111827',
                  },
                  em: {
                    fontStyle: 'italic',
                    color: '#374151',
                  },
                  i: {
                    fontStyle: 'italic',
                    color: '#374151',
                  },
                  ul: { marginBottom: 16, paddingLeft: 20 },
                  ol: { marginBottom: 16, paddingLeft: 20 },
                  li: { 
                    marginBottom: 6,
                    fontSize: 16,
                    color: '#374151',
                    lineHeight: 26,
                    letterSpacing: -0.1,
                  },
                  br: {
                    marginBottom: 12,
                  },
                }}
                enableExperimentalMarginCollapsing={true}
                defaultTextProps={{
                  style: {
                    fontSize: 16,
                    lineHeight: 26,
                    color: '#374151',
                    letterSpacing: -0.1,
                  }
                }}
              />
            ) : (
              <Text style={styles.noContentText}>No content available</Text>
            )}
        </View>
      </ScrollView>

        {/* Fixed Bottom Action Bar */}
        <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.actionButtonContainer}>
            {/* Show Approve button only for draft letters - Primary */}
            {(letter.status === 'draft' || letter.status === 'created') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton, isApproving && styles.disabledButton]}
                onPress={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                )}
                <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                  {isApproving ? 'Approving...' : 'Approve'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Show Post button only for approved letters - Primary */}
            {letter.status === 'approved' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.postButton, isPosting && styles.disabledButton]}
                onPress={handlePost}
                disabled={isPosting}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
                <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                  {isPosting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    minHeight: 64,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
    marginLeft: 8,
    minWidth: 0, // Allow text to shrink
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 2,
    flexShrink: 1, // Allow text to shrink if needed
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusMetadata: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  overflowMenu: {
    position: 'absolute',
    top: 76, // Position just below the header (72px + 4px gap)
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
    zIndex: 1000,
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overflowMenuText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginBottom: 80, // Space for fixed bottom bar
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  contentArea: {
    paddingVertical: 0,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
  },
  noContentText: {
    fontSize: 14, // text-sm
    color: '#9CA3AF', // text-gray-400
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  htmlContent: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    letterSpacing: -0.1,
  },
  // Bottom Action Bar Styles
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionButtonContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 50,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  // Primary buttons (filled)
  approveButton: {
    backgroundColor: '#111827',
    borderWidth: 0,
  },
  postButton: {
    backgroundColor: '#111827',
    borderWidth: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
