import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Table2, Inbox, Check, X, Edit2 } from 'lucide-react';
import type { RegistroInconsistencia } from '../../services/ControlIdParser';

export type InconsistenciaRow = RegistroInconsistencia;

type FilterType = 'todos' | 'falta' | 'atraso' | 'saida_antecipada' | 'sem_registro_entrada' | 'sem_registro_saida';

const filterLabels: { key: FilterType; label: string }[] = [
  { key: 'todos',            label: 'Todos' },
  { key: 'falta',            label: 'Falta' },
  { key: 'atraso',           label: 'Atraso' },
  { key: 'saida_antecipada', label: 'Saída Ant.' },
  { key: 'sem_registro_entrada', label: 'S/ Entrada' },
  { key: 'sem_registro_saida', label: 'S/ Saída' },
];

const PAGE_SIZE = 10;

const diaDaSemana = (dataStr: string): string => {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [y, m, d] = dataStr.split('-').map(Number);
  return dias[new Date(y, m - 1, d).getDay()];
};

const badgeClass: Record<string, string> = {
  falta:            'badge-falta',
  atraso:           'badge-atraso',
  saida_antecipada: 'badge-saida',
  sem_registro_entrada: 'badge-sementrada',
  sem_registro_saida: 'badge-semsaida',
};

const badgeLabel: Record<string, string> = {
  falta:            'Falta',
  atraso:           'Atraso',
  saida_antecipada: 'Saída Ant.',
  sem_registro_entrada: 'Sem Entrada',
  sem_registro_saida: 'Sem Saída',
};

function JustificativaCell({ row, isPrinting, onUpdate }: { row: InconsistenciaRow; isPrinting: boolean; onUpdate?: (nome: string, data: string, tipo: string, justificativa: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(row.justificativa || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (isPrinting) {
    return <span className="text-[var(--color-text-primary)]">{row.justificativa || '—'}</span>;
  }

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      if (onUpdate) onUpdate(row.nome_servidor, row.data, row.tipo, val);
      setTimeout(() => {
        setSaved(false);
        setIsEditing(false);
      }, 1500);
    }, 400);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <input
          autoFocus
          type="text"
          placeholder="Motivo (ex: atestado...)"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if(e.key === 'Enter') handleSave(); if(e.key === 'Escape') setIsEditing(false); }}
          className="w-full px-2 py-1.5 text-[12px] bg-white border border-gray-200 rounded focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors flex items-center gap-1">
            <X size={12} /> Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || saved}
            className={`px-2 py-1 text-[11px] rounded transition-all flex items-center gap-1 ${
              saved ? 'bg-green-100 text-green-700 font-medium' : 'bg-[var(--color-brand)] text-white hover:opacity-90'
            }`}
          >
            {saving ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <><Check size={12} /> Salva</>
            ) : (
              'Salvar'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (row.justificativa) {
    return (
      <div className="flex items-center gap-2 group max-w-[200px]">
        <span className="truncate text-[12px] text-gray-700 font-medium" title={row.justificativa}>{row.justificativa}</span>
        <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[var(--color-brand)] rounded-full hover:bg-[var(--color-brand)]/10 transition-all">
          <Edit2 size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="px-2 py-1 text-[11px] text-[var(--color-brand)] bg-[var(--color-brand)]/5 hover:bg-[var(--color-brand)]/10 rounded transition-colors border border-[var(--color-brand)]/10 whitespace-nowrap"
    >
      + Justificativa
    </button>
  );
}

export type { FilterType };

interface Props {
  data: InconsistenciaRow[];
  searchQuery: string;
  isPrinting?: boolean;
  onUpdateJustificativa?: (nome: string, data: string, tipo: string, justificativa: string) => void;
  filter?: FilterType;
  onFilterChange?: (f: FilterType) => void;
}

export default function DataTable({ data, searchQuery, isPrinting = false, onUpdateJustificativa, filter: filterProp, onFilterChange }: Props) {
  const [filterInternal, setFilterInternal] = useState<FilterType>('todos');
  const filter = filterProp ?? filterInternal;
  const setFilter = (f: FilterType) => {
    setFilterInternal(f);
    onFilterChange?.(f);
  };
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = data;
    if (filter !== 'todos') rows = rows.filter((r) => r.tipo === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) => r.nome_servidor.toLowerCase().includes(q) || r.data.includes(q)
      );
    }
    return rows.sort((a, b) => b.data.localeCompare(a.data));
  }, [data, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = isPrinting ? filtered : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className={`card ${isPrinting ? 'print:shadow-none print:border-none' : 'overflow-hidden'}`}
    >
      {/* Header + Filter Pills */}
      <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <Table2 size={16} className="text-[var(--color-brand)]" />
          <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Registros de Inconsistência
          </h3>
          {filtered.length > 0 && (
            <span className="rounded-full bg-[var(--color-brand-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand)]">
              {filtered.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-surface-page)] p-0.5">
          {filterLabels.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(0); }}
                className={`relative rounded-[var(--radius-xs)] px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-[var(--radius-xs)] bg-[var(--color-brand)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      <div className={isPrinting ? "" : "overflow-x-auto"}>
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-page)]/50">
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Data</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Dia</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Nome</th>
              <th className="hidden px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] md:table-cell">Cargo</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Setor</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Entrada</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Saída</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox size={32} className="text-[var(--color-text-muted)] opacity-40" />
                      <p className="text-[13px] text-[var(--color-text-muted)]">
                        Nenhum registro encontrado. Importe uma planilha para começar.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((row, i) => (
                  <motion.tr
                    key={`${row.nome_servidor}-${row.data}-${row.tipo}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b border-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {row.data.split('-').reverse().join('/')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                      {diaDaSemana(row.data)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {row.nome_servidor}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--color-text-muted)] md:table-cell">
                      {row.cargo || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {row.setor || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-secondary)]">
                      {row.entrada || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-secondary)]">
                      {row.saida || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={badgeClass[row.tipo]}>
                        {badgeLabel[row.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <JustificativaCell row={row} isPrinting={isPrinting} onUpdate={onUpdateJustificativa} />
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isPrinting && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-4 py-3 sm:px-5 print:hidden">
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 text-[12px] font-semibold text-[var(--color-text-primary)]">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-ghost disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
