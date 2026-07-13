import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const ACCESS_TOKEN_KEY = 'dia_access_token';
const REFRESH_TOKEN_KEY = 'dia_refresh_token';

export const AUTH_LOGOUT_EVENT = 'dia:auth-logout';


// Web'de burada AUTH_LOGOUT_EVENT vardı (window event bus).
// RN'de window yok → reaktif logout login ekranı fazında (React state) ele alınacak.

export const AuthStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    // İki yazma paralel — sıra önemli değil, ikisi de bitmeli.
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  // Web'de ikisini de kontrol ediyordu; burada tek okuma yeterli.
  // Access token yoksa login değilsin. Refresh'in varlığı doRefresh'te kontrol ediliyor.
  async hasTokens(): Promise<boolean> {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return accessToken !== null;
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    // Storage boşaldı → dinleyen herkese haber ver. Emit'i silmeden SONRA
    // yapıyoruz: dinleyici status'u değiştirdiğinde token'lar zaten gitmiş olmalı.
    DeviceEventEmitter.emit(AUTH_LOGOUT_EVENT);
  },
};