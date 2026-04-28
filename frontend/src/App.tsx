import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Building2, Users, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import AppShell from './components/layout/AppShell';
import type { PageId } from './components/layout/Sidebar';
import KPICard from './components/dashboard/KPICard';
import PeriodFilter, { PeriodState } from './components/dashboard/PeriodFilter';
import DataTable, { type FilterType } from './components/dashboard/DataTable';
import InconsistenciaChart from './components/dashboard/InconsistenciaChart';
import ResumoSetores from './components/dashboard/ResumoSetores';
import ExportModal from './components/dashboard/ExportModal';
import { parseISO, startOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UploadZone from './components/importacao/UploadZone';
import EnviarRelatorios from './components/relatorios/EnviarRelatorios';
import { FuncionariosPage } from './pages/FuncionariosPage';
import type { RegistroInconsistencia } from './services/ControlIdParser';
import { supabase } from './services/supabaseClient';

// ────────────────────────────────────────────────────────────────────────────
// Page transition variants
// ────────────────────────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)' },
};

// ────────────────────────────────────────────────────────────────────────────
// Dashboard Page
// ────────────────────────────────────────────────────────────────────────────

function DashboardPage({
  data,
  searchQuery,
  onUpdateJustificativa,
  funcionarios,
}: {
  data: RegistroInconsistencia[];
  searchQuery: string;
  onUpdateJustificativa: (nome: string, data: string, tipo: string, justificativa: string) => void;
  funcionarios: { nome: string; setor: string | null }[];
}) {
  const [period, setPeriod] = useState<PeriodState>({ mode: 'Geral', value: null });
  const [typeFilter, setTypeFilter] = useState<FilterType>('todos');
  const [showExportModal, setShowExportModal] = useState(false);

  const displayedData = useMemo(() => {
    if (!data.length) return [];
    if (period.mode === 'Geral' || !period.value) return data;
    
    return data.filter((r) => {
      const rDate = parseISO(r.data);
      
      if (period.mode === 'Mês') {
        const rMonth = format(rDate, 'yyyy-MM');
        return rMonth === period.value;
      }
      if (period.mode === 'Semana') {
        const weekStart = startOfWeek(rDate, { weekStartsOn: 1 });
        return format(weekStart, 'yyyy-MM-dd') === period.value;
      }
      if (period.mode === 'Dia') {
        return r.data === period.value;
      }
      
      return true;
    });
  }, [data, period]);

  const periodLabel = useMemo(() => {
    if (period.mode === 'Geral' || !period.value) return 'Período Completo';
    if (period.mode === 'Mês') {
       const [y, m] = period.value.split('-');
       return `${m}/${y}`;
    }
    if (period.mode === 'Semana') {
       return `Semana de ${period.value.split('-').reverse().join('/')}`;
    }
    if (period.mode === 'Dia') {
       return `Dia ${period.value.split('-').reverse().join('/')}`;
    }
    return '';
  }, [period]);

  const typeFilterLabel: Record<FilterType, string> = {
    todos: 'Todas as Inconsistências',
    falta: 'Faltas',
    atraso: 'Atrasos',
    saida_antecipada: 'Saídas Antecipadas',
    sem_registro_entrada: 'Sem Registro de Entrada',
    sem_registro_saida: 'Sem Registro de Saída',
  };

  // pdfData = period filter + type filter applied (exact mirror of what's visible)
  const pdfData = useMemo(() => {
    let rows = displayedData;
    if (typeFilter !== 'todos') rows = rows.filter(r => r.tipo === typeFilter);
    return rows;
  }, [displayedData, typeFilter]);

  const pdfLabel = [
    periodLabel,
    typeFilter !== 'todos' ? typeFilterLabel[typeFilter] : null,
  ].filter(Boolean).join(' · ');

  const totalInconsistencias = displayedData.length;
  const faltas = displayedData.filter((r) => r.tipo === 'falta').length;
  const atrasos = displayedData.filter((r) => r.tipo === 'atraso').length;

  const totalServidores = new Set(displayedData.map((r) => r.nome_servidor)).size;
  const totalDias = new Set(displayedData.map((r) => r.data)).size;
  const totalPossivel = totalDias * totalServidores;
  const assiduidade = totalPossivel > 0
    ? Math.round(((totalPossivel - faltas) / totalPossivel) * 100)
    : displayedData.length > 0 ? 100 : 0;

  const setorCounts: Record<string, number> = {};
  for (const r of displayedData) {
    const s = r.setor || 'Sem Setor';
    setorCounts[s] = (setorCounts[s] ?? 0) + 1;
  }
  const setorCritico = Object.entries(setorCounts).sort(([, a], [, b]) => b - a)[0];

  const isEmpty = displayedData.length === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Period Filter Row & PDF Button */}
      <div className="relative z-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <motion.h2
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[18px] font-bold text-[var(--color-text-primary)] sm:text-[20px]"
        >
          Visão Geral
        </motion.h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isEmpty}
            className="relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:bg-[var(--color-brand)]/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span className="flex flex-col items-start leading-tight">
              <span>Gerar Relatório</span>
              {!isEmpty && (
                <span className="text-[10px] font-normal opacity-80">
                  por setor · {pdfLabel}
                </span>
              )}
            </span>
          </button>
          
          <PeriodFilter 
            active={period} 
            onChange={setPeriod} 
            dataDates={data.map(r => r.data)} 
          />
        </div>
      </div>

      {/* ÁREA DO DASHBOARD */}
      <div className="space-y-5 sm:space-y-6">
        {/* KPI Grid — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <KPICard
          title="Inconsistências"
          value={totalInconsistencias}
          subtitle={`${atrasos} atrasos · ${faltas} faltas`}
          icon={<AlertTriangle size={20} />}
          color={totalInconsistencias > 0 ? 'danger' : 'success'}
          trend={totalInconsistencias > 10 ? 'up' : undefined}
          trendLabel={totalInconsistencias > 10 ? 'Volume alto' : undefined}
          index={0}
        />
        <KPICard
          title="Assiduidade"
          value={isEmpty ? '—' : `${assiduidade}%`}
          subtitle={isEmpty ? 'Sem dados' : `${totalDias} dia(s) analisados`}
          icon={<Building2 size={20} />}
          color={assiduidade >= 90 ? 'success' : assiduidade >= 75 ? 'warning' : 'danger'}
          index={1}
        />
        <KPICard
          title="Funcionários"
          value={totalServidores}
          subtitle={isEmpty ? 'Importe uma planilha' : 'Servidores ativos'}
          icon={<Users size={20} />}
          color="brand"
          index={2}
        />
        <KPICard
          title="Setor Crítico"
          value={setorCritico ? setorCritico[0] : '—'}
          subtitle={setorCritico ? `${setorCritico[1]} ocorrências` : 'Sem dados'}
          icon={<FileSpreadsheet size={20} />}
          color="warning"
          index={3}
        />
      </div>

      {/* Charts Row */}
      {!isEmpty && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
          <InconsistenciaChart data={displayedData} />
          <ResumoSetores data={displayedData} />
        </div>
      )}

      {/* Data Table */}
        <DataTable
          data={displayedData}
          searchQuery={searchQuery}
          onUpdateJustificativa={onUpdateJustificativa}
          filter={typeFilter}
          onFilterChange={setTypeFilter}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={pdfData}
        periodLabel={pdfLabel}
        funcionarios={funcionarios}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Configurações Page
