import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Dimouro.gather',
  appName: 'Gather',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'gather',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    iosScheme: 'gather',
    androidScheme: 'https',
    allowNavigation: [
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
    ],
  },
};

export default config;
