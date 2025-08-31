// src/services/SimpleStreamingService.ts
import { streamOpenAI } from '../lib/openaiStream';
import ApiService from './ApiService';
import { LETTER_PROMPTS, getPatientPrompt } from '../config/aiPrompts';
import { getPatientPromptAsync } from '../config/aiPrompts';

export interface StreamingResponse {
  success: boolean;
  content?: string;
  isComplete: boolean;
  error?: string;
}

class SimpleStreamingService {
  private activeStreams = new Map<string, () => void>();

  /**
   * Create prompt based on letter type
   */
  private async createPrompt(transcription: string, patientInfo: any, letterType: string): Promise<{ userPrompt: string; systemRole: string }> {
    // Map letter types to config keys
    const promptKey = letterType === 'clinical' ? 'clinical' : 
                     letterType === 'discharge' ? 'discharge' : 'generic';
    
    try {
      // Use the async function that loads the full prompt configuration
      const prompt = await getPatientPromptAsync(promptKey, patientInfo, transcription);
      return {
        userPrompt: prompt,
        systemRole: "You are a medical letter generator for doctors. Generate professional clinical letters using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax like ** or ##."
      };
    } catch (error) {
      console.warn('Failed to load configurable prompt, using fallback:', error);
      // Fallback to legacy method
      const fallbackPrompt = getPatientPrompt(promptKey, patientInfo, transcription);
      return {
        userPrompt: fallbackPrompt,
        systemRole: "You are a medical letter generator for doctors. Generate professional clinical letters using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax like ** or ##."
      };
    }
  }

  /**
   * Generate letter with real-time streaming using callback approach
   */
  async generateLetterWithStreaming(
    transcription: string,
    patientInfo: any,
    letterType: string,
    onChunk: (content: string, progress: number) => void,
    onComplete: (finalContent: string) => void,
    onError: (error: string) => void
  ): Promise<() => void> {
    console.log('📝 Starting simple streaming letter generation...');
    
    const streamId = `${patientInfo.id}-${Date.now()}`;
    let accumulatedContent = '';
    
    // Estimate target letter length based on transcription length
    const estimatedLength = Math.max(transcription.length * 3, 2000); // At least 2000 chars
    console.log(`📏 Estimated letter length: ${estimatedLength} chars`);

    // Create prompt with system role
    const promptConfig = await this.createPrompt(transcription, patientInfo, letterType);

    // Start streaming with progress tracking
    const cancelStream = streamOpenAI({
      prompt: promptConfig.userPrompt,
      systemRole: promptConfig.systemRole,
      onToken: (text) => {
        accumulatedContent += text;
        
        // Calculate progress based on current length vs estimated length
        const progress = Math.min(Math.round((accumulatedContent.length / estimatedLength) * 100), 95);
        
        console.log(`📝 Token: "${text}" (${text.length} chars) - Total: ${accumulatedContent.length} - Progress: ${progress}%`);
        
        // Update UI with content and progress
        onChunk(accumulatedContent, progress);
      },
      onEnd: () => {
        console.log('✅ Streaming completed');
        this.activeStreams.delete(streamId);
        
        // Final UI update with 100% progress
        onChunk(accumulatedContent, 100);
        
        // Save to backend and complete
        this.saveLetterToBackend(accumulatedContent, patientInfo, letterType);
        onComplete(accumulatedContent);
      },
      onError: (error) => {
        console.error('❌ Streaming error:', error);
        this.activeStreams.delete(streamId);
        onError(error?.message || 'Streaming failed');
      }
    });

    // Store cancel function
    this.activeStreams.set(streamId, cancelStream);

    // Return cancel function
    return () => {
      cancelStream();
      this.activeStreams.delete(streamId);
    };
  }

  /**
   * Cancel stream for patient
   */
  cancelStream(patientId: number): void {
    for (const [streamId, cancelFn] of Array.from(this.activeStreams.entries())) {
      if (streamId.startsWith(`${patientId}-`)) {
        cancelFn();
        this.activeStreams.delete(streamId);
        console.log(`🛑 Cancelled stream for patient ${patientId}`);
      }
    }
  }

  /**
   * Save letter to backend
   */
  private async saveLetterToBackend(content: string, patientInfo: any, letterType: string): Promise<void> {
    try {
      const letterData = {
        patientId: typeof patientInfo.id === 'string' ? parseInt(patientInfo.id, 10) : patientInfo.id,
        content: content,
        type: letterType,
        priority: 'medium' as const,
        notes: '',
        status: 'created' as const
      };

      const savedLetter = await ApiService.createLetter(letterData);
      console.log('✅ Letter saved successfully:', savedLetter);
    } catch (error) {
      console.error('❌ Failed to save letter:', error);
    }
  }

  /**
   * Delete letter
   */
  async deleteLetter(letterId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deleting letter:', letterId);
      const success = await ApiService.deleteLetter(letterId);
      
      if (success) {
        console.log('✅ Letter deleted successfully');
        return true;
      } else {
        console.error('❌ Failed to delete letter');
        return false;
      }
    } catch (error) {
      console.error('❌ Delete letter error:', error);
      return false;
    }
  }
}

export default new SimpleStreamingService();
