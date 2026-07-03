import { ApiClient, AuthResponse } from './apiClient';
import { AuthStorage } from './authStorage';

export type AuthUser = AuthResponse['user'];

export const AuthService = {
  // Login: token yok, o yüzden auth:false (401'de refresh denenmesin).
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await ApiClient.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { auth: false },
    );
    AuthStorage.setTokens(res.accessToken, res.refreshToken);
    return res.user;
  },

  // Logout: backend refresh hash'ini temizlesin, sonra local token'ları sil.
  // Backend'e ulaşılamasa bile local temizlik yapılmalı → finally.
  async logout(): Promise<void> {
    try {
      await ApiClient.post('/auth/logout', {});
    } catch {
      /* backend hatası olsa bile local clear şart */
    } finally {
      AuthStorage.clear();
    }
  },

  // "Login mi?" için ucuz sinyal. Token'ın geçerli olduğunu garanti etmez.
  isLoggedIn(): boolean {
    return AuthStorage.hasTokens();
  },
};