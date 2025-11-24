// src/lib/openaiStream.ts
import EventSource from "react-native-sse";
import { fetch } from 'expo/fetch';
import ApiService from "../services/ApiService";
import Constants from 'expo-constants';
import { API_BASE_URL } from '@env';

// Priority: expo-constants (set in app.config.js) > .env file > production fallback
const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  API_BASE_URL ||
  'https://slippery-glass-production.up.railway.app/api'; // Production fallback

type ChunkHandler = (text: string) => void;

type StreamArgs = {
  prompt: string;
  onToken: ChunkHandler;
  onEnd?: () => void;
  onError?: (e: any) => void;
  model?: string;
};

export async function streamLetterGeneration(
  prompt: string,
  patientContext: string,
  letterType: string,
  onToken: (token: string) => void,
  onComplete: (content: string) => void,
  onError: (error: string) => void,
  systemRole?: string
): Promise<void> {
  try {
    // Get auth token for backend API
    const token = await ApiService.getToken();
    if (!token || !token.trim()) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Use backend streaming endpoint instead of direct OpenAI
    const url = `${BASE_URL}/ai/generate-letter-stream`;

    const body = JSON.stringify({
      prompt,
      patientInfo: patientContext,
      letterType,
      // Model is now configured in backend app_settings - don't override it
      systemRole: systemRole || undefined
    });

    const headers: Record<string, any> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    };

    console.log('🚀 Starting backend streaming connection:', { url, letterType });

    const es = new EventSource(url, {
      method: "POST",
      headers,
      body,
    });

    es.addEventListener("message", (evt) => {
      try {
        const data = evt?.data;
        if (!data) return;
        
        const json = JSON.parse(data);
        
        if (!json.success) {
          console.error('❌ Backend streaming error:', json.error);
          onError(json.error || 'Backend streaming failed');
          es.close();
          return;
        }

        if (json.isComplete) {
          const modelUsed = json.model || 'unknown';
          const modelSource = json.modelSource || 'unknown';
          console.log(`✅ Backend streaming completed using AI Model: ${modelUsed} (from ${modelSource})`);
          onComplete("Stream completed");
          es.close();
          return;
        }

        // Handle backend streaming format
        const text: string = json.content || "";

        if (text) {
          console.log(`🔥 Backend SSE Token received: "${text}" (${text.length} chars)`);
          onToken(text);
        }
      } catch (error) {
        // ignore keepalives/comments that aren't JSON
        console.log('🔍 SSE parse error (likely keepalive):', error);
      }
    });

    es.addEventListener("error", (e) => {
      const errorMessage = e instanceof ErrorEvent ? e.message : 'Stream error occurred';
      onError(errorMessage);
      es.close();
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    onError(errorMessage);
  }
}

// Export streamOpenAI function for backward compatibility with SimpleStreamingService
// Use EventSource for proper SSE support instead of XMLHttpRequest polling
export function streamOpenAI(args: StreamArgs & { systemRole?: string; patientInfo?: any; letterType?: string }): () => void {
  // Model is now configured in backend app_settings - don't override it
  const { prompt, onToken, onEnd, onError, systemRole, patientInfo, letterType } = args;
  
  console.log('🚀 streamOpenAI called with:', { 
    promptLength: prompt.length, 
    hasSystemRole: !!systemRole, 
    hasPatientInfo: !!patientInfo,
    letterType: letterType || 'consultation',
    note: 'Using EventSource for SSE streaming' 
  });
  
  let isActive = true;
  let es: EventSource | null = null;

  const cleanup = () => {
    isActive = false;
    if (es) {
      es.close();
      es = null;
    }
  };

  // Start the streaming process using EventSource (proper SSE support)
  (async () => {
    try {
      // Get auth token for backend API
      const token = await ApiService.getToken();
      if (!token || !token.trim()) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Use backend streaming endpoint
      const url = `${BASE_URL}/ai/generate-letter-stream`;

      // Use provided patientInfo and letterType, or fallback to defaults
      const requestBody = JSON.stringify({
        prompt,
        patientInfo: patientInfo || { name: 'Patient' },
        letterType: letterType || 'consultation',
        systemRole: systemRole || undefined
      });

      const headers: Record<string, any> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      };

      console.log('🚀 streamOpenAI: Starting EventSource streaming connection');

      es = new EventSource(url, {
        method: "POST",
        headers,
        body: requestBody,
      });

      es.addEventListener("message", (evt) => {
        if (!isActive) return;
        
        try {
          const data = evt?.data;
          if (!data) return;
          
          const json = JSON.parse(data);
          
          if (!json.success) {
            console.error('❌ streamOpenAI: Backend streaming error:', json.error);
            if (onError) onError(json.error || 'Backend streaming failed');
            cleanup();
            return;
          }

          if (json.isComplete) {
            console.log('✅ streamOpenAI: Stream completed');
            if (onEnd) onEnd();
            cleanup();
            return;
          }

          // Handle backend streaming format
          const text: string = json.content || "";

          if (text && onToken) {
            onToken(text);
          }
        } catch (error) {
          // ignore keepalives/comments that aren't JSON
          console.log('🔍 streamOpenAI: SSE parse error (likely keepalive):', error);
        }
      });

      es.addEventListener("error", (e) => {
        if (!isActive) return;
        
        const errorMessage = e instanceof ErrorEvent ? e.message : 'Stream error occurred';
        console.error('❌ streamOpenAI: EventSource error:', errorMessage);
        if (onError) onError(errorMessage);
        cleanup();
      });

    } catch (error) {
      if (!isActive) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ streamOpenAI: XMLHttpRequest setup error:', errorMessage);
      if (onError) onError(errorMessage);
      cleanup();
    }
  })();

  // Return cleanup function
  return cleanup;
}
