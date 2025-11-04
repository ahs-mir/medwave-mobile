const fs = require('fs');
const path = require('path');

module.exports = function(api) {
  api.cache(true);
  
  // Use .env.local if it exists, otherwise .env.production
  const localEnvPath = path.resolve(__dirname, '.env.local');
  const hasLocalEnv = fs.existsSync(localEnvPath);
  const envFile = hasLocalEnv ? '.env.local' : '.env.production';
  
  console.log(`🔧 Babel: Using env file: ${envFile}`);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for `react-native-reanimated/plugin`
      'react-native-reanimated/plugin',
      ["module:react-native-dotenv", {
        "envName": "APP_ENV",
        "moduleName": "@env",
        "path": envFile,
        "safe": true,
        "allowUndefined": true,
        "verbose": false
      }]
    ]
  };
};
