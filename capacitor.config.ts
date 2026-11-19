import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.aurix.app',
  appName: 'AURIX PRO',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    backgroundColor: '#090B08',
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    backgroundColor: '#090B08',
    scrollEnabled: true,
    contentInset: 'always',
  },
};

export default config;
