import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/theme';

// Tab navigator: Feed + Koleksiyonlar. Guard bir üst seviyede ((app)/_layout),
// buraya ulaşan zaten authenticated. artwork/[slug] bu grubun DIŞINDA (Stack'te)
// → detaya girince tab bar kaybolur, tam ekran olur.
export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                },
            }}
        >
            <Tabs.Screen
                name="feed"
                options={{
                    title: 'Akış',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'home' : 'home-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="collections"
                options={{
                    title: 'Koleksiyonlar',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'bookmark' : 'bookmark-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}