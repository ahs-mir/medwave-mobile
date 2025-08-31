// Simple test to verify the configurable prompt system works
// This can be run with: node test-prompts.js

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Configurable Prompt System...\n');

// Test 1: Check if all prompt files exist
const promptsDir = path.join(__dirname, 'prompts');
const expectedFiles = [
  'index.json',
  'clinical.json',
  'consultation.json',
  'referral.json',
  'discharge.json',
  'soap.json',
  'generic.json',
  'README.md'
];

console.log('📁 Checking prompt files...');
expectedFiles.forEach(file => {
  const filePath = path.join(promptsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 2: Validate JSON syntax
console.log('\n🔍 Validating JSON syntax...');
expectedFiles.filter(f => f.endsWith('.json')).forEach(file => {
  const filePath = path.join(promptsDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✅ ${file} has valid JSON`);
  } catch (error) {
    console.log(`❌ ${file} has invalid JSON: ${error.message}`);
  }
});

// Test 3: Check prompt structure
console.log('\n🏗️  Checking prompt structure...');
const indexPath = path.join(promptsDir, 'index.json');
try {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const index = JSON.parse(indexContent);
  
  console.log(`✅ Index file loaded successfully`);
  console.log(`   Version: ${index.version}`);
  console.log(`   Total prompts: ${index.totalPrompts}`);
  console.log(`   Categories: ${index.categories.join(', ')}`);
  
  // Check if all referenced prompt files exist
  index.prompts.forEach(prompt => {
    const promptFile = path.join(promptsDir, prompt.file);
    if (fs.existsSync(promptFile)) {
      console.log(`✅ ${prompt.id} -> ${prompt.file} exists`);
    } else {
      console.log(`❌ ${prompt.id} -> ${prompt.file} missing`);
    }
  });
  
} catch (error) {
  console.log(`❌ Failed to load index: ${error.message}`);
}

// Test 4: Validate individual prompt files
console.log('\n📋 Validating individual prompts...');
const requiredFields = ['id', 'name', 'description', 'icon', 'systemRole', 'userPrompt', 'temperature', 'maxTokens', 'version', 'lastModified', 'author', 'category', 'isActive'];

expectedFiles.filter(f => f.endsWith('.json') && f !== 'index.json').forEach(file => {
  const filePath = path.join(promptsDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const prompt = JSON.parse(content);
    
    const missingFields = requiredFields.filter(field => !prompt.hasOwnProperty(field));
    if (missingFields.length === 0) {
      console.log(`✅ ${file} has all required fields`);
    } else {
      console.log(`❌ ${file} missing fields: ${missingFields.join(', ')}`);
    }
    
    // Check if prompt is active
    if (prompt.isActive) {
      console.log(`   🟢 ${prompt.name} is active`);
    } else {
      console.log(`   🔴 ${prompt.name} is inactive`);
    }
    
  } catch (error) {
    console.log(`❌ ${file} validation failed: ${error.message}`);
  }
});

console.log('\n🎉 Prompt system validation complete!');
console.log('\n💡 To modify prompts:');
console.log('   1. Edit the JSON files in frontend/src/config/prompts/');
console.log('   2. Test your changes');
console.log('   3. Commit the updated prompt files');
console.log('\n📚 See README.md for detailed instructions');
