import { AuthStorage } from './authStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL tanımlı değil. apps/web/.env.local kontrol et.');
}

// Backend'in login/refresh dönüşüyle birebir aynı şekil.
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Aynı anda birden fazla 401 olursa tek refresh yapılsın diye tutulur.
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = AuthStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    // Düz fetch — request()'ten geçmiyor ki 401'de tekrar refresh denenmesin.
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      AuthStorage.clear();
      return false;
    }

    const data = (await res.json()) as AuthResponse;
    AuthStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    AuthStorage.clear();
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface RequestOptions extends RequestInit {
  auth?: boolean; // true (default): 401'de refresh dene. false: deneme (login için).
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };
    if (auth) {
      const token = AuthStorage.getAccessToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  };

  let res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: buildHeaders() });

  if (res.status === 401 && auth) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: buildHeaders() });
    }
  }

  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const err = await res.json();
      if (err?.message) message = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    } catch {
      /* body yok */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const ApiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};