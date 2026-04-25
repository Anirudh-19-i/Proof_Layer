import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';
import CandidateDashboard from './components/dashboard/CandidateDashboard';
import RecruiterDashboard from './components/dashboard/RecruiterDashboard';
import ProfileView from './components/dashboard/ProfileView';
import SettingsView from './components/dashboard/SettingsView';
import { Role } from './types';
import { Loader2, ArrowLeft } from 'lucide-react';
import ClickSpark from './components/ui/ClickSpark';
import StaggeredMenu from './components/ui/StaggeredMenu';
import Plasma from './components/ui/Plasma';

function BackToDashboard() {
  return (
    <div className="fixed top-8 left-8 z-[100]">
      <Link 
        to="/"
        className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#F27D26] transition-colors shadow-2xl"
      >
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();

  const menuItems = [
    { label: 'Dashboard', ariaLabel: 'Go to dashboard', link: '/' },
    { label: 'Profile', ariaLabel: 'View profile', link: '/profile' },
    { label: 'Settings', ariaLabel: 'Settings', link: '/settings' }
  ];

  const socialItems = [
    { label: 'Twitter', link: '#' },
    { label: 'GitHub', link: '#' },
    { label: 'LinkedIn', link: '#' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      <ClickSpark sparkColor="#F27D26" />
      <div className="fixed inset-0 pointer-events-none z-0">
        <Plasma color="#F27D26" speed={0.4} opacity={0.2} />
      </div>
      
      <StaggeredMenu
        items={menuItems}
        socialItems={socialItems}
        menuButtonColor="#ffffff"
        accentColor="#F27D26"
      />

      <div className="relative z-10">
        <Routes>
          <Route path="/" element={
            profile?.role === Role.RECRUITER ? <RecruiterDashboard /> : <CandidateDashboard />
          } />
          <Route path="/profile/:userId?" element={
            <div className="min-h-screen bg-[#F5F5F4] p-12">
              <BackToDashboard />
              <ProfileView />
            </div>
          } />
          <Route path="/settings" element={
            <div className="min-h-screen bg-[#F5F5F4] p-12">
              <BackToDashboard />
              <SettingsView />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
