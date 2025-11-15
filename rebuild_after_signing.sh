#!/bin/bash
# Rebuild script after Xcode signing is configured

echo "🔍 Checking signing configuration..."
cd "$(dirname "$0")"

# Check if development team is configured
TEAM=$(xcodebuild -project ios/MedWave.xcodeproj -target MedWave -showBuildSettings 2>/dev/null | grep "DEVELOPMENT_TEAM" | head -1 | awk -F'=' '{print $2}' | tr -d ' ')

if [ -z "$TEAM" ]; then
    echo "❌ Development team not configured yet."
    echo "Please configure signing in Xcode first:"
    echo "1. Open Xcode (ios/MedWave.xcodeproj)"
    echo "2. Select MedWave target"
    echo "3. Go to Signing & Capabilities"
    echo "4. Enable 'Automatically manage signing'"
    echo "5. Select your Team"
    exit 1
fi

echo "✅ Development team configured: $TEAM"
echo ""
echo "🔨 Rebuilding app with proper signing..."
npx expo run:ios

