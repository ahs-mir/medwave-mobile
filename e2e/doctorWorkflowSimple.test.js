const { device, expect, element, by, waitFor } = require('detox');
const { 
  loginUser, 
  completeDoctorWorkflow, 
  resetAppState, 
  expectError 
} = require('./helpers/testUtils');

describe('Doctor Workflow E2E Tests (Simplified)', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await resetAppState();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should complete the full doctor workflow using helper functions', async () => {
    console.log('🎯 Running simplified doctor workflow test');
    
    await completeDoctorWorkflow({
      email: 'rizwan@medwave.com',
      password: 'Rizwan123!',
      patientIndex: 0,
      letterType: 'clinical',
      recordingDuration: 3000
    });
  });

  it('should handle login errors', async () => {
    await expectError(
      () => loginUser('invalid@test.com', 'wrongpassword'),
      'Login Failed'
    );
  });

  it('should generate different letter types', async () => {
    console.log('📝 Testing different letter types');
    
    // Test consultation letter
    await completeDoctorWorkflow({
      letterType: 'consultation'
    });
    
    await resetAppState();
    
    // Test referral letter  
    await completeDoctorWorkflow({
      letterType: 'referral'
    });
  });
});
