/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserAccount } from './types';
import {
  initStorage,
  getCurrentSession,
  setCurrentSession,
} from './services/storageService';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { GuruDashboard } from './components/GuruDashboard';
import { WaliDashboard } from './components/WaliDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DEFAULT_PASSWORD } from './services/storageService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initStorage();
    const session = getCurrentSession();
    if (session) {
      setCurrentUser(session);
      // Auto open change password modal if account is still using default password
      if (session.isDefaultPassword || session.password === DEFAULT_PASSWORD) {
        setIsChangePasswordOpen(true);
      }
    }
    setInitialized(true);

    const handleSessionChange = () => {
      const current = getCurrentSession();
      setCurrentUser(current);
    };

    window.addEventListener('salam_session_changed', handleSessionChange);
    return () => window.removeEventListener('salam_session_changed', handleSessionChange);
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentSession(user);
    setCurrentUser(user);
    // When any account logs in for the first time with default password, automatically show change password modal
    if (user.isDefaultPassword || user.password === DEFAULT_PASSWORD) {
      setIsChangePasswordOpen(true);
    }
  };

  const handleLogout = () => {
    setCurrentSession(null);
    setCurrentUser(null);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="w-8 h-8 border-4 border-[#00C2A0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#3F4E5A] flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePasswordClick={() => setIsChangePasswordOpen(true)}
      />

      {/* Main Role-Based Dashboard View */}
      <main className="flex-1">
        {currentUser.role === 'guru' && (
          <GuruDashboard currentUser={currentUser} />
        )}
        {currentUser.role === 'wali' && (
          <WaliDashboard currentUser={currentUser} />
        )}
        {currentUser.role === 'admin' && (
          <AdminDashboard currentUser={currentUser} />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="no-print border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} <strong>SALAM Quran</strong> &bull; SDIT Salsabila 3 Banguntapan
          </p>
          <p className="text-[11px] text-slate-400">
            Salsabila Achievement, Learning, And Application for Monitoring Qur’an
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ChangePasswordModal
        currentUser={currentUser}
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => {
          // session updated automatically
        }}
      />
    </div>
  );
}
