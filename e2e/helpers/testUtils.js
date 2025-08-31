const { device, expect, element, by, waitFor } = require('detox');

/**
 * Test utilities for MedWave E2E tests
 */

/**
 * Login helper function
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {number} timeout - Timeout in milliseconds (default: 15000)
 */
async function loginUser(email = 'rizwan@medwave.com', password = 'Rizwan123!', timeout = 15000) {
  console.log(`🔐 Logging in user: ${email}`);
  
  // Wait for login screen
  await waitFor(element(by.text('Sign In')))
    .toBeVisible()
    .withTimeout(10000);

  // Fill credentials
  await element(by.traits(['textField']).and(by.text('Email address')))
    .typeText(email);
  
  await element(by.traits(['textField']).and(by.text('Password')))
    .typeText(password);

  // Submit login
  await element(by.text('Sign In')).tap();

  // Wait for successful login
  await waitFor(element(by.text('Welcome')))
    .toBeVisible()
    .withTimeout(timeout);
    
  console.log('✅ Login successful');
}

/**
 * Wait for patient list to load
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 */
async function waitForPatientList(timeout = 10000) {
  console.log('👥 Waiting for patient list to load...');
  
  await waitFor(element(by.id('patient-list')))
    .toBeVisible()
    .withTimeout(timeout);
    
  console.log('✅ Patient list loaded');
}

/**
 * Select patient by index
 * @param {number} index - Patient index (default: 0)
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 */
async function selectPatient(index = 0, timeout = 5000) {
  console.log(`🔍 Selecting patient at index: ${index}`);
  
  await waitFor(element(by.id(`patient-item-${index}`)))
    .toBeVisible()
    .withTimeout(timeout);
  
  await element(by.id(`patient-item-${index}`)).tap();

  // Wait for patient detail screen
  await waitFor(element(by.text('Patient Details')))
    .toBeVisible()
    .withTimeout(10000);
    
  console.log('✅ Patient selected');
}

/**
 * Simulate voice recording process
 * @param {number} recordingDuration - Recording duration in milliseconds (default: 3000)
 */
async function simulateVoiceRecording(recordingDuration = 3000) {
  console.log('🎤 Starting voice recording simulation...');
  
  // Navigate to recording
  await waitFor(element(by.text('Record Letter')))
    .toBeVisible()
    .withTimeout(5000);
  
  await element(by.text('Record Letter')).tap();

  // Wait for recording screen
  await waitFor(element(by.id('voice-recording-screen')))
    .toBeVisible()
    .withTimeout(10000);

  // Start recording
  await element(by.id('record-button')).tap();
  
  // Simulate recording duration
  await new Promise(resolve => setTimeout(resolve, recordingDuration));
  
  // Stop recording
  await element(by.id('stop-button')).tap();
  
  console.log('✅ Voice recording completed');
}

/**
 * Generate letter with specified type
 * @param {string} letterType - Type of letter (default: 'clinical')
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 */
async function generateLetter(letterType = 'clinical', timeout = 30000) {
  console.log(`📝 Generating ${letterType} letter...`);
  
  // Wait for letter type selection
  await waitFor(element(by.text('Select Letter Type')))
    .toBeVisible()
    .withTimeout(15000);

  // Select letter type
  const letterTypeText = letterType === 'clinical' ? 'Clinical Letter' : 
                        letterType === 'consultation' ? 'Consultation Letter' :
                        letterType === 'referral' ? 'Referral Letter' :
                        letterType === 'discharge' ? 'Discharge Summary' : 'Clinical Letter';
  
  await element(by.text(letterTypeText)).tap();

  // Verify selection
  await expect(element(by.id(`${letterType}-letter-selected`))).toBeVisible();

  // Generate letter
  await element(by.text('Generate Letter')).tap();

  // Wait for completion
  await waitFor(element(by.text('Letter Generated')))
    .toBeVisible()
    .withTimeout(timeout);

  // Verify success message
  await expect(element(by.text(`${letterTypeText} has been generated successfully.`)))
    .toBeVisible();

  // Dismiss alert
  await element(by.text('OK')).tap();
  
  console.log('✅ Letter generated successfully');
}

/**
 * Verify patient completion status
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 */
async function verifyPatientCompletion(timeout = 10000) {
  console.log('✅ Verifying patient completion...');
  
  // Wait to return to patient list
  await waitFor(element(by.text('Dr. Rizwan')))
    .toBeVisible()
    .withTimeout(timeout);

  // Switch to completed tab
  await element(by.text('Completed')).tap();
  
  // Verify checkmark appears
  await waitFor(element(by.id('completed-patient-checkmark')))
    .toBeVisible()
    .withTimeout(5000);
    
  console.log('✅ Patient completion verified');
}

/**
 * Reset app state for fresh test
 */
async function resetAppState() {
  console.log('🔄 Resetting app state...');
  await device.reloadReactNative();
  console.log('✅ App state reset');
}

/**
 * Search for patients
 * @param {string} searchTerm - Search term
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 */
async function searchPatients(searchTerm, timeout = 5000) {
  console.log(`🔍 Searching for patients: "${searchTerm}"`);
  
  await element(by.traits(['textField']).and(by.text('Search patients...')))
    .typeText(searchTerm);

  await waitFor(element(by.id('filtered-patient-list')))
    .toBeVisible()
    .withTimeout(timeout);
    
  console.log('✅ Search completed');
}

/**
 * Handle expected errors gracefully
 * @param {Function} testFunction - Function to execute that might throw
 * @param {string} expectedErrorText - Expected error message
 */
async function expectError(testFunction, expectedErrorText) {
  console.log(`⚠️  Testing error scenario: ${expectedErrorText}`);
  
  try {
    await testFunction();
    throw new Error('Expected error did not occur');
  } catch (error) {
    // Verify error message appears
    await waitFor(element(by.text(expectedErrorText)))
      .toBeVisible()
      .withTimeout(10000);
    
    console.log('✅ Expected error handled correctly');
  }
}

/**
 * Complete doctor workflow from start to finish
 * @param {Object} options - Configuration options
 * @param {string} options.email - Login email
 * @param {string} options.password - Login password
 * @param {number} options.patientIndex - Patient to select
 * @param {string} options.letterType - Type of letter to generate
 * @param {number} options.recordingDuration - Recording duration in ms
 */
async function completeDoctorWorkflow(options = {}) {
  const {
    email = 'rizwan@medwave.com',
    password = 'Rizwan123!',
    patientIndex = 0,
    letterType = 'clinical',
    recordingDuration = 3000
  } = options;
  
  console.log('🚀 Starting complete doctor workflow...');
  
  await loginUser(email, password);
  await waitForPatientList();
  await selectPatient(patientIndex);
  await simulateVoiceRecording(recordingDuration);
  await generateLetter(letterType);
  await verifyPatientCompletion();
  
  console.log('🎉 Complete doctor workflow finished successfully!');
}

module.exports = {
  loginUser,
  waitForPatientList,
  selectPatient,
  simulateVoiceRecording,
  generateLetter,
  verifyPatientCompletion,
  resetAppState,
  searchPatients,
  expectError,
  completeDoctorWorkflow
};
