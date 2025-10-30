# Deploying MedWave Mobile App to Vercel

## Overview

This guide explains how to deploy the MedWave mobile app's web presence to Vercel.

## Important Note

MedWave is primarily a **native mobile application** built with React Native and Expo. The Vercel deployment provides a landing page that directs users to download the mobile app. For actual mobile app distribution, use:

- **iOS**: App Store (via EAS Build)
- **Android**: Google Play Store (via EAS Build)

## Prerequisites

1. Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed globally:
   ```bash
   npm install -g vercel
   ```
3. Git repository (optional, for continuous deployment)

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Quickest)

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to Vercel:
   ```bash
   vercel
   ```

4. Follow the prompts to:
   - Link to an existing project or create a new one
   - Confirm the project settings
   - Deploy

5. Your app will be live at a URL like: `https://your-project.vercel.app`

### Option 2: Deploy via Vercel Dashboard (Recommended for CI/CD)

1. Push your code to GitHub/GitLab/Bitbucket

2. Go to [vercel.com/new](https://vercel.com/new)

3. Import your repository and select the `mobile` folder

4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `mobile`
   - **Build Command**: `npm run build:static`
   - **Output Directory**: `public`
   - **Install Command**: `npm install`

5. Add Environment Variables (if needed):
   - `EXPO_PUBLIC_API_BASE_URL`: Your API base URL
   - Any other `EXPO_PUBLIC_*` variables your app uses

6. Click "Deploy"

## Configuration Files

- `vercel.json`: Vercel deployment configuration
- `package.json`: Contains build scripts
- `app.config.js`: Expo app configuration

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

- `EXPO_PUBLIC_API_BASE_URL`: Backend API URL (e.g., `https://your-api.railway.app/api`)

## Building for Native Mobile Apps

To build native iOS and Android apps:

```bash
# iOS
npm run build:ios

# Android  
npm run build:android
```

These commands use EAS Build and create native app binaries for app store submission.

## Troubleshooting

### Build Fails
- Ensure Node.js version is >= 18.0.0
- Check that all dependencies are installed
- Review build logs in Vercel dashboard

### Environment Variables Not Working
- Ensure variables start with `EXPO_PUBLIC_` for web builds
- Redeploy after adding new environment variables

### Static Assets Not Loading
- Check that asset paths are correct in `public/` directory
- Verify cache headers in `vercel.json`

## Next Steps

1. ✅ Deploy to Vercel (web landing page)
2. 📱 Build iOS app: `npm run build:ios`
3. 📱 Build Android app: `npm run build:android`
4. 🍎 Submit to App Store
5. 🤖 Submit to Google Play Store

For mobile app store submission, see [APP_STORE_SUBMISSION.md](./APP_STORE_SUBMISSION.md)
