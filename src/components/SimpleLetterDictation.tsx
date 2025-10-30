import React, { useState, useRef, useEffect, useCallback } from 'react'
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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import GPTService from '../services/GPTService'
import LetterService from '../services/LetterService'
import { streamOpenAI } from '../lib/openaiStream'
import { loadPrompt, replacePromptPlaceholders } from '../config/aiPrompts'
import RenderHtml from 'react-native-render-html'

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
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [letterType, setLetterType] = useState(propSelectedLetterType || 'consultation-paragraph')

  const letterTypes = [
    { id: 'consultation', name: 'Consultation (Headings)', icon: '📋' },
    { id: 'consultation-paragraph', name: 'Consultation (Paragraphs Only)', icon: '📋' },
    { id: 'custom', name: 'Custom Letter', icon: '✏️' },
    { id: 'referral', name: 'Referral', icon: '📤' },
    { id: 'discharge', name: 'Discharge', icon: '🏥' },
  ]

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

      // Use a ref to accumulate the full letter text
      let fullLetterText = ''
      
      // Start streaming
      const cancelStream = streamOpenAI({
        prompt,
        systemRole,
        onToken: (token: string) => {
          fullLetterText += token
          setStreamingText(prev => prev + token)
        },
        onEnd: () => {
          // Set the complete letter when streaming finishes
          setGeneratedLetter(fullLetterText)
          setIsStreaming(false)
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
    console.log('useEffect triggered:', { 
      visible, 
      propSelectedLetterType, 
      propInputText, 
      hasPreGeneratedContent: !!preGeneratedContent,
      preGeneratedContentLength: preGeneratedContent?.length 
    })
    
    if (visible && propSelectedLetterType) {
      // Set the letter type
      setLetterType(propSelectedLetterType)
      
      if (preGeneratedContent) {
        // Use pre-generated content
        console.log('Using pre-generated content, length:', preGeneratedContent.length)
        console.log('First 200 chars:', preGeneratedContent.substring(0, 200))
        setGeneratedLetter(preGeneratedContent)
        setStreamingText('')
        setIsStreaming(false)
        console.log('State updated with pre-generated content')
      } else if (propInputText?.trim()) {
        // Auto-start generation
        console.log('Auto-starting generation...')
        setGeneratedLetter('')
        setStreamingText('')
        setTimeout(() => {
          handleGenerate()
        }, 300) // Small delay to ensure state is set
      }
    }
  }, [visible, propSelectedLetterType, propInputText, preGeneratedContent, handleGenerate])

  const handleAccept = async () => {
    try {
      const letterData = {
        patientId: typeof patient.id === 'string' ? parseInt(patient.id, 10) : patient.id,
        type: letterType,
        content: generatedLetter,
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
      console.error('Error saving letter:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Save Failed', 'Failed to save letter. Please try again.')
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
            showsVerticalScrollIndicator={false}
          >
            {generatedLetter || streamingText ? (
              <RenderHtml
                contentWidth={340} // Fixed width for modal
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
    height: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
