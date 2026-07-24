import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// Expo Router'in kendi entry'si — uygulamanin normal acilisi bundan geliyor.
// Onun yerine gecmiyoruz, uzerine widget handler kaydi ekliyoruz.
import 'expo-router/entry';

registerWidgetTaskHandler(widgetTaskHandler);