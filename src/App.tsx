import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminGuard from '@/components/common/AdminGuard';
import UserLayout from '@/components/layouts/UserLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import QuizPage from '@/pages/QuizPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminQuizControlPage from '@/pages/admin/AdminQuizControlPage';
import AdminAdsPage from '@/pages/admin/AdminAdsPage';
import AdminLeaderboardPage from '@/pages/admin/AdminLeaderboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminHistoryPage from '@/pages/admin/AdminHistoryPage';
import AdminExportPage from '@/pages/admin/AdminExportPage';
import AdminBroadcastPage from '@/pages/admin/AdminBroadcastPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User routes with layout */}
          <Route element={<UserLayout />}>
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Admin login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<Navigate to="/admin/quiz" replace />} />

          {/* Admin routes with guard + layout */}
          <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route path="/admin/quiz" element={<AdminQuizControlPage />} />
            <Route path="/admin/leaderboard" element={<AdminLeaderboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/history" element={<AdminHistoryPage />} />
            <Route path="/admin/ads" element={<AdminAdsPage />} />
            <Route path="/admin/broadcast" element={<AdminBroadcastPage />} />
            <Route path="/admin/export" element={<AdminExportPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </Router>
  );
};

export default App;
