#!/bin/bash

echo "=========================================="
echo "iOS Post-Install Hook Starting"
echo "=========================================="
echo "Current directory: $(pwd)"
echo "Python version: $(python3 --version 2>&1 || echo 'not found')"

# The file should be in ios/Pods after pod install
EXPO_FILE="ios/Pods/Expo/ExpoKit/ios/AppDelegates/ExpoReactNativeFactory.swift"

echo "Looking for: $EXPO_FILE"

if [ ! -f "$EXPO_FILE" ]; then
  echo "ERROR: File not found at $EXPO_FILE"
  echo "Listing ios/Pods structure..."
  ls -la ios/Pods/ 2>/dev/null | head -20 || echo "ios/Pods doesn't exist yet"
  echo "Searching for ExpoReactNativeFactory.swift..."
  find . -name "ExpoReactNativeFactory.swift" 2>/dev/null | head -5 || echo "File not found anywhere"
  echo "Hook will exit - build may fail"
  exit 0  # Don't fail the build if file not found
fi

echo "✓ Found file: $EXPO_FILE"

# Check if already patched
if grep -q "PATCHED.*RCTReleaseLevel" "$EXPO_FILE"; then
  echo "✓ File already patched, skipping"
  exit 0
fi

echo "Applying compatibility patch..."

# Create backup
cp "$EXPO_FILE" "${EXPO_FILE}.original"

# Use Python to apply the fix
python3 << 'PYEOF'
import re
import sys

file_path = "ios/Pods/Expo/ExpoKit/ios/AppDelegates/ExpoReactNativeFactory.swift"

try:
    with open(file_path, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix 1: Remove releaseLevel from super.init
    content = content.replace(
        'super.init(delegate: delegate, releaseLevel: releaseLevel)',
        'super.init(delegate: delegate)  // PATCHED: Removed releaseLevel for RN 0.79.5'
    )
    
    # Fix 2: Replace releaseLevel initialization
    # Try pattern matching first
    pattern = r'let releaseLevel = \(Bundle\.main\.object\(forInfoDictionaryKey: "ReactNativeReleaseLevel"\) as\? String\)\s*\.flatMap \{[\s\S]*?\}\s*\?\? RCTReleaseLevel\.Stable'
    
    replacement = '''// PATCHED: RCTReleaseLevel compatibility fix for React Native 0.79.5
    let releaseLevel: RCTReleaseLevel = .Stable'''
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # If pattern didn't work, try manual line replacement
    if new_content == content:
        print("Pattern didn't match, trying manual replacement...")
        lines = content.split('\n')
        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            # Check if this is the start of releaseLevel declaration
            if 'let releaseLevel = (Bundle.main.object(forInfoDictionaryKey: "ReactNativeReleaseLevel")' in line:
                print(f"Found releaseLevel at line {i+1}")
                # Skip this line and continue until we find ?? RCTReleaseLevel.Stable
                new_lines.append('    // PATCHED: RCTReleaseLevel compatibility fix for React Native 0.79.5')
                new_lines.append('    let releaseLevel: RCTReleaseLevel = .Stable')
                # Skip until we find the end
                while i < len(lines) and 'RCTReleaseLevel.Stable' not in lines[i]:
                    i += 1
                # Skip the line with RCTReleaseLevel.Stable
                i += 1
                continue
            new_lines.append(line)
            i += 1
        
        new_content = '\n'.join(new_lines)
    
    if new_content != original:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print("✓ Patch applied successfully")
        
        # Verify fixes
        if 'super.init(delegate: delegate, releaseLevel: releaseLevel)' in new_content:
            print("WARNING: super.init still contains releaseLevel!")
        else:
            print("✓ super.init fix verified")
            
        if 'let releaseLevel: RCTReleaseLevel = .Stable' in new_content:
            print("✓ releaseLevel initialization fix verified")
    else:
        print("WARNING: No changes made to file")
        print("File might already be patched or have different structure")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

echo "Hook completed"
PYEOF
