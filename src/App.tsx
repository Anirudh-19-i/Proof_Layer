import React from 'react';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';
import CandidateDashboard from './components/dashboard/CandidateDashboard';
import RecruiterDashboard from './components/dashboard/RecruiterDashboard';
import { Role } from './types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (profile?.role === Role.RECRUITER) {
    return <RecruiterDashboard />;
  }

  return <CandidateDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppContent />
    </AuthProvider>
  );
}
