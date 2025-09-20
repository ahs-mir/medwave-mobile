// src/services/AudioService.ts
import * as Audio from 'expo-audio';
import { Platform } from 'react-native';

export interface RecordingResult {
  success: boolean;
  filePath?: string;
  duration?: string;
  error?: string;
}

class AudioService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private recordingUri: string | null = null;

  constructor() {
    console.log('AudioService constructor - Audio object:', Audio);
    console.log('Available Audio methods:', Object.keys(Audio));
    this.setupAudio();
  }

  // Check if recording is supported on this device
  isRecordingSupported(): boolean {
    return !!(Audio && Audio.Recording && Audio.Recording.createAsync);
  }

  private async setupAudio() {
    try {
      // Check if Audio methods are available
      if (Audio.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } else {
        console.warn('Audio.setAudioModeAsync not available, skipping setup');
      }
    } catch (error) {
      console.error('Audio setup error:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // For now, assume permission is granted to avoid native module issues
      // In a production app, you would implement proper permission handling
      console.log('Permission check - assuming granted for development');
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async startRecording(patientId?: string): Promise<RecordingResult> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return { success: false, error: 'Microphone permission denied' };
      }

      if (this.isRecording) {
        return { success: false, error: 'Already recording' };
      }

      // Check if Audio.Recording is available
      if (!Audio.Recording || !Audio.Recording.createAsync) {
        console.error('Audio.Recording.createAsync not available');
        return { success: false, error: 'Recording functionality not available' };
      }

      // Create recording using the new expo-audio API
      this.recording = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.isRecording = true;
      console.log('Recording started successfully');

      return { success: true, filePath: 'Recording in progress...' };
    } catch (error) {
      console.error('Start recording error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      };
    }
  }

  async stopRecording(): Promise<RecordingResult> {
    try {
      if (!this.recording) {
        return { success: false, error: 'No active recording found' };
      }

      // Check if stopAsync method is available
      if (!this.recording.stopAsync) {
        console.error('Recording.stopAsync not available');
        this.isRecording = false;
        return { success: false, error: 'Recording stop functionality not available' };
      }

      // Stop recording using the new expo-audio API
      await this.recording.stopAsync();
      const uri = this.recording.getURI ? this.recording.getURI() : null;
      
      // Get duration from the recording
      const durationMillis = this.recording.durationMillis || 0;
      const durationSeconds = Math.floor(durationMillis / 1000);
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      this.recordingUri = uri;
      this.isRecording = false;

      console.log('Recording stopped successfully');

      return {
        success: true,
        filePath: uri || '',
        duration: formattedDuration
      };
    } catch (error) {
      console.error('Stop recording error:', error);
      this.isRecording = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      };
    }
  }

  getCurrentRecordingPath(): string {
    return this.recordingUri || '';
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  resetRecording(): void {
    this.isRecording = false;
    this.recording = null;
    this.recordingUri = null;
  }

  dispose(): void {
    if (this.isRecording && this.recording) {
      try {
        // Properly handle async cleanup to prevent crashes
        this.recording.stopAsync().catch(console.error);
      } catch (error) {
        console.error('Error stopping recording during dispose:', error);
      }
    }
    this.isRecording = false;
    this.recording = null;
    this.recordingUri = null;
  }
}

export default new AudioService();