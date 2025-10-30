#!/usr/bin/env node

/**
 * Fix RCTReleaseLevel compatibility issue between Expo SDK 54 and React Native 0.79.5
 * This script patches the ExpoReactNativeFactory.swift file after pod install
 */

const fs = require('fs');
const path = require('path');

// Try multiple possible paths for the file
const possiblePaths = [
  path.join(__dirname, '..', 'ios', 'Pods', 'Expo', 'ExpoKit', 'ios', 'AppDelegates', 'ExpoReactNativeFactory.swift'),
  path.join(process.cwd(), 'ios', 'Pods', 'Expo', 'ExpoKit', 'ios', 'AppDelegates', 'ExpoReactNativeFactory.swift'),
];

let filePath = null;
for (const possiblePath of possiblePaths) {
  const fullPath = path.resolve(possiblePath);
  if (fs.existsSync(fullPath)) {
    filePath = fullPath;
    break;
  }
}

if (!filePath) {
  console.log('ExpoReactNativeFactory.swift not found, skipping patch');
  process.exit(0);
}

console.log(`Patching ${filePath}...`);

let contents = fs.readFileSync(filePath, 'utf8');
const originalContents = contents;

// Check if already patched
if (contents.includes('// PATCHED: RCTReleaseLevel compatibility')) {
  console.log('File already patched, skipping...');
  process.exit(0);
}

// Replace the problematic releaseLevel initialization
const releaseLevelPattern = /let releaseLevel = \(Bundle\.main\.object\(forInfoDictionaryKey: "ReactNativeReleaseLevel"\) as\? String\)\s*\.flatMap \{ \[[\s\S]*?\]\[.*?\]\s*\}\s*\?\? RCTReleaseLevel\.Stable/;

if (releaseLevelPattern.test(contents)) {
  contents = contents.replace(
    releaseLevelPattern,
    `// PATCHED: RCTReleaseLevel compatibility fix for React Native 0.79.5
    let releaseLevel: RCTReleaseLevel = .Stable`
  );
  console.log('✓ Patched releaseLevel initialization');
}

// Fix the super.init call - remove releaseLevel parameter if it causes issues
if (contents.includes('super.init(delegate: delegate, releaseLevel: releaseLevel)')) {
  // First, try to comment it out and add a fallback
  contents = contents.replace(
    /super\.init\(delegate: delegate, releaseLevel: releaseLevel\)/,
    `// PATCHED: Removed releaseLevel parameter for React Native 0.79.5 compatibility
      super.init(delegate: delegate)`
  );
  console.log('✓ Patched super.init call');
}

if (contents !== originalContents) {
  fs.writeFileSync(filePath, contents);
  console.log('✓ Successfully patched ExpoReactNativeFactory.swift');
} else {
  console.log('No changes needed');
}

process.exit(0);