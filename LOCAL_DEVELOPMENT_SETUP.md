# Local Development Setup - Fixed

## Problem
App was trying to connect to production backend instead of local backend.

## Solution Applied
1. ✅ Updated `app.config.js` to default to local backend URL
2. ✅ Updated `ApiService.ts` fallback to use local URL
3. ✅ Created `.env.local` file to force local development

## Current Configuration

### API Base URL
- **Local Development**: `http://192.168.0.227:8080/api`
- **Production**: `https://slippery-glass-production.up.railway.app/api` (commented out)

### Files Modified
1. `app.config.js` - Defaults to local URL
2. `src/services/ApiService.ts` - Fallback changed to local URL
3. `.env.local` - Environment variable to force local URL

## Next Steps

### 1. Rebuild the App
The app MUST be rebuilt for config changes to take effect:

```bash
cd mobile

# Option 1: Clear cache and restart Expo
npx expo start --clear
# Then press 'i' for iOS simulator

# Option 2: Full native rebuild (if using native build)
npx expo prebuild --clean
npx expo run:ios
```

### 2. Verify Backend is Running
```bash
cd backend
# Check if backend is running
curl http://192.168.0.227:8080/health

# Should return: {"status":"healthy",...}
```

### 3. Test Apple Sign-In
1. Open app in simulator
2. Tap "Sign in with Apple"
3. Authenticate
4. Should now connect to local backend ✅

## When Ready for Staging/Production

### Option 1: Use Environment Variable
```bash
export EXPO_PUBLIC_API_BASE_URL=https://your-staging-url.com/api
npx expo run:ios
```

### Option 2: Update app.config.js
Change line 46 back to:
```javascript
apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://slippery-glass-production.up.railway.app/api' 
    : 'http://192.168.0.227:8080/api'),
```

### Option 3: Remove .env.local
```bash
rm mobile/.env.local
```

## Verify It's Using Local Backend

Check the console logs when app starts:
- Look for: `🔧 BASE_URL configured: http://192.168.0.227:8080/api`
- Should NOT show production URL

## Troubleshooting

**If still connecting to production:**
1. Make sure you did a full rebuild (not just restart)
2. Check console logs for actual BASE_URL being used
3. Verify `.env.local` exists and has correct URL
4. Clear Metro bundler cache: `npx expo start --clear`

**If IP address changes:**
1. Find new IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Update `app.config.js` line 46
3. Update `.env.local`
4. Rebuild app