// ────────────────────────────────────────────────────────────────────────────

function ConfiguracoesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col items-center gap-4 py-16 text-center sm:py-20"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-brand)] to-[#7c3aed] shadow-[var(--shadow-brand)]">
        <FileSpreadsheet size={26} className="text-white" />
      </div>
      <h3 className="text-[17px] font-bold text-[var(--color-text-primary)]">Em breve</h3>
      <p className="max-w-md text-[13px] text-[var(--color-text-muted)]">
        Configurações de horários, cadastro de gestores por setor e integração com API de e-mail.
      </p>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Authenticated App Content
// ────────────────────────────────────────────────────────────────────────────

function AuthenticatedApp() {
  const [activePage, setActivePage] = useState<PageId>(() => {
    return (localStorage.getItem('activePage') as PageId) || 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);
  const [registros, setRegistros] = useState<RegistroInconsistencia[]>([]);
  const [funcionarios, setFuncionarios] = useState<{ nome: string; setor: string | null }[]>([]);

  useEffect(() => {
    supabase.from('funcionarios').select('nome, setor').then(({ data }) => {
      if (data) setFuncionarios(data);
    });
  }, []);

  const handleImported = (novos: RegistroInconsistencia[]) => {
    setRegistros(novos);
    setActivePage('dashboard');
  };

  const handleFuncionarioUpdate = (func: any) => {
    // Atualiza a lista global de funcionários (para o ExportModal e outros)
    setFuncionarios(prev => prev.map(f => {
      if (f.nome === func.nome) {
        return { ...f, ...func };
      }
      return f;
    }));

    // Atualiza os registros do dashboard
    setRegistros(prev => prev.map(r => {
      if (r.nome_servidor === func.nome) {
        return {
          ...r,
          cargo: func.cargo,
          setor: func.setor, // Update sector immediately
          horario_previsto: func.horario_previsto || r.horario_previsto
        };
      }
      return r;
    }));
  };

  const handleUpdateJustificativa = async (nome: string, data: string, tipo: string, justificativa: string) => {
    // 1. Atualiza na UI otimisticamente
    setRegistros(prev => prev.map(r => {
      if (r.nome_servidor === nome && r.data === data && r.tipo === tipo) {
        return { ...r, justificativa };
      }
      return r;
    }));

    // 2. Persiste no Supabase
    try {
      const { error } = await supabase
        .from('inconsistencias')
        .update({ justificativa })
        .eq('nome_servidor', nome)
        .eq('data', data)
        .eq('tipo', tipo);
        
      if (error) {
        console.error('Erro ao salvar justificativa no Supabase:', error);
      }
    } catch (err) {
      console.error('Falha na persistência da justificativa:', err);
    }
  };


  const filteredData = useMemo(() => registros, [registros]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage data={filteredData} searchQuery={searchQuery} onUpdateJustificativa={handleUpdateJustificativa} funcionarios={funcionarios} />;
      case 'importar':
        return <UploadZone onImported={handleImported} />;
      case 'relatorios':
        return <EnviarRelatorios />;
      case 'configuracoes':
        return <ConfiguracoesPage />;
      case 'funcionarios':
        return <FuncionariosPage onFuncionarioUpdate={handleFuncionarioUpdate} />;
      case 'perfil':
        return <ProfilePage onBack={() => setActivePage('dashboard')} />;
    }
  };

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// App Root — with Auth Gate
// ────────────────────────────────────────────────────────────────────────────

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src="/logo.png" alt="Carregando" className="h-16 w-auto object-contain drop-shadow-md" />
          </motion.div>
          <p className="text-[14px] text-gray-500 font-medium">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
