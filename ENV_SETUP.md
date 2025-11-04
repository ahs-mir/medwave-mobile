# Environment Configuration Guide

## Issue Found and Fixed

### The Problem
The app was connecting to `localhost` instead of production API after TestFlight deployment.

### Root Cause
The `.env` file contained `API_BASE_URL=http://localhost:8080/api` and was being bundled into production builds by EAS, causing the app to try connecting to localhost on devices.

### The Fix
1. Renamed `.env` to `.env.local` (gitignored for local dev only)
2. Created `.env.production` with production API URL
3. Updated `babel.config.js` to use `.env.production` by default

## Environment Files

### `.env.production` (Committed to Git)
- Used for EAS builds and production
- Contains production API URL: `https://slippery-glass-production.up.railway.app/api`
- **This file should be committed**

### `.env.local` (Gitignored)
- Used for local development only
- Contains localhost URL for testing with local backend
- Contains developer credentials
- **This file should NOT be committed**

## Usage

### Local Development
1. Copy `.env.local` if it doesn't exist (or it should already be there from the rename)
2. Run `npm start` - will use localhost backend

### Production Build
1. Run `eas build --platform ios --profile production`
2. EAS will use `.env.production` automatically
3. App will connect to production backend

## Verification

To verify the correct URL is being used, check the console logs on app startup:
```
🔧 BASE_URL configured: [URL HERE]
🔧 API_BASE_URL from @env: [URL HERE]
```

For TestFlight/Production, you should see:
```
🔧 BASE_URL configured: https://slippery-glass-production.up.railway.app/api
```

For Local Development, you should see:
```
🔧 BASE_URL configured: http://localhost:8080/api
```
