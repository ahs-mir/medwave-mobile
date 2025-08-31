import PromptLoader, { PromptConfig as ConfigurablePromptConfig } from './promptLoader';

// Legacy interfaces for backward compatibility
export interface PromptConfig {
  systemRole: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface LetterPromptConfig {
  [key: string]: PromptConfig;
}

export interface TranscriptionPromptConfig {
  whisper: string;
  ocr: string;
}

export interface ImprovementPromptConfig {
  proofread: PromptConfig;
  format: PromptConfig;
}

// Legacy prompts - now loaded from configurable files
// These are kept for backward compatibility but will be deprecated
export const LETTER_PROMPTS: LetterPromptConfig = {
  clinical: {
    systemRole: "You are a medical letter generator for doctors. Generate professional clinical letters using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax like ** or ##.",
    userPrompt: `Patient Information:
- Name: {{patientName}}
- MRN: {{patientMRN}}
- Age: {{patientAge}}
- Primary Condition: {{patientCondition}}
- Date: {{currentDate}}

Consultation Notes:
{{transcription}}

Dear {{Referring_Doctor_Name}},

<strong>{{Patient_Full_Name}}</strong> DOB: {{Patient_DOB}} MRN: {{Patient_MRN}}
{{Patient_Address}}
Tel: {{Patient_Tel}}

Thank you for asking me to see {{Patient_First_Name}}, a {{Patient_Age}}-year-old {{gender descriptor e.g., gentleman/lady}} with a medical history including {{Key_Comorbidities}}.

<h3>History & Presentation:</h3>
<p>{{Narrative history of presenting complaint, symptom description, relevant context, and previous care/specialists.}}</p>

<h3>Past Medical History:</h3>
<p>• {{Condition_1}}<br>
• {{Condition_2}}<br>
• {{Condition_3}}<br>
• {{Etc}}</p>

<h3>Medications:</h3>
<p>• {{Medication_1}}<br>
• {{Medication_2}}<br>
• {{Medication_3}}<br>
• {{Etc}}</p>

<h3>Investigations:</h3>
<p>• {{Investigation_1 with result}}<br>
• {{Investigation_2 with result}}<br>
• {{Investigation_3 with result}}</p>

<h3>Examination:</h3>
<p>• {{Examination finding 1}}<br>
• {{Examination finding 2}}<br>
• {{Examination finding 3}}</p>

<h3>Assessment:</h3>
<p>{{Provide a summary interpretation of the findings, suspected diagnosis or contributing factors. Keep the tone formal and clear.}}</p>

<h3>Plan:</h3>
<p>• {{Plan_Item_1}}<br>
• {{Plan_Item_2}}<br>
• {{Plan_Item_3}}<br>
• {{Plan_Item_4}}</p>`,
    temperature: 0.7,
    maxTokens: 2000
  },

  consultation: {
    systemRole: "You are a medical letter generator for doctors. Generate the BODY of a professional consultation letter using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax.",
    userPrompt: `Patient Information:
- Name: {{patientName}}
- MRN: {{patientMRN}}
- Age: {{patientAge}}
- Primary Condition: {{patientCondition}}
- Date: {{currentDate}}

Consultation Notes:
{{transcription}}

Please create a comprehensive consultation letter BODY with clean, professional HTML formatting. Use paragraph text with optional section headings only. Include these sections in order, but DO NOT include any greeting or closing/signature:

<p><strong>Patient Demographics:</strong> {{patientName}}; MRN {{patientMRN}}; Age {{patientAge}}; Primary Condition {{patientCondition}}.</p>

<h3>Clinical Assessment:</h3>
<p>[Detailed clinical assessment based on transcription]</p>

<h3>Diagnostic Findings:</h3>
<p>[Diagnostic findings and test results based on transcription]</p>

<h3>Treatment Plan:</h3>
<p>[Comprehensive treatment plan based on transcription]</p>

<h3>Follow-up Recommendations:</h3>
<p>[Follow-up recommendations and monitoring plan based on transcription]</p>

Output only the body paragraphs with HTML formatting. No header, no footer, no placeholders, no salutations, no signature.`,
    temperature: 0.7,
    maxTokens: 1800
  },

  soap: {
    systemRole: "You are a medical professional. Convert this consultation into a professional SOAP note format using HTML tags. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs.",
    userPrompt: `Patient: {{patientName}} ({{patientAge}}y)
Condition: {{patientCondition}}

Consultation transcription:
{{transcription}}

Please format as a proper SOAP note using HTML:

<h3><strong>SUBJECTIVE:</strong></h3>
<p>[Content here]</p>

<h3><strong>OBJECTIVE:</strong></h3>
<p>[Content here]</p>

<h3><strong>ASSESSMENT:</strong></h3>
<p>[Content here]</p>

<h3><strong>PLAN:</strong></h3>
<p>[Content here]</p>

Use proper medical terminology and HTML formatting.`,
    temperature: 0.6,
    maxTokens: 1000
  },

  generic: {
    systemRole: "You are a medical letter generator for doctors. Generate the BODY of a professional clinical letter using HTML tags for formatting. Use <strong> for bold text, <h3> for section headings, and <p> for paragraphs. Do NOT use markdown syntax.",
    userPrompt: `Patient Information:
- Name: {{patientName}}
- MRN: {{patientMRN}}
- Age: {{patientAge}}
- Primary Condition: {{patientCondition}}
- Date: {{currentDate}}

Consultation Notes:
{{transcription}}

Please create a comprehensive letter BODY with clean, professional HTML formatting. Use paragraph text with optional section headings only. Include these sections in order, but DO NOT include any greeting or closing/signature:

<p><strong>Patient Demographics:</strong> {{patientName}}; MRN {{patientMRN}}; Age {{patientAge}}; Primary Condition {{patientCondition}}.</p>

<h3>Clinical Assessment:</h3>
<p>[Detailed clinical assessment based on transcription]</p>

<h3>Diagnostic Findings:</h3>
<p>[Diagnostic findings and test results based on transcription]</p>

<h3>Treatment Plan:</h3>
<p>[Comprehensive treatment plan based on transcription]</p>

<h3>Follow-up Recommendations:</h3>
<p>[Follow-up recommendations and monitoring plan based on transcription]</p>

Output only the body paragraphs with HTML formatting. No header, no footer, no placeholders, no salutations, no signature.`,
    temperature: 0.7,
    maxTokens: 1500
  }
};

// Transcription Prompts
export const TRANSCRIPTION_PROMPTS: TranscriptionPromptConfig = {
  whisper: "Medical consultation with clinical terminology.",
  ocr: "Extract patient information from this text, focusing on medical details, patient demographics, and clinical findings. Format as structured data."
};

// Text Improvement Prompts
export const IMPROVEMENT_PROMPTS: ImprovementPromptConfig = {
  proofread: {
    systemRole: "You are a medical text editor. Review and improve the following clinical letter for grammar, clarity, and medical terminology accuracy.",
    userPrompt: "Please proofread and minimally improve the following medical letter while maintaining all clinical details and the doctor's original intent:\n\n{content}",
    temperature: 0.3,
    maxTokens: 1000
  },
  format: {
    systemRole: "You are a medical letter formatter. Convert the following text into a properly formatted medical letter with appropriate HTML structure.",
    userPrompt: "Please format the following medical text into a professional letter structure with proper HTML formatting:\n\n{content}",
    temperature: 0.2,
    maxTokens: 800
  }
};

// NEW: Configurable prompt loading functions
let promptLoader: PromptLoader | null = null;

/**
 * Get the prompt loader instance
 */
function getPromptLoader(): PromptLoader {
  if (!promptLoader) {
    promptLoader = PromptLoader.getInstance();
  }
  return promptLoader;
}

/**
 * Load a prompt from the configurable system
 * Falls back to legacy prompts if configurable prompt fails
 */
export async function loadPrompt(promptId: string): Promise<PromptConfig | null> {
  // TEMPORARILY DISABLED: Use legacy prompts to fix letter type swapping issue
  console.log(`⚠️ Configurable prompts temporarily disabled, using legacy prompt: ${promptId}`);
  return LETTER_PROMPTS[promptId] || null;
  
  /* Original code commented out until we fix the prompt loading issue
  try {
    const loader = getPromptLoader();
    const prompt = await loader.loadPrompt(promptId);
    if (prompt) {
      return {
        systemRole: prompt.systemRole,
        userPrompt: prompt.userPrompt,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens
      };
    }
  } catch (error) {
    console.warn(`Failed to load configurable prompt ${promptId}, falling back to legacy:`, error);
  }

  // Fallback to legacy prompts
  return LETTER_PROMPTS[promptId] || null;
  */
}

/**
 * Get all available prompt types
 */
export async function getAvailablePromptTypes(): Promise<string[]> {
  try {
    const loader = getPromptLoader();
    const index = await loader.loadPromptIndex();
    return index.prompts.filter(p => p.isActive).map(p => p.id);
  } catch (error) {
    console.warn('Failed to load prompt index, using legacy types:', error);
    return Object.keys(LETTER_PROMPTS);
  }
}

/**
 * Get prompt metadata for UI display
 */
export async function getPromptMetadata(promptId: string): Promise<{
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
} | null> {
  try {
    const loader = getPromptLoader();
    return await loader.getPromptMetadata(promptId);
  } catch (error) {
    console.warn(`Failed to get prompt metadata for ${promptId}:`, error);
    return null;
  }
}

// Legacy helper functions (maintained for backward compatibility)
export function replacePromptPlaceholders(prompt: string, replacements: Record<string, string>): string {
  let result = prompt;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

export function getPatientPrompt(promptType: string, patientInfo: any, transcription: string): string {
  const prompt = LETTER_PROMPTS[promptType];
  if (!prompt) {
    throw new Error(`Unknown prompt type: ${promptType}`);
  }

  const replacements = {
    patientName: patientInfo.name || 'Unknown Patient',
    patientMRN: patientInfo.medicalNumber || patientInfo.id || 'N/A',
    patientAge: patientInfo.age || 'N/A',
    patientCondition: patientInfo.condition || 'General consultation',
    currentDate: new Date().toLocaleDateString(),
    transcription: transcription || ''
  };

  return replacePromptPlaceholders(prompt.userPrompt, replacements);
}

// NEW: Enhanced patient prompt function that uses configurable prompts
export async function getPatientPromptAsync(promptType: string, patientInfo: any, transcription: string): Promise<string> {
  try {
    const prompt = await loadPrompt(promptType);
    if (!prompt) {
      throw new Error(`Unknown prompt type: ${promptType}`);
    }

    const replacements = {
      patientName: patientInfo.name || 'Unknown Patient',
      patientMRN: patientInfo.medicalNumber || patientInfo.id || 'N/A',
      patientAge: patientInfo.age || 'N/A',
      patientCondition: patientInfo.condition || 'General consultation',
      currentDate: new Date().toLocaleDateString(),
      transcription: transcription || ''
    };

    return replacePromptPlaceholders(prompt.userPrompt, replacements);
  } catch (error) {
    console.warn(`Failed to load configurable prompt ${promptType}, using legacy:`, error);
    return getPatientPrompt(promptType, patientInfo, transcription);
  }
}
