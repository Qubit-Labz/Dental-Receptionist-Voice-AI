import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Mail, ArrowRight, KeyRound, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'email' | 'otp'>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setMode('otp');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter all 6 digits');
      setSubmitting(false);
      return;
    }

    // Prototype: accept any OTP
    const fn = isSignUp ? signUp : signIn;
    const { error } = await fn(email, enteredOtp);

    if (error) {
      setError(error);
    }
    setSubmitting(false);
  };

  const goBackToEmail = () => {
    setMode('email');
    setOtp(['', '', '', '', '', '']);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.08),_transparent_60%)]">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-5">
            <Stethoscope className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dental<span className="text-purple-400">Voice</span> AI
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Your intelligent dental receptionist
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl shadow-purple-500/5">
          {mode === 'email' ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">
                {isSignUp ? 'Create account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {isSignUp ? 'Enter your email to get started' : 'Sign in to your account'}
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#0a0e1a] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-blue-600/50 text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors inline-flex items-center gap-1.5"
                >
                  {isSignUp ? (
                    <>
                      Already have an account? <span className="text-purple-400">Sign in</span>
                    </>
                  ) : (
                    <>
                      Don't have an account? <span className="text-purple-400">Sign up</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={goBackToEmail}
                className="text-sm text-gray-400 hover:text-purple-400 transition-colors inline-flex items-center gap-1 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Enter verification code</h2>
                  <p className="text-sm text-gray-400">
                    We sent a code to <span className="text-gray-300">{email}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 bg-[#0a0e1a] border border-gray-700 rounded-xl text-center text-lg font-semibold text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                    />
                  ))}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-blue-600/50 text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                <button
                  onClick={goBackToEmail}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
                >
                  Didn't receive a code? <span className="text-purple-400">Try again</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
