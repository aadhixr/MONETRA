import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.monetra.app',
  appName: 'MONETRA',
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
