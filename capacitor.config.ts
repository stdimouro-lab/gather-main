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
  },
  server: {
    iosScheme: 'capacitor',
    allowNavigation: [
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
    ],
  },
};

export default config;