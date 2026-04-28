import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { X, FileText, FileSpreadsheet, Check, Building2, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import RelatorioPDF from '../relatorios/RelatorioPDF';
import type { RegistroInconsistencia } from '../../services/ControlIdParser';

export const SETORES = [
  'Assessoria de Comunicação',
  'Diretoria de Gestão Financeira',
  'Controladoria',
  'Centro de Documentação e Memória',
  'Legisla.AM',
  'Assessoria Jurídica',
  'Almoxarifado',
  'Assessoria de Logística',
  'Assessoria de Gestão de Qualidade',
  'Gabinete da Presidência',
  'Assessoria de Tecnologia da Informação',
  'Gerência de Controle de Produção',
  'Diário Eletrônico/Diagramação',
  'Gerência de Negócios',
  'Gerência de Gestão de Pessoas',
] as const;

export type Setor = typeof SETORES[number];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: RegistroInconsistencia[];
  periodLabel: string;
  /** employees list from supabase so we can match setor */
  funcionarios: { nome: string; setor: string | null }[];
}

const badgeLabelMap: Record<string, string> = {
  falta: 'Falta',
  atraso: 'Atraso',
  saida_antecipada: 'Saída Ant.',
  sem_registro_entrada: 'Sem Entrada',
  sem_registro_saida: 'Sem Saída',
};

export default function ExportModal({ isOpen, onClose, data, periodLabel, funcionarios }: Props) {
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingXLS, setGeneratingXLS] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) setSelectedSetor(null);
  }, [isOpen]);

  // Build a quick lookup: nome_servidor -> setor
  const nomeParaSetor = Object.fromEntries(
    funcionarios.map(f => [f.nome.trim().toUpperCase(), f.setor?.trim() ?? ''])
  );

  const getSetorDoRegistro = (r: RegistroInconsistencia): string =>
    nomeParaSetor[r.nome_servidor.trim().toUpperCase()] || r.setor || '';

  const dataDoSetor = selectedSetor
    ? data.filter(r => getSetorDoRegistro(r) === selectedSetor)
    : [];

  const handlePDF = async () => {
    if (!selectedSetor) return;
    
    // Open tab synchronously to bypass popup blockers
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.title = 'Gerando Relatório...';
      newTab.document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">Gerando PDF... Aguarde.</div>';
    }

    setGeneratingPDF(true);
    try {
      const label = `${periodLabel} · ${selectedSetor}`;
      const blob = await pdf(<RelatorioPDF data={dataDoSetor} period={label} />).toBlob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      
      if (newTab) {
        newTab.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error(e);
      if (newTab) newTab.close();
      alert('Erro ao gerar PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const diaDaSemana = (dataStr: string): string => {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const [y, m, d] = dataStr.split('-').map(Number);
    return dias[new Date(y, m - 1, d).getDay()];
  };

  const handleXLS = () => {
    if (!selectedSetor) return;
    setGeneratingXLS(true);

    try {
      // Execução síncrona para não perder o Token de Ativação do Usuário (User Activation Token) do navegador
      // Isso garante que o Mac/Chrome não bloqueie o download nem corrompa o nome do arquivo.
      const rows = dataDoSetor.map(r => ({
        'Data': r.data.split('-').reverse().join('/'),
        'Dia': diaDaSemana(r.data),
        'Nome': r.nome_servidor,
        'Cargo': r.cargo || r.setor || '—',
        'Setor': selectedSetor,
        'Horário Previsto': r.horario_previsto || '—',
        'Entrada': r.entrada || '—',
        'Saída': r.saida || '—',
        'Status': badgeLabelMap[r.tipo] || r.tipo,
        'Justificativa': r.justificativa || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      ws['!cols'] = [
        { wch: 12 }, { wch: 6 }, { wch: 40 }, { wch: 18 }, { wch: 35 },
        { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inconsistências');
      
      const filename = `Inconsistencias_${selectedSetor.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
      
      // Utilizamos o método oficial e mais robusto da biblioteca SheetJS
      // Ele já possui todo o tratamento necessário para Mac, Windows, Chrome e Safari
      // sem depender de Blob URLs manuais que podem ser barrados pelo Sandbox.
      XLSX.writeFile(wb, filename);

    } catch (e) {
      console.error(e);
      alert('Erro ao gerar Excel.');
    } finally {
      setGeneratingXLS(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)]/10 flex items-center justify-center">
                    <Download size={18} className="text-[var(--color-brand)]" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-gray-900">Gerar Relatório por Setor</h2>
                    <p className="text-[12px] text-gray-500 mt-0.5">{periodLabel}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sector Grid */}
              <div className="p-6">
                <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-3">Selecione o setor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {SETORES.map(setor => {
                    const count = data.filter(r => getSetorDoRegistro(r) === setor).length;
                    const isSelected = selectedSetor === setor;
                    return (
                      <button
                        key={setor}
                        onClick={() => setSelectedSetor(setor)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5 text-[var(--color-brand)]'
                            : 'border-gray-100 bg-gray-50/50 text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2 size={15} className={isSelected ? 'text-[var(--color-brand)] flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                          <span className="text-[13px] font-medium truncate">{setor}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {count > 0 && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-[var(--color-brand)]/10 text-[var(--color-brand)]' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {count}
                            </span>
                          )}
                          {isSelected && <Check size={14} className="text-[var(--color-brand)]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer: action buttons */}
              <div className="px-6 pb-6 flex flex-col sm:flex-row items-center gap-3">
                {selectedSetor ? (
                  <>
                    <div className="flex-1 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 text-[13px] text-blue-700 font-medium">
                      <span className="opacity-70 font-normal">Selecionado: </span>
                      {selectedSetor}
                      <span className="ml-2 text-[12px] opacity-70">({dataDoSetor.length} registro{dataDoSetor.length !== 1 ? 's' : ''})</span>
                    </div>
                    <button
                      onClick={handleXLS}
                      disabled={generatingXLS || dataDoSetor.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-[13px] font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {generatingXLS
                        ? <Loader2 size={16} className="animate-spin" />
                        : <FileSpreadsheet size={16} />}
                      Excel
                    </button>
                    <button
                      onClick={handlePDF}
                      disabled={generatingPDF || dataDoSetor.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand)]/90 transition-colors disabled:opacity-50 shadow-[var(--shadow-brand)]"
                    >
                      {generatingPDF
                        ? <Loader2 size={16} className="animate-spin" />
                        : <FileText size={16} />}
                      PDF
                    </button>
                  </>
                ) : (
                  <p className="w-full text-center text-[13px] text-gray-400 py-2">
                    Selecione um setor para habilitar o download
                  </p>
                )}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
