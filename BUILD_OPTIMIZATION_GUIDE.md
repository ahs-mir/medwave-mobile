# Build Optimization Guide

This document outlines optimizations applied to speed up EAS builds.

## Applied Optimizations

### 1. **Larger Resource Classes** ⚡
- Changed from `m-medium` to `large` for faster CPU and more RAM
- **Impact**: ~20-30% faster builds
- **Cost**: Slightly higher build minutes usage

### 2. **Build Caching** 💾
- Enabled EAS build caching for dependencies and intermediate files
- **Impact**: ~40-50% faster for subsequent builds when dependencies don't change
- Subsequent builds reuse cached layers

### 3. **.easignore File** 🚫
- Excludes unnecessary files from build upload
- Reduces upload size and build time
- **Impact**: ~10-15% faster upload/preparation

### 4. **Podfile Optimizations** 📦
- Prebuilt React Native Core (unless building from source)
- Using prebuilt dependencies reduces compile time

## Build Time Expectations

- **First Build**: ~15-25 minutes (cold cache)
- **Cached Builds**: ~8-12 minutes (with dependency cache)
- **OTA Updates**: ~2-5 minutes (JavaScript-only changes)

## Additional Speed Tips

### Use OTA Updates for Most Changes
For JavaScript/TypeScript changes that don't require native modules:
```bash
npm run update
```
This deploys in ~2-5 minutes vs 15-25 minutes for full builds.

### Local Builds for Testing
For development/testing before pushing to TestFlight:
```bash
npm run ios  # Local simulator build
```

### Parallel Builds
Build iOS and Android simultaneously if needed:
```bash
npx eas build --platform all
```

### Build Profiles
- `preview`: Fast internal builds
- `production`: Full release builds (longer but optimized)

## Monitoring Build Performance

Check build times in EAS Dashboard:
https://expo.dev/accounts/ahsan.mirza/projects/medwave/builds

## When to Rebuild vs Update

**Rebuild (Native Build Required)**:
- New native dependencies added
- Native code changes
- App configuration changes (app.json, bundle ID, etc.)
- New permissions required
- Build number incremented

**OTA Update (No Rebuild)**:
- JavaScript/TypeScript code changes
- Asset changes (images, fonts, etc.)
- API endpoint changes
- UI/UX changes

## Cost Optimization

- **Large machines**: Use for production builds where speed matters
- **Medium machines**: Use for preview/internal builds if budget-conscious
- **Caching**: Always enabled - significantly reduces costs over time

## Troubleshooting Slow Builds

1. Check build queue: EAS may be experiencing high load
2. Verify cache hits: Subsequent builds should be faster
3. Review dependencies: Large native modules slow builds
4. Check build logs: Look for slow steps

