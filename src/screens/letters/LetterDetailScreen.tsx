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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RenderHtml from 'react-native-render-html';
import { LetterFrontend } from '../../types';
import SimpleStreamingService from '../../services/SimpleStreamingService';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created':
        return '#10B981';
      case 'approved':
        return '#3B82F6';
      case 'posted':
        return '#8B5CF6';
      case 'draft':
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Letter Details</Text>
          <Text style={styles.headerSubtitle}>{patientName}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteLetter}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Letter Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{letter.type || 'Clinical Letter'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor(letter.status) }
                ]} 
              />
              <Text style={styles.statusText}>
                {getStatusText(letter.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(letter.createdAt)}</Text>
          </View>
          
          {letter.updatedAt !== letter.createdAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Updated:</Text>
              <Text style={styles.infoValue}>{formatDate(letter.updatedAt)}</Text>
            </View>
          )}
        </View>

        {/* Letter Content */}
        <View style={styles.contentCard}>
          <Text style={styles.contentTitle}>Letter Content</Text>
          <View style={styles.contentContainer}>
            {letter.content ? (
              <RenderHtml
                contentWidth={width - 64} // Account for padding and margins
                source={{ html: letter.content }}
                baseStyle={styles.htmlContent}
                tagsStyles={{
                  p: {
                    fontSize: 16,
                    lineHeight: 24,
                    color: '#374151',
                    marginBottom: 16,
                    marginTop: 8,
                  },
                  h1: {
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: 16,
                    marginTop: 24,
                    lineHeight: 32,
                  },
                  h2: {
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: 12,
                    marginTop: 20,
                    lineHeight: 28,
                  },
                  h3: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: 12,
                    marginTop: 16,
                    lineHeight: 26,
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
                  ul: {
                    marginLeft: 20,
                    marginBottom: 16,
                  },
                  ol: {
                    marginLeft: 20,
                    marginBottom: 16,
                  },
                  li: {
                    fontSize: 16,
                    lineHeight: 24,
                    color: '#374151',
                    marginBottom: 8,
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
              <Text style={styles.contentText}>No content available</Text>
            )}
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  contentContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  htmlContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
});
