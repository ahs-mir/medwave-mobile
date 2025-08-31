import ApiService from './ApiService';
import GPTService from './GPTService';
import PDFService from './PDFService';
import { CreateLetterRequest } from '../types';

export interface LetterData {
  patientId: string;
  type: string;
  content: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface GeneratedLetter {
  success: boolean;
  letter?: any;
  error?: string;
  pdfUrl?: string; // Deprecated for iOS flow; web app handles final PDF
}

class LetterService {
  private _apiService: typeof ApiService | null = null;
  private _gptService: typeof GPTService | null = null;

  private get apiService(): typeof ApiService {
    if (!this._apiService) {
      this._apiService = ApiService;
    }
    return this._apiService;
  }

  private get gptService(): typeof GPTService {
    if (!this._gptService) {
      this._gptService = GPTService;
    }
    return this._gptService;
  }

  /**
   * Strip any header/footer scaffolding (contact block, salutations, signatures)
   * that the LLM might still include. Keeps only the body content paragraphs.
   */
  private stripHeadersFooters(rawText: string): string {
    const lines = rawText.split(/\r?\n/).map(l => l.trimEnd());

    const isDiscardableTop = (line: string): boolean => {
      if (!line.trim()) return true;
      const prefixes = [
        'dr.', 'mr.', 'mrs.', 'ms.', 'prof.', 'professor', 'phone', 'tel', 'fax', 'email',
        'address', 'clinic', 'hospital', 'centre', 'center', 'practice', 'gmc', 'md', 'mbbs',
        'date:', 're:', 'dear '
      ];
      const lower = line.toLowerCase();
      if (prefixes.some(p => lower.startsWith(p))) return true;
      // Obvious contact-like lines
      if (lower.includes('@') || /\+?\d[\d\s().-]{6,}/.test(lower)) return true;
      return false;
    };

    const isBodyStart = (line: string): boolean => {
      const starts = [
        'clinical assessment', 'consultation details', 'patient demographics', 'subjective:',
        'objective:', 'assessment:', 'plan:', 'i am writing', 'the patient', 'this is'
      ];
      const lower = line.toLowerCase();
      return starts.some(s => lower.startsWith(s)) || /[A-Za-z]/.test(line) && !isDiscardableTop(line);
    };

    // Drop top scaffolding
    let start = 0;
    while (start < lines.length && (isDiscardableTop(lines[start]) || !isBodyStart(lines[start]))) {
      // Move until we encounter a credible body start
      if (isBodyStart(lines[start])) break;
      start++;
    }

    // Drop footer (salutations/signatures) if present
    const isFooterStart = (line: string): boolean => {
      const lowers = line.toLowerCase();
      return (
        lowers.startsWith('sincerely') || lowers.startsWith('yours') || lowers.startsWith('kind regards') ||
        lowers.startsWith('regards') || lowers.startsWith('best regards')
      );
    };

    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
      if (isFooterStart(lines[i])) { end = i; break; }
    }

