import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  StatusBar,
  SafeAreaView,
  InputAccessoryView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/ApiService';
import AudioService from '../../services/AudioService';
import WhisperService from '../../services/WhisperService';
import GPTService from '../../services/GPTService';
import LetterService from '../../services/LetterService';
import PatientStateService from '../../services/PatientStateService';
import ClinicalLetterModal from '../../components/ClinicalLetterModal';
import RenderHtml from 'react-native-render-html';
import * as Speech from 'expo-speech';

export const PatientDetailScreen = React.memo(({ navigation, route }: any) => {
  // Get route params and safe area insets
  const { patient } = route.params || {};
  
  // Debug logging
  console.log('🔍 PatientDetailScreen - Route params:', route.params);
  console.log('🔍 PatientDetailScreen - Patient data:', patient);
  console.log('🔍 PatientDetailScreen - Navigation object:', navigation);
  
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  
  // All state hooks
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [clinicalLetter, setClinicalLetter] = useState('');
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [inputMode, setInputMode] = useState<'recording' | 'typing'>('typing');
  const [voiceTypingText, setVoiceTypingText] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showImprovePreview, setShowImprovePreview] = useState(false);
  const [improvedText, setImprovedText] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showLetterTypeModal, setShowLetterTypeModal] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedReferralType, setSelectedReferralType] = useState<string>('');
  const [showReferralSelection, setShowReferralSelection] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [showGeneratedLetter, setShowGeneratedLetter] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLetterType, setSelectedLetterType] = useState<string>('');
  const [patientLetters, setPatientLetters] = useState<any[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  const [recordingPulse, setRecordingPulse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);


  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const inputAccessoryViewID = 'notesAccessory';

  // Check if patient data exists and is valid
  if (!patient || !patient.id || !patient.name) {
    console.error('❌ PatientDetailScreen - Invalid patient data:', patient);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorFallback}>
          <Text style={styles.errorFallbackText}>Invalid patient data</Text>
          <Text style={styles.errorFallbackSubtext}>
            {JSON.stringify(route.params, null, 2)}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Helper function to format letter type with proper capitalization
  const formatLetterType = (type: string): string => {
    if (!type) return 'Letter';
    
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

  // Fetch patient letters when component mounts or auth changes
  const fetchPatientLetters = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        setPatientLetters([]);
        return;
      }
      
      setLoadingLetters(true);
      const letters = await ApiService.getLetters();
      
      const patientLettersList = letters.filter((letter: any) => 
        letter.patientId.toString() === patient.id.toString()
      );
      
      setPatientLetters(patientLettersList);
    } catch (error) {
      console.error('Failed to fetch patient letters:', error);
      setPatientLetters([]);
    } finally {
      setLoadingLetters(false);
    }
  }, [patient.id, isAuthenticated]);

  // Load patient letters on mount
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchPatientLetters();
    }
  }, [fetchPatientLetters, authLoading, isAuthenticated]);

  // Handle recording
  const handleStartRecording = async () => {
    try {
      AudioService.resetRecording();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      await AudioService.startRecording();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      setIsTranscribing(true);
      
      const audioResult = await AudioService.stopRecording();
      if (audioResult.success && audioResult.filePath) {
        const transcriptionResult = await WhisperService.transcribeAudio(audioResult.filePath);
        if (transcriptionResult.success && transcriptionResult.text) {
          setTranscription(transcriptionResult.text);
        }
      }
      setIsTranscribing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to process recording');
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  // Helper function to ensure content has proper HTML formatting
  const ensureHtmlFormatting = (content: string): string => {
    if (!content.trim()) return content;
    
    // If content already has HTML tags, return as-is
    if (/<[^>]*>/.test(content)) {
      return content;
    }
    
    // If content is plain text, wrap it in paragraph tags
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    } else {
      return `<p>${content.trim()}</p>`;
    }
  };

  // Simple non-streaming letter generation using LetterService
  const generateLetterSimple = async (transcription: string, patientInfo: any, letterType: string, referralTo?: string): Promise<string> => {
    console.log('📝 Starting simple letter generation...');
    console.log('👤 Patient:', patientInfo.name);
    console.log('🎤 Transcription length:', transcription.length);
    
    try {
      // Use LetterService for reliable generation
      const result = await LetterService.generateAndSaveLetter(
        transcription,
        patientInfo,
        letterType,
        'medium'
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate letter');
      }
      
      console.log('✅ Letter generated successfully');
      
      // Return the generated content with proper HTML formatting
      const content = result.letter?.content || 'Letter generated successfully. Please check the Letters section to view it.';
      return ensureHtmlFormatting(content);
      
    } catch (error) {
      console.error('❌ Letter generation failed:', error);
      throw error;
    }
  };

  // Handle letter generation
  const handleGenerateLetter = async (letterType: string) => {
    console.log('🚀 Starting letter generation for type:', letterType);
    
    const currentText = inputMode === 'typing' ? voiceTypingText : transcription;
    console.log('📝 Current text length:', currentText.length);
    
    if (!currentText.trim()) {
      Alert.alert('No Content', 'Please add some text before generating a letter.');
      return;
    }
    
    if (letterType === 'referral') {
      setShowLetterTypeModal(false);
      setShowReferralSelection(true);
      return;
    }
    
    setShowLetterTypeModal(false);
    
    // Show loading state
    setIsGenerating(true);
    
    try {
      console.log('🔄 Calling generateLetterSimple...');
      const generatedContent = await generateLetterSimple(
        currentText,
        patient,
        letterType
      );
      
      console.log('✅ Letter generated successfully, length:', generatedContent.length);
      setSelectedLetterType(letterType);
      setGeneratedLetter(generatedContent);
      setShowGeneratedLetter(true);
    } catch (error) {
      console.error('❌ Letter generation failed:', error);
      Alert.alert('Error', `Failed to generate letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle referral selection
  const handleReferralSelection = async () => {
    if (!selectedReferralType) {
      Alert.alert('Selection Required', 'Please select who to refer to.');
      return;
    }
    
    const currentText = inputMode === 'typing' ? voiceTypingText : transcription;
    setShowReferralSelection(false);
    
    try {
      const generatedContent = await generateLetterSimple(
        currentText,
        patient,
        'referral'
      );
      
      setSelectedLetterType('referral');
      setGeneratedLetter(generatedContent);
      setShowGeneratedLetter(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate referral letter. Please try again.');
    }
  };

  // Handle letter press
  const handleLetterPress = (letter: any) => {
    navigation.navigate('LetterDetail', {
      letter: letter,
      patientName: patient.name
    });
  };

  // Handle letter deletion
  const handleDeleteLetter = async (letterId: number) => {
    try {
      const success = await LetterService.deleteLetter(letterId);
      
      if (success) {
        setPatientLetters(prev => prev.filter(letter => letter.id !== letterId));
      } else {
        Alert.alert('Error', 'Failed to delete letter. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete letter. Please try again.');
    }
  };

  const confirmDeleteLetter = (letterId: number, letterType: string) => {
    Alert.alert(
      'Delete Letter',
      `Are you sure you want to delete this ${letterType} letter?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteLetter(letterId)
        }
      ]
    );
  };

  // Update word and character count
  useEffect(() => {
    const words = transcription.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharacterCount(transcription.length);
  }, [transcription]);

  // Auto-save functionality
  useEffect(() => {
    if (transcription.trim() && !isRecording && !isTranscribing) {
      const timeoutId = setTimeout(() => {
        setIsAutoSaving(true);
        setTimeout(() => {
          setLastSaved(new Date());
          setIsAutoSaving(false);
        }, 1000);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [transcription, isRecording, isTranscribing]);

  // Critical cleanup on component unmount to prevent audio recording crashes
  useEffect(() => {
    return () => {
      // Cleanup timer - prevents memory leaks
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Cleanup audio recording - prevents shared_ptr crashes
      if (isRecording) {
        AudioService.stopRecording().catch(console.error);
      }
      
      // Reset audio service to clear any lingering references
      AudioService.resetRecording();
    };
  }, []); // Empty dependency array means this runs on unmount only

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSaved.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return lastSaved.toLocaleDateString();
  };

  const letterTypes = [
    // {
    //   id: 'clinical',
    //   title: 'Clinical Letter',
    //   description: 'Comprehensive clinical assessment',
    // },
    {
      id: 'consultation',
      title: 'Consultation Letter (With Headings)',
      description: 'Letter with section headings',
    },
    {
      id: 'consultation-paragraph',
      title: 'Consultation (Paragraphs Only)',
      description: 'Letter without section headings',
    },
    // {
    //   id: 'referral',
    //   title: 'Referral Letter',
    //   description: 'Referral to specialist',
    // },
    // {
    //   id: 'discharge',
    //   title: 'Discharge Summary',
    //   description: 'Comprehensive discharge summary',
    // },
    {
      id: 'custom',
      title: 'Custom Letter',
      description: 'Follow your instructions',
    },
  ];

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
          <Text style={styles.headerTitle}>{patient.name}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerDOB}>DOB: {new Date(patient.dob).toLocaleDateString()}</Text>
            <Text style={styles.headerMRN}>MR #: {patient.id}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </View>

      {/* Main Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Input Mode Selector */}
        <View style={styles.inputModeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'typing' && styles.modeButtonActive
            ]}
            onPress={() => setInputMode('typing')}
          >
            <Ionicons 
              name="create-outline" 
              size={18} 
              color={inputMode === 'typing' ? '#0F172A' : '#6B7280'} 
            />
            <Text style={[
              styles.modeButtonText,
              inputMode === 'typing' && styles.modeButtonTextActive
            ]}>
              Type
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'recording' && styles.modeButtonActive
            ]}
            onPress={() => setInputMode('recording')}
          >
            <Ionicons 
              name="mic-outline" 
              size={18} 
              color={inputMode === 'recording' ? '#0F172A' : '#6B7280'} 
            />
            <Text style={[
              styles.modeButtonText,
              inputMode === 'recording' && styles.modeButtonTextActive
            ]}>
              Voice
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Area */}
        <View style={styles.textInputWrapper}>
          <View style={styles.textInputArea}>
            <View style={[
              styles.chatGPTTextInput,
              { height: 160 },
              showValidationMessage && (!transcription.trim() && !voiceTypingText.trim()) && styles.textInputEmpty
            ]}>
              {inputMode === 'recording' ? (
                <View style={styles.voiceRecordingContent}>
                  <TouchableOpacity 
                    style={styles.voiceRecordButton}
                    onPress={isRecording ? handleStopRecording : handleStartRecording}
                  >
                    <Ionicons 
                      name={isRecording ? "stop-circle" : "mic"} 
                      size={48} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                  <Text style={styles.voiceRecordingText}>
                    {isRecording ? "Tap to stop recording" : "Tap to start recording"}
                  </Text>
                  {isRecording && (
                    <Text style={styles.recordingDuration}>
                      Recording... {recordingDuration}s
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <TextInput
                    ref={textInputRef}
                    style={styles.textInputInner}
                    placeholder="Type your clinical notes here..."
                    placeholderTextColor="#9CA3AF"
                    value={voiceTypingText}
                    onChangeText={setVoiceTypingText}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled
                    numberOfLines={8}
                  />
                  {showValidationMessage && (!transcription.trim() && !voiceTypingText.trim()) && (
                    <View style={styles.validationMessage}>
                      <Ionicons name="information-circle" size={16} color="#F59E0B" />
                      <Text style={styles.validationText}>Add clinical notes to generate a letter</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Existing Letters Section */}
        <View style={styles.existingLettersSection}>
          <View style={styles.existingLettersHeader}>
            <Text style={styles.existingLettersTitle}>
              Letters {patientLetters.length > 0 ? `(${patientLetters.length})` : ''}
            </Text>
          </View>
          
          {loadingLetters ? (
            <View style={styles.lettersLoadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.lettersLoadingText}>Loading letters...</Text>
            </View>
          ) : patientLetters.length > 0 ? (
            patientLetters.map((letter) => (
              <TouchableOpacity
                key={letter.id}
                style={styles.letterListItem}
                onPress={() => handleLetterPress(letter)}
                activeOpacity={0.7}
              >
                <View style={styles.letterInfoSection}>
                  <Text style={styles.letterTypeName}>
                    {formatLetterType(letter.type)}
                  </Text>
                  <View style={styles.letterMetaRow}>
                    <Text style={styles.letterDate}>
                      {new Date(letter.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.letterStatus}>
                      {letter.status || 'draft'}
                    </Text>
                  </View>
                </View>
                <View style={styles.letterActionsSection}>
                  <TouchableOpacity
                    style={styles.deleteButtonInline}
                    onPress={() => confirmDeleteLetter(letter.id, letter.type || 'Letter')}
                  >
                    <Ionicons name="trash-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.lettersEmptyContainer}>
              <Text style={styles.lettersEmptyText}>No letters yet</Text>
              <Text style={styles.lettersEmptySubtext}>Generate your first letter using the button below</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingActionButton}
        onPress={() => {
          const currentText = inputMode === 'typing' ? voiceTypingText : transcription;
          if (!currentText.trim()) {
            setShowValidationMessage(true);
            return;
          }
          setShowLetterTypeModal(true);
        }}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="document-text" size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      {/* Letter Type Selection Modal */}
      {showLetterTypeModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isGenerating ? 'Generating Letter...' : 'Select Letter Type'}
              </Text>
              <TouchableOpacity onPress={() => setShowLetterTypeModal(false)} disabled={isGenerating}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {isGenerating ? (
                <View style={styles.generatingContainer}>
                  <ActivityIndicator size="large" color="#000000" />
                  <Text style={styles.generatingText}>Generating your letter...</Text>
                  <Text style={styles.generatingSubtext}>This may take a few moments</Text>
                </View>
              ) : (
                letterTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.bottomSheetOption}
                    onPress={() => handleGenerateLetter(type.id)}
                  >
                    <View style={styles.bottomSheetOptionContent}>
                      <Text style={styles.bottomSheetOptionTitle}>{type.title}</Text>
                      <Text style={styles.bottomSheetOptionDescription}>{type.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Referral Selection Modal */}
      {showReferralSelection && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Referral Type</Text>
              <TouchableOpacity onPress={() => setShowReferralSelection(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>Choose who to refer {patient.name} to</Text>
              <View style={styles.referralTypesContainer}>
                {[
                  { id: 'cardiologist', title: 'Cardiologist', description: 'Heart specialist' },
                  { id: 'dermatologist', title: 'Dermatologist', description: 'Skin specialist' },
                  { id: 'neurologist', title: 'Neurologist', description: 'Brain and nervous system specialist' },
                  { id: 'orthopedist', title: 'Orthopedist', description: 'Bone and joint specialist' },
                  { id: 'psychiatrist', title: 'Psychiatrist', description: 'Mental health specialist' },
                ].map((specialist) => (
                  <TouchableOpacity
                    key={specialist.id}
                    style={[
                      styles.referralTypeCard,
                      selectedReferralType === specialist.id && styles.selectedReferralCard
                    ]}
                    onPress={() => setSelectedReferralType(specialist.id)}
                  >
                    <View style={styles.referralTypeHeader}>
                      <View style={styles.referralTypeIcon}>
                        <Ionicons 
                          name="medical-outline" 
                          size={20} 
                          color={selectedReferralType === specialist.id ? '#FFFFFF' : '#000000'} 
                        />
                      </View>
                      <View style={styles.referralTypeInfo}>
                        <Text style={[
                          styles.referralTypeTitle,
                          selectedReferralType === specialist.id && styles.selectedReferralText
                        ]}>
                          {specialist.title}
                        </Text>
                        <Text style={[
                          styles.referralTypeDescription,
                          selectedReferralType === specialist.id && styles.selectedReferralText
                        ]}>
                          {specialist.description}
                        </Text>
                      </View>
                      {selectedReferralType === specialist.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#000000" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleReferralSelection}
              >
                <Text style={styles.modalButtonTextPrimary}>Generate Referral</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Generated Letter Preview Modal */}
      {showGeneratedLetter && (
        <View style={styles.modalOverlay}>
          <View style={styles.letterPreviewModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Letter Preview</Text>
              <TouchableOpacity onPress={() => setShowGeneratedLetter(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.letterPreviewBody}>
              {generatedLetter.trim() ? (
                <RenderHtml
                  contentWidth={width - 48} // Account for modal padding
                  source={{ html: generatedLetter }}
                  baseStyle={styles.htmlContent}
                  tagsStyles={{
                    p: {
                      fontSize: 16,
                      lineHeight: 24,
                      color: '#111827',
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
                      color: '#111827',
                    },
                    i: {
                      fontStyle: 'italic',
                      color: '#111827',
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
                      color: '#111827',
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
                      color: '#111827',
                    }
                  }}
                />
              ) : (
                <View style={styles.emptyContentContainer}>
                  <Text style={styles.emptyContentText}>No letter content generated</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowGeneratedLetter(false);
                  PatientStateService.markPatientUpdated(patient.id);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Clinical Letter Modal */}
      <ClinicalLetterModal
        visible={showLetterModal}
        onClose={() => setShowLetterModal(false)}
        generatedLetter={clinicalLetter}
        patientName={patient.name}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerInfo: {
    marginTop: 4,
    alignItems: 'center',
  },
  headerDOB: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  headerMRN: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  inputModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginBottom: 32,
    overflow: 'hidden',
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  modeButtonTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  textInputArea: {
    flex: 1,
    paddingVertical: 0,
  },
  chatGPTTextInput: {
    fontSize: 16,
    color: '#111827',
    padding: 16,
    minHeight: 160,
    textAlignVertical: 'top',
    lineHeight: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  textInputEmpty: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  textInputInner: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  validationText: {
    fontSize: 13,
    color: '#991B1B',
    marginLeft: 8,
  },
  voiceRecordingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  voiceRecordButton: {
    backgroundColor: '#0F172A',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  voiceRecordingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  recordingDuration: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '400',
    textAlign: 'center',
  },
  existingLettersSection: {
    marginTop: 24,
    marginBottom: 120,
  },
  existingLettersHeader: {
    marginBottom: 12,
  },
  existingLettersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  lettersLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  lettersLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  lettersEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  lettersEmptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  lettersEmptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  letterListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  letterInfoSection: {
    flex: 1,
  },
  letterTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  letterDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  letterStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  letterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  letterActionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButtonInline: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    height: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  letterPreviewModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    height: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 16,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  letterPreviewBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButtonPrimary: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  bottomSheetOptionContent: {
    flex: 1,
  },
  bottomSheetOptionTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  bottomSheetOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  referralTypesContainer: {
    gap: 12,
  },
  referralTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedReferralCard: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  referralTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  referralTypeIcon: {
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralTypeInfo: {
    flex: 1,
  },
  referralTypeTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  selectedReferralText: {
    color: '#000000',
  },
  referralTypeDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  errorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorFallbackText: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 20,
  },
  errorFallbackSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  generatingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  generatingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  htmlContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
    paddingHorizontal: 8,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContentText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});