# Xcode Signing Setup for Apple Sign-In

## ✅ What's Already Done

1. ✅ Simulator signed in with your Apple ID
2. ✅ Apple Sign-In capability added to entitlements
3. ✅ Plugin configured in app.config.js
4. ✅ Native project rebuilt with prebuild

## 🔧 Remaining Step: Configure Xcode Signing

Xcode is now opening. Follow these steps:

### Step 1: Select the Project
1. In Xcode's left sidebar, click on **"MedWave"** (the blue project icon at the top)
2. Make sure the **MedWave** project (not folder) is selected

### Step 2: Select the Target
1. In the main area, click on the **"MedWave"** target under TARGETS
2. Make sure it's highlighted

### Step 3: Configure Signing & Capabilities
1. Click on the **"Signing & Capabilities"** tab at the top
2. Check **"Automatically manage signing"** checkbox
3. In the **"Team"** dropdown:
   - Select your Apple ID team (it may show your name or email)
   - If you don't see your team, click "Add Account..." and sign in
4. Verify that **"Sign in with Apple"** appears in the Capabilities list
   - If not, click the "+ Capability" button and add "Sign in with Apple"

### Step 4: Verify Bundle Identifier
- The Bundle Identifier should be: `com.riztech.medwave`
- Xcode may automatically add a Team prefix (like `YourName.com.riztech.medwave`)
- That's OK - the important thing is signing works

### Step 5: Wait for Signing to Complete
- Xcode will automatically generate signing certificates and provisioning profiles
- Wait until you see a green checkmark ✅ and "MedWave.app" is ready

### Step 6: Close Xcode
- Once signing is configured (green checkmark), you can close Xcode
- The app will be rebuilt with proper signing

## 🚀 After Xcode Signing is Configured

Run the app again:
```bash
cd mobile
npx expo run:ios
```

Apple Sign-In should now work in the simulator!

## ⚠️ Troubleshooting

**If you see "No signing certificate" error:**
- Make sure you're signed into Xcode with your Apple ID
- Go to Xcode → Settings → Accounts → Add your Apple ID

**If "Sign in with Apple" capability doesn't appear:**
- The capability might already be there (check the entitlements file)
- If missing, click "+ Capability" and add it manually

**If bundle identifier conflicts:**
- This might happen if another app uses the same ID
- Xcode will suggest a unique identifier with your team prefix
- That's fine - use the suggested one

