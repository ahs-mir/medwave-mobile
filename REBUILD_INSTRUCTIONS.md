# ⚠️ IMPORTANT: Full Rebuild Required

## Problem
The app is still using the production URL because configuration changes require a **full rebuild**, not just a restart.

## Solution: Complete Rebuild Steps

### Step 1: Stop All Processes
```bash
cd mobile
pkill -9 -f "expo\|react-native\|metro"
```

### Step 2: Clear All Caches
```bash
cd mobile
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ios/build
```

### Step 3: Rebuild the App

**Option A: Using Expo (Recommended)**
```bash
cd mobile
npx expo start --clear
# Press 'i' to open iOS simulator
```

**Option B: Full Native Rebuild**
```bash
cd mobile
npx expo prebuild --clean
npx expo run:ios
```

### Step 4: Verify Configuration

When the app starts, check the console logs. You should see:
```
🔧 BASE_URL configured: http://192.168.0.227:8080/api
```

**NOT:**
```
❌ http://slippery-glass-production.up.railway.app/api
```

## Files Fixed

1. ✅ `app.config.js` - Defaults to local URL
2. ✅ `src/services/ApiService.ts` - Fallback changed to local URL  
3. ✅ `src/lib/openaiStream.ts` - Fallback changed to local URL

## Quick Rebuild Script

I've created a script to do all of this automatically:
```bash
cd mobile
./force-local-rebuild.sh
```

## Why This Happens

- `app.config.js` changes require a rebuild because they're bundled at build time
- Expo caches configuration values
- Native apps need to be rebuilt to pick up new config

## Test After Rebuild

1. Open app in simulator
2. Check console logs for BASE_URL
3. Try Apple Sign-In
4. Should now connect to `http://192.168.0.227:8080/api` ✅

