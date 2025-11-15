# Apple Sign-In Troubleshooting Guide

## Current Issue
"Apple Login Failed: The authorization attempt failed for an unknown reason"

## Common Causes & Solutions

### 1. **App Not Signed with Development Team**
Apple Sign-In requires the app to be signed with a valid Apple Developer account.

**Solution:**
- Open Xcode: `cd mobile/ios && open MedWave.xcodeproj`
- Select the project in the navigator
- Select the "MedWave" target
- Go to "Signing & Capabilities" tab
- Check "Automatically manage signing"
- Select your Team (Apple Developer account)
- Ensure "Sign in with Apple" capability is visible in the list

### 2. **Simulator Not Signed In with Apple ID**
The iOS Simulator must be signed in with an Apple ID to test Apple Sign-In.

**Solution:**
- Open iOS Simulator
- Go to Settings app in the simulator
- Tap "Sign in to your iPhone" at the top
- Sign in with your Apple ID
- Re-run the app

### 3. **Bundle ID Not Configured in Apple Developer Portal** (For Production)
For local development, this might not be required, but for production builds:

**Solution:**
- Go to [Apple Developer Portal](https://developer.apple.com/account)
- Navigate to Certificates, Identifiers & Profiles
- Select "Identifiers"
- Find your bundle ID: `com.riztech.medwave`
- Enable "Sign in with Apple" capability
- Save changes

### 4. **App Not Rebuilt After Adding Capability**
After adding entitlements, the app must be rebuilt.

**Solution (Already Applied):**
- ✅ Cleaned build artifacts
- ✅ Ran `npx expo prebuild --clean`
- Now need to rebuild and run: `npx expo run:ios`

### 5. **Testing on Physical Device Instead**
Sometimes Apple Sign-In works better on physical devices than simulators.

**Solution:**
- Connect your iPhone via USB
- Run: `npx expo run:ios --device`

## Quick Fix Steps (In Order)

1. **Ensure Simulator is Signed In:**
   ```
   Open iOS Simulator → Settings → Sign in to your iPhone → Use your Apple ID
   ```

2. **Verify Xcode Signing:**
   ```bash
   cd mobile/ios
   open MedWave.xcodeproj
   ```
   - Select MedWave target
   - Check "Signing & Capabilities"
   - Ensure team is selected
   - Ensure "Sign in with Apple" is enabled

3. **Rebuild and Run:**
   ```bash
   cd mobile
   npx expo run:ios
   ```

4. **If Still Failing, Try Physical Device:**
   ```bash
   npx expo run:ios --device
   ```

## Alternative: Skip Apple Sign-In for Local Testing

If you just want to test Google Sign-In and other features, you can:
- Comment out the Apple Sign-In button temporarily
- Focus on testing Google Sign-In and email/password auth
- Come back to Apple Sign-In when you have a physical device or proper signing set up

## Verify Entitlements Are Applied

Check that the entitlements file exists and is correct:
```bash
cat mobile/ios/MedWave/MedWave.entitlements
```

Should contain:
```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

## Current Status
- ✅ Entitlements file configured
- ✅ Plugin added to app.config.js
- ✅ Native project rebuilt with prebuild
- ⏳ Need to rebuild and run with Xcode signing configured
- ⏳ Need simulator signed in with Apple ID

