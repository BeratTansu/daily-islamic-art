import { ApiClient, AuthResponse } from './apiClient';
import { AuthStorage } from './authStorage';

export type AuthUser = AuthResponse['user'];

export const AuthService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await ApiClient.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { auth: false },
    );
    await AuthStorage.setTokens(res.accessToken, res.refreshToken); // await eklendi
    return res.user;
  },

  async logout(): Promise<void> {
    try {
      await ApiClient.post('/auth/logout', {});
    } catch {
      /* backend hatası olsa bile local clear şart */
    } finally {
      await AuthStorage.clear(); // await eklendi
    }
  },

  // Web'de sync'ti; artık async → çağıran await'lemeli.
  async isLoggedIn(): Promise<boolean> {
    return AuthStorage.hasTokens();
  },
};