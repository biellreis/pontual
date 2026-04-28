import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Camera, LogOut, ArrowLeft, Loader2, Check, Mail, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

export default function ProfilePage({ onBack }: { onBack: () => void }) {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [nome, setNome] = useState(profile?.nome || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = nome
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const handleSaveName = async () => {
    if (!nome.trim()) return;
    setSavingName(true);
    setError(null);

    const { error: err } = await supabase
      .from('profiles')
      .update({ nome: nome.trim() })
      .eq('id', user?.id);

    if (err) {
      setError('Erro ao atualizar nome.');
    } else {
      setNameSuccess(true);
      await refreshProfile();
      setTimeout(() => setNameSuccess(false), 2000);
    }
    setSavingName(false);
  };

  const handleChangePassword = async () => {
    setError(null);
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSavingPassword(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });

    if (err) {
      setError(err.message);
    } else {
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 2000);
    }
    setSavingPassword(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setError('Erro ao enviar foto.');
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    // Update profile
    await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    await refreshProfile();
    setUploadingAvatar(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover gradient */}
        <div className="h-28 bg-gradient-to-r from-[#4f6ef7] via-[#5b7af9] to-[#7c3aed]" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-14 mb-4">
            <div className="relative inline-block">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-[#4f6ef7] to-[#7c3aed] flex items-center justify-center text-white text-[28px] font-bold">
                  {initials}
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                {uploadingAvatar ? (
                  <Loader2 size={14} className="animate-spin text-gray-500" />
                ) : (
                  <Camera size={14} className="text-gray-500" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <h2 className="text-[20px] font-bold text-gray-900">{profile?.nome || 'Usuário'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Mail size={14} className="text-gray-400" />
            <span className="text-[13px] text-gray-500">{profile?.email || user?.email}</span>
          </div>
          {profile?.created_at && (
            <div className="flex items-center gap-2 mt-1">
              <Shield size={14} className="text-gray-400" />
              <span className="text-[13px] text-gray-500">Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-600"
        >
          {error}
        </motion.div>
      )}

      {/* Update Name */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <User size={18} className="text-[#4f6ef7]" />
          <h3 className="text-[15px] font-bold text-gray-900">Alterar Nome</h3>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.1)]"
          />
          <button
            onClick={handleSaveName}
            disabled={savingName || nome.trim() === profile?.nome}
            className="flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#3b56d4] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {savingName ? <Loader2 size={15} className="animate-spin" /> : nameSuccess ? <Check size={15} /> : null}
            {nameSuccess ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Lock size={18} className="text-[#4f6ef7]" />
          <h3 className="text-[15px] font-bold text-gray-900">Alterar Senha</h3>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mín. 6 caracteres)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.1)]"
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.1)]"
          />
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword}
            className="flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#3b56d4] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {savingPassword ? <Loader2 size={15} className="animate-spin" /> : passSuccess ? <Check size={15} /> : null}
            {passSuccess ? 'Senha alterada!' : 'Alterar Senha'}
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-5 py-3 text-[14px] font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer"
        >
          <LogOut size={18} />
          Sair da Conta
        </button>
      </div>
    </motion.div>
  );
}
