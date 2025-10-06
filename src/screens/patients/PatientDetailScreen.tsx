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
  const [showGeneratedLetter, setShowGeneratedLetter] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLetterType, setSelectedLetterType] = useState<string>('consultation');
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

  // Letter types configuration
  const letterTypes = [
    {
      id: 'consultation',
      title: 'Consultation',
      shortTitle: 'Consultation',
      description: 'Letter with section headings',
      icon: 'document-text-outline',
    },
    {
      id: 'consultation-paragraph',
      title: 'Consultation (Paragraphs Only)',
      shortTitle: 'Paragraphs',
      description: 'Letter without section headings',
      icon: 'document-outline',
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
      // case 'discharge':
      //   return 'Discharge Summary';
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
        {/* Header */}
        <View
          style={styles.header}
          onLayout={(event) => {
            setHeaderHeight(event.nativeEvent.layout.height);
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{patient.name}</Text>
            <View style={styles.headerInfoRow}>
              <Text style={styles.headerDOB}>
                DOB: {new Date(patient.dob).toLocaleDateString()}
              </Text>
              <Text style={styles.headerMRN}>MR #: {patient.id}</Text>
            </View>
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

          {/* Chat Messages */}
          <FlatList
            ref={chatFlatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            onScrollBeginDrag={() => {
              console.log('📜 User started scrolling');
            }}
            onScrollEndDrag={() => console.log('📜 User ended scrolling')}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onLayout={() => {
              // Scroll to bottom when layout is ready
              if (chatMessages.length > 0) {
                setTimeout(() => scrollToBottom(), 100);
              }
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>Start dictating...</Text>
              </View>
            )}
          />


          {/* ChatGPT-style Bottom Input Bar */}
          <View
            style={[styles.bottomInputBar, { paddingBottom: insets.bottom }]}
          >
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={[
                    styles.chatInput,
                    {
                      minHeight:
                        currentInput.length > 0
                          ? Math.min(
                              Math.max(
                                currentInput.split('\n').length * 20 + 20,
                                20
                              ),
                              120
                            )
                          : 20,
                      maxHeight: 120,
                    },
                  ]}
                  placeholder="Type or dictate..."
                  placeholderTextColor="#9CA3AF"
                  value={currentInput}
                  onChangeText={setCurrentInput}
                  multiline
                  maxLength={3500}
                  textAlignVertical="center"
                  onContentSizeChange={(event) => {
                    // Dynamic height based on content
                    const { height } = event.nativeEvent.contentSize;
                    // Height is automatically managed by the container style above
                  }}
                />


                {/* Send button - now shows letter type popup */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !currentInput.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={() => setShowLetterTypeSheet(true)}
                  disabled={!currentInput.trim()}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={currentInput.trim() ? '#FFFFFF' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </KeyboardAvoidingView>
        {/* Letter Type Selection Modal */}
        {showLetterTypeSheet && (
          <View style={styles.modalOverlay}>
            <View style={styles.letterTypeModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Letter Type</Text>
                <TouchableOpacity 
                  onPress={() => setShowLetterTypeSheet(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {letterTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.letterTypeOption,
                      selectedLetterType === type.id && styles.letterTypeOptionSelected
                    ]}
                    onPress={() => setSelectedLetterType(type.id)}
                  >
                    <View style={styles.letterTypeOptionContent}>
                      <View style={[
                        styles.letterTypeIcon,
                        selectedLetterType === type.id && styles.letterTypeIconSelected
                      ]}>
                        <Ionicons 
                          name={type.icon as any} 
                          size={20} 
                          color={selectedLetterType === type.id ? '#FFFFFF' : '#000000'} 
                        />
                      </View>
                      <Text style={[
                        styles.letterTypeTitle,
                        selectedLetterType === type.id && styles.letterTypeTitleSelected
                      ]}>
                        {type.title}
                      </Text>
                    </View>
                    {selectedLetterType === type.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#000000" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.modalGenerateButton,
                    (!selectedLetterType || !currentInput.trim()) && styles.modalGenerateButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedLetterType && currentInput.trim()) {
                      handleGenerateLetter(selectedLetterType);
                      setShowLetterTypeSheet(false);
                    }
                  }}
                  disabled={!selectedLetterType || !currentInput.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalGenerateButtonText}>Generate Letter</Text>
                  )}
                </TouchableOpacity>
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
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
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
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
  
  // Letter type modal styles
  letterTypeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 40,
    height: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  letterTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  letterTypeOptionSelected: {
    backgroundColor: '#F3F4F6',
  },
  letterTypeOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  letterTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  letterTypeIconSelected: {
    backgroundColor: '#1F2937',
  },
  letterTypeTitle: {
    fontSize: 16,
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
});