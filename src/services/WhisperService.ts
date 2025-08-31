// src/services/WhisperService.ts
import StorageService from './StorageService';
import { TRANSCRIPTION_PROMPTS } from '../config/aiPrompts';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

class WhisperService {
  // Remove hardcoded fallback API key - only use user-provided keys
  private async getApiKey(): Promise<string> {
    try {
      const storedKey = await StorageService.getOpenAIKey();
      if (storedKey && storedKey.trim()) {
        console.log('🔑 Using stored OpenAI API key for Whisper');
        return storedKey;
      }
      
      // No fallback key - require user to configure
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    } catch (error) {
      console.error('Error getting API key for Whisper:', error);
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    }
  }

  async transcribeAudio(audioUri: string, patientContext?: string): Promise<TranscriptionResult> {
    try {
      console.log('🎙️ Starting Whisper transcription...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      // Handle cases where no actual file exists
      if (!audioUri || audioUri === 'no-actual-file' || audioUri === 'mock-recording') {
        return {
          success: false,
          error: 'No valid audio file to transcribe'
        };
      }

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('prompt', TRANSCRIPTION_PROMPTS.whisper);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Transcription completed');

      return {
        success: true,
        text: result.text
      };

    } catch (error) {
      console.error('❌ Transcription failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }
}

export default new WhisperService();