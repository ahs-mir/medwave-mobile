#!/bin/bash
# Force rebuild with local backend configuration

echo "🛑 Stopping all Expo/Metro processes..."
pkill -9 -f "expo\|react-native\|metro" 2>/dev/null || echo "No processes running"

echo "🧹 Clearing all caches..."
cd "$(dirname "$0")"
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ios/build
rm -rf android/build
rm -rf .expo-shared

echo "✅ Cache cleared"

echo ""
echo "🔧 Verifying configuration..."
echo "Checking app.config.js..."
grep -A2 "apiBaseUrl" app.config.js | head -3

echo ""
echo "Checking ApiService.ts..."
grep -A2 "BASE_URL" src/services/ApiService.ts | head -3

echo ""
echo "🚀 Starting Expo with cleared cache..."
echo "Press 'i' to open iOS simulator"
echo ""

npx expo start --clear

