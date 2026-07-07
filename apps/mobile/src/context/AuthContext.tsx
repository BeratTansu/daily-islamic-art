import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AuthService } from '../lib/auth/authService';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Açılışta bir kez: SecureStore'da token var mı? → flash önleme buradan.
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

  async function signIn(email: string, password: string) {
    // login throw ederse status DEĞİŞMEZ — hata login ekranına propagate olur.
    await AuthService.login(email, password);
    setStatus('authenticated');
  }

  async function signOut() {
    await AuthService.logout(); // logout içinde her hâlükârda clear var
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}