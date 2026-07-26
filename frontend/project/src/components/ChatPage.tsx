import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import VoiceVisualizer from './VoiceVisualizer';
import ChatSidebar from './ChatSidebar';
import {
  Mic,
  MicOff,
  LogOut,
  Stethoscope,
  Loader2,
  PanelRightOpen,
  CalendarDays,
} from 'lucide-react';

export default function ChatPage({ onNavigateAppointments }: { onNavigateAppointments: () => void }) {
  const { user, signOut } = useAuth();
  const { messages, analyserNode, toggleRecording, isRecording, isPlaying, isProcessing, appointmentCreated, clearAppointmentFlag } = useVoiceAgent(user?.email ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (appointmentCreated) {
      setShowNotification(true);
      clearAppointmentFlag();
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [appointmentCreated, clearAppointmentFlag]);

  return (
    <div className="h-screen bg-[#0a0e1a] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.08),_transparent_60%)]">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-800/50 bg-[#0a0e1a]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">
              Dental<span className="text-purple-400">Voice</span> AI
            </h1>
            <p className="text-[10px] text-gray-500">Receptionist Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateAppointments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Appointments
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-gray-800/50 transition-colors"
            title="Toggle sidebar"
          >
            <PanelRightOpen className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`} />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
            <span className="text-xs text-gray-400 hidden sm:block">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center - Visualizer + Controls */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          {/* Visualizer */}
          <div className="w-full max-w-3xl">
            <VoiceVisualizer
              isRecording={isRecording}
              isPlaying={isPlaying}
              analyserNode={analyserNode}
            />
          </div>

          {/* Controls */}
          <div className="mt-10 flex flex-col items-center gap-4">
            {/* Record button */}
            <button
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/30'
                  : isProcessing
                    ? 'bg-gray-700 cursor-wait'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}

              {/* Pulse ring when recording */}
              {isRecording && (
                <span className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ping" />
              )}
            </button>

            {/* State label */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {isProcessing
                  ? 'Processing your request...'
                  : isRecording
                    ? 'Tap to stop recording'
                    : isPlaying
                      ? 'Playing response...'
                      : 'Tap to start speaking'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Sidebar — TEMPORARILY HIDDEN: the message data flow is not yet implemented,
            so the sidebar renders empty. Re-enable once the backend -> frontend transcript
            stream is wired up. */}
        <div className="hidden">
          <ChatSidebar
            messages={messages}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </div>

      {/* Appointment created notification */}
      {showNotification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-3 bg-[#111827] border border-purple-500/30 rounded-2xl px-5 py-3 shadow-lg shadow-purple-500/10">
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white">Appointment scheduled</span>
            <button
              onClick={() => {
                setShowNotification(false);
                onNavigateAppointments();
              }}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
