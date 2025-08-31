# AI Prompts Configuration

This directory contains centralized configuration for all AI prompts used in the iOS app.

## File Structure

- `aiPrompts.ts` - Main configuration file with all prompts
- `README.md` - This documentation file

## How to Modify Prompts

### 1. Letter Generation Prompts

All letter generation prompts are defined in `LETTER_PROMPTS`:

```typescript
export const LETTER_PROMPTS: LetterPromptConfig = {
  clinical: {
    systemRole: "You are a medical letter generator...",
    userPrompt: `Patient Information:...`,
    temperature: 0.7,
    maxTokens: 2000
  },
  consultation: { ... },
  referral: { ... },
  discharge: { ... },
  soap: { ... },
  generic: { ... }
}
```

**To modify a prompt:**
1. Open `aiPrompts.ts`
2. Find the prompt you want to change in `LETTER_PROMPTS`
3. Edit the `userPrompt` field
4. Adjust `temperature` and `maxTokens` if needed

### 2. Transcription Prompts

```typescript
export const TRANSCRIPTION_PROMPTS: TranscriptionPromptConfig = {
  whisper: "Medical consultation with clinical terminology.",
  ocr: "Extract patient information from this text..."
}
```

### 3. Text Improvement Prompts

```typescript
export const IMPROVEMENT_PROMPTS: ImprovementPromptConfig = {
  proofread: {
    systemRole: "You are a medical text editor...",
    userPrompt: "Please proofread and minimally improve..."
  },
  format: { ... }
}
```

## Placeholder System

Prompts use a placeholder system with `{{variableName}}` syntax:

- `{{patientName}}` - Patient's name
- `{{patientMRN}}` - Medical record number
- `{{patientAge}}` - Patient's age
- `{{patientCondition}}` - Primary condition
- `{{currentDate}}` - Current date
- `{{transcription}}` - Voice transcription text

## Helper Functions

### `getPatientPrompt(promptType, patientInfo, transcription)`

Automatically replaces placeholders with patient data:

```typescript
import { getPatientPrompt } from '../config/aiPrompts';

const prompt = getPatientPrompt('clinical', patientInfo, transcription);
```

### `replacePromptPlaceholders(prompt, replacements)`

Manual placeholder replacement:

```typescript
import { replacePromptPlaceholders } from '../config/aiPrompts';

const prompt = replacePromptPlaceholders(
  "Hello {{name}}", 
  { name: "John" }
);
```

## Adding New Prompt Types

1. **Add to interface:**
```typescript
export interface LetterPromptConfig {
  // ... existing types
  newType: PromptConfig;
}
```

2. **Add to config:**
```typescript
export const LETTER_PROMPTS: LetterPromptConfig = {
  // ... existing prompts
  newType: {
    systemRole: "Your system role...",
    userPrompt: "Your prompt template...",
    temperature: 0.7,
    maxTokens: 1500
  }
}
```

3. **Use in service:**
```typescript
const prompt = getPatientPrompt('newType', patientInfo, transcription);
```

## Best Practices

- **Keep prompts focused** - One clear purpose per prompt
- **Use consistent formatting** - Maintain structure across similar prompts
- **Test changes** - Verify prompts work as expected
- **Version control** - Commit prompt changes separately for easy rollback
- **Document updates** - Note any significant prompt changes in commit messages

## Temperature Settings

- **0.0-0.3**: Very focused, consistent output
- **0.4-0.7**: Balanced creativity and consistency (recommended for medical)
- **0.8-1.0**: More creative, varied output

## Token Limits

- **500-1000**: Short notes, summaries
- **1000-2000**: Standard letters (recommended)
- **2000+**: Comprehensive documents

## Example: Modifying Clinical Letter Prompt

```typescript
// In aiPrompts.ts
clinical: {
  systemRole: "You are a medical letter generator for doctors...",
  userPrompt: `Patient Information:
- Name: {{patientName}}
- MRN: {{patientMRN}}
- Age: {{patientAge}}
- Primary Condition: {{patientCondition}}
- Date: {{currentDate}}

Consultation Notes:
{{transcription}}

// Add your custom prompt structure here
Dear Doctor,

[Your custom letter format...]

Yours sincerely,
Dr. {{doctorName}}`,
  temperature: 0.7,
  maxTokens: 2000
}
```

## Troubleshooting

**Prompt not working?**
1. Check placeholder syntax: `{{variableName}}`
2. Verify patient info is being passed correctly
3. Check console for any errors
4. Test with simple prompt first

**Output too long/short?**
1. Adjust `maxTokens` value
2. Modify prompt structure
3. Check temperature setting

**Inconsistent results?**
1. Lower temperature for more consistency
2. Make prompt more specific
3. Add more structure to the prompt
