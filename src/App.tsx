import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';

import AuthProvider from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import PrivateRoute from '@/routes/PrivateRoute';
import PublicRoute from '@/routes/PublicRoute';
import Loader from '@/components/Loader';
import { GuideRuntimeProvider } from '@/lib/guide-runtime/GuideRuntimeProvider';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'));
const GoogleOAuthCallbackPage = lazy(() => import('@/pages/GoogleOAuthCallbackPage'));

import { LoadingProvider } from '@/context/LoadingContext';
import GlobalLoadingSpinner from '@/components/GlobalLoadingSpinner';
import { ToastProvider } from '@/context/ToastContext';

function App(): JSX.Element {
  return (
    <ToastProvider>
      <LoadingProvider>
        <AuthProvider>
          <ChatProvider>
            <ConfirmationProvider>
              <BrowserRouter>
                <GuideRuntimeProvider>
                  <Suspense fallback={<Loader center />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                    <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
                    <Route
                      path="/login"
                      element={
                        <PublicRoute redirectTo="/dashboard">
                          <LoginPage />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PublicRoute redirectTo="/dashboard">
                          <RegisterPage />
                        </PublicRoute>
                      }
                    />
                    <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/intelligence" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/prompts" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/playground" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/event-tracking" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/engagement" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-integrations" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-integrations/:integrationId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-integrations/:integrationId/:tab" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/sdk-docs" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/projects/:projectId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="/projects/:projectId/epics/:epicId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
                </GuideRuntimeProvider>
              </BrowserRouter>
              <GlobalLoadingSpinner />
            </ConfirmationProvider>
          </ChatProvider>
        </AuthProvider>
      </LoadingProvider>
    </ToastProvider>
  );
}

export default App;
