# App Store Rejection Fix Guide

## ✅ Fixed: Issue #1 - Camera Permission Description

Updated `Info.plist` with detailed permission descriptions:
- **Camera**: Now explains scanning patient lists and medical documents
- **Microphone**: Now explains voice notes and audio documentation  
- **Photo Library**: Now explains attaching medical documents to patient records

## ✅ Bonus Fix: Export Compliance Automation

Added `ITSAppUsesNonExemptEncryption` key to `Info.plist`:
- **No more "None of the above" clicks** in App Store Connect
- Automatically declares standard encryption usage (HTTPS only)
- Saves time on every app submission

## 📋 Action Required: Issue #2 - App Store Connect Privacy Settings

You need to update your privacy labels in App Store Connect:

### Steps:

1. **Go to App Store Connect**
   - Navigate to: https://appstoreconnect.apple.com
   - Select your MedWave app

2. **Update App Privacy**
   - Go to: App Information → App Privacy
   - Find **Performance Data** and **Crash Data**

3. **Change the "Data Use" Setting**
   
   For BOTH Performance Data and Crash Data:
   - Click "Edit"
   - Change **"Data Use"** from "Tracking" to **"App Functionality"** 
   - Ensure **"Used to Track You"** is set to **NO**
   - Save changes

### Why This Fixes It:

Your app uses Expo's built-in crash reporting and performance monitoring to improve the app (not for advertising). By changing the data use to "App Functionality" and confirming it's NOT used for tracking, Apple will no longer require App Tracking Transparency.

## 🚀 Next Steps

1. Fix the App Store Connect privacy settings (above)
2. Rebuild your app:
   ```bash
   cd /Users/ahsanmirza/Desktop/MedWave/mobile
   eas build --platform ios
   ```
3. Submit the new build to App Store Connect
4. In Review Notes, mention:
   - "Updated all permission descriptions with specific use cases"
   - "Corrected privacy labels - no user tracking, data used for app functionality only"

## Build Details to Update

- Current version: 1.0.0
- Current build: 2
- New build will be: 3 (automatically incremented by EAS)

---

**Estimated time to fix:** 5-10 minutes in App Store Connect + 15-20 minutes for new build

