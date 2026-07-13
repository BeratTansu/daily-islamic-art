import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { AuthService } from '../lib/auth/authService';
import { AUTH_LOGOUT_EVENT } from '../lib/auth/authStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      const loggedIn = await AuthService.isLoggedIn();
      if (active) setStatus(loggedIn ? 'authenticated' : 'unauthenticated');
    })();
    return () => {
      active = false; // unmount olduysa setState'i yut (async race koruması)
    };
  }, []);

  // Reaktif logout: AuthStorage.clear() her çağrıldığında tetiklenir.
  // Asıl amaç refresh-fail — ApiClient token'ı yenileyemeyip clear() çağırınca
  // ekran asılı kalmasın, kullanıcı login'e düşsün. Normal logout da buradan
  // geçer (signOut ayrıca kendi setStatus'unu yapar → idempotent).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_LOGOUT_EVENT, () => {
      setStatus('unauthenticated');
    });
    return () => sub.remove();
  }, []);

  async function signIn(email: string, password: string) {
    // login throw ederse status DEĞİŞMEZ — hata login ekranına propagate olur.
    await AuthService.login(email, password);
    setStatus('authenticated');
  }

  async function register(email: string, password: string, displayName: string) {
    // signIn ile aynı desen: register throw ederse status değişmez,
    // hata register ekranına propagate olur.
    await AuthService.register(email, password, displayName);
    setStatus('authenticated');
  }

  async function signOut() {
    await AuthService.logout(); // logout içinde her hâlükârda clear var
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ status, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}