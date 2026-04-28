import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Users, Save, Search, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { SETORES } from '../components/dashboard/ExportModal';

export interface Funcionario {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  horario_tipo: string | null;
  horario_previsto: string | null;
}

const CARGO_OPCOES = ['Suplementar', 'Celetista', 'Comissionado', 'Estagiário'];
const HORARIO_OPCOES = [
  { label: 'Manhã (08h às 14h)', value: 'manhã' },
  { label: 'Tarde (11h às 17h)', value: 'tarde' },
  { label: 'Comercial (08h às 17h)', value: 'comercial' },
];

function CustomSelect({ options, value, onChange, placeholder = "Selecione..." }: { options: {label: string, value: string}[], value: string, onChange: (val: string) => void, placeholder?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl shadow-blue-900/5 py-1 max-h-60 overflow-auto">
            <div
              className={`px-3 py-2 text-[13px] cursor-pointer flex justify-between items-center transition-colors ${!value ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} className="text-blue-600" />}
            </div>
            {options.map(opt => (
              <div
                key={opt.value}
                className={`px-3 py-2 text-[13px] cursor-pointer flex justify-between items-center transition-colors ${value === opt.value ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={14} className="text-blue-600" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FuncionariosPage({ onFuncionarioUpdate }: { onFuncionarioUpdate?: (func: Funcionario) => void }) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // ID do funcionário sendo salvo
  const [saved, setSaved] = useState<string | null>(null); // ID do funcionário que acabou de ser salvo
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  async function carregarFuncionarios() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205') {
          setErro('A tabela "funcionarios" ainda não foi criada no banco de dados. Por favor, execute o script SQL no Supabase.');
        } else {
          throw error;
        }
      } else {
        setFuncionarios(data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  }

  async function salvarFuncionario(func: Funcionario) {
    try {
      setSaving(func.id);
      const { error } = await supabase
        .from('funcionarios')
        .update({
          cargo: func.cargo,
          setor: func.setor,
          horario_tipo: func.horario_tipo,
          horario_previsto: func.horario_previsto,
        })
        .eq('id', func.id);

      if (error) throw error;
      
      setSaved(func.id);
      setTimeout(() => setSaved(null), 2000);

      if (onFuncionarioUpdate) {
        onFuncionarioUpdate(func);
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar as informações.');
    } finally {
      setSaving(null);
    }
  }

  const funcFiltrados = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Funcionários
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os cargos, setores e horários dos funcionários</p>
        </div>
      </div>

      {erro && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{erro}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Nome do Funcionário</th>
                <th className="px-6 py-4">Horário Previsto (Excel)</th>
                <th className="px-6 py-4 w-56">Cargo</th>
                <th className="px-6 py-4 w-64">Setor</th>
                <th className="px-6 py-4 w-56">Horário de Trabalho</th>
                <th className="px-6 py-4 w-24">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Carregando funcionários...
                  </td>
                </tr>
              ) : funcFiltrados.length === 0 && !erro ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : (
                funcFiltrados.map((func) => (
                  <tr key={func.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {func.nome}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {func.horario_previsto || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <CustomSelect
                        value={func.cargo || ''}
                        options={CARGO_OPCOES.map(o => ({ label: o, value: o }))}
                        onChange={(val) => {
                          setFuncionarios(prev => prev.map(f => f.id === func.id ? { ...f, cargo: val } : f));
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <CustomSelect
                        value={func.setor || ''}
                        options={SETORES.map(s => ({ label: s, value: s }))}
                        placeholder="Selecione o setor..."
                        onChange={(val) => {
                          setFuncionarios(prev => prev.map(f => f.id === func.id ? { ...f, setor: val } : f));
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <CustomSelect
                        value={func.horario_tipo || ''}
                        options={HORARIO_OPCOES}
                        onChange={(val) => {
                          let novoPrevisto = func.horario_previsto;
                          if (val === 'comercial') novoPrevisto = '08:00-12:00 13:00-17:00';
                          else if (val === 'meio_periodo_manha') novoPrevisto = '08:00-12:00';
                          else if (val === 'meio_periodo_tarde') novoPrevisto = '13:00-17:00';
                          
                          setFuncionarios(prev => prev.map(f => f.id === func.id ? { ...f, horario_tipo: val, horario_previsto: novoPrevisto } : f));
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => salvarFuncionario(func)}
                        disabled={saving === func.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                          saved === func.id
                            ? 'bg-green-50 text-green-600 font-medium'
                            : 'text-blue-600 hover:bg-blue-50 disabled:opacity-50'
                        }`}
                        title="Salvar alterações"
                      >
                        {saving === func.id ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : saved === func.id ? (
                          <>
                            <motion.div
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            </motion.div>
                            <span className="text-xs">Salvo</span>
                          </>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
