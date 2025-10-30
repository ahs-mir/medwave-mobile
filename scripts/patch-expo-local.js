#!/usr/bin/env node

/**
 * Patch ExpoReactNativeFactory.swift in node_modules for local builds
 */

const fs = require('fs');
const path = require('path');

const expoFile = path.join(__dirname, '..', 'node_modules', 'expo', 'ios', 'AppDelegates', 'ExpoReactNativeFactory.swift');

if (!fs.existsSync(expoFile)) {
  console.log('ExpoReactNativeFactory.swift not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(expoFile, 'utf8');
const original = content;

// Fix 1: Remove releaseLevel parameter from super.init
content = content.replace(
  'super.init(delegate: delegate, releaseLevel: releaseLevel)',
  'super.init(delegate: delegate)  // PATCHED: Removed releaseLevel for RN 0.79.5'
);

// Fix 2: Remove releaseLevel initialization entirely (RN 0.79 removed RCTReleaseLevel)
const pattern = /let releaseLevel = \(Bundle\.main\.object\(forInfoDictionaryKey: "ReactNativeReleaseLevel"\) as\? String\)\s*\.flatMap \{[\s\S]*?\}\s*\?\? RCTReleaseLevel\.Stable/;
content = content.replace(
  pattern,
  '// PATCHED: React Native 0.79 removed RCTReleaseLevel; removed releaseLevel block'
);

// Remove any declaration that explicitly references RCTReleaseLevel type (from old broken patch)
content = content.replace(/^\s*let releaseLevel:\s*RCTReleaseLevel\s*=\s*\.Stable\s*$/gm, '// PATCHED: React Native 0.79 removed RCTReleaseLevel');

// Remove any other stray declarations that might reference RCTReleaseLevel
content = content.replace(/^\s*let releaseLevel[^\n]*RCTReleaseLevel[^\n]*$/gm, '// PATCHED: React Native 0.79 removed RCTReleaseLevel');

if (content !== original) {
  fs.writeFileSync(expoFile, content);
  console.log('✓ Patched ExpoReactNativeFactory.swift for local builds');
} else {
  console.log('✓ File already patched or no changes needed');
}

