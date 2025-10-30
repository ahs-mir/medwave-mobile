#!/bin/bash

# Fix RCTReleaseLevel compatibility issue between Expo SDK 54 and React Native 0.79.5
# This runs after pod install during EAS builds

echo "Running post-install hook to fix Expo/React Native compatibility..."

# Run the Node.js fix script
node scripts/fix-expo-rn-compat.js || echo "Warning: Fix script failed, continuing build..."

echo "Post-install hook completed"