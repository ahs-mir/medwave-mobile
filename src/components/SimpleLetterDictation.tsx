import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import GPTService from '../services/GPTService'
import LetterService from '../services/LetterService'
import { streamOpenAI } from '../lib/openaiStream'
import { loadPrompt, replacePromptPlaceholders } from '../config/aiPrompts'
import RenderHtml from 'react-native-render-html'
import { useLetterTypes } from '../hooks/useLetterTypes'

interface SimpleLetterDictationProps {
  visible: boolean
  patient: any
  onClose: () => void
  onLetterCreated: () => void
  selectedLetterType?: string
  inputText?: string
  preGeneratedContent?: string
}

const SimpleLetterDictation: React.FC<SimpleLetterDictationProps> = ({
  visible,
  patient,
  onClose,
  onLetterCreated,
  selectedLetterType: propSelectedLetterType,
  inputText: propInputText,
  preGeneratedContent
}) => {
  console.log('SimpleLetterDictation props:', { 
    visible, 
    propSelectedLetterType, 
    propInputText,
    hasPreGeneratedContent: !!preGeneratedContent,
    patientName: patient?.name 
  })
  const { width: screenWidth } = useWindowDimensions()
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [letterType, setLetterType] = useState(propSelectedLetterType || '')
  const { letterTypes: apiLetterTypes, loading: letterTypesLoading } = useLetterTypes()
  
  // Use refs to accumulate content (must be at component level)
  const fullLetterTextRef = useRef('')
  const tokenCountRef = useRef(0)
  
  // Calculate content width based on modal width (88% of screen, minus padding)
  const modalWidth = screenWidth * 0.88
  const contentWidth = modalWidth - 32 // Subtract horizontal padding (16px each side)

  // Map API letter types to UI format
  const letterTypes = useMemo(() => {
    return apiLetterTypes.map((type) => ({
      id: type.id,
      name: type.name,
      icon: '📋', // Default icon, can be enhanced later
    }));
  }, [apiLetterTypes]);

  // Set default selection when letter types load
  useEffect(() => {
    if (letterTypes.length > 0 && !letterType && !propSelectedLetterType) {
      setLetterType(letterTypes[0].id);
    } else if (propSelectedLetterType) {
      setLetterType(propSelectedLetterType);
    }
  }, [letterTypes, propSelectedLetterType]);

  const handleGenerate = useCallback(async () => {
    // Use prop input text if available
    const textToUse = propInputText?.trim()
    console.log('handleGenerate called with textToUse:', textToUse)
    if (!textToUse) {
      Alert.alert('Input Required', 'Please provide input text for letter generation')
      return
    }

    setIsStreaming(true)
    setStreamingText('')

    try {
      // Map letter type to prompt key
      let promptKey = letterType;
      if (letterType === 'consultation-paragraph') {
        promptKey = 'consultation-paragraph';
      } else if (letterType === 'custom') {
        promptKey = 'custom';
      }
      
      // Load the configured prompt
      const promptConfig = await loadPrompt(promptKey)
      if (!promptConfig) {
        throw new Error('Failed to load prompt configuration')
      }

      // Use the configured prompt with patient info replacements
      const replacements = {
        patientName: patient.name || 'Unknown Patient',
        patientMRN: patient.medicalNumber || patient.id || 'N/A',
        patientAge: patient.age || 'N/A',
        patientCondition: patient.condition || 'General consultation',
        currentDate: new Date().toLocaleDateString(),
        transcription: textToUse || ''
      }
      
      const prompt = replacePromptPlaceholders(promptConfig.userPrompt, replacements)
      const systemRole = promptConfig.systemRole

      // Reset accumulators when starting new generation
      fullLetterTextRef.current = ''
      tokenCountRef.current = 0
      
      console.log('🚀 Starting letter generation:', {
        promptLength: prompt.length,
        letterType: letterType,
        patientName: patient?.name,
        systemRoleLength: systemRole?.length || 0
      })
      
      // Start streaming
      const cancelStream = streamOpenAI({
        prompt,
        systemRole,
        patientInfo: patient,
        letterType: letterType,
        onToken: (token: string) => {
          if (!token || token.trim().length === 0) {
            console.warn('⚠️ Received empty token, skipping')
            return
          }
          
          tokenCountRef.current++
          fullLetterTextRef.current += token
          
          console.log(`📥 Token ${tokenCountRef.current}: "${token.substring(0, 30)}..." (${token.length} chars, total: ${fullLetterTextRef.current.length})`)
          
          // Update state for UI display
          setStreamingText(prev => {
            const updated = prev + token
            setGeneratedLetter(updated)
            return updated
          })
        },
        onEnd: () => {
          // Use ref value (most reliable source)
          const finalContent = fullLetterTextRef.current
          
          console.log('🏁 Stream ended:', {
            tokenCount: tokenCountRef.current,
            finalContentLength: finalContent.length,
            finalContentPreview: finalContent.substring(0, 200)
          })
          
          // CRITICAL: Always set the content, even if short
          if (finalContent && finalContent.trim().length > 0) {
            console.log('✅ Setting final content to state')
            setGeneratedLetter(finalContent)
            setStreamingText(finalContent)
          } else {
            console.error('❌ ERROR: finalContent is empty!')
            console.error('   fullLetterTextRef.current:', fullLetterTextRef.current)
            console.error('   tokenCountRef.current:', tokenCountRef.current)
          }
          
          setIsStreaming(false)
          
          if (finalContent.length < 100) {
            console.error('⚠️ WARNING: Generated content is very short!')
          }
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        },
        onError: (error: string) => {
          console.error('Streaming error:', error)
          Alert.alert('Generation Failed', 'Failed to generate letter. Please try again.')
          setIsStreaming(false)
        }
      })

    } catch (error) {
      console.error('Error generating letter:', error)
      Alert.alert('Generation Failed', 'Failed to generate letter. Please try again.')
      setIsStreaming(false)
    }
  }, [propInputText, letterType, patient])

  // Auto-load pre-generated content or generate new content
  useEffect(() => {
    if (!visible) return
    
    // Always set the letter type if provided
    if (propSelectedLetterType) {
      setLetterType(propSelectedLetterType)
    } else if (letterTypes.length > 0 && !letterType) {
      setLetterType(letterTypes[0].id)
    }
    
    if (preGeneratedContent) {
      // Use pre-generated content
      setGeneratedLetter(preGeneratedContent)
      setStreamingText(preGeneratedContent)
      setIsStreaming(false)
      fullLetterTextRef.current = preGeneratedContent
    } else if (propInputText?.trim() && !generatedLetter && !isStreaming) {
      // Auto-start generation only if we don't already have content
      handleGenerate()
    }
  }, [visible, propSelectedLetterType, propInputText, preGeneratedContent, letterTypes, letterType, generatedLetter, isStreaming])

  const handleAccept = async () => {
    try {
      // Ensure letterType is set - use propSelectedLetterType as fallback
      const finalLetterType = letterType || propSelectedLetterType || ''
      
      // Validate letter type
      if (!finalLetterType || finalLetterType.trim() === '') {
        Alert.alert('Error', 'Letter type is required. Please select a letter type.')
        return
      }

      // Use the most complete content available (generatedLetter or streamingText)
      const letterContent = generatedLetter || streamingText || ''
      
      if (!letterContent || letterContent.trim() === '') {
        Alert.alert('Error', 'Letter content is required.')
        return
      }

      console.log('💾 Saving letter with type:', finalLetterType)
      console.log('💾 Letter data:', {
        patientId: typeof patient.id === 'string' ? parseInt(patient.id, 10) : patient.id,
        type: finalLetterType,
        contentLength: letterContent.length,
        generatedLetterLength: generatedLetter.length,
        streamingTextLength: streamingText.length,
        hasRawTranscription: !!propInputText,
        letterTypeState: letterType,
        propSelectedLetterType: propSelectedLetterType
      })

      const letterData = {
        patientId: typeof patient.id === 'string' ? parseInt(patient.id, 10) : patient.id,
        type: finalLetterType,
        content: letterContent,
        priority: 'medium' as const,
        notes: '',
        status: 'draft' as const,
        rawTranscription: propInputText || ''
      }

      await LetterService.createLetter(letterData)
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
      // Reset states
      setGeneratedLetter('')
      setStreamingText('')
      
      // Close modal and trigger callbacks
      onClose()
      onLetterCreated()
    } catch (error) {
      console.error('❌ Error saving letter:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      
      // Extract detailed error message
      let errorMessage = 'Failed to save letter. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show full error message (don't truncate in alert)
      Alert.alert(
        'Save Failed', 
        errorMessage,
        [{ text: 'OK' }]
      )
    }
  }

  const handleClose = () => {
    setGeneratedLetter('')
    setStreamingText('')
    onClose()
  }


  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          {/* Header - BASE Style */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{patient?.name}</Text>
            <Text style={styles.headerSubtitle}>
              {letterTypes.find(t => t.id === letterType)?.name}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Letter Content - Clean scrollable area */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
            alwaysBounceVertical={false}
          >
            {isStreaming && !streamingText ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.loadingText}>Preparing letter...</Text>
              </View>
            ) : (generatedLetter || streamingText) ? (
              <>
                {/* Debug info - remove in production */}
                {__DEV__ && (
                  <Text style={{ fontSize: 10, color: '#999', padding: 8 }}>
                    Debug: generatedLetter={generatedLetter.length} chars, streamingText={streamingText.length} chars, isStreaming={isStreaming ? 'true' : 'false'}
                  </Text>
                )}
                <RenderHtml
                  contentWidth={contentWidth}
                  source={{ html: isStreaming ? streamingText : generatedLetter }}
                  baseStyle={styles.htmlContent}
                tagsStyles={{
                  p: {
                    fontSize: 14,
                    lineHeight: 20,
                    color: '#000000',
                    marginBottom: 4,
                    marginTop: 0,
                  },
                  h1: {
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: 6,
                    marginTop: 8,
                    lineHeight: 22,
                  },
                  h2: {
                    fontSize: 17,
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: 6,
                    marginTop: 8,
                    lineHeight: 22,
                  },
                  h3: {
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: 6,
                    marginTop: 8,
                    lineHeight: 20,
                  },
                  strong: {
                    fontWeight: '600',
                    color: '#000000',
                  },
                  b: {
                    fontWeight: '600',
                    color: '#000000',
                  },
                  em: {
                    fontStyle: 'italic',
                    color: '#000000',
                  },
                  i: {
                    fontStyle: 'italic',
                    color: '#000000',
                  },
                  ul: {
                    marginLeft: 16,
                    marginBottom: 8,
                    marginTop: 0,
                  },
                  ol: {
                    marginLeft: 16,
                    marginBottom: 8,
                    marginTop: 0,
                  },
                  li: {
                    fontSize: 14,
                    lineHeight: 20,
                    color: '#000000',
                    marginBottom: 2,
                  },
                  br: {
                    marginBottom: 4,
                  },
                  hr: {
                    marginVertical: 8,
                    height: 1,
                    backgroundColor: '#E5E7EB',
                  },
                }}
                defaultTextProps={{
                  style: {
                    fontSize: 14,
                    lineHeight: 20,
                    color: '#000000',
                  }
                }}
                />
              </>
            ) : (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.emptyText}>Preparing letter...</Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Buttons - BASE Style */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAccept}
              style={[
                styles.primaryButton,
                (!generatedLetter || isStreaming) && styles.primaryButtonDisabled
              ]}
              disabled={!generatedLetter || isStreaming}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Modal Overlay - BASE
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  
  // Container - BASE Design
  container: {
    width: '88%',
    maxWidth: 440,
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'column',
  },
  
  // Header - BASE
  header: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'System',
    letterSpacing: 0,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#545454',
    fontFamily: 'System',
    letterSpacing: 0,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Content - BASE
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  htmlContent: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#545454',
    fontFamily: 'System',
    letterSpacing: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#545454',
    fontFamily: 'System',
    letterSpacing: 0,
  },
  
  // Actions - BASE Design
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: 'System',
    letterSpacing: 0,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'System',
    letterSpacing: 0,
  },
})

export default SimpleLetterDictation
