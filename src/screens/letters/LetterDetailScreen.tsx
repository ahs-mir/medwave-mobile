import React, { useState, useEffect } from 'react';
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
      patientName: string;
    };
  };
}

export const LetterDetailScreen: React.FC<LetterDetailScreenProps> = ({ navigation, route }) => {
  const { letter, patientName } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientFrontend | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

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
                letter.status = 'approved';
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
                letter.status = 'posted';
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
          <Ionicons name="chevron-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {patientName}
          </Text>
          <Text style={styles.headerSubtitle}>
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
        <View style={styles.statusMetadataContainer}>
          <Text style={styles.statusMetadata}>
            Created {formatDate(letter.createdAt)}
          </Text>
          {letter.updatedAt !== letter.createdAt && (
            <Text style={styles.statusMetadata}>
              Updated {formatDate(letter.updatedAt)}
            </Text>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: getStatusBackgroundColor(letter.status),
            borderColor: getStatusBorderColor(letter.status)
          }
        ]}>
          <Ionicons 
            name={getStatusIcon(letter.status)} 
            size={16} 
            color={getStatusColor(letter.status)} 
            style={styles.statusIcon}
          />
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
            {letter.content ? (
              <RenderHtml
                contentWidth={width - 64} // Account for px-4 safe padding
                source={{ html: letter.content }}
                baseStyle={styles.htmlContent}
                tagsStyles={{
                  p: { 
                    fontSize: 14, // text-sm
                    color: '#374151', // text-gray-700
                    lineHeight: 22, // leading-relaxed
                    marginBottom: 12,
                  },
                  h1: { 
                    fontSize: 16, // text-base
                    fontWeight: '600', // font-semibold
                    marginBottom: 4, // mb-1
                    color: '#111827',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    paddingBottom: 8,
                    marginTop: 16,
                  },
                  h2: { 
                    fontSize: 16, // text-base
                    fontWeight: '600', // font-semibold
                    marginBottom: 4, // mb-1
                    color: '#111827',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    paddingBottom: 8,
                    marginTop: 16,
                  },
                  h3: { 
                    fontSize: 16, // text-base
                    fontWeight: '600', // font-semibold
                    marginBottom: 4, // mb-1
                    color: '#111827',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    paddingBottom: 8,
                    marginTop: 16,
                  },
                  strong: {
                    fontWeight: 'bold',
                    color: '#111827',
                  },
                  b: {
                    fontWeight: 'bold',
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
                  ul: { marginBottom: 12, paddingLeft: 16 },
                  ol: { marginBottom: 12, paddingLeft: 16 },
                  li: { 
                    marginBottom: 4,
                    fontSize: 14, // text-sm
                    color: '#374151', // text-gray-700
                    lineHeight: 22, // leading-relaxed
                  },
                  br: {
                    marginBottom: 8,
                  },
                }}
                enableExperimentalMarginCollapsing={true}
                defaultTextProps={{
                  style: {
                    fontSize: 16,
                    lineHeight: 24,
                    color: '#374151',
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 72,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
    marginLeft: 12,
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusMetadataContainer: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-start',
  },
  statusMetadata: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 18,
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
    paddingHorizontal: 20, // More generous padding
    paddingVertical: 20,
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
  htmlContent: {
    fontSize: 16, // text-base
    lineHeight: 24, // leading-relaxed
    color: '#2D3748', // text-gray-800
  },
  // Bottom Action Bar Styles
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16, // Taller buttons
    paddingHorizontal: 20,
    borderRadius: 12, // More rounded corners
    borderWidth: 1,
    minHeight: 52, // Consistent height
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Primary buttons (filled)
  approveButton: {
    backgroundColor: '#2C3E50', // Dark blue-grey primary
    borderColor: '#2C3E50',
  },
  postButton: {
    backgroundColor: '#2C3E50', // Dark blue-grey primary
    borderColor: '#2C3E50',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
