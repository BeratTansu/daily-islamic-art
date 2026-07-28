import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';

// Tab navigator: Feed + Koleksiyonlar. Guard bir üst seviyede ((app)/_layout),
// buraya ulaşan zaten authenticated. artwork/[slug] bu grubun DIŞINDA (Stack'te)
// → detaya girince tab bar kaybolur, tam ekran olur.
export default function TabsLayout() {
    const { t } = useTranslation();
    // Tab bar option'lari native tarafta yasiyor — Stack header'i gibi
    // temadan beslenmezse koyu ekranin altinda krem serit kalir.
    const { colors } = useTheme();
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
                    title: t('tabs.feed'),
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
                    title: t('tabs.collections'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'bookmark' : 'bookmark-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'person' : 'person-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}