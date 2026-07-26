import { ScrollText, Bot, User, Volume2 } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  hasAudio?: boolean;
}

interface ChatSidebarProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({ messages, isOpen, onToggle }: ChatSidebarProps) {
  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={onToggle}
        className={`fixed top-4 right-4 z-50 lg:hidden bg-[#111827] border border-gray-700 rounded-xl p-2.5 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors ${
          isOpen ? 'hidden' : ''
        }`}
      >
        <ScrollText className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative top-0 right-0 h-full w-80 bg-[#0d1117] border-l border-gray-800 z-40 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-l-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-purple-400" />
            Conversation
          </h3>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-300 transition-colors lg:hidden"
          >
            &times;
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">
                Start a conversation by pressing the microphone button
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-purple-600/20 text-purple-100 rounded-br-md'
                    : 'bg-gray-800/50 text-gray-200 rounded-bl-md'
                }`}
              >
                <p>{msg.text}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-gray-500">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.hasAudio && (
                    <Volume2 className="w-3 h-3 text-purple-400/60" />
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
