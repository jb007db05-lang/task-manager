import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState, AppDispatch } from '@/store';
import { TOKEN_STORAGE_KEY } from '@/services/authTokens';
import {
  AuthProfile,
  AuthSession,
  loginThunk,
  verify2faThunk,
  registerThunk,
  refreshUserThunk,
  updateProfileThunk,
  googleExchangeThunk,
  companionLoginThunk,
  logoutThunk,
  logout as logoutLocal,
  clearError as clearErrorAction,
  setRememberMe
} from '@/store/authSlice';

interface AuthContextValue {
  user: AuthProfile | null;
  session: AuthSession | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  require2fa: boolean;
  tempEmail2fa: string | null;
  /** Resolves with require2fa: true when a 2FA code must be entered next. */
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ require2fa: boolean }>;
  loginWithCompanionKey: (key: string) => Promise<void>;
  /** Finishes Google sign-in with the single-use code from the callback URL. */
  completeGoogleSignIn: (code: string) => Promise<void>;
  register: (payload: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
  }) => Promise<void>;
  verify2fa: (email: string, code: string, rememberMe?: boolean) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session, token, loading, error, require2fa, tempEmail2fa } = useSelector(
    (state: RootState) => state.auth
  );

  // Signing out in one tab signs out every "remember me" tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === TOKEN_STORAGE_KEY && event.newValue == null && user) {
        dispatch(logoutLocal());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch, user]);

  const logout = useCallback(async (): Promise<void> => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  const refreshUser = useCallback(async (): Promise<void> => {
    await dispatch(refreshUserThunk()).unwrap();
  }, [dispatch]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<{ require2fa: boolean }> => {
      dispatch(setRememberMe(rememberMe));
      const result = await dispatch(loginThunk({ email, password, rememberMe })).unwrap();
      return { require2fa: Boolean(result.data?.require2fa) };
    },
    [dispatch]
  );

  const verify2fa = useCallback(
    async (email: string, code: string, rememberMe = false): Promise<void> => {
      dispatch(setRememberMe(rememberMe));
      await dispatch(verify2faThunk({ email, code, rememberMe })).unwrap();
    },
    [dispatch]
  );

  const register = useCallback(
    async (payload: { email: string; password: string; firstName: string; lastName: string }): Promise<void> => {
      await dispatch(registerThunk(payload)).unwrap();
    },
    [dispatch]
  );

  const updateProfile = useCallback(
    async (data: {
      firstName?: string;
      lastName?: string;
      openaiApiKey?: string;
      anthropicApiKey?: string;
      geminiApiKey?: string;
    }): Promise<void> => {
      await dispatch(updateProfileThunk(data)).unwrap();
    },
    [dispatch]
  );

  const loginWithCompanionKey = useCallback(
    async (key: string): Promise<void> => {
      await dispatch(companionLoginThunk({ key })).unwrap();
    },
    [dispatch]
  );

  const completeGoogleSignIn = useCallback(
    async (code: string): Promise<void> => {
      await dispatch(googleExchangeThunk({ code })).unwrap();
    },
    [dispatch]
  );

  const clearError = useCallback((): void => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  const value = useMemo(
    () => ({
      user,
      session,
      token,
      loading,
      error,
      require2fa,
      tempEmail2fa,
      login,
      loginWithCompanionKey,
      completeGoogleSignIn,
      register,
      logout,
      refreshUser,
      updateProfile,
      verify2fa,
      clearError
    }),
    [
      user,
      session,
      token,
      loading,
      error,
      require2fa,
      tempEmail2fa,
      login,
      loginWithCompanionKey,
      completeGoogleSignIn,
      register,
      logout,
      refreshUser,
      updateProfile,
      verify2fa,
      clearError
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context == null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthProvider;
export { useAuth };
