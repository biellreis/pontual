/**
 * RelatorioService.ts
 *
 * Serviço para filtragem de inconsistências por setor,
 * geração de relatórios HTML e disparo de e-mails.
 */

import { supabase } from './supabaseClient';
import type { RegistroInconsistencia } from './ControlIdParser';

type InconsistenciaRow = RegistroInconsistencia;

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────

export interface GestorSetor {
  setor: string;
  nome_gestor: string;
  email: string;
}

export interface RelatorioEnvio {
  setor: string;
  emailGestor: string;
  nomeGestor: string;
  totalInconsistencias: number;
  htmlCorpo: string;
  status: 'pendente' | 'enviado' | 'erro';
  erro?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Busca de dados
// ────────────────────────────────────────────────────────────────────────────

/**
 * Busca todas as inconsistências do Supabase com filtro opcional por setor e data.
 */
export async function buscarInconsistencias(filtros?: {
  setor?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<InconsistenciaRow[]> {
  let query = supabase.from('inconsistencias').select('*');

  if (filtros?.setor) {
    query = query.eq('setor', filtros.setor);
  }
  if (filtros?.dataInicio) {
    query = query.gte('data', filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    query = query.lte('data', filtros.dataFim);
  }

  const { data, error } = await query.order('data', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar inconsistências: ${error.message}`);
  }

  return (data ?? []) as InconsistenciaRow[];
}

/**
 * Busca gestores cadastrados (futura tabela `gestores`).
 */
export async function buscarGestores(): Promise<GestorSetor[]> {
  const { data, error } = await supabase
    .from('gestores')
    .select('*')
    .order('setor');

  if (error) {
    console.warn('Tabela gestores não encontrada — usando dados mock');
    return [
      { setor: 'Administrativo', nome_gestor: 'Maria Silva', email: 'maria@empresa.gov.br' },
      { setor: 'Operacional', nome_gestor: 'João Santos', email: 'joao@empresa.gov.br' },
      { setor: 'Financeiro', nome_gestor: 'Ana Costa', email: 'ana@empresa.gov.br' },
    ];
  }

  return (data ?? []) as GestorSetor[];
}

// ────────────────────────────────────────────────────────────────────────────
// Geração de relatório HTML
// ────────────────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  falta: 'Falta',
  atraso: 'Atraso',
  saida_antecipada: 'Saída Antecipada',
  sem_registro_entrada: 'Sem Registro de Entrada',
  sem_registro_saida: 'Sem Registro de Saída',
};

const TIPO_COLORS: Record<string, string> = {
  falta: '#ef4444',
  atraso: '#f59e0b',
  saida_antecipada: '#3b82f6',
  sem_registro_entrada: '#8b5cf6',
  sem_registro_saida: '#ec4899',
};

/**
 * Gera corpo HTML formatado para e-mail de relatório.
 */
export function gerarRelatorioHTML(
  setor: string,
  inconsistencias: InconsistenciaRow[]
): string {
  const rows = inconsistencias
    .map((r) => {
      const cor = TIPO_COLORS[r.tipo] ?? '#94a3b8';
      const label = TIPO_LABELS[r.tipo] ?? r.tipo;
      const [y, m, d] = r.data.split('-');
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.nome_servidor}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${d}/${m}/${y}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.entrada ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.saida ?? '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
            <span style="background:${cor}22;color:${cor};padding:2px 10px;border-radius:6px;font-size:12px;font-weight:600">${label}</span>
          </td>
        </tr>`;
    })
    .join('');

  return `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:700px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">📋 Relatório de Inconsistências</h1>
        <p style="color:#c7d2fe;margin:4px 0 0;font-size:14px">Setor: ${setor}</p>
      </div>
      <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#374151;font-size:14px;margin:0 0 16px">
          Foram detectadas <strong>${inconsistencias.length}</strong> inconsistências no período.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb">Servidor</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb">Data</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb">Entrada</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb">Saída</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;text-align:center">
          Gerado automaticamente pelo Hub RH Ponto
        </p>
      </div>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────────────────────
// Envio (preparação — a integração com backend de e-mail é plugável)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Prepara relatórios por setor para envio.
 * Retorna array de payloads prontos.
 */
export async function prepararRelatorios(): Promise<RelatorioEnvio[]> {
  const gestores = await buscarGestores();
  const relatorios: RelatorioEnvio[] = [];

  for (const gestor of gestores) {
    const inconsistencias = await buscarInconsistencias({ setor: gestor.setor });

    if (inconsistencias.length === 0) continue;

    relatorios.push({
      setor: gestor.setor,
      emailGestor: gestor.email,
      nomeGestor: gestor.nome_gestor,
      totalInconsistencias: inconsistencias.length,
      htmlCorpo: gerarRelatorioHTML(gestor.setor, inconsistencias),
      status: 'pendente',
    });
  }

  return relatorios;
}

/**
 * Envia um relatório individual (stub — conectar com API de e-mail).
 * TODO: Integrar com Gmail API ou serviço SMTP
 */
export async function enviarRelatorio(relatorio: RelatorioEnvio): Promise<RelatorioEnvio> {
  try {
    // Simula envio — substituir por integração real (Gmail API, SendGrid, etc.)
    console.info(
      `📧 Enviando relatório para ${relatorio.nomeGestor} (${relatorio.emailGestor}) — Setor: ${relatorio.setor}`
    );

    // Delay simulado
    await new Promise((r) => setTimeout(r, 800));

    return { ...relatorio, status: 'enviado' };
  } catch (err) {
    return {
      ...relatorio,
      status: 'erro',
      erro: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}
