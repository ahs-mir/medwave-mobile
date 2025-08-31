import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LetterService from '../../services/LetterService';

export const LetterTypeSelectionScreen = ({ navigation, route }: any) => {
  const { patient, transcription } = route.params;
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const letterTypes = [
    {
      id: 'clinical',
      title: 'Clinical Letter',
      description: 'Generate a comprehensive clinical letter',
      icon: 'medical-outline',
    },
    {
      id: 'consultation',
      title: 'Consultation Letter',
      description: 'Create a consultation letter with detailed paragraphs',
      icon: 'document-text-outline',
    },
    {
      id: 'referral',
      title: 'Referral Letter',
      description: 'Generate a referral letter to another specialist',
      icon: 'clipboard-outline',
    },
    {
      id: 'discharge',
      title: 'Discharge Summary',
      description: 'Create a comprehensive discharge summary',
      icon: 'medical-outline',
    },
  ];

  const handleGenerateLetter = async () => {
    if (!selectedType) {
      Alert.alert('Selection Required', 'Please select a letter type.');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('📝 Generating letter type:', selectedType);
      console.log('👤 Patient:', patient.name);
      console.log('🎤 Transcription length:', transcription.length);

      // Generate letter using LetterService
      const result = await LetterService.generateAndSaveLetter(
        transcription,
        patient,
        selectedType,
        'medium'
      );

      if (result.success) {
        Alert.alert(
          'Letter Generated', 
          `${letterTypes.find(t => t.id === selectedType)?.title} has been generated successfully.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate letter. Please try again.');
      }
    } catch (error) {
      console.error('Letter generation error:', error);
      Alert.alert('Error', 'Failed to generate letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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
          <Ionicons name="chevron-back" size={24} color="#003087" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Generate Letter</Text>
          <Text style={styles.headerSubtitle}>Select letter type for {patient.name}</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Clinical Notes</Text>
          <Text style={styles.infoText} numberOfLines={3}>
            {transcription}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select Letter Type</Text>
        
        <View style={styles.letterTypesContainer}>
          {letterTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              testID={selectedType === type.id ? `${type.id}-letter-selected` : `${type.id}-letter`}
              style={[
                styles.letterTypeCard,
                selectedType === type.id && styles.selectedCard
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <View style={styles.letterTypeHeader}>
                <View style={[
                  styles.letterTypeIcon,
                  selectedType === type.id && styles.selectedIcon
                ]}>
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={selectedType === type.id ? '#FFFFFF' : '#003087'} 
                  />
                </View>
                <View style={styles.letterTypeInfo}>
                  <Text style={styles.letterTypeTitle}>{type.title}</Text>
                  <Text style={styles.letterTypeDescription}>{type.description}</Text>
                </View>
                {selectedType === type.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#003087" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.generateButton,
            !selectedType && styles.disabledButton
          ]}
          onPress={handleGenerateLetter}
          disabled={!selectedType || isGenerating}
        >
          {isGenerating ? (
            <Text style={styles.generateButtonText}>Generating...</Text>
          ) : (
            <Text style={styles.generateButtonText}>Generate Letter</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  letterTypesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  letterTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  selectedCard: {
    borderColor: '#003087',
    borderWidth: 2,
  },
  letterTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letterTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedIcon: {
    backgroundColor: '#003087',
  },
  letterTypeInfo: {
    flex: 1,
  },
  letterTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  letterTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#003087',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#003087',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
}); 