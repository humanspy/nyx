import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import AuthPage from './components/Auth/AuthPage.jsx';
import VerifyEmailPage from './components/Auth/VerifyEmailPage.jsx';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './components/Auth/ResetPasswordPage.jsx';
import AppLayout from './components/Layout/AppLayout.jsx';
import TermsPage from './components/Legal/TermsPage.jsx';
import PrivacyPage from './components/Legal/PrivacyPage.jsx';
import CookieBanner from './components/Common/CookieBanner.jsx';
import { useAuthStore } from './store/authStore.js';
import { useTheme } from './utils/theme.js';

export default function App() {
  const { token, restoreSession } = useAuthStore();
  const { applyTheme } = useTheme();

  useEffect(() => {
    restoreSession();
    applyTheme();
  }, []);

  return (
    <>
      <Routes>
        {/* Public routes — always accessible */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {!token ? (
          <Route path="/*" element={<AuthPage />} />
        ) : (
          <Route path="/*" element={<AppLayout />} />
        )}
      </Routes>
      <CookieBanner />
    </>
  );
}
