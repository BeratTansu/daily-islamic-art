const ACCESS_TOKEN_KEY = 'dia_access_token';
const REFRESH_TOKEN_KEY = 'dia_refresh_token';

export const AuthStorage = {
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  hasTokens(): boolean {
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) !== null &&
      localStorage.getItem(REFRESH_TOKEN_KEY) !== null
    );
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};