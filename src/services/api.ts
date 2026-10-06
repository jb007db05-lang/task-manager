import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { showGlobalToast } from '@/context/ToastContext';
import { normalizeApiError } from '@/utils/apiError';
import {
  TOKEN_STORAGE_KEY,
  clearAuth,
  getAccessToken,
  getRefreshToken,
  isRememberMe,
  saveAuth
} from '@/services/authTokens';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Endpoints whose 401 means "wrong credentials", not "access token expired".
 * They never trigger a token refresh, and their pages show errors inline.
 */
const CREDENTIAL_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/verify-2fa',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/google/exchange',
  '/auth/companion-login'
];

const isCredentialEndpoint = (url?: string): boolean =>
  !!url && CREDENTIAL_ENDPOINTS.some((path) => url === path || url.endsWith(path));

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();

  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
  }
}

/** Runs fn while holding a lock shared by every tab of this origin. */
const withCrossTabLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) return fn();
  return locks.request('auth-token-refresh', fn) as Promise<T>;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets a fresh access token. `failedToken` is the access token the 401 was
 * for: if storage already holds a different one, another request or tab has
 * refreshed in the meantime and that token is used instead.
 */
const performRefresh = async (failedToken: string | null): Promise<string> => {
  const current = getAccessToken();
  if (current && current !== failedToken) return current;

  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new SessionExpiredError();

  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
    const { token, refreshToken: nextRefreshToken, user, session } = res.data.data;
    saveAuth({ token, refreshToken: nextRefreshToken, user, session }, isRememberMe());
    return token as string;
  } catch (error) {
    // 409: this refresh token was rotated a moment ago by someone else
    // sharing this session (e.g. a tab without Web Locks). Their new tokens
    // land in storage shortly.
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      for (let i = 0; i < 10; i += 1) {
        await wait(200);
        const latest = getAccessToken();
        if (latest && latest !== failedToken && getRefreshToken() !== refreshToken) return latest;
      }
    }
    if (axios.isAxiosError(error) && !error.response) {
      // Network failure: keep the session, just fail this request.
      throw error;
    }
    throw new SessionExpiredError();
  }
};

let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = (failedToken: string | null): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = withCrossTabLock(() => performRefresh(failedToken)).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

let redirectingToLogin = false;

/** Clears the session and goes to sign-in; returns true if it navigated away. */
const redirectToLogin = (): boolean => {
  clearAuth();
  const { pathname, search } = window.location;
  if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth/')) return false;
  if (!redirectingToLogin) {
    redirectingToLogin = true;
    const params = new URLSearchParams({ redirect: `${pathname}${search}`, expired: '1' });
    window.location.assign(`/login?${params.toString()}`);
  }
  return true;
};

/** Settles never: callers stay idle while the page navigates to sign-in. */
const pendingForever = <T>() => new Promise<T>(() => undefined);

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;
    const credentialRequest = isCredentialEndpoint(originalRequest?.url);

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !credentialRequest) {
      originalRequest._retry = true;
      const failedHeader = originalRequest.headers?.Authorization;
      const failedToken =
        typeof failedHeader === 'string' ? failedHeader.replace(/^Bearer\s+/i, '') : getAccessToken();

      let token: string;
      try {
        token = await refreshAccessToken(failedToken);
      } catch (refreshError) {
        if (refreshError instanceof SessionExpiredError && redirectToLogin()) {
          return pendingForever();
        }
        return Promise.reject(normalizeApiError(refreshError));
      }
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      // A failure here goes through this interceptor again (already normalized).
      return api(originalRequest);
    }

    const normalizedError = normalizeApiError(error);
    if (!credentialRequest) {
      showGlobalToast({
        variant: 'error',
        message: normalizedError.message,
        dedupeKey: `${normalizedError.code}:${normalizedError.message}`
      });
    }

    return Promise.reject(normalizedError);
  }
);

export { TOKEN_STORAGE_KEY };
export default api;
