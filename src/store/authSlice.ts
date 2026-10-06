import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/services/api';
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getStoredJson,
  isRememberMe,
  saveAuth,
  saveStoredJson
} from '@/services/authTokens';
import type { NormalizedApiError } from '@/utils/apiError';

export interface AuthProfile {
  id: string;
  email: string;
  syncApiKey: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  authProvider: 'local' | 'google';
  openaiApiKeyConfigured?: boolean;
  anthropicApiKeyConfigured?: boolean;
  geminiApiKeyConfigured?: boolean;
  twoFactorEnabled?: boolean;
}

export interface AuthSession {
  sessionId: string | null;
  deviceId: string | null;
  deviceType: 'primary' | 'companion' | 'sync_key';
  deviceName: string | null;
  companionDeviceType: string | null;
  authMethod: 'access_token' | 'sync_api_key';
}

export interface AuthState {
  user: AuthProfile | null;
  session: AuthSession | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  require2fa: boolean;
  tempEmail2fa: string | null;
  rememberMe: boolean;
}

const initialToken = getAccessToken();
const initialRefreshToken = getRefreshToken();
const initialUser = getStoredJson<AuthProfile>('user');
const initialSession = getStoredJson<AuthSession>('session');
const initialRememberMe = isRememberMe();

interface AuthPayload {
  token: string;
  refreshToken: string;
  user: AuthProfile;
  session?: AuthSession;
}

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { message?: string } | null)?.message || fallback;

const initialState: AuthState = {
  user: initialUser,
  session: initialSession,
  token: initialToken,
  refreshToken: initialRefreshToken,
  loading: false,
  error: null,
  require2fa: false,
  tempEmail2fa: null,
  rememberMe: initialRememberMe,
};

// Async Thunks
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string; rememberMe: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', {
        email: payload.email,
        password: payload.password,
      });
      return { data: response.data.data, rememberMe: payload.rememberMe };
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Login failed');
    }
  }
);

export const verify2faThunk = createAsyncThunk(
  'auth/verify2fa',
  async (payload: { email: string; code: string; rememberMe: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-2fa', {
        email: payload.email,
        code: payload.code,
      });
      return { data: response.data.data, rememberMe: payload.rememberMe };
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || '2FA code verification failed');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; password: string; firstName: string; lastName: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', payload);
      return response.data.data;
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Registration failed');
    }
  }
);

/** Exchanges the single-use code from the Google callback for a session. */
export const googleExchangeThunk = createAsyncThunk(
  'auth/googleExchange',
  async (payload: { code: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/google/exchange', { code: payload.code });
      return response.data.data as AuthPayload;
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Google sign-in failed'));
    }
  }
);

export const companionLoginThunk = createAsyncThunk(
  'auth/companionLogin',
  async (payload: { key: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/companion-login', { key: payload.key });
      return response.data.data as AuthPayload;
    } catch (err) {
      return rejectWithValue(errorMessage(err, 'Companion login failed'));
    }
  }
);

/** Revokes the session on the server (best effort), then clears local state. */
export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  if (getAccessToken()) {
    try {
      await api.post('/auth/logout');
    } catch {
      // Already expired or offline: local sign-out still happens.
    }
  }
});

export const refreshUserThunk = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (err) {
      const status = (err as NormalizedApiError | null)?.status;
      return rejectWithValue({
        message: errorMessage(err, 'Unable to refresh session'),
        unauthorized: status === 401
      });
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (
    payload: {
      firstName?: string;
      lastName?: string;
      openaiApiKey?: string;
      anthropicApiKey?: string;
      geminiApiKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch('/auth/profile', payload);
      return response.data.data.user;
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Failed to update profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearTokens(state);
    },
    clearError(state) {
      state.error = null;
    },
    setTokens(state, action: PayloadAction<AuthPayload & { rememberMe: boolean }>) {
      state.rememberMe = action.payload.rememberMe;
      saveTokens(state, action.payload);
    },
    setRememberMe(state, action: PayloadAction<boolean>) {
      state.rememberMe = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.rememberMe = action.payload.rememberMe;
      if (action.payload.data.require2fa) {
        state.require2fa = true;
        state.tempEmail2fa = action.payload.data.email;
      } else {
        saveTokens(state, action.payload.data);
      }
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Verify 2FA
    builder.addCase(verify2faThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verify2faThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.rememberMe = action.payload.rememberMe;
      saveTokens(state, action.payload.data);
    });
    builder.addCase(verify2faThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(registerThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerThunk.fulfilled, (state, action) => {
      state.loading = false;
      saveTokens(state, action.payload);
    });
    builder.addCase(registerThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Google / companion sign-in (always "remember me": one sign-in per device)
    for (const thunk of [googleExchangeThunk, companionLoginThunk]) {
      builder.addCase(thunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.loading = false;
        state.rememberMe = true;
        saveTokens(state, action.payload);
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    }

    builder.addCase(logoutThunk.fulfilled, (state) => {
      clearTokens(state);
    });

    // Refresh User
    builder.addCase(refreshUserThunk.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.session = action.payload.session ?? null;
      saveStoredJson('user', action.payload.user);
      if (action.payload.session) {
        saveStoredJson('session', action.payload.session);
      }
    });
    builder.addCase(refreshUserThunk.rejected, (state, action) => {
      // Only a definite auth failure signs out; a network blip must not.
      if ((action.payload as { unauthorized?: boolean } | undefined)?.unauthorized) {
        clearTokens(state);
      }
    });

    // Update Profile
    builder.addCase(updateProfileThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      saveStoredJson('user', action.payload);
    });
    builder.addCase(updateProfileThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

function saveTokens(state: AuthState, payload: AuthPayload) {
  state.token = payload.token;
  state.refreshToken = payload.refreshToken;
  state.user = payload.user;
  state.session = payload.session ?? null;
  state.require2fa = false;
  state.tempEmail2fa = null;
  saveAuth(payload, state.rememberMe);
}

function clearTokens(state: AuthState) {
  state.token = null;
  state.refreshToken = null;
  state.user = null;
  state.session = null;
  state.require2fa = false;
  state.tempEmail2fa = null;
  state.rememberMe = false;
  clearAuth();
}

export const { logout, clearError, setTokens, setRememberMe } = authSlice.actions;
export default authSlice.reducer;
