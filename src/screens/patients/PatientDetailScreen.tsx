import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  Clipboard,
  InteractionManager,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/ApiService';
import GPTService from '../../services/GPTService';
import LetterService from '../../services/LetterService';
import { streamOpenAI } from '../../lib/openaiStream';
import { loadPrompt, replacePromptPlaceholders } from '../../config/aiPrompts';
import PatientStateService from '../../services/PatientStateService';
import ClinicalLetterModal from '../../components/ClinicalLetterModal';
import SimpleLetterDictation from '../../components/SimpleLetterDictation';
import RenderHtml from 'react-native-render-html';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

export const PatientDetailScreen = ({ navigation, route }: any) => {
  // Get route params and safe area insets
  const { patient, onLetterCreated } = route.params || {};
  
  
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  
  // All state hooks
  const [transcription, setTranscription] = useState('');
  const [clinicalLetter, setClinicalLetter] = useState('');
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [inputMode, setInputMode] = useState<'typing'>('typing');
  const [isImproving, setIsImproving] = useState(false);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showImprovePreview, setShowImprovePreview] = useState(false);
  const [improvedText, setImprovedText] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showLetterTypeSheet, setShowLetterTypeSheet] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedReferralType, setSelectedReferralType] = useState<string>('');
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [showReferralSelection, setShowReferralSelection] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [rawTranscription, setRawTranscription] = useState('');
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [currentLetterId, setCurrentLetterId] = useState<number | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    isVoice?: boolean;
  }>>([]);
  
  // Tab state for Create Letter / History
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [patientLetters, setPatientLetters] = useState<any[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [showGeneratedLetter, setShowGeneratedLetter] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLetterType, setSelectedLetterType] = useState<string>('consultation');
  const [consultationFormat, setConsultationFormat] = useState<'headings' | 'paragraphs'>('paragraphs');
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  const [recordingPulse, setRecordingPulse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const [showLetterPreviewModal, setShowLetterPreviewModal] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isLetterStreaming, setIsLetterStreaming] = useState(false);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  
  // Chat interface state
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai' | 'system';
    content: string;
    timestamp: Date;
    isVoice?: boolean;
    letterType?: string;
  }>>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [showSimpleLetterDictation, setShowSimpleLetterDictation] = useState(false);
  const [preGeneratedLetter, setPreGeneratedLetter] = useState<string>('');

  // Letter types configuration
  const letterTypes = [
    {
      id: 'consultation',
      title: 'Consultation',
      shortTitle: 'Consultation',
      description: 'Standard consultation letter',
      icon: 'document-text-outline',
    },
    {
      id: 'discharge',
      title: 'Discharge Summary',
      shortTitle: 'Discharge',
      description: 'Discharge summary letter',
      icon: 'exit-outline',
    },
    {
      id: 'custom',
      title: 'Custom Letter',
      shortTitle: 'Custom',
      description: 'Follow your instructions',
      icon: 'create-outline',
    },
  ];

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const chatFlatListRef = useRef<FlatList>(null);
  
  // Auto-scroll function using scrollToIndex (more reliable with getItemLayout)
  const scrollToBottom = () => {
    if (chatMessages.length === 0) {
      return;
    }
    
    
    // Use scrollToEnd for more reliable scrolling
    const attemptScroll = (delay = 0) => {
      setTimeout(() => {
        if (chatFlatListRef.current && chatFlatListRef.current.scrollToEnd) {
          try {
            chatFlatListRef.current.scrollToEnd({ animated: true });
          } catch (error) {
            // Silent error handling
          }
        }
      }, delay);
    };

    // Try multiple times with increasing delays for reliability
    attemptScroll(0);    // Immediate
    attemptScroll(100);  // 100ms delay
    attemptScroll(300);  // 300ms delay
    attemptScroll(500);  // 500ms delay
  };
  const inputAccessoryViewID = 'notesAccessory';

  // Auto-scroll when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      // Use InteractionManager for better timing
      InteractionManager.runAfterInteractions(() => {
        scrollToBottom();
      });
    }
  }, [chatMessages.length]);

  // Load existing letters as chat history when component mounts
  useEffect(() => {
    const loadExistingLetters = async () => {
      if (!patient?.id || !isAuthenticated) {
        return;
      }

      try {
        const existingLetters = await ApiService.getPatientLetters(patient.id);

        if (existingLetters.length > 0) {
          // Sort letters by creation date (newest first)
          const sortedLetters = existingLetters.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Convert letters to chat messages format
          const chatHistory: Array<{
            id: string;
            type: 'user' | 'ai' | 'system';
            content: string;
            timestamp: Date;
            isVoice?: boolean;
            letterType?: string;
          }> = [];

          // Add the most recent letter as chat history
          const mostRecentLetter = sortedLetters[0];
          
          // Add user dictation message (if we have raw transcription)
          if (mostRecentLetter.rawTranscription && mostRecentLetter.rawTranscription.trim()) {
            chatHistory.push({
              id: `dictation-${mostRecentLetter.id}`,
              type: 'user',
              content: mostRecentLetter.rawTranscription,
              timestamp: new Date(mostRecentLetter.createdAt),
              isVoice: true
            });
          } else {
            // Add a system message explaining this
            chatHistory.push({
              id: `no-transcription-${mostRecentLetter.id}`,
              type: 'system',
              content: 'Previous dictation not available (older letter format)',
              timestamp: new Date(mostRecentLetter.createdAt)
            });
          }

          // Add AI letter response
          chatHistory.push({
            id: `letter-${mostRecentLetter.id}`,
            type: 'ai',
            content: mostRecentLetter.content,
            timestamp: new Date(mostRecentLetter.createdAt),
            letterType: mostRecentLetter.type
          });

          // Add system message if there are multiple letters
          if (sortedLetters.length > 1) {
            chatHistory.unshift({
              id: `system-${patient.id}`,
              type: 'system',
              content: `Previous letters (${sortedLetters.length - 1} more)`,
              timestamp: new Date(mostRecentLetter.createdAt)
            });
          }

          setChatMessages(chatHistory);
          setShowChatInterface(true);
          
          // Set the current letter ID for potential updates
          setCurrentLetterId(mostRecentLetter.id);
          
        }
      } catch (error) {
        // Silent error handling
      }
    };

    loadExistingLetters();
  }, [patient?.id, isAuthenticated]);

  // Check if patient data exists and is valid
  if (!patient || !patient.id || !patient.name) {
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
      // case 'clinical':
      //   return 'Clinical Letter';
      case 'consultation':
        return 'Consultation Letter (With Headings)';
      case 'consultation-paragraph':
        return 'Consultation (Paragraphs Only)';
      // case 'referral':
      //   return 'Referral Letter';
      case 'discharge':
        return 'Discharge Summary';
      case 'custom':
        return 'Custom Letter';
      // case 'soap':
      //   return 'SOAP Note';
      default:
        // Capitalize first letter of each word
        return type.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
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

  // Save generated letter to backend
  const saveGeneratedLetter = async (content: string, letterType: string) => {
    try {
      setIsSavingLetter(true);
      
      // Create letter data
      const letterData = {
        patientId: typeof patient.id === 'string' ? parseInt(patient.id, 10) : patient.id,
        type: letterType,
        content: content,
        priority: 'medium' as const,
        notes: '',
        status: 'draft' as const,
        rawTranscription: rawTranscription
      };
      

      if (currentLetterId) {
        // Update existing letter (regenerate case)
        await ApiService.updateLetterContent(currentLetterId, content, rawTranscription);
      } else {
        // Create new letter (first generation case)
        const savedLetter = await ApiService.createLetter(letterData);
        
        if (savedLetter) {
          setCurrentLetterId(savedLetter.id);
        }
      }
      
      // Notify parent component that a letter was created/updated
      if (onLetterCreated && typeof onLetterCreated === 'function') {
        onLetterCreated();
      }
      
      // Show success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      
      // Show error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Optional: Show error message to user
      // You could add an error toast here
    } finally {
      setIsSavingLetter(false);
    }
  };

  // Streaming letter generation with real-time token display
  const generateLetterStreaming = async (transcription: string, patientInfo: any, letterType: string): Promise<(() => void) | undefined> => {
    
    try {
      setIsLetterStreaming(true);
      setGeneratedLetter('');
      setShowGeneratedLetter(false);

      // Add a placeholder AI message to the chat
      const aiMessageId = Date.now().toString();
      const placeholderMessage = {
        id: aiMessageId,
        type: 'ai' as const,
        content: '',
        timestamp: new Date(),
        isVoice: false,
        letterType,
      };
      setChatMessages(prev => [...prev, placeholderMessage]);

      // Haptic feedback for generation start
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Use configured prompts based on letter type - FIXED MAPPING
      let promptKey: string;
      switch (letterType) {
        case 'clinical':
          promptKey = 'clinical';
          break;
        case 'consultation':
          promptKey = 'consultation'; // ← FIXED: Use consultation.json
          break;
        case 'consultation-paragraph':
          promptKey = 'consultation-paragraph'; // ← FIXED: Use consultation-paragraph.json
          break;
        case 'referral':
          promptKey = 'referral'; // ← FIXED: Use referral.json
          break;
        case 'discharge':
          promptKey = 'discharge';
          break;
        case 'custom':
          promptKey = 'custom'; // ← FIXED: Use custom.json
          break;
        case 'soap':
          promptKey = 'soap';
          break;
        default:
          promptKey = 'generic'; // Fallback to generic
      }
      
      // Load the configured prompt
      let prompt: string;
      let systemRole: string;
      
      try {
        const promptConfig = await loadPrompt(promptKey);
        if (promptConfig) {
          // Use the configured prompt with patient info replacements
          const replacements = {
            patientName: patientInfo.name || 'Unknown Patient',
            patientMRN: patientInfo.medicalNumber || patientInfo.id || 'N/A',
            patientAge: patientInfo.age || 'N/A',
            patientCondition: patientInfo.condition || 'General consultation',
            currentDate: new Date().toLocaleDateString(),
            transcription: transcription || ''
          };
          prompt = replacePromptPlaceholders(promptConfig.userPrompt, replacements);
          systemRole = promptConfig.systemRole;
        } else {
          throw new Error('Failed to load prompt configuration');
        }
      } catch (error) {
        throw new Error('Failed to load prompt configuration. Please try again.');
      }
      
      // Start streaming
      const cancelStream = streamOpenAI({
        prompt,
        systemRole,
        onToken: (token: string) => {
          setChatMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: msg.content + token } : msg
            )
          );
        },
        onEnd: async () => {
          setIsLetterStreaming(false);
          
          // Haptic feedback for generation completion
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Finalize the generated letter content and save it
          setTimeout(async () => {
            setChatMessages(prev => {
              const finalMessages = [...prev];
              const finalMessage = finalMessages.find(msg => msg.id === aiMessageId);
              if (finalMessage) {
                setGeneratedLetter(finalMessage.content);
                setShowGeneratedLetter(true);
                
                // Save the generated letter to backend
                saveGeneratedLetter(finalMessage.content, letterType);
              }
              return finalMessages;
            });
          }, 100);
        },
        onError: (error: string) => {
          setIsLetterStreaming(false);
          setNetworkError('A network error occurred. Please check your connection and try again.');
        }
      });
      
      // Store cancel function for cleanup
      return cancelStream;
      
    } catch (error) {
      setIsLetterStreaming(false);
      const errorMessage = 'A network error occurred. Please check your connection and try again.';
      setNetworkError(errorMessage);
    }
  };

  // Simple non-streaming letter generation using LetterService (fallback)
  const generateLetterSimple = async (transcription: string, patientInfo: any, letterType: string, referralTo?: string): Promise<string> => {
    
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
      
      // Store the letter ID for regenerate functionality
      if (result.letter?.id) {
        setCurrentLetterId(result.letter.id);
      }
      
      // Notify parent component that a letter was created
      if (onLetterCreated && typeof onLetterCreated === 'function') {
        onLetterCreated();
      }
      
      // Haptic feedback for successful letter generation (fire and forget)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Return the generated content with proper HTML formatting
      const content = result.letter?.content || 'Letter generated successfully. Please check the Letters section to view it.';
      return ensureHtmlFormatting(content);
      
    } catch (error) {
      console.error('❌ Letter generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setNetworkError(errorMessage);
      setIsLetterStreaming(false);
      return 'Error: Failed to generate letter';
    }
  };


  // Save letter function
  const handleSaveLetter = async () => {
    if (!generatedLetter.trim()) {
      Alert.alert('No Letter', 'Please generate a letter before saving.');
      return;
    }

    try {
      // Update the existing letter with the generated content
      if (currentLetterId) {
        await ApiService.updateLetterContent(currentLetterId, generatedLetter, rawTranscription);
        Alert.alert('Success', 'Letter saved successfully!');
      } else {
        Alert.alert('Error', 'No letter to save. Please generate a letter first.');
      }
    } catch (error) {
      console.error('❌ Save failed:', error);
      Alert.alert('Error', 'Failed to save letter. Please try again.');
    }
  };

  // Add message to chat
  const addChatMessage = (type: 'user' | 'ai' | 'system', content: string, isVoice = false, letterType?: string) => {
    const newMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isVoice,
      letterType,
    };
    
    setChatMessages(prev => {
      const updated = [...prev, newMessage];
      console.log('📝 Added message to chat, total messages:', updated.length);
      return updated;
    });
    
    // Auto-scroll to bottom
    scrollToBottom();
  };


  // Handle sending user input
  const handleSendMessage = async () => {
    if (!currentInput.trim()) {
      Alert.alert('No Content', 'Please add some text before sending.');
      return;
    }

    // Haptic feedback for send action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add new message to conversation
    addChatMessage('user', currentInput.trim(), false);
    setShowChatInterface(true);
    
    // Store the input text for letter generation
    const inputText = currentInput.trim();
    
    // Add to raw transcription for letter generation
    setRawTranscription(prev => prev ? `${prev} ${inputText}` : inputText);
    
    // Clear input
    setCurrentInput('');
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    // Auto-scroll to show the user message
    scrollToBottom();
    
    // Small delay to ensure user message is visible before AI starts generating
    setTimeout(async () => {
      // Add a loading message to show AI is working
      addChatMessage('ai', 'Generating letter...', true);
      scrollToBottom();
      
      // Generate letter directly with selected type, passing the text
      await handleGenerateLetterFromChat(selectedLetterType, inputText);
      
      // Auto-scroll again after generation starts
      scrollToBottom();
    }, 500);
  };

  // Handle letter generation from chat
  const handleGenerateLetterFromChat = async (letterType: string, transcriptionText?: string) => {
    // Use the passed text or fall back to rawTranscription
    const textToUse = transcriptionText || rawTranscription || currentInput;
    
    if (!textToUse || !textToUse.trim()) {
      Alert.alert('No Content', 'Please add some text before generating a letter.');
      return;
    }
    
    if (letterType === 'referral') {
      setShowLetterTypeSheet(false);
      setShowReferralSelection(true);
      return;
    }
    
    setShowLetterTypeSheet(false);
    setSelectedLetterType(letterType);
    
    // Scroll to bottom when modal closes using InteractionManager
    InteractionManager.runAfterInteractions(() => {
      scrollToBottom();
    });
    
    try {
      console.log('🔄 Starting streaming letter generation...');
      
      // Use streaming generation instead of simple generation
      await generateLetterStreaming(textToUse, patient, letterType);
      
      // Auto-scroll to show the streaming content using InteractionManager
      InteractionManager.runAfterInteractions(() => {
        scrollToBottom();
      });
      
    } catch (error) {
      console.error('❌ Letter generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setNetworkError(errorMessage);
      Alert.alert('Error', `Failed to generate letter: ${errorMessage}`);
      setIsLetterStreaming(false);
    }
  };

  // Handle letter generation (update existing function to use chat version)
  const handleGenerateLetter = async (letterType: string) => {
    await handleGenerateLetterFromChat(letterType);
  };

  // Generate letter and then show popup
  const generateLetterForPopup = async (letterType: string) => {
    const textToUse = currentInput.trim();
    
    if (!textToUse) {
      Alert.alert('No Content', 'Please add some text before generating a letter.');
      return;
    }

    setIsGenerating(true);
    setPreGeneratedLetter('');

    try {
      console.log('🔄 Generating letter before showing popup...');

      // Load the configured prompt
      let promptKey: string;
      switch (letterType) {
        case 'consultation':
          promptKey = 'consultation';
          break;
        case 'consultation-paragraph':
          promptKey = 'consultation-paragraph';
          break;
        case 'discharge':
          promptKey = 'discharge';
          break;
        case 'custom':
          promptKey = 'custom';
          break;
        default:
          promptKey = 'consultation';
      }

      const promptConfig = await loadPrompt(promptKey);
      if (!promptConfig) {
        throw new Error('Failed to load prompt configuration');
      }

      const replacements = {
        patientName: patient.name || 'Unknown Patient',
        patientMRN: patient.medicalNumber || patient.id || 'N/A',
        patientAge: patient.age || 'N/A',
        patientCondition: patient.condition || 'General consultation',
        currentDate: new Date().toLocaleDateString(),
        transcription: textToUse || ''
      };

      const prompt = replacePromptPlaceholders(promptConfig.userPrompt, replacements);
      const systemRole = promptConfig.systemRole;

      // Accumulate the full letter
      let fullLetter = '';

      // Generate using streaming
      const cancelStream = streamOpenAI({
        prompt,
        systemRole,
        onToken: (token: string) => {
          fullLetter += token;
        },
        onEnd: () => {
          console.log('✅ Letter generation complete, opening popup');
          console.log('Generated letter length:', fullLetter.length);
          setPreGeneratedLetter(fullLetter);
          setIsGenerating(false);
          // Small delay to ensure state is updated before opening modal
          setTimeout(() => {
            setShowSimpleLetterDictation(true);
          }, 100);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error: string) => {
          console.error('❌ Letter generation failed:', error);
          setIsGenerating(false);
          Alert.alert('Error', 'Failed to generate letter. Please try again.');
        }
      });

    } catch (error) {
      console.error('❌ Letter generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setIsGenerating(false);
      Alert.alert('Error', `Failed to generate letter: ${errorMessage}`);
    }
  };

  // Handle regenerating a letter
  const handleRegenerateLetter = async (letterType: string) => {
    const textToUse = rawTranscription || currentInput;
    
    if (!textToUse || !textToUse.trim()) {
      Alert.alert('No Content', 'Please add some text before regenerating a letter.');
      return;
    }

    if (!currentLetterId) {
      Alert.alert('Error', 'No letter ID found to regenerate.');
      return;
    }

    // Remove the last AI message (the letter we're regenerating)
    setChatMessages(prev => {
      const filtered = prev.filter(msg => !(msg.type === 'ai' && msg.letterType));
      return filtered;
    });

    // Generate new letter content and update the existing letter
    try {
      console.log('🔄 Generating new content for existing letter ID:', currentLetterId);
      
      // Use streaming generation to get new content
      await generateLetterStreaming(rawTranscription, patient, letterType);
      
      // The streaming function will automatically update the existing letter
      // because currentLetterId is already set
      
    } catch (error) {
      console.error('❌ Letter regeneration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setNetworkError(errorMessage);
      Alert.alert('Error', `Failed to regenerate letter: ${errorMessage}`);
    }
  };

  // Render chat message bubble - ChatGPT inspired design
  const renderChatMessage = ({ item }: { item: any }) => {
    const isUser = item.type === 'user';
    const isSystem = item.type === 'system';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
          
          {/* Message content */}
        <View style={[
          styles.messageContent,
          isUser ? styles.userMessageContent : styles.aiMessageContent
        ]}>
          {item.type === 'ai' ? (
            <>
              <RenderHtml
                contentWidth={width - 80}
                source={{ html: item.content }}
                baseStyle={styles.aiMessageText}
                tagsStyles={{
                  p: { fontSize: 15, lineHeight: 22, marginBottom: 12, color: '#374151' },
                  h1: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#111827' },
                  h2: { fontSize: 17, fontWeight: '600', marginBottom: 10, color: '#111827' },
                  h3: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111827' },
                  strong: { fontWeight: '600', color: '#111827' },
                  ul: { marginLeft: 16, marginBottom: 12 },
                  ol: { marginLeft: 16, marginBottom: 12 },
                  li: { fontSize: 15, lineHeight: 22, marginBottom: 6, color: '#374151' },
                }}
              />
              
              {/* Regenerate button for completed letter messages */}
              {item.letterType && item.content.trim() && !isSavingLetter && !isLetterStreaming && (
                <TouchableOpacity
                  style={styles.regenerateButton}
                  onPress={() => handleRegenerateLetter(item.letterType)}
                >
                  <Ionicons name="refresh" size={16} color="#000000" />
                  <Text style={styles.regenerateButtonText}>Regenerate</Text>
                </TouchableOpacity>
              )}
              
              {/* Show saving indicator for the most recent AI message when saving */}
              {isSavingLetter && item.id === chatMessages[chatMessages.length - 1]?.id && (
                <View style={styles.savingIndicator}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.savingText}>Saving letter...</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.systemMessageText
            ]}>
              {item.content}
            </Text>
          )}
        </View>
          
      </View>
    );
  };

  // Handle referral selection
  const handleReferralSelection = async () => {
    if (!selectedReferralType) {
      Alert.alert('Selection Required', 'Please select who to refer to.');
      return;
    }
    
    const currentText = rawTranscription || currentInput || transcription;
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


  // Update word and character count
  useEffect(() => {
    const words = transcription.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharacterCount(transcription.length);
  }, [transcription]);

  // Auto-save functionality
  useEffect(() => {
    if (transcription.trim()) {
      const timeoutId = setTimeout(() => {
        setIsAutoSaving(true);
        setTimeout(() => {
          setLastSaved(new Date());
          setIsAutoSaving(false);
        }, 1000);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [transcription]);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Fetch patient letters for history tab
  const fetchPatientLetters = async () => {
    if (!patient?.id) return;
    
    setLoadingLetters(true);
    try {
      const letters = await ApiService.getPatientLetters(patient.id);
      setPatientLetters(letters);
    } catch (error) {
      console.error('❌ Error fetching patient letters:', error);
      setNetworkError('Failed to load letter history');
    } finally {
      setLoadingLetters(false);
    }
  };

  // Load patient letters when history tab is activated
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPatientLetters();
    }
  }, [activeTab, patient?.id]);

  // Critical cleanup on component unmount to prevent audio recording crashes
  useEffect(() => {
    return () => {
      // Cleanup timer - prevents memory leaks
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      
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


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Uber BASE Header */}
        <View
          style={styles.uberHeader}
          onLayout={(event) => {
            setHeaderHeight(event.nativeEvent.layout.height);
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.uberBackButton}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.uberHeaderContent}>
            <Text style={styles.uberHeaderTitle}>{patient.name}</Text>
            <Text style={styles.uberHeaderSubtitle}>
              MR #{patient.id} • DOB: {new Date(patient.dob).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.uberHeaderRight} />

        </View>

        {/* Uber-style Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsWrapper}>
            <TouchableOpacity
              style={[
                styles.tab,
                styles.tabLeft,
                activeTab === 'create' && styles.tabActive
              ]}
              onPress={() => setActiveTab('create')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'create' && styles.tabTextActive
              ]}>
                Create Letter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                styles.tabRight,
                activeTab === 'history' && styles.tabActive
              ]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'history' && styles.tabTextActive
              ]}>
                History ({patientLetters.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior="height"
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Network Error Banner */}
          {networkError && (
            <View style={styles.errorBanner}>
              <View style={styles.errorContent}>
                <Ionicons name="warning" size={16} color="#FFFFFF" />
                <Text style={styles.errorText}>{networkError}</Text>
                <TouchableOpacity
                  onPress={() => setNetworkError(null)}
                  style={styles.errorCloseButton}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Uber Base Design System */}
          <View style={styles.uberContainer}>
            {activeTab === 'create' ? (
              /* Create Letter Tab Content */
              <ScrollView 
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Text Input */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={textInputRef}
                    style={styles.textInput}
                    placeholder="Start typing or dictate your letter..."
                    placeholderTextColor="#8E8E93"
                    value={currentInput}
                    onChangeText={setCurrentInput}
                    multiline
                    textAlignVertical="top"
                    maxLength={10000}
                  />
                  <View style={styles.characterCounter}>
                    <Text style={styles.characterCounterText}>
                      {currentInput.length}/10000
                    </Text>
                  </View>
                </View>

                {/* Letter Type */}
                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>Letter Type:</Text>
                  <View style={styles.chipsRow}>
                    {letterTypes.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.chip,
                          selectedLetterType === type.id && styles.chipSelected
                        ]}
                        onPress={() => setSelectedLetterType(type.id)}
                        disabled={isGenerating}
                      >
                        <Text style={[
                          styles.chipText,
                          selectedLetterType === type.id && styles.chipTextSelected
                        ]}>
                          {type.shortTitle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Format - Only show when Consultation is selected */}
                {selectedLetterType === 'consultation' && (
                  <View style={styles.optionGroup}>
                    <Text style={styles.optionLabel}>Format:</Text>
                    <View style={styles.segmentedControl}>
                      <TouchableOpacity
                        style={[
                          styles.segment,
                          styles.segmentLeft,
                          consultationFormat === 'paragraphs' && styles.segmentSelected
                        ]}
                        onPress={() => setConsultationFormat('paragraphs')}
                        disabled={isGenerating}
                      >
                        <Text style={[
                          styles.segmentText,
                          consultationFormat === 'paragraphs' && styles.segmentTextSelected
                        ]}>
                          Paragraphs
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.segment,
                          styles.segmentRight,
                          consultationFormat === 'headings' && styles.segmentSelected
                        ]}
                        onPress={() => setConsultationFormat('headings')}
                        disabled={isGenerating}
                      >
                        <Text style={[
                          styles.segmentText,
                          consultationFormat === 'headings' && styles.segmentTextSelected
                        ]}>
                          Headings
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : (
              /* History Tab Content */
              <ScrollView 
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {loadingLetters ? (
                  <View style={styles.historyLoading}>
                    <ActivityIndicator size="large" color="#000000" />
                    <Text style={styles.historyLoadingText}>Loading letter history...</Text>
                  </View>
                ) : patientLetters.length === 0 ? (
                  <View style={styles.historyEmpty}>
                    <Ionicons name="document-outline" size={48} color="#8E8E93" />
                    <Text style={styles.historyEmptyTitle}>No Previous Letters</Text>
                    <Text style={styles.historyEmptySubtitle}>
                      Letters created for this patient will appear here
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyList}>
                    {patientLetters.map((letter, index) => (
                      <TouchableOpacity
                        key={letter.id}
                        style={[
                          styles.historyItem,
                          index === patientLetters.length - 1 && styles.historyItemLast
                        ]}
                        onPress={() => {
                          // Navigate to letter detail screen
                          navigation.navigate('LetterDetail', { 
                            letterId: letter.id,
                            letter: letter,
                            patient: patient 
                          });
                        }}
                      >
                        <View style={styles.historyItemContent}>
                          <View style={styles.historyItemHeader}>
                            <Text style={styles.historyItemType}>
                              {letter.type === 'consultation' ? 'Consultation Letter' : 'Custom Letter'}
                            </Text>
                            <View style={styles.historyItemStatus}>
                              <Text style={[
                                styles.historyItemStatusText,
                                styles[`historyItemStatus${letter.status?.charAt(0).toUpperCase() + letter.status?.slice(1)}`]
                              ]}>
                                {letter.status || 'Draft'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.historyItemDate}>
                            {new Date(letter.createdAt || letter.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'numeric', 
                              day: 'numeric'
                            })}
                          </Text>
                          <Text style={styles.historyItemSnippet} numberOfLines={2}>
                            {letter.content ? letter.content.replace(/<[^>]*>/g, '') : 'No content available'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Fixed Footer with Generate Button - Only show for Create tab */}
            {activeTab === 'create' && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!currentInput.trim() || !selectedLetterType || isGenerating) && styles.primaryButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedLetterType) {
                      // Determine the actual letter type to generate
                      let actualLetterType = selectedLetterType;
                      if (selectedLetterType === 'consultation') {
                        actualLetterType = consultationFormat === 'headings' ? 'consultation' : 'consultation-paragraph';
                      }
                      generateLetterForPopup(actualLetterType);
                    }
                  }}
                  disabled={!currentInput.trim() || !selectedLetterType || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                        Generating...
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Generate Letter
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        {/* Uber BASE Letter Type Selection Modal - Centered Popup */}
        {showLetterTypeSheet && (
          <View style={styles.baseModalOverlay}>
            <TouchableOpacity 
              style={styles.baseModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowLetterTypeSheet(false)}
            />
            <View style={styles.baseModal}>
              {/* BASE Modal Header */}
              <View style={styles.baseModalHeader}>
                <View style={styles.baseModalHeaderContent}>
                  <Text style={styles.baseModalTitle}>Select Letter Type</Text>
                  <TouchableOpacity 
                    onPress={() => setShowLetterTypeSheet(false)}
                    style={styles.baseModalCloseButton}
                  >
                    <Ionicons name="close" size={20} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* BASE Modal Content */}
              <View style={styles.baseModalContent}>
                {letterTypes.map((type, index) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.baseOption,
                      selectedLetterType === type.id && styles.baseOptionSelected,
                      index === letterTypes.length - 1 && styles.baseOptionLast
                    ]}
                    onPress={async () => {
                      setSelectedLetterType(type.id);
                      setShowLetterTypeSheet(false);
                      // Generate letter first, then open popup with the result
                      await generateLetterForPopup(type.id);
                    }}
                  >
                    <View style={styles.baseOptionContent}>
                      <View style={styles.baseOptionText}>
                        <Text style={[
                          styles.baseOptionTitle,
                          selectedLetterType === type.id && styles.baseOptionTitleSelected
                        ]}>
                          {type.title}
                        </Text>
                      </View>
                      {selectedLetterType === type.id && (
                        <View style={styles.baseOptionCheckmark}>
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
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
        {showLetterPreviewModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.letterPreviewModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Letter Preview</Text>
                <TouchableOpacity onPress={() => setShowLetterPreviewModal(false)}>
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
                    setShowLetterPreviewModal(false);
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
          generatedLetter={generatedLetter}
          patientName={patient.name}
        />

        {/* Simple Letter Dictation Modal */}
        <SimpleLetterDictation
          visible={showSimpleLetterDictation}
          patient={patient}
          selectedLetterType={selectedLetterType}
          inputText={currentInput}
          preGeneratedContent={preGeneratedLetter}
          onClose={() => {
            setShowSimpleLetterDictation(false)
            setPreGeneratedLetter('')
          }}
          onLetterCreated={() => {
            setShowSimpleLetterDictation(false)
            setCurrentInput('')
            setSelectedLetterType('')
            setPreGeneratedLetter('')
            if (onLetterCreated) {
              onLetterCreated()
            }
            // Mark that patient list needs refreshing
            PatientStateService.markPatientUpdated(patient.id)
            // Navigate back to patient list
            navigation.goBack()
          }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Uber BASE Header
  uberHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  uberBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uberHeaderContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  uberHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  uberHeaderSubtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  uberHeaderRight: {
    width: 40,
    height: 40,
  },
  // Uber-style Tabs - Subtle Design
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLeft: {
    marginRight: 1,
  },
  tabRight: {
    marginLeft: 1,
  },
  tabActive: {
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  
  // Bottom Sheet Styles
  
  // Inline Letter Type Selection Styles
  inlineLetterTypeContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  inlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  inlineCloseButton: {
    padding: 4,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 16,
  },
  modalBody: {
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
  
  // Chat Interface Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatContentContainer: {
    padding: 16,
    // paddingBottom: 100, // No longer needed
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // ChatGPT-inspired message styles
  messageContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  userMessageContainer: {
    alignItems: 'flex-start',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageRoleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageRoleText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  voiceIndicatorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  voiceIndicatorInlineText: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 3,
    fontWeight: '500',
  },
  messageContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 60, // Ensure bubble has a minimum width for streaming
  },
  userMessageContent: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  aiMessageContent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 24, // leading-relaxed
    fontWeight: '400',
  },
  systemMessageText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  aiMessageText: {
    color: '#1F2937', // darker gray for better contrast
    fontSize: 15,
    lineHeight: 24, // leading-relaxed
    fontWeight: '400',
  },
  aiMessageActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  aiActionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  messageTimestamp: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 4,
  },
  userMessageTimestamp: {
    color: '#9CA3AF',
    textAlign: 'right',
  },
  aiMessageTimestamp: {
    color: '#9CA3AF',
    textAlign: 'left',
  },
  // ChatGPT-inspired input bar
  bottomInputBar: {
    // position: 'absolute', // Removed for KeyboardAvoidingView
    // bottom: 0,
    // left: 0,
    // right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    textAlignVertical: 'center',
    minHeight: 20,
    maxHeight: 100,
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 4,
  },
  // ChatGPT-style chat interface
  chatInterface: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatMessageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  // Removed duplicate styles - using ChatGPT-inspired versions above
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  aiIndicatorText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 3,
    fontWeight: '500',
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  voiceIndicatorText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 3,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  loadingText: {
    marginLeft: 6,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  // Removed duplicate text styles - using versions defined earlier
  
  // Error banner styles
  errorBanner: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  errorCloseButton: {
    padding: 4,
  },
  
  // Streaming indicator styles
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
    // Add pulsing animation
    opacity: 0.7,
  },
  streamingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  
  // Saving indicator styles
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  savingText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Letter type modal styles - Tight & Matching
  letterTypeModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 0,
    marginTop: 'auto',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  letterTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  letterTypeOptionSelected: {
    backgroundColor: '#F8FAFC',
    borderColor: '#1F2937',
  },
  letterTypeOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  letterTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  letterTypeIconSelected: {
    backgroundColor: '#1F2937',
  },
  letterTypeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  letterTypeTitleSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalGenerateButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGenerateButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Uber BASE Design System
  uberContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Scrollable Content
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  
  // Option Group - BASE (Clean, No Headers)
  optionGroup: {
    marginTop: 24,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
    fontFamily: 'System',
    letterSpacing: 0,
  },
  
  // Selected Type Indicator - Uber BASE
  selectedTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  clearTypeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  
  // Input Wrapper with Character Counter - BASE
  inputWrapper: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    fontSize: 16,
    color: '#000000',
    minHeight: 160,
    maxHeight: 220,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    lineHeight: 24,
  },
  characterCounter: {
    position: 'absolute',
    bottom: 10,
    right: 12,
  },
  characterCounterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: 'System',
  },
  
  // History Tab Styles
  historyLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  historyLoadingText: {
    fontSize: 16,
    color: '#6B6B6B',
    marginTop: 16,
    fontWeight: '500',
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  historyEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  historyEmptySubtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyList: {
    paddingTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  historyItemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 6,
  },
  historyItemSnippet: {
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 18,
  },
  historyItemStatus: {
    marginLeft: 8,
  },
  historyItemStatusText: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  historyItemStatusDraft: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  historyItemStatusCreated: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  historyItemStatusApproved: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  historyItemStatusPosted: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
  
  // Fixed Footer - BASE
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  
  // Primary Button - Uber BASE (Sharp, Minimal)
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 4,
    minHeight: 52,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Letter Type Chips - BASE (Sharp, Minimal)
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 4,
    backgroundColor: '#F6F6F6',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#545454',
    fontFamily: 'System',
    letterSpacing: 0,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Segmented Control - BASE (Sharp, Clean)
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F6F6F6',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLeft: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  segmentRight: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  segmentSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#545454',
    fontFamily: 'System',
    letterSpacing: 0,
  },
  segmentTextSelected: {
    color: '#000000',
    fontWeight: '600',
  },
  
  // Uber BASE Modal Styles - Centered Popup
  baseModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  baseModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  baseModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1001,
  },
  baseModalHeader: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  baseModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baseModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
    fontFamily: 'System',
  },
  baseModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseModalContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  
  // BASE Option Styles - Following Uber BASE Design Tokens
  baseOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 56,
    overflow: 'hidden', // Ensure content doesn't bleed outside
  },
  baseOptionSelected: {
    backgroundColor: '#F8F9FA',
    borderColor: '#000000',
    borderWidth: 2,
  },
  baseOptionLast: {
    marginBottom: 0,
    backgroundColor: '#FFFFFF', // Explicitly set white background for last item
  },
  baseOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 56,
  },
  baseOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  baseOptionIconSelected: {
    backgroundColor: '#000000',
  },
  baseOptionText: {
    flex: 1,
  },
  baseOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
    fontFamily: 'System',
  },
  baseOptionTitleSelected: {
    color: '#000000',
  },
  baseOptionDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B6B6B',
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: 'System',
  },
  baseOptionDescriptionSelected: {
    color: '#6B6B6B',
  },
  baseOptionCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});