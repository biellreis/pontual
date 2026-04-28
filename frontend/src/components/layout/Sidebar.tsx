import { LayoutDashboard, Upload, FileBarChart2, Settings, ChevronRight, Sparkles, X, Users, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

export type PageId = 'dashboard' | 'importar' | 'relatorios' | 'configuracoes' | 'funcionarios' | 'perfil';

const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: <LayoutDashboard size={18} /> },
  { id: 'funcionarios',  label: 'Funcionários',  icon: <Users size={18} /> },
  { id: 'importar',      label: 'Importar',      icon: <Upload size={18} /> },
  { id: 'relatorios',    label: 'Relatórios',     icon: <FileBarChart2 size={18} /> },
  { id: 'configuracoes', label: 'Configurações',  icon: <Settings size={18} /> },
];

interface Props {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ activePage, onNavigate, mobileOpen, onMobileClose }: Props) {
  const { profile, user } = useAuth();

  const userInitials = profile?.nome
    ? profile.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : user?.email ? user.email[0].toUpperCase() : '?';

  const handleNav = (id: PageId) => {
    onNavigate(id);
    onMobileClose();
  };

  /* ── Desktop Sidebar ──────────────────────────────────── */
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo Centralizada */}
      <div className="flex flex-col items-center justify-center px-5 pt-6 pb-4">
        <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
      </div>

      {/* Nav Items */}
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                neon-bar group relative flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5
                text-[13px] font-medium transition-all duration-200 cursor-pointer
                ${active
                  ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                }
              `}
              style={active ? { '--neon-bar-active': '1' } as React.CSSProperties : undefined}
            >
              {/* Neon bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-neon"
                  className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-neon)]"
                  style={{ boxShadow: 'var(--shadow-neon)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                active ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)]'
              }`}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
                <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 0.5, x: 0 }}>
                  <ChevronRight size={14} />
                </motion.div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pro Card */}
      <div className="mx-3 mb-3">
        <div className="rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-brand)] to-[#7c3aed] p-4 text-white shadow-[var(--shadow-brand)]">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles size={14} />
            <span className="text-[12px] font-bold tracking-wide uppercase">IOA Pro</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-80">
            Relatórios automáticos e alertas em tempo real.
          </p>
          <button className="mt-3 w-full rounded-[var(--radius-xs)] bg-white/20 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer">
            Saiba Mais
          </button>
        </div>
      </div>

      {/* User — clicável para ir ao Perfil */}
      <div className="border-t border-[var(--color-border-default)] px-4 py-3">
        <button
          onClick={() => handleNav('perfil')}
          className="flex items-center gap-3 w-full rounded-lg px-1 py-1 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[#7c3aed] text-[12px] font-bold text-white shadow-sm">
              {userInitials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)] text-left">
              {profile?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'}
            </p>
            <p className="truncate text-[11px] text-[var(--color-text-muted)] text-left">{profile?.email || user?.email || ''}</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile) ──────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-[var(--color-border-default)] bg-[var(--color-surface-sidebar)] lg:block">
        {sidebarContent}
      </aside>

      {/* ── Mobile Overlay + Drawer ─────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-50 bg-[var(--color-surface-overlay)] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--color-surface-sidebar)] shadow-[var(--shadow-xl)] lg:hidden"
            >
              <button
                onClick={onMobileClose}
                className="absolute right-3 top-5 rounded-[var(--radius-xs)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Bar ───────────────────────────── */}
      <nav className="bottom-bar flex items-center justify-around lg:hidden">
        {navItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`relative flex flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-[10px] font-medium transition-colors cursor-pointer ${
                active ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="bottombar-indicator"
                  className="absolute -top-1.5 h-[3px] w-6 rounded-full bg-[var(--color-brand)]"
                  style={{ boxShadow: 'var(--shadow-neon)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
              <span>{item.label.length > 8 ? item.label.slice(0, 7) + '.' : item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
