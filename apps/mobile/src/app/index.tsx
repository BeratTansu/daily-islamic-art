import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { OnboardingStorage } from '../lib/onboarding/onboardingStorage';
import { colors } from '../constants/theme';


export default function Index() {
  const { status } = useAuth();

  // Onboarding flag'i async okunur: null = henuz bilinmiyor (spinner).
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    OnboardingStorage.isCompleted().then((done) => {
      if (active) setOnboardingDone(done);
    });
    return () => { active = false; };
  }, []);

  // Auth veya onboarding durumu belli degilken spinner —
  // erken Redirect yanlis ekrana atar (flash).
  if (status === 'loading' || onboardingDone === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Sira onemli: onboarding gorulmediyse auth'tan ONCE gelir.
  // Gerekce: kullanici urunun ne oldugunu anlamadan giris istemek sogutur.
  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={status === 'authenticated' ? '/feed' : '/welcome'} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});