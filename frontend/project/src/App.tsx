import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';
import AppointmentsPage from './components/AppointmentsPage';

type Page = 'chat' | 'appointments';

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('chat');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (page === 'appointments') {
    return <AppointmentsPage onNavigateChat={() => setPage('chat')} />;
  }

  return <ChatPage onNavigateAppointments={() => setPage('appointments')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
