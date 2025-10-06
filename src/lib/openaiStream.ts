// src/lib/openaiStream.ts
import EventSource from "react-native-sse";
import { fetch } from 'expo/fetch';
import ApiService from "../services/ApiService";

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
    const url = "https://slippery-glass-production.up.railway.app/api/ai/generate-letter-stream";

    const body = JSON.stringify({
      prompt,
      patientInfo: patientContext,
      letterType,
      model: "gpt-4o-mini",
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
          console.log('✅ Backend streaming completed');
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
export function streamOpenAI(args: StreamArgs & { systemRole?: string }): () => void {
  const { prompt, onToken, onEnd, onError, model = 'gpt-4o-mini', systemRole } = args;
  
  console.log('🚀 streamOpenAI called with:', { promptLength: prompt.length, model, hasSystemRole: !!systemRole });
  
  let isActive = true;
  let xhr: XMLHttpRequest | null = null;

  const cleanup = () => {
    isActive = false;
    if (xhr) {
      xhr.abort();
      xhr = null;
    }
  };

  // Start the streaming process
  (async () => {
    try {
      // Get auth token for backend API
      const token = await ApiService.getToken();
      if (!token || !token.trim()) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Use backend streaming endpoint
      const url = "https://slippery-glass-production.up.railway.app/api/ai/generate-letter-stream";

      const body = JSON.stringify({
        prompt,
        patientInfo: "",
        letterType: "consultation",
        model,
        systemRole: systemRole || undefined
      });

      console.log('🚀 streamOpenAI: Starting XMLHttpRequest streaming connection');

      xhr = new XMLHttpRequest();
      let receivedLength = 0;
      let buffer = '';

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // React Native XMLHttpRequest doesn't reliably fire onprogress for streaming
      // Use a polling approach instead
      const pollResponse = () => {
        if (!isActive || !xhr) return;

        const currentLength = xhr.responseText.length;
        if (currentLength > receivedLength) {
          // Extract only new data since last update
          const newData = xhr.responseText.substring(receivedLength);
          receivedLength = currentLength;
          buffer += newData;

          console.log(`📥 Received ${newData.length} new chars, total: ${currentLength}`);

          // Process complete lines (SSE format)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          lines.forEach((line) => {
            if (!isActive) return;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove 'data: ' prefix
              
              if (!data.trim()) return;
              
              try {
                const json = JSON.parse(data);
                
                if (!json.success) {
                  console.error('❌ streamOpenAI: Backend streaming error:', json.error);
                  if (onError) onError(json.error || 'Backend streaming failed');
                  cleanup();
                  return;
                }

                if (json.isComplete) {
                  console.log('✅ streamOpenAI: Backend streaming completed');
                  if (onEnd) onEnd();
                  cleanup();
                  return;
                }

                // Handle backend streaming format
                const text: string = json.content || "";

                if (text && onToken) {
                  console.log(`🔥 streamOpenAI: Token received: "${text}" (${text.length} chars)`);
                  onToken(text);
                }
              } catch (parseError) {
                console.log('🔍 streamOpenAI: JSON parse error (likely keepalive):', parseError);
              }
            }
          });
        }

        // Continue polling if request is still active
        if (xhr.readyState !== 4 && isActive) {
          setTimeout(pollResponse, 100); // Poll every 100ms
        }
      };

      // Start polling after a short delay to let the request begin
      setTimeout(pollResponse, 200);

      xhr.onprogress = () => {
        // Fallback: if onprogress does fire, also trigger polling
        if (isActive) pollResponse();
      };

      xhr.onloadend = () => {
        if (!isActive || !xhr) return;

        // Process any remaining data in buffer
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const json = JSON.parse(data);
                if (json.isComplete) {
                  console.log('✅ streamOpenAI: Stream completed via onloadend');
                  if (onEnd) onEnd();
                }
              } catch (parseError) {
                console.log('🔍 Final buffer parse error:', parseError);
              }
            }
          }
        }

        if (onEnd && isActive) {
          console.log('✅ streamOpenAI: Stream completed');
          onEnd();
        }
        cleanup();
      };

      xhr.onerror = () => {
        if (!isActive || !xhr) return;
        
        console.error('❌ streamOpenAI: XMLHttpRequest error');
        if (onError) onError('Network error occurred');
        cleanup();
      };

      xhr.onreadystatechange = () => {
        if (!isActive || !xhr) return;
        
        if (xhr.readyState === 4) {
          if (xhr.status !== 200) {
            console.error(`❌ streamOpenAI: HTTP ${xhr.status}: ${xhr.statusText}`);
            if (onError) onError(`HTTP ${xhr.status}: ${xhr.statusText}`);
            cleanup();
          }
        }
      };

      // Send the request
      const requestBody = JSON.stringify({
        prompt,
        patientInfo: { name: 'Patient' }, // Default patient info
        letterType: 'consultation',
        model
      });

      console.log('📤 streamOpenAI: Sending request...');
      xhr.send(requestBody);

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
