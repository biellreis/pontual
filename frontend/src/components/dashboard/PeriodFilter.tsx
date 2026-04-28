import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, CalendarDays, CalendarRange, Layers, ChevronDown } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

export type FilterMode = 'Geral' | 'Mês' | 'Semana' | 'Dia';

export interface PeriodState {
  mode: FilterMode;
  value: string | null;
}

interface Props {
  active: PeriodState;
  onChange: (p: PeriodState) => void;
  dataDates: string[]; // List of all dates in the dataset (YYYY-MM-DD)
}

export default function PeriodFilter({ active, onChange, dataDates }: Props) {
  const [openDropdown, setOpenDropdown] = useState<FilterMode | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { months, minDate, maxDate } = useMemo(() => {
    const uniqueDates = [...new Set(dataDates)].sort();
    
    if (uniqueDates.length === 0) {
      return { months: [], minDate: undefined, maxDate: undefined };
    }

    const monthsMap = new Map<string, string>(); 
    uniqueDates.forEach(d => {
      const dateObj = parseISO(d);
      const monthKey = format(dateObj, 'yyyy-MM');
      if (!monthsMap.has(monthKey)) {
        const monthLabel = format(dateObj, 'MMMM yyyy', { locale: ptBR });
        monthsMap.set(monthKey, monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1));
      }
    });

    return {
      months: Array.from(monthsMap.entries()).map(([k, v]) => ({ key: k, label: v })),
      minDate: parseISO(uniqueDates[0]),
      maxDate: parseISO(uniqueDates[uniqueDates.length - 1]),
    };
  }, [dataDates]);

  const handleModeClick = (mode: FilterMode) => {
    if (mode === 'Geral') {
      onChange({ mode, value: null });
      setOpenDropdown(null);
      return;
    }

    if (openDropdown === mode) {
      setOpenDropdown(null);
      return;
    }

    setOpenDropdown(mode);

    if (active.mode !== mode && active.mode !== 'Geral') {
      // Avoid resetting value if possible, or reset nicely
      // But let's just let them pick from the calendar, no forced default
    }
  };

  const handleSelectOption = (mode: FilterMode, value: string) => {
    onChange({ mode, value });
    setOpenDropdown(null);
  };

  const buttons = [
    { mode: 'Geral', icon: <Layers size={13} /> },
    { mode: 'Mês', icon: <CalendarRange size={13} /> },
    { mode: 'Semana', icon: <CalendarDays size={13} /> },
    { mode: 'Dia', icon: <CalendarIcon size={13} /> },
  ] as const;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Overriding some default DayPicker variables to match our brand */}
      <style>{`
        .rdp-root {
          --rdp-accent-color: var(--color-brand);
          --rdp-background-color: var(--color-brand-light);
          margin: 0;
        }
        .rdp-month_caption { padding: 0 0.5rem; }
        .rdp-day_selected { font-weight: bold; color: white !important; }
        .week-selected .rdp-day { border-radius: 0; }
        .week-selected .rdp-day_selected { background-color: var(--color-brand); color: white; }
      `}</style>
      
      <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-white/60 p-1 backdrop-blur-sm">
        {buttons.map((b) => {
          const isActive = active.mode === b.mode;
          const isOpen = openDropdown === b.mode;
          
          return (
            <div key={b.mode} className="relative">
              <button
                onClick={() => handleModeClick(b.mode as FilterMode)}
                className={`relative flex items-center gap-1.5 rounded-[var(--radius-xs)] px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="period-pill"
                    className="absolute inset-0 rounded-[var(--radius-xs)] bg-[var(--color-brand)]"
                    style={{ boxShadow: 'var(--shadow-brand)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 hidden sm:inline-flex">{b.icon}</span>
                <span className="relative z-10">{b.mode}</span>
                {b.mode !== 'Geral' && (
                  <ChevronDown size={12} className={`relative z-10 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 rounded-lg bg-white p-2 shadow-xl ring-1 ring-black/5 z-[60] origin-top-right"
                  >
                    {/* Render Content based on mode */}
                    {b.mode === 'Mês' && (
                      <div className="w-48 max-h-64 overflow-y-auto">
                        {months.map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => handleSelectOption('Mês', opt.key)}
                            className={`w-full text-left px-3 py-2 text-[13px] rounded-md transition-colors ${
                              active.value === opt.key
                                ? 'bg-[var(--color-brand)]/10 text-[var(--color-brand)] font-semibold'
                                : 'text-[var(--color-text-primary)] hover:bg-gray-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {b.mode === 'Semana' && (
                      <div className="week-selected">
                        <DayPicker
                          mode="single"
                          locale={ptBR}
                          startMonth={minDate}
                          endMonth={maxDate}
                          disabled={{ dayOfWeek: [0, 6] }} // Disable weekends
                          selected={active.value ? parseISO(active.value) : undefined}
                          modifiers={{
                            selectedWeek: active.value ? {
                              from: parseISO(active.value),
                              to: endOfWeek(parseISO(active.value), { weekStartsOn: 1 })
                            } : undefined
                          }}
                          modifiersClassNames={{
                            selectedWeek: "bg-[var(--color-brand)] text-white font-bold"
                          }}
                          onDayClick={(date) => {
                            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
                            handleSelectOption('Semana', format(weekStart, 'yyyy-MM-dd'));
                          }}
                        />
                      </div>
                    )}

                    {b.mode === 'Dia' && (
                      <div>
                        <DayPicker
                          mode="single"
                          locale={ptBR}
                          startMonth={minDate}
                          endMonth={maxDate}
                          disabled={{ dayOfWeek: [0, 6] }} // Disable weekends
                          selected={active.value ? parseISO(active.value) : undefined}
                          onSelect={(date) => {
                            if (date) handleSelectOption('Dia', format(date, 'yyyy-MM-dd'));
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
