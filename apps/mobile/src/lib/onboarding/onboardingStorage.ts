import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore DEGIL: hassas veri degil, i18n de AsyncStorage kullaniyor (tutarlilik).
const ONBOARDING_KEY = 'dia.onboarding.completed';

export const OnboardingStorage = {
    async isCompleted(): Promise<boolean> {
        try {
            return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
        } catch {
            // Okuma patlarsa onboarding'i GOSTERME (kullaniciyi her acilista
            // tanitimla karsilamaktansa bir kez kacirmak daha iyi).
            return true;
        }
    },

    async markCompleted(): Promise<void> {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch {
            // Yazma patlarsa sessiz gec — kullanici akisi bloklanmasin.
            // En kotu senaryo: bir sonraki acilista tekrar gorur.
        }
    },
};