const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to ensure RCTReleaseLevel fix is in Podfile
 * This runs after prebuild to ensure the fix is always present
 */
module.exports = function withPodfileRCTReleaseLevelFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      const originalContent = podfileContent;
      
      // Check if the fix is already present
      if (podfileContent.includes('Fix RCTReleaseLevel compatibility issue for React Native 0.79.5')) {
        return config;
      }

      // Find the post_install hook and add our code before the final 'end'
      const postInstallPattern = /(\s+react_native_post_install\([\s\S]*?\)\s*\n\s*\)\s*\n)(\s+end\s*\nend)/;
      
      if (postInstallPattern.test(podfileContent)) {
        podfileContent = podfileContent.replace(
          postInstallPattern,
          (match, body, ending) => {
            return body + getPatchCode() + ending;
          }
        );
      } else {
        console.warn('[with-podfile-rctreleaselevel-fix] Could not find post_install hook to modify');
        return config;
      }

      if (podfileContent !== originalContent) {
        fs.writeFileSync(podfilePath, podfileContent);
        console.log('[with-podfile-rctreleaselevel-fix] ✓ Added RCTReleaseLevel fix to Podfile');
      }
      
      return config;
    },
  ]);
};

function getPatchCode() {
  return `
    # Fix RCTReleaseLevel compatibility issue for React Native 0.79.5
    # React Native 0.79 removed RCTReleaseLevel, so we need to remove any references
    node_modules_path = File.join(__dir__, '..', 'node_modules', 'expo', 'ios', 'AppDelegates', 'ExpoReactNativeFactory.swift')
    possible_paths = [
      File.join(installer.sandbox.root, 'Expo', 'ios', 'AppDelegates', 'ExpoReactNativeFactory.swift'),
      Dir.glob(File.join(installer.sandbox.root, '**', 'ExpoReactNativeFactory.swift')).first,
      node_modules_path
    ].compact
    
    expo_file = possible_paths.find { |path| path && File.exist?(path) }
    
    if expo_file
      puts "Fixing ExpoReactNativeFactory.swift for RN 0.79.5 compatibility..."
      puts "Found at: #{expo_file}"
      content = File.read(expo_file)
      original = content
      
      # Fix 1: Remove releaseLevel parameter from super.init
      content = content.gsub(/super\.init\(delegate:\s*delegate,\s*releaseLevel:\s*releaseLevel\)/, 'super.init(delegate: delegate)  // PATCHED: Removed releaseLevel for RN 0.79.5')
      
      # Fix 2: Remove releaseLevel initialization block entirely (RN 0.79 removed RCTReleaseLevel)
      content = content.gsub(/let releaseLevel\s*=\s*\(Bundle\.main\.object\(forInfoDictionaryKey:\s*"ReactNativeReleaseLevel"\)\s*as\? String\)\s*\.flatMap\s*\{[\s\S]*?\}\s*\?\?\s*RCTReleaseLevel\.Stable/, '// PATCHED: React Native 0.79 removed RCTReleaseLevel; removed releaseLevel block')
      
      # Fix 3: Remove any declaration that explicitly references RCTReleaseLevel type (from old broken patch)
      content = content.gsub(/^\s*let releaseLevel:\s*RCTReleaseLevel\s*=\s*\.Stable\s*$/m, '// PATCHED: React Native 0.79 removed RCTReleaseLevel')
      
      # Fix 4: Remove any other stray declarations that might reference RCTReleaseLevel
      content = content.gsub(/^\s*let releaseLevel[^\n]*RCTReleaseLevel[^\n]*$/m, '// PATCHED: React Native 0.79 removed RCTReleaseLevel')
      
      if content != original
        File.write(expo_file, content)
        puts "✓ Successfully patched ExpoReactNativeFactory.swift"
      else
        puts "⚠ No changes made (may already be patched or structure changed)"
      end
    else
      puts "⚠ ExpoReactNativeFactory.swift not found (checked Pods and node_modules)"
    end
`;
}

