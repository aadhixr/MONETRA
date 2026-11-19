import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.aurix.app',
  appName: 'AURIX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#090B08',
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
