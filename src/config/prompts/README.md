# Configurable Letter Prompts

This directory contains configurable AI prompts for generating different types of medical letters. The prompts are stored as JSON files and can be easily modified without changing the application code.

## 📁 File Structure

```
prompts/
├── index.json          # Index of all available prompts
├── clinical.json       # Clinical letter prompt
├── consultation.json   # Consultation letter prompt
├── referral.json       # Referral letter prompt
├── discharge.json      # Discharge summary prompt
├── soap.json          # SOAP note prompt
├── generic.json       # Generic letter prompt
└── README.md          # This documentation
```

## 🔧 How to Modify Prompts

### 1. Edit JSON Files
Each prompt is stored in a separate JSON file. You can edit these files directly:

```json
{
  "id": "clinical",
  "name": "Clinical Letter",
  "description": "Generate a comprehensive clinical letter",
  "icon": "medical-outline",
  "systemRole": "You are a medical letter generator...",
  "userPrompt": "Patient Information:\n- Name: {{patientName}}\n...",
  "temperature": 0.7,
  "maxTokens": 2000,
  "version": "1.0.0",
  "lastModified": "2024-01-15",
  "author": "MedWave System",
  "category": "clinical",
  "isActive": true
}
```

### 2. Key Fields to Modify

- **`systemRole`**: Defines the AI's role and behavior
- **`userPrompt`**: The main prompt template with placeholders
- **`temperature`**: Controls creativity (0.0-1.0)
- **`maxTokens`**: Maximum response length
- **`isActive`**: Enable/disable this prompt type

### 3. Placeholder System
Prompts use `{{variableName}}` placeholders that get replaced with actual data:

- `{{patientName}}` - Patient's name
- `{{patientMRN}}` - Medical record number
- `{{patientAge}}` - Patient's age
- `{{patientCondition}}` - Primary condition
- `{{currentDate}}` - Current date
- `{{transcription}}` - Voice transcription text

## 📝 Adding New Prompt Types

### Step 1: Create the Prompt File
Create a new JSON file in the `prompts/` directory:

```json
{
  "id": "new-type",
  "name": "New Letter Type",
  "description": "Description of the new letter type",
  "icon": "icon-name",
  "systemRole": "Your system role...",
  "userPrompt": "Your prompt template...",
  "temperature": 0.7,
  "maxTokens": 1500,
  "version": "1.0.0",
  "lastModified": "2024-01-15",
  "author": "MedWave System",
  "category": "new-category",
  "isActive": true
}
```

### Step 2: Update the Index
Add the new prompt to `index.json`:

```json
{
  "id": "new-type",
  "name": "New Letter Type",
  "description": "Description of the new letter type",
  "icon": "icon-name",
  "category": "new-category",
  "isActive": true,
  "file": "new-type.json"
}
```

### Step 3: Update the UI
Modify the letter type selection UI to include the new type.

## 🎯 Prompt Categories

### Clinical Letters
- **clinical**: Comprehensive clinical letters
- **consultation**: Consultation letters
- **generic**: Generic clinical letters

### Specialized Letters
- **referral**: Referral to specialists
- **discharge**: Discharge summaries
- **soap**: SOAP notes

## ⚙️ Configuration Options

### Temperature Settings
- **0.0-0.3**: Very focused, consistent output
- **0.4-0.7**: Balanced creativity and consistency (recommended)
- **0.8-1.0**: More creative, varied output

### Token Limits
- **500-1000**: Short notes, summaries
- **1000-2000**: Standard letters (recommended)
- **2000+**: Comprehensive documents

## 🔍 Validation

The system automatically validates prompt files to ensure:
- All required fields are present
- Data types are correct
- Prompts are properly formatted

## 📱 Usage in the App

### Loading Prompts
```typescript
import PromptLoader from '../config/promptLoader';

const promptLoader = PromptLoader.getInstance();
const clinicalPrompt = await promptLoader.loadPrompt('clinical');
```

### Getting All Prompts
```typescript
const allPrompts = await promptLoader.loadAllPrompts();
const clinicalPrompts = await promptLoader.getPromptsByCategory('clinical');
```

## 🚀 Best Practices

### 1. Keep Prompts Focused
- One clear purpose per prompt
- Avoid overly complex instructions
- Use consistent formatting

### 2. Test Changes
- Test prompts with sample data
- Verify output quality
- Check for proper HTML formatting

### 3. Version Control
- Commit prompt changes separately
- Use descriptive commit messages
- Document significant changes

### 4. Backup
- Keep backups of working prompts
- Test changes in development first
- Have rollback plans

## 🐛 Troubleshooting

### Common Issues

1. **Prompt not loading**
   - Check file path and naming
   - Verify JSON syntax
   - Ensure `isActive: true`

2. **Invalid prompt data**
   - Check required fields
   - Verify data types
   - Look for JSON syntax errors

3. **Placeholder not replaced**
   - Check placeholder syntax `{{variableName}}`
   - Ensure variable names match
   - Verify data is being passed

### Debug Mode
Enable debug logging to see prompt loading details:

```typescript
// In development
console.log('Loading prompt:', promptId);
console.log('Prompt data:', promptData);
```

## 📚 Examples

### Clinical Letter Prompt
```json
{
  "systemRole": "You are a medical letter generator for doctors...",
  "userPrompt": "Patient Information:\n- Name: {{patientName}}\n- MRN: {{patientMRN}}\n...",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

### SOAP Note Prompt
```json
{
  "systemRole": "You are a medical professional...",
  "userPrompt": "Please format as a proper SOAP note...",
  "temperature": 0.6,
  "maxTokens": 1000
}
```

## 🔄 Updates and Maintenance

### Regular Maintenance
- Review prompt effectiveness monthly
- Update based on user feedback
- Monitor AI model changes
- Validate output quality

### Version Updates
- Increment version numbers
- Update lastModified dates
- Document changes in commit messages
- Test thoroughly before deployment

---

**Note**: Always test prompt changes thoroughly before deploying to production. The AI model's behavior can vary, so validate outputs with real medical scenarios.
