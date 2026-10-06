/**
 * Single place that reads and writes the persisted auth state.
 *
 * "Remember me" sessions live in localStorage (shared by all tabs, survive a
 * restart); other sessions live in sessionStorage (this tab only).
 */
const KEYS = {
  token: 'todo_token',
  refreshToken: 'todo_refresh_token',
  user: 'todo_user',
  session: 'todo_session',
  rememberMe: 'todo_remember_me'
} as const;

export const TOKEN_STORAGE_KEY = KEYS.token;

export interface StoredAuth {
  token: string;
  refreshToken: string;
  user?: unknown;
  session?: unknown;
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export const isRememberMe = (): boolean => {
  try {
    return localStorage.getItem(KEYS.rememberMe) === 'true';
  } catch {
    return false;
  }
};

export const getAccessToken = (): string | null => read(KEYS.token);
export const getRefreshToken = (): string | null => read(KEYS.refreshToken);

export const getStoredJson = <T>(key: 'user' | 'session'): T | null => {
  const value = read(KEYS[key]);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const saveAuth = (auth: StoredAuth, rememberMe: boolean): void => {
  try {
    // Never leave a copy in the other storage: it would shadow the new one.
    const other = rememberMe ? sessionStorage : localStorage;
    const storage = rememberMe ? localStorage : sessionStorage;
    [KEYS.token, KEYS.refreshToken, KEYS.user, KEYS.session].forEach((key) => other.removeItem(key));

    storage.setItem(KEYS.token, auth.token);
    storage.setItem(KEYS.refreshToken, auth.refreshToken);
    if (auth.user !== undefined) storage.setItem(KEYS.user, JSON.stringify(auth.user));
    if (auth.session) storage.setItem(KEYS.session, JSON.stringify(auth.session));
    else storage.removeItem(KEYS.session);

    if (rememberMe) localStorage.setItem(KEYS.rememberMe, 'true');
    else localStorage.removeItem(KEYS.rememberMe);
  } catch {
    // Storage unavailable (private mode quota etc.): the in-memory session still works.
  }
};

export const saveStoredJson = (key: 'user' | 'session', value: unknown): void => {
  try {
    const storage = isRememberMe() ? localStorage : sessionStorage;
    storage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // ignore
  }
};

export const clearAuth = (): void => {
  try {
    Object.values(KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // ignore
  }
};
