# Local Build Guide

This guide helps you build and test the iOS app locally before deploying to EAS.

## Prerequisites

- ✅ Xcode 16.2+ installed
- ✅ CocoaPods installed (`pod --version`)
- ✅ Node.js 18+ installed
- ✅ All dependencies installed (`npm install`)

## Quick Start

### 1. Clean Prebuild (First Time)
```bash
npm run prebuild:ios
```
This generates fresh iOS native code from your Expo config.

### 2. Install Pods (Apply Podfile Fix)
```bash
cd ios && pod install && cd ..
```
This installs iOS dependencies and applies the RCTReleaseLevel compatibility fix.

### 3. Build for Simulator (Fast Testing)
```bash
npm run build:ios:simulator
```
Builds and runs in iOS Simulator - fastest way to test.

### 4. Build for Device (Production-like)
```bash
npm run build:ios:local
```
Builds a Release configuration (what TestFlight/App Store uses).

## Complete Test Flow

```bash
# 1. Clean start (if needed)
npm run prebuild:ios

# 2. Install pods and apply fixes
cd ios && pod install && cd ..

# 3. Test build locally
npm run build:ios:simulator

# If build succeeds, deploy to EAS:
npm run build:ios
```

## Building for Device

To build for a physical device:

1. Open Xcode:
   ```bash
   open ios/MedWave.xcworkspace
   ```

2. Select your device in Xcode

3. Build and Run (Cmd+R)

## Verifying the Fix

The Podfile fix automatically applies during `pod install`. Check the output:
```
Fixing ExpoReactNativeFactory.swift for RN 0.79.5 compatibility...
✓ Successfully patched ExpoReactNativeFactory.swift
```

If you see this, the fix is applied correctly.

## Troubleshooting

### Build Fails with RCTReleaseLevel Error
- Make sure pods are installed: `cd ios && pod install`
- Check Podfile fix is present (lines 60-85)
- Clean and rebuild: `cd ios && pod deintegrate && pod install`

### Pod Install Fails
```bash
cd ios
pod deintegrate
pod install --repo-update
```

### Xcode Can't Find Files
```bash
npm run prebuild:ios -- --clean
cd ios && pod install
```

## After Local Build Succeeds

Once your local build works:

1. **Submit to EAS Build:**
   ```bash
   npm run build:ios
   ```

2. **Submit to TestFlight:**
   ```bash
   npm run submit:ios
   ```

## Benefits of Local Building

- ✅ Catch errors 10x faster (local vs EAS queue)
- ✅ Test fixes immediately
- ✅ Save build minutes
- ✅ Debug Xcode issues directly
- ✅ Verify Podfile fix works

## Build Time Comparison

- **Local Build**: ~3-5 minutes
- **EAS Build**: ~15-25 minutes (first), ~8-12 minutes (cached)

Build locally to validate, then deploy to EAS once confirmed!

