import React, { useState } from 'react';
import {
  LogIn, Building2, Mail, Lock, Eye, EyeOff, AlertCircle,
  KeyRound, ArrowLeft, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// view: 'login' | 'forgot' | 'reset'
export default function Login() {
  const { login, forgotPassword, resetPassword } = useAuth();

  const [view, setView] = useState('login');

  // Shared state
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Reset-flow state
  const [resetData, setResetData] = useState({ code: '', newPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
    setError('');
  };

  const goTo = (target) => {
    setError('');
    setInfo('');
    setView(target);
  };

  // --- Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  // --- Request reset code ---
  const handleForgot = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      await forgotPassword(formData.email);
      setInfo(`We've sent a 6-digit verification code to ${formData.email}. Check your inbox (and spam).`);
      setView('reset');
    } catch (err) {
      setError(err.message || 'Could not send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Verify code + set new password ---
  const handleReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      await resetPassword(formData.email, resetData.code, resetData.newPassword);
      setInfo('Password reset successfully! You can now sign in with your new password.');
      setFormData({ ...formData, password: '' });
      setResetData({ code: '', newPassword: '' });
      setView('login');
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const Alert = () => (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
      {info && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-200">{info}</p>
        </div>
      )}
    </>
  );

  const Spinner = ({ label }) => (
    <>
      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      <span>{label}</span>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* Dynamic Gradient Background */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-rose-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/10 p-8 md:p-10 rounded-3xl border border-white/20 shadow-2xl shadow-slate-900/50">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-white p-3 rounded-xl shadow-md">
              {view === 'login'
                ? <Building2 className="w-6 h-6 text-indigo-600" />
                : <KeyRound className="w-6 h-6 text-indigo-600" />}
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md">
              {view === 'login' ? 'HomeTax Login' : view === 'forgot' ? 'Reset Password' : 'Enter Code'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-300">
            {view === 'login' && 'Secure access to the Revenue Management Console.'}
            {view === 'forgot' && 'Enter your email and we will send you a verification code.'}
            {view === 'reset' && 'Enter the code from your email and choose a new password.'}
          </p>
        </div>

        {/* ---------- LOGIN VIEW ---------- */}
        {view === 'login' && (
          <form className="space-y-6" onSubmit={handleLogin}>
            <Alert />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-indigo-300" />
                </div>
                <input
                  required name="email" type="email" placeholder="user@taxation.gov"
                  value={formData.email} onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">Password</label>
                <button type="button" onClick={() => goTo('forgot')}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-indigo-300" />
                </div>
                <input
                  required name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={formData.password} onChange={handleInputChange}
                  className="block w-full pl-10 pr-10 py-3 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-300 hover:text-indigo-100 focus:outline-none">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/50 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-8">
              {isLoading ? <Spinner label="Authenticating..." /> : (<><LogIn className="w-5 h-5" /><span>Access Console</span></>)}
            </button>
          </form>
        )}

        {/* ---------- FORGOT (request code) VIEW ---------- */}
        {view === 'forgot' && (
          <form className="space-y-6" onSubmit={handleForgot}>
            <Alert />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-indigo-300" />
                </div>
                <input
                  required name="email" type="email" placeholder="user@taxation.gov"
                  value={formData.email} onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/50 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoading ? <Spinner label="Sending code..." /> : (<><Mail className="w-5 h-5" /><span>Send Verification Code</span></>)}
            </button>

            <button type="button" onClick={() => goTo('login')}
              className="w-full flex justify-center items-center gap-2 text-sm text-indigo-300 hover:text-indigo-100">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
          </form>
        )}

        {/* ---------- RESET (enter code + new password) VIEW ---------- */}
        {view === 'reset' && (
          <form className="space-y-6" onSubmit={handleReset}>
            <Alert />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">Verification Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-indigo-300" />
                </div>
                <input
                  required name="code" type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code"
                  value={resetData.code} onChange={handleResetChange}
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl text-white tracking-[0.4em] placeholder-indigo-300 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-indigo-300" />
                </div>
                <input
                  required name="newPassword" type={showNewPassword ? 'text' : 'password'} placeholder="Choose a new password"
                  value={resetData.newPassword} onChange={handleResetChange}
                  className="block w-full pl-10 pr-10 py-3 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-300 hover:text-indigo-100 focus:outline-none">
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/50 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoading ? <Spinner label="Resetting..." /> : (<><KeyRound className="w-5 h-5" /><span>Reset Password</span></>)}
            </button>

            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => goTo('forgot')}
                className="flex items-center gap-1 text-indigo-300 hover:text-indigo-100">
                <ArrowLeft className="w-4 h-4" /> Resend code
              </button>
              <button type="button" onClick={() => goTo('login')}
                className="text-indigo-300 hover:text-indigo-100">
                Back to login
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p className='text-gray-400'>256-bit Encrypted Connection | Need Support? <a href="#" className="text-indigo-400 hover:text-indigo-300">Contact IT</a></p>
        </div>
      </div>
    </div>
  );
}
