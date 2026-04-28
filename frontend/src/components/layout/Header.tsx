import { Search, Bell, Upload, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import type { PageId } from './Sidebar';

interface Props {
  activePage: PageId;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (page: PageId) => void;
  onMobileMenuOpen: () => void;
}

const greetingMessages = [
  'Tudo sob controle hoje!',
  'Gestão inteligente ativa.',
  'Acompanhe tudo em tempo real.',
  'Seu painel está atualizado.',
  'Eficiência na ponta dos dedos.',
];

const pageTitle: Record<PageId, string> = {
  dashboard: '',
  importar: 'Importar Planilha',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  funcionarios: 'Funcionários',
  perfil: 'Meu Perfil',
};

export default function Header({ activePage, searchQuery, onSearchChange, onNavigate, onMobileMenuOpen }: Props) {
  const { profile, user } = useAuth();

  const userInitials = profile?.nome
    ? profile.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  const firstName = profile?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';

  // Pick a daily greeting based on day of month
  const greeting = greetingMessages[new Date().getDate() % greetingMessages.length];

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border-default)] bg-white/80 px-4 py-3 backdrop-blur-xl lg:gap-4 lg:px-6 lg:py-4">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] lg:hidden cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Greeting + Page Title */}
      <div className="min-w-0 flex-1">
        <motion.h1
          key={activePage}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="truncate text-[15px] font-bold text-[var(--color-text-primary)] lg:text-[17px]"
        >
          {activePage === 'dashboard' ? (
            <>
              <span className="hidden sm:inline">Olá, {firstName}! — </span>
              <span className="font-normal text-[var(--color-text-muted)]">{greeting}</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Olá, {firstName}! — </span>
              {pageTitle[activePage]}
            </>
          )}
        </motion.h1>
      </div>

      {/* Search (hidden on small mobile) */}
      <div className="relative hidden sm:block sm:w-56 lg:w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Buscar por nome ou matrícula..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-surface-page)] py-2 pl-9 pr-3 text-[13px] text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:shadow-[var(--shadow-glow)]"
        />
      </div>

      {/* Import Button */}
      <button
        onClick={() => onNavigate('importar')}
        className="btn-primary hidden md:inline-flex cursor-pointer"
      >
        <Upload size={15} />
        <span>Importar Excel</span>
      </button>

      {/* Notification — mostra inconsistências recentes */}
      <button
        title="Notificações de inconsistências recentes"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
      >
        <Bell size={18} />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger)] text-[9px] font-bold text-white shadow-sm">
          3
        </span>
      </button>

      {/* Avatar — click to go to Profile */}
      <button
        onClick={() => onNavigate('perfil')}
        className="cursor-pointer"
        title="Meu Perfil"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[#7c3aed] text-[11px] font-bold text-white shadow-sm">
            {userInitials}
          </div>
        )}
      </button>
    </header>
  );
}
