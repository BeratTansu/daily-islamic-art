import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { type ThemeColors } from '../../constants/theme';
import { useTheme, useThemedStyles, useThemedScreenOptions } from '../../context/ThemeContext';

export default function AppLayout() {
  const { status } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Kok Stack ile AYNI kaynak: settings/detay header'i bu Stack'ten miras alir.
  const screenOptions = useThemedScreenOptions();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  return <Stack screenOptions={screenOptions} />;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
  });