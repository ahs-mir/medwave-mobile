# Fixed: iOS Simulator API Connection Issue

## Problem
Apple Sign-In was working, but getting "Route not found" error when trying to send authentication to backend.

## Root Cause
iOS Simulator cannot access `localhost:8080` from the mobile app. It needs to use your Mac's IP address instead.

## Solution Applied
Updated `app.config.js` to use Mac's IP address (`192.168.0.227`) instead of `localhost` for development.

## Next Steps

### 1. Restart the App
The app needs to be restarted to pick up the new API URL:
```bash
cd mobile
npx expo run:ios
```

### 2. Verify Backend is Accessible
The backend should already be listening on `0.0.0.0:8080`, which means it accepts connections from network interfaces.

If you need to check:
```bash
cd backend
curl http://192.168.0.227:8080/health
```

Should return: `{"status":"healthy",...}`

### 3. Test Apple Sign-In Again
1. Open the app in simulator
2. Tap "Sign in with Apple"
3. Authenticate with Apple ID
4. Should now successfully connect to backend

## If IP Address Changes
If your Mac's IP address changes (e.g., when you reconnect to WiFi), update it in `mobile/app.config.js`:

1. Find your Mac's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

2. Update `app.config.js` line 46 with the new IP

3. Rebuild the app

## Alternative: Use Environment Variable
You can also set it via environment variable:
```bash
export EXPO_PUBLIC_API_BASE_URL=http://192.168.0.227:8080/api
npx expo run:ios
```

