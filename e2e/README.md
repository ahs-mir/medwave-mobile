# MedWave E2E Testing with Detox

This directory contains End-to-End (E2E) tests for the MedWave iOS application using Detox testing framework.

## Test Coverage

### Doctor Workflow Test (`doctorWorkflow.test.js`)

**Case 1: Complete Doctor Workflow**
Tests the primary user journey for doctors:

1. **Doctor Login** - Authenticates with valid credentials
2. **Patient List** - Verifies patient list loads and displays correctly
3. **Patient Selection** - Selects a patient from the list
4. **Voice Recording** - Initiates and completes voice recording for letter dictation
5. **Letter Generation** - Selects letter type and generates clinical letter
6. **Verification** - Confirms letter is created and linked to selected patient

**Additional Test Cases:**
- Login error handling with invalid credentials
- Patient search functionality
- Empty patient list handling
- Network error scenarios (placeholder)
- Microphone permission handling (placeholder)
- App backgrounding during recording (placeholder)

## Prerequisites

1. **iOS Simulator**: Xcode and iOS Simulator must be installed
2. **Dependencies**: Run `npm install` to install Detox and testing dependencies
3. **App Build**: The iOS app must be built before running tests

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Build the iOS App for Testing
```bash
npm run detox:build:ios
```

### 3. Run E2E Tests

**Run all E2E tests:**
```bash
npm run detox:test:ios
```

**Run complete workflow (build + test):**
```bash
npm run e2e:ios
```

**Run specific doctor workflow test:**
```bash
npm run e2e:doctor-workflow
```

## Test Configuration

### Detox Configuration (`.detoxrc.js`)
- **iOS Simulator**: iPhone 15
- **App Binary**: `ios/build/Build/Products/Debug-iphonesimulator/MedWave.app`
- **Build Command**: Uses Xcode workspace and scheme `MedWave`

### Jest Configuration (`jest.config.js`)
- **Test Timeout**: 120 seconds (allows for network calls and UI transitions)
- **Max Workers**: 1 (prevents simulator conflicts)
- **Test Pattern**: `e2e/**/*.test.js`

## Test Data Requirements

### Test User Credentials
The tests use the following test account:
- **Email**: `rizwan@medwave.com`
- **Password**: `Rizwan123!`

**Note**: Ensure this test account exists in your backend database for tests to pass.

### Patient Data
Tests expect at least one patient to exist in the system. The test will:
- Select the first patient in the list
- Generate a letter for that patient
- Verify the patient appears in the "Completed" tab

## Test Identifiers (testID)

The following testID attributes have been added to components for reliable testing:

### Patient List Screen
- `patient-list`: FlatList containing patients
- `patient-item-{index}`: Individual patient list items
- `completed-patient-checkmark`: Green checkmark for completed patients

### Letter Type Selection Screen
- `{type}-letter`: Letter type selection buttons
- `{type}-letter-selected`: Selected letter type (e.g., `clinical-letter-selected`)

### Voice Recording Screen (Needs Implementation)
- `voice-recording-screen`: Main container
- `record-button`: Start recording button
- `stop-button`: Stop recording button

## Running Tests in CI/CD

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    cd frontend
    npm run detox:build:ios
    npm run detox:test:ios
```

### Prerequisites for CI
- macOS runner with Xcode
- iOS Simulator setup
- Backend server running for API calls

## Troubleshooting

### Common Issues

1. **App Build Fails**
   - Ensure Xcode is properly installed
   - Check iOS Simulator is available
   - Verify workspace and scheme names in `.detoxrc.js`

2. **Tests Timeout**
   - Check backend server is running
   - Verify network connectivity
   - Increase timeout in test configuration if needed

3. **Element Not Found**
   - Verify testID attributes are correctly added
   - Check element visibility timing
   - Use `waitFor()` for elements that load asynchronously

4. **Simulator Issues**
   - Reset iOS Simulator: `xcrun simctl erase all`
   - Restart Simulator
   - Check available simulators: `xcrun simctl list devices`

### Debug Mode
Run tests with verbose logging:
```bash
detox test -c ios.sim.debug --loglevel verbose
```

## Future Enhancements

### Planned Test Additions
1. **Network Error Simulation**: Mock API failures and test error handling
2. **Permission Testing**: Test microphone and camera permission flows
3. **App State Management**: Test backgrounding/foregrounding during recording
4. **Data Persistence**: Test offline capabilities and data sync
5. **Performance Testing**: Measure app startup and response times

### Test Infrastructure
- **Test Data Management**: Automated test data setup/teardown
- **Screenshot Capture**: Automatic screenshots on test failures
- **Test Reporting**: Enhanced reporting with test metrics
- **Parallel Testing**: Multi-device testing capabilities

## Contributing

When adding new tests:

1. **Add testID attributes** to new components
2. **Follow naming conventions** for test files and test cases
3. **Include proper assertions** to verify expected behavior
4. **Add timeout handling** for async operations
5. **Update this README** with new test coverage

## Support

For testing issues or questions:
- Check Detox documentation: https://wix.github.io/Detox/
- Review test logs for specific error messages
- Ensure backend services are running and accessible
