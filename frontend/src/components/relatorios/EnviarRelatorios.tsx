import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle2, AlertCircle, Mail, Users } from 'lucide-react';
import {
  prepararRelatorios,
  enviarRelatorio,
  type RelatorioEnvio,
} from '../../services/RelatorioService';

export default function EnviarRelatorios() {
  const [relatorios, setRelatorios] = useState<RelatorioEnvio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const carregarRelatorios = async () => {
    setIsLoading(true);
    try {
      const result = await prepararRelatorios();
      setRelatorios(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorios();
  }, []);

  const enviarTodos = async () => {
    setIsSending(true);
    const atualizado = [...relatorios];
    for (let i = 0; i < atualizado.length; i++) {
      if (atualizado[i].status !== 'pendente') continue;
      const result = await enviarRelatorio(atualizado[i]);
      atualizado[i] = result;
      setRelatorios([...atualizado]);
    }
    setIsSending(false);
  };

  const statusIcon = (status: RelatorioEnvio['status']) => {
    switch (status) {
      case 'enviado': return <CheckCircle2 size={16} className="text-[var(--color-success)]" />;
      case 'erro': return <AlertCircle size={16} className="text-[var(--color-danger)]" />;
      default: return <Mail size={16} className="text-[var(--color-text-muted)]" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-3xl space-y-5"
    >
      {/* Header Card */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-brand)] to-[#7c3aed] shadow-sm">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">
                Enviar para Gestores
              </h3>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Relatórios segmentados por setor
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={enviarTodos}
            disabled={isSending || relatorios.length === 0}
            className="btn-primary w-full sm:w-auto cursor-pointer"
          >
            {isSending ? (
              <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            ) : (
              <><Send size={16} /> Enviar Todos</>
            )}
          </motion.button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[var(--color-brand)]" />
        </div>
      ) : relatorios.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Mail size={32} className="text-[var(--color-text-muted)] opacity-40" />
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Nenhuma inconsistência encontrada para gerar relatórios.
            <br />
            Importe uma planilha primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {relatorios.map((r, i) => (
            <motion.div
              key={r.setor}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              whileHover={{ scale: 1.01 }}
              className="card flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {statusIcon(r.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[var(--color-text-primary)]">{r.setor}</p>
                  <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                    {r.nomeGestor} — {r.emailGestor}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <span className="badge-atraso">{r.totalInconsistencias} ocorrências</span>
                <span className={`text-[12px] font-semibold ${
                  r.status === 'enviado' ? 'text-[var(--color-success)]'
                  : r.status === 'erro' ? 'text-[var(--color-danger)]'
                  : 'text-[var(--color-text-muted)]'
                }`}>
                  {r.status === 'enviado' ? 'Enviado ✓' : r.status === 'erro' ? 'Erro' : 'Pendente'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
