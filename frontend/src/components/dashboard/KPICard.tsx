import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

type ColorKey = 'brand' | 'success' | 'warning' | 'danger';

interface Props {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: ColorKey;
  trend?: 'up' | 'down';
  trendLabel?: string;
  index?: number;
}

const colorMap: Record<ColorKey, { bg: string; text: string; glow: string }> = {
  brand:   { bg: 'rgba(79, 110, 247, 0.10)',  text: 'var(--color-brand)',   glow: 'rgba(79, 110, 247, 0.20)' },
  success: { bg: 'rgba(16, 185, 129, 0.10)',   text: 'var(--color-success)', glow: 'rgba(16, 185, 129, 0.20)' },
  warning: { bg: 'rgba(245, 158, 11, 0.10)',   text: 'var(--color-warning)', glow: 'rgba(245, 158, 11, 0.20)' },
  danger:  { bg: 'rgba(239, 68, 68, 0.10)',    text: 'var(--color-danger)',  glow: 'rgba(239, 68, 68, 0.20)' },
};

export default function KPICard({ title, value, subtitle, icon, color, trend, trendLabel, index = 0 }: Props) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      whileHover={{
        y: -3,
        scale: 1.02,
        boxShadow: `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), 0 0 20px ${c.glow}`,
      }}
      className="card glow-hover relative overflow-hidden p-5"
    >
      {/* Background gradient accent */}
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30 blur-xl"
        style={{ background: c.text }}
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            {title}
          </p>
          <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-[var(--color-text-primary)]">
            {value}
          </p>
          <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">
            {subtitle}
          </p>
        </div>

        {/* Icon badge */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{ background: c.bg, color: c.text }}
        >
          {icon}
        </div>
      </div>

      {/* Trend indicator */}
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-[11px] font-semibold ${
          trend === 'up' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
        }`}>
          {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{trendLabel}</span>
        </div>
      )}
    </motion.div>
  );
}