    const body = lines.slice(start, end)
      // Remove any lingering Date/Re/Dear lines inside the slice
      .filter(l => {
        const lower = l.toLowerCase();
        return !(/^date:/.test(lower) || /^re:/.test(lower) || /^dear\b/.test(lower));
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return body || rawText.trim();
  }

  // PDF generation is handled in the web app. Keep PDF methods available but
  // do not use them in the iOS generation flow for faster UX.

  /**
   * Generate a clinical letter from voice transcription and save it to the backend
   */
  async generateAndSaveLetter(
    transcription: string,
    patientInfo: any,
    letterType: string = 'consultation',
    priority: 'low' | 'medium' | 'high' = 'medium',
    notes?: string
  ): Promise<GeneratedLetter> {
    try {
      console.log('📝 Starting letter generation process...');
      console.log('👤 Patient:', patientInfo.name);
      console.log('🎤 Transcription length:', transcription.length);

      // Step 1: Generate letter content using GPT based on letter type
      let gptResult;
      switch (letterType) {
        case 'clinical':
          gptResult = await this.gptService.generateClinicalLetter(transcription, patientInfo);
          break;
        case 'consultation':
          gptResult = await this.gptService.generateConsultationLetter(transcription, patientInfo);
          break;
        case 'referral':
          gptResult = await this.gptService.generateClinicalLetter(transcription, patientInfo); // Use clinical for referral
          break;
        case 'discharge':
          gptResult = await this.gptService.generateDischargeLetter(transcription, patientInfo);
          break;
        default:
          gptResult = await this.gptService.generateClinicalLetter(transcription, patientInfo);
      }
      
      if (!gptResult.success) {
        console.error('❌ GPT letter generation failed:', gptResult.error);
        return {
          success: false,
          error: gptResult.error || 'Failed to generate letter content'
        };
      }

      console.log('✅ Letter content generated successfully');

      // Step 2: Save letter to backend
      const bodyOnly = this.stripHeadersFooters(gptResult.text!);

      const letterData: CreateLetterRequest = {
        patientId: typeof patientInfo.id === 'string' ? parseInt(patientInfo.id, 10) : patientInfo.id,
        type: letterType,
        content: bodyOnly,
        priority,
        notes: notes || '',
        status: 'draft'
      };

      console.log('💾 Saving letter to backend...');
      const savedLetter = await this.apiService.createLetter(letterData);
      
      console.log('✅ Letter saved to backend:', savedLetter.id);

      // iOS app: Skip PDF generation for speed. Web handles final PDF.
      return {
        success: true,
        letter: savedLetter
      };

    } catch (error) {
      console.error('❌ Letter generation and save failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Letter generation failed'
      };
    }
  }

  /**
   * Generate a clinical letter with streaming for real-time typing effect
   */
  async *generateLetterStream(
    transcription: string,
    patientInfo: any,
    letterType: string = 'consultation',
    priority: 'low' | 'medium' | 'high' = 'medium',
    notes?: string
  ): AsyncGenerator<{ success: boolean; content?: string; isComplete: boolean; error?: string }> {
    try {
      console.log('📝 Starting streaming letter generation process...');
      console.log('👤 Patient:', patientInfo.name);
      console.log('🎤 Transcription length:', transcription.length);

      // Step 1: Generate letter content using GPT streaming
      let generatedContent = '';
      
      try {
        const gptStream = this.gptService.generateClinicalLetterStream(transcription, patientInfo);
        
        for await (const chunk of gptStream) {
          if (!chunk.success) {
            throw new Error(chunk.error || 'GPT streaming failed');
          }
          
          if (chunk.content) {
            generatedContent += chunk.content; // Accumulate here
            yield {
              success: true,
              content: generatedContent, // Send full accumulated content
              isComplete: false
            };
          }
          
          if (chunk.isComplete) {
            break;
          }
        }
        
        console.log('✅ Streaming letter generation completed');
        
      } catch (streamingError) {
        console.warn('⚠️ Streaming failed, trying fallback method:', streamingError);
        
        // Try fallback non-streaming method
        try {
          const fallbackResult = await this.gptService.generateClinicalLetterFallback(transcription, patientInfo);
          
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
          console.error('❌ Both streaming and fallback failed:', fallbackError);
          throw new Error(`Letter generation failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }

      if (!generatedContent.trim()) {
        yield {
          success: false,
          error: 'No content generated',
          isComplete: true
        };
        return;
      }

      console.log('✅ Letter content generated successfully via streaming');

      // Step 2: Save letter to backend
      const bodyOnly = this.stripHeadersFooters(generatedContent);

      // Create letter data with proper types
      const letterData: CreateLetterRequest = {
        patientId: typeof patientInfo.id === 'string' ? parseInt(patientInfo.id, 10) : patientInfo.id,
        content: generatedContent,
        type: letterType,
        priority: priority,
        notes: notes || '',
        status: 'draft'
      };

      try {
        const savedLetter = await this.apiService.createLetter(letterData);
        console.log('✅ Letter saved successfully:', savedLetter);
        return savedLetter;
      } catch (error) {
        console.error('❌ Failed to save letter:', error);
        throw new Error('Failed to save letter to database');
      }

    } catch (error) {
      console.error('❌ Streaming letter generation failed:', error);
      yield {
        success: false,
        error: error instanceof Error ? error.message : 'Letter generation failed',
        isComplete: true
      };
    }
  }

  /**
   * Get all letters for the current user
   */
  async getLetters(status?: string): Promise<any[]> {
    try {
      return await this.apiService.getLetters(status);
    } catch (error) {
      console.error('❌ Failed to fetch letters:', error);
      throw error;
    }
  }

  /**
   * Get letters for a specific patient
   */
  async getPatientLetters(patientId: string): Promise<any[]> {
    try {
      return await this.apiService.getPatientLetters(patientId);
    } catch (error) {
      console.error('❌ Failed to fetch patient letters:', error);
      throw error;
    }
  }

  /**
   * Get letters that need doctor review
   */
  async getLettersForReview(): Promise<any[]> {
    try {
      return await this.apiService.getLettersForReview();
    } catch (error) {
      console.error('❌ Failed to fetch letters for review:', error);
      throw error;
    }
  }

  /**
   * Get pending letters for secretary processing
   */
  async getPendingLetters(): Promise<any[]> {
    try {
      return await this.apiService.getPendingLetters();
    } catch (error) {
      console.error('❌ Failed to fetch pending letters:', error);
      throw error;
    }
  }

  /**
   * Get a specific letter by ID
   */
  async getLetter(letterId: string): Promise<any> {
    try {
      return await this.apiService.getLetter(letterId);
    } catch (error) {
      console.error('❌ Failed to fetch letter:', error);
      throw error;
    }
  }

  /**
   * Generate PDF for an existing letter
   */
  async generateLetterPDF(): Promise<string> {
    throw new Error('Mobile export is disabled. Please use the web app to export or print letters.');
  }

  /**
   * Share a letter as PDF
   */
  async shareLetterPDF(): Promise<void> {
    throw new Error('Mobile export is disabled. Please use the web app to export or print letters.');
  }

  /**
   * Delete a letter by ID
   */
  async deleteLetter(letterId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deleting letter:', letterId);
      
      const success = await this.apiService.deleteLetter(letterId);
      
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

export default new LetterService(); 