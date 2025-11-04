module.exports = ({ config }) => {
  return {
    ...config,
    expo: {
      name: "MedWave",
      slug: "medwave",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      },
      assetBundlePatterns: [
        "**/*"
      ],
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.riztech.medwave",
        icon: "./assets/icon.png",
        buildNumber: "2"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
        package: "com.riztech.medwave",
        versionCode: 1
      },
      web: {
        favicon: "./assets/favicon.png",
        bundler: "metro"
      },
      extra: {
        eas: {
          projectId: "dd546335-b1ca-41c4-b066-d4626f5013d1"
        },
        // API Configuration - accessible via Constants.expoConfig.extra
        apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://slippery-glass-production.up.railway.app/api',
        devQuickLoginEnabled: process.env.DEV_QUICK_LOGIN_ENABLED || 'false'
      },
      runtimeVersion: "1.0.0",
      updates: {
        url: "https://u.expo.dev/dd546335-b1ca-41c4-b066-d4626f5013d1",
        fallbackToCacheTimeout: 0
      },
      channel: "production"
    },
    plugins: [
      "expo-audio",
      "./plugins/with-podfile-rctreleaselevel-fix.js"
    ]
  };
};
