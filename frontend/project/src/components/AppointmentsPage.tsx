import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL, getHeaders } from "../lib/api";
import {
  CalendarDays,
  Clock,
  Stethoscope,
  LogOut,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

interface Appointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  reference: string;
  created_at: string;
}

export default function AppointmentsPage({
  onNavigateChat,
}: {
  onNavigateChat: () => void;
}) {
  const { user, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/appointments?email=${encodeURIComponent(user.email)}`,
        { headers: getHeaders() },
      );
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const data = await response.json();
      setAppointments(data.appointments ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch appointments");
    }
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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
            <p className="text-[10px] text-gray-500">Appointments</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-purple-400 hover:bg-blue-500/10 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              Scheduled Appointments
            </h2>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loading && appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">
                No appointments yet
              </h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Schedule an appointment by talking to the AI receptionist.
              </p>
            </div>
          )}

          {/* Appointments list */}
          {!loading && appointments.length > 0 && (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-colors"
                >
                  {/* Card main row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-medium text-purple-400 uppercase">
                        {new Date(
                          apt.appointment_date + "T00:00:00",
                        ).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-white leading-none">
                        {new Date(apt.appointment_date + "T00:00:00").getDate()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-sm font-medium text-white truncate">
                          {apt.appointment_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="font-mono text-purple-400">
                          Ref #{apt.reference}
                        </span>
                      </div>
                    </div>

                    {/* Expand/collapse */}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === apt.id ? null : apt.id)
                      }
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
                    >
                      {expandedId === apt.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {expandedId === apt.id && (
                    <div className="px-5 pb-4 pt-0 border-t border-gray-800/50 animate-fade-in">
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-gray-500">Date</span>
                          <p className="text-gray-300">
                            {new Date(
                              apt.appointment_date + "T00:00:00",
                            ).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">
                            Reference
                          </span>
                          <p className="text-gray-300 font-mono">
                            {apt.reference}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Created</span>
                          <p className="text-gray-300">
                            {new Date(apt.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
