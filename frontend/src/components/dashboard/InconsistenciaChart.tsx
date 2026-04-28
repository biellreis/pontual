import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { InconsistenciaRow } from './DataTable';

interface Props {
  data: InconsistenciaRow[];
}

const COLORS: Record<string, string> = {
  falta:            '#ef4444',
  atraso:           '#f59e0b',
  saida_antecipada: '#4f6ef7',
  sem_registro_entrada: '#8b5cf6',
  sem_registro_saida: '#ec4899',
};

const LABELS: Record<string, string> = {
  falta:            'Falta',
  atraso:           'Atraso',
  saida_antecipada: 'Saída Ant.',
  sem_registro_entrada: 'S/ Entrada',
  sem_registro_saida: 'S/ Saída',
};

export default function InconsistenciaChart({ data }: Props) {
  const counts: Record<string, number> = { falta: 0, atraso: 0, saida_antecipada: 0, sem_registro_entrada: 0, sem_registro_saida: 0 };
  for (const r of data) counts[r.tipo] = (counts[r.tipo] ?? 0) + 1;

  const chartData = Object.entries(counts).map(([tipo, count]) => ({
    tipo: LABELS[tipo] ?? tipo,
    count,
    fill: COLORS[tipo as keyof typeof COLORS] ?? '#94a3b8',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="card p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-[var(--color-brand)]" />
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
          Distribuição por Tipo
        </h3>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis
              dataKey="tipo"
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(79,110,247,0.04)' }}
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: 13,
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Ocorrências" animationDuration={800}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
