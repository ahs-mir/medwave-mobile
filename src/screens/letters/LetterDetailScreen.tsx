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
  const [patientDetails, setPatientDetails] = useState<PatientFrontend | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Fetch patient details on component mount
  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (letter.patientId) {
        try {
          const apiService = new ApiService();
          const patient = await apiService.getPatient(letter.patientId);
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
      month: 'long',
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
            // TODO: Implement approve functionality
            Alert.alert('Success', 'Letter approved successfully');
          }
        }
      ]
    );
  };

  const handleEdit = () => {
    // TODO: Navigate to edit screen
    Alert.alert('Edit', 'Edit functionality coming soon');
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
            // TODO: Implement post functionality
            Alert.alert('Success', 'Letter posted successfully');
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
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          {/* Title Row: Patient Name + Status Badge */}
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {patientName}
            </Text>
            <View style={[
              styles.compactStatusBadge,
              { 
                backgroundColor: getStatusBackgroundColor(letter.status),
                borderColor: getStatusBorderColor(letter.status)
              }
            ]}>
              <Text style={[styles.compactStatusText, { color: getStatusColor(letter.status) }]}>
                {getStatusText(letter.status)}
              </Text>
            </View>
          </View>
          
          {/* Subtitle Row: Type + Metadata */}
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerSubtitle}>
              {formatLetterType(letter.type)}
            </Text>
            <Text style={styles.headerMetadataSeparator}>•</Text>
            <Text style={styles.headerMetadataText}>
              Created {formatDate(letter.createdAt)}
            </Text>
            {letter.updatedAt !== letter.createdAt && (
              <>
                <Text style={styles.headerMetadataSeparator}>•</Text>
                <Text style={styles.headerMetadataText}>
                  Updated {formatDate(letter.updatedAt)}
                </Text>
              </>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowOverflowMenu(!showOverflowMenu)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
        
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
      </View>


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
            {/* Always show Edit button - Secondary */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color="#6B7280" />
              <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
            </TouchableOpacity>
            
            {/* Show Approve button only for draft letters - Primary */}
            {(letter.status === 'draft' || letter.status === 'created') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Approve</Text>
              </TouchableOpacity>
            )}
            
            {/* Show Post button only for approved letters - Primary */}
            {letter.status === 'approved' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.postButton]}
                onPress={handlePost}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Post</Text>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    minHeight: 60,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8, // mb-2 equivalent
  },
  headerTitle: {
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: '#111827',
    marginRight: 8,
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 20, // h-5 equivalent
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16, // gap-x-4 equivalent (16px = 4 * 4)
  },
  headerSubtitle: {
    fontSize: 12, // text-xs
    color: '#6B7280', // text-gray-500
    fontWeight: '500',
  },
  headerMetadataText: {
    fontSize: 12, // text-xs
    color: '#6B7280', // text-gray-500
    fontWeight: '400',
  },
  headerMetadataSeparator: {
    fontSize: 12, // text-xs
    color: '#6B7280', // text-gray-500
    marginHorizontal: 0, // gap handles spacing
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
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
    top: '100%',
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
    paddingHorizontal: 16, // px-4 safe padding like medical apps
    paddingVertical: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  contentArea: {
    paddingVertical: 16,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  noContentText: {
    fontSize: 14, // text-sm
    color: '#9CA3AF', // text-gray-400
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
  },
  htmlContent: {
    fontSize: 14, // text-sm
    lineHeight: 22, // leading-relaxed
    color: '#374151', // text-gray-700
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
    paddingVertical: 14, // Taller buttons
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48, // Consistent height
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Primary buttons (filled)
  approveButton: {
    backgroundColor: '#10B981', // Green primary
    borderColor: '#10B981',
  },
  postButton: {
    backgroundColor: '#3B82F6', // Blue primary
    borderColor: '#3B82F6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  // Secondary buttons (outlined)
  editButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  editButtonText: {
    color: '#6B7280',
  },
});
