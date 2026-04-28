import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { processarArquivoControlId } from '../../services/ControlIdParser';
import type { RegistroInconsistencia } from '../../services/ControlIdParser';

interface Props {
  onImported: (registros: RegistroInconsistencia[]) => void;
}

type Phase = 'idle' | 'processing' | 'done' | 'error';

export default function UploadZone({ onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setPhase('error');
      setErrorMsg('Formato inválido. Aceitos: .xlsx, .xls');
      return;
    }

    setFileName(file.name);
    setPhase('processing');
    setErrorMsg('');

    try {
      const buffer = await file.arrayBuffer();
      const resultado = await processarArquivoControlId(buffer);
      setResultCount(resultado.registros.length);
      setPhase('done');
      onImported(resultado.registros);
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar arquivo.');
    }
  }, [onImported]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl space-y-5"
    >
      {/* Upload Zone */}
      <motion.div
        whileHover={{ scale: 1.01, boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 0 20px rgba(79,110,247,0.1)' }}
        whileTap={{ scale: 0.99 }}
        className={`card flex flex-col items-center gap-5 border-2 border-dashed px-6 py-14 sm:py-16 transition-colors cursor-pointer ${
          dragging
            ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]'
            : 'border-[var(--color-border-default)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <motion.div
          animate={{ y: dragging ? -8 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-brand)] to-[#7c3aed] shadow-[var(--shadow-brand)]"
        >
          <Upload size={26} className="text-white" />
        </motion.div>
        <div className="text-center">
          <p className="text-[16px] font-bold text-[var(--color-text-primary)]">
            Arraste o arquivo Excel aqui
          </p>
          <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
            ou <span className="font-semibold text-[var(--color-brand)]">clique para selecionar</span> — formatos aceitos: .xlsx, .xls
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </motion.div>

      {/* Status Indicators */}
      <AnimatePresence mode="wait">
        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card flex items-center gap-4 p-5"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={20} className="text-[var(--color-brand)]" />
            </motion.div>
            <div>
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">Processando...</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">{fileName}</p>
            </div>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="card flex items-center gap-4 border-l-4 border-l-[var(--color-success)] p-5"
          >
            <CheckCircle2 size={20} className="text-[var(--color-success)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[var(--color-text-primary)]">
                Processamento concluído!
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                <FileSpreadsheet size={12} className="inline-block mr-1" />
                {fileName} — <strong>{resultCount}</strong> inconsistência(s) detectada(s)
              </p>
            </div>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card flex items-center gap-4 border-l-4 border-l-[var(--color-danger)] p-5"
          >
            <AlertCircle size={20} className="text-[var(--color-danger)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[var(--color-text-primary)]">Erro</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
