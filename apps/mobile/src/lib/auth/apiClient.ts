import { AuthStorage } from './authStorage';
import Constants from 'expo-constants';


// Android emülatör → makinenin localhost'u 10.0.2.2.
// iOS simülatör localhost'u paylaşır ama tek değer tutuyoruz; cihaz/prod'da değişecek (aşağıda not).
const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://10.0.2.2:3000';

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

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = await AuthStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await AuthStorage.clear();
      return false;
    }

    const data = (await res.json()) as AuthResponse;
    await AuthStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    await AuthStorage.clear();
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

// RequestInit'in `body`'si BodyInit. Biz ham veriyi kabul edip serialization'ı
// request() içinde tek noktada yapıyoruz → `body`'yi override ediyoruz.
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;

  // Serialization tek nokta. `undefined` = gövde yok. `false`/`0`/`''` geçerli gövdedir.
  const isFormData = body instanceof FormData;
  const hasBody = body !== undefined;
  const serializedBody: BodyInit | undefined = !hasBody
    ? undefined
    : isFormData
      ? (body as FormData)
      : JSON.stringify(body);

  // async — içinde await AuthStorage.getAccessToken() var.
  const buildHeaders = async (): Promise<HeadersInit> => {
    const h: Record<string, string> = {
      ...(headers as Record<string, string>),
    };
    // FormData'da Content-Type'a dokunma (boundary).
    // Gövde yoksa hiç set etme.
    if (hasBody && !isFormData) {
      h['Content-Type'] = 'application/json';
    }
    if (auth) {
      const token = await AuthStorage.getAccessToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  };

  const init: RequestInit = { ...rest, body: serializedBody };

  let res = await fetch(`${BASE_URL}${path}`, { ...init, headers: await buildHeaders() });

  if (res.status === 401 && auth) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await fetch(`${BASE_URL}${path}`, { ...init, headers: await buildHeaders() });
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
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: formData }),
};