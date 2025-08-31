// src/services/GPTService.ts
import { streamOpenAI } from '../lib/openaiStream';
import StorageService from './StorageService';
import { LETTER_PROMPTS, IMPROVEMENT_PROMPTS, getPatientPrompt } from '../config/aiPrompts';
import { loadPrompt, replacePromptPlaceholders } from '../config/aiPrompts';

export interface GPTResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface StreamingLetterResponse {
  success: boolean;
  content?: string;
  isComplete: boolean;
  error?: string;
}

class GPTService {
  // Remove hardcoded fallback API key - only use user-provided keys
  private async getApiKey(): Promise<string> {
    try {
      const storedKey = await StorageService.getOpenAIKey();
      if (storedKey && storedKey.trim()) {
        console.log('🔑 Using stored OpenAI API key');
        return storedKey;
      }
      
      // No fallback key - require user to configure
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    } catch (error) {
      console.error('Error getting API key:', error);
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    }
  }

  async exportLetter(content: string, options?: any): Promise<GPTResult> {
    try {
      console.log('📝 Exporting clinical letter...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      const prompt = IMPROVEMENT_PROMPTS.format.userPrompt.replace('{{text}}', content);

      return new Promise((resolve) => {
        let accumulatedText = '';
        
        const cancel = streamOpenAI({
          prompt,
          onToken: (text) => {
            accumulatedText += text;
          },
          onEnd: () => {
            resolve({
              success: true,
              text: accumulatedText.trim()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to export letter'
            });
          }
        });
      });
    } catch (error) {
      console.error('Error in exportLetter:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export letter'
      };
    }
  }

  async improveTranscription(transcription: string, patientInfo?: any): Promise<GPTResult> {
    try {
      console.log('✨ Improving transcription with GPT-4o-mini...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      const prompt = IMPROVEMENT_PROMPTS.proofread.userPrompt.replace('{{text}}', transcription);

      return new Promise((resolve) => {
        let accumulatedText = '';
        
        const cancel = streamOpenAI({
          prompt,
          onToken: (text) => {
            accumulatedText += text;
          },
          onEnd: () => {
            resolve({
              success: true,
              text: accumulatedText.trim()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Text improvement failed'
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Text improvement failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text improvement failed'
      };
    }
  }

  async generateClinicalLetter(transcription: string, patientInfo: any): Promise<GPTResult> {
    try {
      console.log('📋 Generating clinical letter with GPT-4o-mini...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      // Load the configured clinical prompt with system role
      let prompt: string;
      let systemRole: string;
      
      try {
        const promptConfig = await loadPrompt('clinical');
        if (promptConfig) {
          // Use the configured prompt
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
          console.log('✅ Using configured clinical prompt with system role');
        } else {
          throw new Error('Failed to load clinical prompt configuration');
        }
      } catch (error) {
        console.warn('⚠️ Failed to load configured prompt, using fallback:', error);
        // Fallback to legacy method
        prompt = getPatientPrompt('clinical', patientInfo, transcription);
        systemRole = "You are a medical letter generator for doctors. Generate professional clinical letters using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax like ** or ##.";
      }

      return new Promise((resolve) => {
        let accumulatedText = '';
        
        const cancel = streamOpenAI({
          prompt,
          systemRole,
          onToken: (text) => {
            accumulatedText += text;
          },
          onEnd: () => {
            resolve({
              success: true,
              text: accumulatedText.trim()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Clinical letter generation failed'
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Clinical letter generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clinical letter generation failed'
      };
    }
  }

  async generateConsultationLetter(transcription: string, patientInfo: any): Promise<GPTResult> {
    try {
      console.log('📋 Generating consultation letter with GPT-4o-mini...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      // Load the configured consultation prompt with system role
      let prompt: string;
      let systemRole: string;
      
      try {
        const promptConfig = await loadPrompt('consultation');
        if (promptConfig) {
          // Use the configured prompt
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
          console.log('✅ Using configured consultation prompt with system role');
        } else {
          throw new Error('Failed to load consultation prompt configuration');
        }
      } catch (error) {
        console.warn('⚠️ Failed to load configured prompt, using fallback:', error);
        // Fallback to hardcoded prompt
        prompt = `Generate the BODY of a professional consultation letter with detailed paragraphs (NO header, NO contact block, NO salutations or signatures, and NO placeholders) based on this information:

Patient Information:
- Name: ${patientInfo.name}
- MRN: ${patientInfo.medicalNumber || patientInfo.id}
- Age: ${patientInfo.age || 'N/A'}
- Primary Condition: ${patientInfo.condition || 'General consultation'}
- Date: ${new Date().toLocaleDateString()}

Consultation Notes:
${transcription}

Please create detailed body paragraphs only with optional section headings. Include:

Patient Demographics (inline): ${patientInfo.name}; MRN ${patientInfo.medicalNumber || patientInfo.id}; Age ${patientInfo.age || 'N/A'}; Primary Condition ${patientInfo.condition || 'General consultation'}.

Consultation Details:
[Intro and chief complaint]

[History of present illness]

[Exam findings]

[Assessment and differential]

[Treatment recommendations]

[Follow-up plan]

Output only the body paragraphs (plain text). No header, no footer, no placeholders, no salutations, no signature.`;
        systemRole = "You are a medical letter generator for doctors. Generate the BODY of a professional consultation letter using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax.";
      }

      return new Promise((resolve) => {
        let accumulatedText = '';
        
        const cancel = streamOpenAI({
          prompt,
          systemRole,
          onToken: (text) => {
            accumulatedText += text;
          },
          onEnd: () => {
            resolve({
              success: true,
              text: accumulatedText.trim()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Consultation letter generation failed'
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Consultation letter generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Consultation letter generation failed'
      };
    }
  }

  async generateDischargeLetter(transcription: string, patientInfo: any): Promise<GPTResult> {
    try {
      console.log('📋 Generating discharge letter with GPT-4o-mini...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      // Load the configured discharge prompt with system role
      let prompt: string;
      let systemRole: string;
      
      try {
        const promptConfig = await loadPrompt('discharge');
        if (promptConfig) {
          // Use the configured prompt
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
          console.log('✅ Using configured discharge prompt with system role');
        } else {
          throw new Error('Failed to load discharge prompt configuration');
        }
      } catch (error) {
        console.warn('⚠️ Failed to load configured prompt, using fallback:', error);
        // Fallback to hardcoded prompt
        prompt = `You are a medical letter generator for doctors. Using the dictated notes, produce a professional discharge summary letter in the following structure and tone. Replace the placeholders with the provided patient and doctor details.

Patient Information:
- Name: ${patientInfo.name}
- MRN: ${patientInfo.medicalNumber || patientInfo.id}
- Age: ${patientInfo.age || 'N/A'}
- Primary Condition: ${patientInfo.condition || 'General consultation'}
- Date: ${new Date().toLocaleDateString()}

Consultation Notes:
${transcription}

Dear {{Referring_Doctor_Name}},

{{Patient_Full_Name}} DOB: {{Patient_DOB}} MRN: {{Patient_MRN}}
{{Patient_Address}}
Tel: {{Patient_Tel}}

Date of Admission: {{Admission_Date}}
Date of Discharge: {{Discharge_Date}}

Discharge Diagnosis:
• {{Diagnosis_1}}
• {{Diagnosis_2}}
• {{Diagnosis_3}}

Presenting Complaint:
{{Narrative summary of presenting complaint, reason for admission, and initial management.}}

Background History:
• {{Condition_1}}
• {{Condition_2}}
• {{Condition_3}}

Investigations:
• {{Investigation_1 with result}}
• {{Investigation_2 with result}}
• {{Investigation_3 with result}}

Discharge Medication:
• {{Medication_1}}
• {{Medication_2}}
• {{Medication_3}}

Follow-up Plan / Recommendations:
• {{Followup_Item_1}}
• {{Followup_Item_2}}

Yours sincerely,

{{Doctor_Name}}
Consultant {{Specialty}}`;
        systemRole = "You are a medical letter generator for doctors. Generate a professional discharge summary letter using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax.";
      }

      return new Promise((resolve) => {
        let accumulatedText = '';
        
        const cancel = streamOpenAI({
          prompt,
          systemRole,
          onToken: (text) => {
            accumulatedText += text;
          },
          onEnd: () => {
            resolve({
              success: true,
              text: accumulatedText.trim()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Discharge letter generation failed'
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Discharge letter generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Discharge letter generation failed'
      };
    }
  }

  async generateSOAPNote(transcription: string, patientInfo: any): Promise<GPTResult> {
    try {
      console.log('📝 Generating SOAP note with GPT-4o-mini...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.'
        };
      }

      const prompt = `Convert this consultation into a professional SOAP note format:

Patient: ${patientInfo.name} (${patientInfo.age}y)
Condition: ${patientInfo.condition}

Consultation transcription:
${transcription}

Please format as a proper SOAP note:
SUBJECTIVE:
OBJECTIVE:
ASSESSMENT:
PLAN:

Use proper medical terminology and formatting.`;

      return new Promise((resolve) => {
        let accumulatedText = '';
        
        const cancel = streamOpenAI({
          prompt,
          onToken: (text) => {
            accumulatedText += text;
          },
          onEnd: () => {
            resolve({
              success: true,
              text: accumulatedText.trim()
            });
          },
          onError: (error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'SOAP note generation failed'
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ SOAP note generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SOAP note generation failed'
      };
    }
  }

  /**
   * Generate clinical letter with streaming for real-time typing effect
   * Now using SSE with react-native-sse
   */
  async *generateClinicalLetterStream(transcription: string, patientInfo: any): AsyncGenerator<StreamingLetterResponse> {
    try {
      console.log('📋 Starting SSE streaming for clinical letter generation...');

      const apiKey = await this.getApiKey();
      if (!apiKey) {
        yield {
          success: false,
          error: 'OpenAI API key not configured. Please add your API key in Settings.',
          isComplete: true
        };
        return;
      }

      // Load the configured clinical prompt with system role
      let prompt: string;
      let systemRole: string;
      
      try {
        const promptConfig = await loadPrompt('clinical');
        if (promptConfig) {
          // Use the configured prompt
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
          console.log('✅ Using configured clinical prompt with system role');
        } else {
          throw new Error('Failed to load clinical prompt configuration');
        }
      } catch (error) {
        console.warn('⚠️ Failed to load configured prompt, using fallback:', error);
        // Fallback to hardcoded prompt
        prompt = `Generate the BODY of a professional clinical letter based on this information (NO header, NO contact block, NO salutations like Dear/Sincerely, NO signature lines, and NO placeholders like [Your Name]):

Patient Information:
- Name: ${patientInfo.name}
- MRN: ${patientInfo.medicalNumber || patientInfo.id}
- Age: ${patientInfo.age || 'N/A'}
- Primary Condition: ${patientInfo.condition || 'General consultation'}
- Date: ${new Date().toLocaleDateString()}

Consultation Notes:
${transcription}

Please create a comprehensive letter BODY with clean, professional formatting. Use paragraph text with optional section headings only. Include these sections in order, but DO NOT include any greeting or closing/signature:

Patient Demographics (inline): ${patientInfo.name}; MRN ${patientInfo.medicalNumber || patientInfo.id}; Age ${patientInfo.age || 'N/A'}; Primary Condition ${patientInfo.condition || 'General consultation'}.

Clinical Assessment:
[Detailed clinical assessment based on transcription]

Diagnostic Findings:
[Diagnostic findings and test results based on transcription]

Treatment Plan:
[Comprehensive treatment plan based on transcription]

Follow-up Recommendations:
[Follow-up recommendations and monitoring plan based on transcription]

Output only the body paragraphs (plain text). No header, no footer, no placeholders, no salutations, no signature.`;
        systemRole = "You are a medical letter generator for doctors. Generate professional clinical letters using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax like ** or ##.";
      }

      // Use SSE streaming
      let cancelStream: (() => void) | null = null;

      try {
        // Create a proper async generator for streaming
        const generator = async function*() {
          let chunkCount = 0;
          
          cancelStream = streamOpenAI({
            prompt,
            systemRole,
            onToken: (text) => {
              chunkCount++;
              console.log(`📝 SSE Content chunk ${chunkCount}:`, text.length, 'chars:', text.substring(0, 30) + '...');
            },
            onEnd: () => {
              console.log('✅ SSE streaming completed');
            },
            onError: (error) => {
              console.error('❌ SSE streaming error:', error);
            }
          });
        };
        
        // Yield from the generator
        yield* generator();
        
      } catch (streamingError) {
        console.warn('⚠️ SSE streaming failed, trying fallback method:', streamingError);
        
        // Fallback to non-streaming method
        try {
          const fallbackResult = await this.generateClinicalLetter(transcription, patientInfo);
          
          if (!fallbackResult.success) {
            throw new Error(fallbackResult.error || 'Fallback generation failed');
          }
          
          // Yield the complete content from fallback
          yield {
            success: true,
            content: fallbackResult.text || '',
            isComplete: true
          };
          
          console.log('✅ Fallback letter generation completed');
          
        } catch (fallbackError) {
          console.error('❌ Both SSE and fallback failed:', fallbackError);
          throw new Error(`Letter generation failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      console.error('❌ Streaming clinical letter generation failed:', error);
      yield {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isComplete: true
      };
    }
  }

  /**
   * Fallback non-streaming method if streaming fails completely
   */
  async generateClinicalLetterFallback(transcription: string, patientInfo: any): Promise<GPTResult> {
    return this.generateClinicalLetter(transcription, patientInfo);
  }

  /**
   * Test API connectivity and key validity
   */
  async testAPIConnectivity(): Promise<boolean> {
    try {
      console.log('🧪 Testing OpenAI API connectivity...');
      
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        console.error('❌ No API key available');
        return false;
      }

      // Test with a simple prompt
      return new Promise((resolve) => {
        const cancel = streamOpenAI({
          prompt: 'Hello',
          onToken: (text) => {
            // Received token, API is working
          },
          onEnd: () => {
            console.log('✅ API connectivity test passed');
            resolve(true);
          },
          onError: (error) => {
            console.error('❌ API connectivity test failed:', error);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('❌ API connectivity test error:', error);
      return false;
    }
  }
}

export default new GPTService();