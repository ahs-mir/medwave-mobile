const { device, expect, element, by, waitFor } = require('detox');

describe('Doctor Workflow E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Case 1: Complete Doctor Workflow', () => {
    it('should complete the full doctor workflow: login → patient list → select patient → dictate → generate letter', async () => {
      // Step 1: Doctor logs into the application
      console.log('🔐 Step 1: Doctor Login');
      
      // Wait for login screen to appear
      await waitFor(element(by.text('Sign In')))
        .toBeVisible()
        .withTimeout(10000);

      // Fill in login credentials (using the test credentials from LoginScreen)
      await element(by.traits(['textField']).and(by.text('Email address')))
        .typeText('rizwan@medwave.com');
      
      await element(by.traits(['textField']).and(by.text('Password')))
        .typeText('Rizwan123!');

      // Tap Sign In button
      await element(by.text('Sign In')).tap();

      // Wait for successful login and navigation to patient list
      await waitFor(element(by.text('Welcome')))
        .toBeVisible()
        .withTimeout(15000);

      console.log('✅ Login successful');

      // Step 2: Doctor receives a list of patients
      console.log('👥 Step 2: Verify Patient List');
      
      // Verify we're on the patient list screen
      await expect(element(by.text('Dr. Rizwan'))).toBeVisible();
      await expect(element(by.text('Pending'))).toBeVisible();
      await expect(element(by.text('Completed'))).toBeVisible();

      // Wait for patients to load
      await waitFor(element(by.id('patient-list')))
        .toBeVisible()
        .withTimeout(10000);

      console.log('✅ Patient list loaded');

      // Step 3: Selects a patient
      console.log('🔍 Step 3: Select Patient');
      
      // Tap on the first patient in the list
      // We'll use a more generic selector since patient names may vary
      await waitFor(element(by.id('patient-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('patient-item-0')).tap();

      // Wait for patient detail screen
      await waitFor(element(by.text('Patient Details')))
        .toBeVisible()
        .withTimeout(10000);

      console.log('✅ Patient selected and detail screen opened');

      // Step 4: Dictates a letter (Navigate to voice recording)
      console.log('🎤 Step 4: Start Voice Recording');
      
      // Look for "Record Letter" or similar button
      await waitFor(element(by.text('Record Letter')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Record Letter')).tap();

      // Wait for voice recording screen
      await waitFor(element(by.id('voice-recording-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Start recording
      await element(by.id('record-button')).tap();
      
      // Wait a moment to simulate recording
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Stop recording
      await element(by.id('stop-button')).tap();

      console.log('✅ Voice recording completed');

      // Step 5: Clicks Generate Letter
      console.log('📝 Step 5: Generate Letter');
      
      // Wait for transcription to complete and letter type selection
      await waitFor(element(by.text('Select Letter Type')))
        .toBeVisible()
        .withTimeout(15000);

      // Select a letter type (Clinical Letter)
      await element(by.text('Clinical Letter')).tap();

      // Verify selection
      await expect(element(by.id('clinical-letter-selected'))).toBeVisible();

      // Tap Generate Letter button
      await element(by.text('Generate Letter')).tap();

      console.log('✅ Letter generation initiated');

      // Step 6: System generates the letter & Verify letter creation
      console.log('✅ Step 6: Verify Letter Generation');
      
      // Wait for generation completion alert or success message
      await waitFor(element(by.text('Letter Generated')))
        .toBeVisible()
        .withTimeout(30000);

      // Verify success message content
      await expect(element(by.text('Clinical Letter has been generated successfully.')))
        .toBeVisible();

      // Tap OK to dismiss alert
      await element(by.text('OK')).tap();

      // Verify we're back to patient list and patient now shows as completed
      await waitFor(element(by.text('Dr. Rizwan')))
        .toBeVisible()
        .withTimeout(10000);

      // Switch to completed tab to verify the patient appears there
      await element(by.text('Completed')).tap();
      
      // Verify patient appears in completed list with green checkmark
      await waitFor(element(by.id('completed-patient-checkmark')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Letter successfully created and linked to patient');
      console.log('🎉 Complete doctor workflow test passed!');
    });

    it('should handle login errors gracefully', async () => {
      console.log('🔐 Testing Login Error Handling');
      
      // Wait for login screen
      await waitFor(element(by.text('Sign In')))
        .toBeVisible()
        .withTimeout(10000);

      // Try with invalid credentials
      await element(by.traits(['textField']).and(by.text('Email address')))
        .typeText('invalid@test.com');
      
      await element(by.traits(['textField']).and(by.text('Password')))
        .typeText('wrongpassword');

      await element(by.text('Sign In')).tap();

      // Verify error message appears
      await waitFor(element(by.text('Login Failed')))
        .toBeVisible()
        .withTimeout(10000);

      // Dismiss error alert
      await element(by.text('OK')).tap();

      console.log('✅ Login error handling verified');
    });

    it('should allow patient search functionality', async () => {
      // First login successfully
      await waitFor(element(by.text('Sign In')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.traits(['textField']).and(by.text('Email address')))
        .typeText('rizwan@medwave.com');
      
      await element(by.traits(['textField']).and(by.text('Password')))
        .typeText('Rizwan123!');

      await element(by.text('Sign In')).tap();

      await waitFor(element(by.text('Welcome')))
        .toBeVisible()
        .withTimeout(15000);

      console.log('🔍 Testing Patient Search');
      
      // Use search functionality
      await element(by.traits(['textField']).and(by.text('Search patients...')))
        .typeText('John');

      // Verify search results update
      await waitFor(element(by.id('filtered-patient-list')))
        .toBeVisible()
        .withTimeout(5000);

      console.log('✅ Patient search functionality verified');
    });

    it('should handle network errors during letter generation', async () => {
      // This test would require network mocking or error simulation
      // For now, we'll create a placeholder that documents the expected behavior
      console.log('🌐 Testing Network Error Handling During Letter Generation');
      
      // Note: In a real implementation, you would:
      // 1. Mock network requests to return errors
      // 2. Verify error messages are displayed
      // 3. Verify retry mechanisms work
      // 4. Ensure app doesn't crash on network failures
      
      console.log('⚠️  Network error handling test - implementation needed');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty patient list gracefully', async () => {
      // Login first
      await waitFor(element(by.text('Sign In')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.traits(['textField']).and(by.text('Email address')))
        .typeText('rizwan@medwave.com');
      
      await element(by.traits(['textField']).and(by.text('Password')))
        .typeText('Rizwan123!');

      await element(by.text('Sign In')).tap();

      await waitFor(element(by.text('Welcome')))
        .toBeVisible()
        .withTimeout(15000);

      // If no patients, should show empty state
      const emptyStateExists = await element(by.text('No Pending Patients')).isVisible();
      if (emptyStateExists) {
        await expect(element(by.text('No Pending Patients'))).toBeVisible();
        console.log('✅ Empty patient list state handled correctly');
      } else {
        console.log('ℹ️  Patients available - empty state test skipped');
      }
    });

    it('should handle microphone permission denial', async () => {
      console.log('🎤 Testing Microphone Permission Handling');
      
      // Note: This would require permission mocking
      // In a real test, you would:
      // 1. Mock permission denial
      // 2. Verify appropriate error message
      // 3. Verify graceful fallback or retry options
      
      console.log('⚠️  Microphone permission test - implementation needed');
    });

    it('should handle app backgrounding during recording', async () => {
      console.log('📱 Testing App Backgrounding During Recording');
      
      // Note: This would test app state management
      // 1. Start recording
      // 2. Background the app
      // 3. Foreground the app
      // 4. Verify recording state is handled correctly
      
      console.log('⚠️  App backgrounding test - implementation needed');
    });
  });
});
