import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import type { InconsistenciaRow } from './DataTable';

interface Props {
  data: InconsistenciaRow[];
}

const barColors = ['#4f6ef7', '#7c3aed', '#f59e0b', '#06b6d4', '#ef4444'];

export default function ResumoSetores({ data }: Props) {
  const counts: Record<string, number> = {};
  for (const r of data) {
    const s = r.setor || 'Sem Setor';
    counts[s] = (counts[s] ?? 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="card p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Building2 size={16} className="text-[var(--color-brand)]" />
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
          Setores com Mais Inconsistências
        </h3>
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--color-text-muted)]">
          Importe dados para visualizar.
        </p>
      ) : (
        <div className="space-y-4">
          {sorted.map(([setor, count], i) => (
            <motion.div
              key={setor}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.08 }}
            >
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-[var(--color-text-primary)]">{setor}</span>
                <span className="font-bold text-[var(--color-text-secondary)]">{count}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-page)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
                  className="h-full rounded-full"
                  style={{ background: barColors[i % barColors.length] }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
