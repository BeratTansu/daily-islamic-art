import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Daily Islamic Art',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'dia',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'app.dia.mobile',
    adaptiveIcon: {
      backgroundColor: '#F5EDE1',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F5EDE1',
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
      },
    ],
    'expo-secure-store',
    'expo-localization',
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'DailyArtwork',
            label: 'Günün Eseri',
            minWidth: '320dp',
            minHeight: '120dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            description: 'Her gün yeni bir Islamic art eseri',
            updatePeriodMillis: 1800000,
            resizeMode: 'horizontal|vertical',
          },
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'e3d1adb5-a014-4573-afad-85f32752629d',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000',
  },
  owner: 'berattansu',
};

export default config;