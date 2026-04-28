import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type AuthMode = 'login' | 'signup' | 'otp_sent';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        setMode('otp_sent');
        setSuccessMsg('Código de confirmação enviado para o seu e-mail!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Auth state change will handle redirect
      }
    } catch (err: any) {
      const msg = err.message || 'Erro inesperado';
      if (msg.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar.');
      } else if (msg.includes('already registered')) {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const handleAppleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };



  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#4f6ef7] via-[#5b7af9] to-[#7c3aed] relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <img src="/logo-branco.png" alt="Logo" className="h-64 w-auto object-contain drop-shadow-xl" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/80 text-[16px] font-medium tracking-wide text-center leading-relaxed"
          >
            Sistema de Gestão de Ponto e Controle Inteligente
          </motion.h2>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain mb-4" />
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-[24px] font-bold text-gray-900">
              {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar Conta' : 'Verifique seu E-mail'}
            </h2>
            <p className="text-[14px] text-gray-500 mt-1">
              {mode === 'login' && 'Acesse o sistema de gestão de ponto'}
              {mode === 'signup' && 'Preencha seus dados para começar'}
              {mode === 'otp_sent' && 'Enviamos um código de confirmação'}
            </p>
          </div>

          {/* OTP Sent Screen */}
          {mode === 'otp_sent' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
                <Mail size={32} className="text-green-500" />
              </div>
              <h3 className="text-[18px] font-bold text-gray-900 mb-2">Confira sua caixa de entrada</h3>
              <p className="text-[14px] text-gray-500 mb-6">
                Enviamos um link de confirmação para<br />
                <span className="font-semibold text-gray-700">{email}</span>
              </p>
              <button
                onClick={() => setMode('login')}
                className="text-[14px] font-semibold text-[#4f6ef7] hover:underline cursor-pointer"
              >
                Voltar para Login
              </button>
            </motion.div>
          ) : (
            <>
              {/* Error / Success */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-600"
                  >
                    {error}
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-[13px] text-green-600"
                  >
                    {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Social Login Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                >
                  {/* Google Official Icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button
                  onClick={handleAppleLogin}
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                >
                  {/* Apple Official Icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[12px] text-gray-400 font-medium">ou continue com e-mail</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-[14px] text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.1)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-12 text-[14px] text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.1)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f6ef7] px-4 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-[#4f6ef7]/25 transition-all hover:bg-[#3b56d4] hover:shadow-xl hover:shadow-[#4f6ef7]/30 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                      {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                      <ArrowRight size={16} className="ml-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Mode */}
              <p className="mt-6 text-center text-[13px] text-gray-500">
                {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-[#4f6ef7] hover:underline cursor-pointer"
                >
                  {mode === 'login' ? 'Criar conta' : 'Fazer login'}
                </button>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
