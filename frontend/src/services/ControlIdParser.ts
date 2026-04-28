/**
 * ControlIdParser.ts
 *
 * Lê arquivos Excel (.xlsx) exportados do sistema Control iD,
 * filtra batidas inválidas, classifica inconsistências e
 * persiste os resultados na tabela `inconsistencias` do Supabase.
 *
 * Fuso horário de referência: America/Manaus (UTC-4)
 */

import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────

/** Tipos de inconsistência detectáveis */
export type TipoInconsistencia = 'atraso' | 'saida_antecipada' | 'falta' | 'sem_registro_entrada' | 'sem_registro_saida';

export interface BatidaBruta {
  nome: string;
  data: string;      // formato ISO ou dd/mm/yyyy
  horario: string | null;  // null se for falta justificada (férias/atestado)
  setor?: string;
  justificada?: boolean;
}

export interface FuncionarioExcel {
  nome: string;
  horario_previsto: string;
}

/** Resumo diário de um servidor após processamento */
export interface ResumoDiario {
  nome: string;
  data: string;          // yyyy-mm-dd
  entrada: string | null;
  saida: string | null;
  inconsistencias: TipoInconsistencia[];
  setor?: string;
  justificado?: boolean;
}

/** Registro pronto para inserção na tabela `inconsistencias` */
export interface RegistroInconsistencia {
  nome_servidor: string;
  data: string;
  tipo: TipoInconsistencia;
  entrada: string | null;
  saida: string | null;
  minutos_atraso: number | null;
  minutos_saida_antecipada: number | null;
  setor?: string;
  cargo?: string;
  horario_previsto?: string;
  justificativa?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Constantes — Regras de negócio (America/Manaus)
// ────────────────────────────────────────────────────────────────────────────

export interface FuncionarioDB {
  id: string;
  nome: string;
  cargo: string | null;
  horario_tipo: string | null;
  horario_previsto: string | null;
}

// Tolerância padrão em minutos (15 minutos para entrada e saída)
const TOLERANCIA_MINUTOS = 15;

function getLimites(func?: FuncionarioDB): { entrada: number, saida: number } {
  let entrada = 8 * 60; // 08:00
  let saida = 17 * 60; // 17:00

  if (func?.horario_previsto) {
    const matches = func.horario_previsto.match(/\d{2}:\d{2}/g);
    if (matches && matches.length >= 2) {
      entrada = horarioParaMinutos(matches[0]);
      saida = horarioParaMinutos(matches[matches.length - 1]);
      return { entrada, saida };
    }
  }

  if (func?.horario_tipo === 'manhã') {
    saida = 14 * 60; // 14:00
  } else if (func?.horario_tipo === 'tarde') {
    entrada = 11 * 60; // 11:00
    saida = 17 * 60; // 17:00
  }
  
  return { entrada, saida };
}

/** Offset UTC do fuso America/Manaus em milissegundos (-4h) */
const MANAUS_OFFSET_MS = -4 * 60 * 60 * 1000;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converte string de horário "HH:mm" ou "HH:mm:ss" em total de minutos.
 */
function horarioParaMinutos(horario: string): number {
  const partes = horario.split(':').map(Number);
  return partes[0] * 60 + partes[1];
}

/**
 * Normaliza uma data para o formato yyyy-mm-dd.
 * Aceita: "dd/mm/yyyy", "yyyy-mm-dd", Date, número serial do Excel.
 */
function normalizarData(valor: string | number | Date): string {
  // Número serial do Excel (dias desde 1900-01-01)
  if (typeof valor === 'number') {
    const dataExcel = XLSX.SSF.parse_date_code(valor);
    const ano = dataExcel.y;
    const mes = String(dataExcel.m).padStart(2, '0');
    const dia = String(dataExcel.d).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  if (valor instanceof Date) {
    // Aplica offset de Manaus manualmente para evitar issues de TZ do browser
    const utc = valor.getTime() + valor.getTimezoneOffset() * 60_000;
    const manaus = new Date(utc + MANAUS_OFFSET_MS);
    return manaus.toISOString().slice(0, 10);
  }

  const str = String(valor).trim();

  // dd/mm/yyyy
  const matchBR = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchBR) {
    return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
  }

  // yyyy-mm-dd (já normalizado)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Tenta parse genérico como fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return normalizarData(d);
  }

  throw new Error(`Formato de data não reconhecido: "${valor}"`);
}

/**
 * Normaliza horário — aceita "HH:mm", "HH:mm:ss" ou número serial do Excel.
 * Retorna no formato "HH:mm".
 */
function normalizarHorario(valor: string | number): string {
  if (typeof valor === 'number') {
    // Número serial do Excel (fração de dia)
    const totalSegundos = Math.round(valor * 86400);
    const horas = Math.floor(totalSegundos / 3600) % 24;
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }

  const str = String(valor).trim();
  const partes = str.split(':');
  if (partes.length >= 2) {
    return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
  }

  throw new Error(`Formato de horário não reconhecido: "${valor}"`);
}

/**
 * Verifica se uma data (yyyy-mm-dd) é dia útil (seg-sex).
 */
function isDiaUtil(dataISO: string): boolean {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  // Constrói a data em UTC para evitar problemas de fuso
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const dow = d.getUTCDay(); // 0 = dom, 6 = sáb
  return dow >= 1 && dow <= 5;
}

/**
 * Gera array de datas úteis (yyyy-mm-dd) no intervalo [inicio, fim].
 */
function gerarDiasUteis(inicio: string, fim: string): string[] {
  const resultado: string[] = [];
  const [aI, mI, dI] = inicio.split('-').map(Number);
  const [aF, mF, dF] = fim.split('-').map(Number);
  const current = new Date(Date.UTC(aI, mI - 1, dI));
  const end = new Date(Date.UTC(aF, mF - 1, dF));

  while (current <= end) {
    const iso = current.toISOString().slice(0, 10);
    if (isDiaUtil(iso)) {
      resultado.push(iso);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return resultado;
}



// ────────────────────────────────────────────────────────────────────────────
// Core — Leitura do Excel
// ────────────────────────────────────────────────────────────────────────────

/**
 * Localiza a linha de cabeçalho pesquisando pelas palavras-chave nas primeiras 20 linhas.
 * Suporta variações comuns dos relatórios Control iD.
 */
function localizarCabecalho(linhas: unknown[][]): {
  indiceLinha: number;
  colNome: number;
  colData: number;
  colsHorarios: number[];
  colsHorarioPrevisto: number[];
  colSetor: number | null;
} {
  const lower = (s: unknown) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const linha = linhas[i];
    if (!Array.isArray(linha)) continue;

    let colNome = -1;
    let colData = -1;
    let colSetor: number | null = null;
    const colsHorarios: number[] = [];
    const colsHorarioPrevisto: number[] = [];

    linha.forEach((celula, index) => {
      const val = String(celula).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (val.includes('nome') || val.includes('servidor') || val.includes('funcionario') || val.includes('colaborador')) colNome = index;
      else if (val.includes('data') || val.includes('date') || val === 'dia') colData = index;
      else if (val.includes('setor') || val.includes('departamento') || val.includes('lotacao') || val.includes('unidade')) colSetor = index;
      else if (val.match(/^horario \d/i) || val.includes('previsto')) {
        colsHorarioPrevisto.push(index);
      }
      else if ((val.includes('entrada') || val.includes('saida') || val.includes('batida') || val.includes('marcacao')) && 
               !val.includes('extra') && !val.includes('noturno') && !val.includes('normais') && !val.includes('banco') && !val.includes('falta')) {
        colsHorarios.push(index);
      }
    });

    if (colNome !== -1 && colData !== -1 && colsHorarios.length > 0) {
      return { indiceLinha: i, colNome, colData, colsHorarios, colsHorarioPrevisto, colSetor };
    }
  }

  throw new Error('Não foi possível localizar o cabeçalho com colunas "Nome", "Data/Dia" e "Entradas/Saídas" nas primeiras 20 linhas.');
}

/**
 * Lê um ArrayBuffer de arquivo Excel e retorna batidas brutas.
 * Identifica colunas dinamicamente e limpa a string "(P)" dos horários.
 */
export function lerExcel(buffer: ArrayBuffer): { batidas: BatidaBruta[], funcionariosExcel: FuncionarioExcel[] } {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const primeiraAba = workbook.SheetNames[0];
  const sheet = workbook.Sheets[primeiraAba];

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (linhas.length === 0) {
    throw new Error('Planilha vazia — nenhuma linha encontrada.');
  }

  const { indiceLinha, colNome, colData, colsHorarios, colsHorarioPrevisto, colSetor } = localizarCabecalho(linhas);

  const batidas: BatidaBruta[] = [];
  const mapFuncionarios = new Map<string, string>();

  for (let i = indiceLinha + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!Array.isArray(linha) || linha.length === 0) continue;

    const nome = String(linha[colNome] ?? '').trim();
    const dataRaw = linha[colData];
    const setor = colSetor !== null ? String(linha[colSetor] ?? '').trim() : undefined;

    // Pula linhas sem dados essenciais
    if (!nome || dataRaw === '' || dataRaw === undefined || dataRaw === '-') {
      continue;
    }

    if (!mapFuncionarios.has(nome) && colsHorarioPrevisto.length > 0) {
      const previstos = colsHorarioPrevisto.map(c => linha[c]).filter(v => v !== undefined && v !== null && v !== '').join(' / ');
      if (previstos) {
        mapFuncionarios.set(nome, previstos);
      }
    }

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  FILTRO: Ignorar linhas de Férias e Atestado Médico             ║
    // ║  Essas ausências são justificadas e NÃO devem ser contadas     ║
    // ║  como falta ou inconsistência.                                  ║
    // ╚═══════════════════════════════════════════════════════════════════╝
    const linhaCompleta = linha.join(' ').toLowerCase();
    if (
      linhaCompleta.includes('férias') ||
      linhaCompleta.includes('ferias') ||
      linhaCompleta.includes('atestado') ||
      linhaCompleta.includes('licença') ||
      linhaCompleta.includes('licenca') ||
      linhaCompleta.includes('declaração de comparecimento')
    ) {
      let dataNormalizada: string;
      try {
        dataNormalizada = normalizarData(dataRaw as string | number | Date);
      } catch {
        continue;
      }
      
      if (!isDiaUtil(dataNormalizada)) {
        continue;
      }

      batidas.push({
        nome,
        data: dataNormalizada,
        horario: null,
        setor: setor || undefined,
        justificada: true
      });
      continue;
    }

    let dataNormalizada: string;
    try {
      dataNormalizada = normalizarData(dataRaw as string | number | Date);
    } catch {
      continue; // Pula se a data for inválida
    }
    
    if (!isDiaUtil(dataNormalizada)) {
      continue; // Pula se for final de semana
    }

    // ╔═══════════════════════════════════════════════════════════════════╗
    // ║  Lê todas as colunas de horário encontradas na linha.           ║
    // ║  Limpa a string "(P)" (Pré-assinalado) e mantém o horário.      ║
    // ╚═══════════════════════════════════════════════════════════════════╝
    let hasPunches = false;
    for (const colIndex of colsHorarios) {
      let horaRaw = linha[colIndex];
      if (horaRaw === '' || horaRaw === undefined || horaRaw === '-') continue;

      let horarioStr = String(horaRaw).trim();
      let isNumber = typeof horaRaw === 'number';

      if (!isNumber && horarioStr.includes('(P)')) {
        horarioStr = horarioStr.replace(/\(P\)/g, '').trim();
        horaRaw = horarioStr; // trata como string limpa a partir daqui
      }

      if (!isNumber && !horarioStr) continue;

      try {
        const horarioNorm = normalizarHorario(typeof horaRaw === 'number' ? horaRaw : horarioStr);
        hasPunches = true;
        batidas.push({
          nome,
          data: dataNormalizada,
          horario: horarioNorm,
          setor: setor || undefined,
        });
      } catch {
        // Ignora formatação de hora inválida ou em branco
      }
    }

    // Se a linha existe para o funcionário neste dia, mas não há nenhuma batida
    // e não é justificada (pois já caiu no if acima), então é uma FALTA explícita.
    if (!hasPunches) {
      batidas.push({
        nome,
        data: dataNormalizada,
        horario: null, // indica ausência de batidas
        setor: setor || undefined,
      });
    }
  }

  const funcionariosExcel = Array.from(mapFuncionarios.entries()).map(([n, h]) => ({ nome: n, horario_previsto: h }));

  return { batidas, funcionariosExcel };
}

// ────────────────────────────────────────────────────────────────────────────
// Core — Processamento e classificação
// ────────────────────────────────────────────────────────────────────────────

/**
 * Agrupa batidas por servidor+dia, identifica entrada/saída
 * e classifica inconsistências.
 */
export function processarBatidas(batidas: BatidaBruta[], mapFuncionariosDB: Map<string, FuncionarioDB>): ResumoDiario[] {
  // Agrupa: chave = "nome|data"
  const mapa = new Map<string, BatidaBruta[]>();
  const setorMap = new Map<string, string>();

  for (const b of batidas) {
    const chave = `${b.nome}|${b.data}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, []);
    }
    mapa.get(chave)!.push(b);
    if (b.setor) setorMap.set(b.nome, b.setor);
  }

  const resumos: ResumoDiario[] = [];

  for (const [chave, batidasDia] of mapa) {
    const [nome, data] = chave.split('|');

    // Se houver qualquer batida justificada para este dia
    const isJustificado = batidasDia.some(b => b.justificada);
    
    // Filtra apenas as batidas reais (ignorando os placeholders de atestado)
    const horarios = batidasDia.filter(b => b.horario !== null).map(b => b.horario as string);
    horarios.sort();

    let entrada: string | null = null;
    let saida: string | null = null;
    const inconsistencias: TipoInconsistencia[] = [];

    if (horarios.length === 1) {
      const minBatida = horarioParaMinutos(horarios[0]);
      // Bateu até as 13:00 -> considera Entrada
      if (minBatida <= 13 * 60) {
        entrada = horarios[0];
      } else {
        // Bateu à tarde -> considera Saída
        saida = horarios[0];
      }
    } else if (horarios.length > 1) {
      entrada = horarios[0];
      saida = horarios[horarios.length - 1];
    }

    if (!isJustificado) {
      const limites = getLimites(mapFuncionariosDB.get(nome));

      if (horarios.length === 0) {
        inconsistencias.push('falta');
      } else if (horarios.length === 1) {
        if (entrada) {
          inconsistencias.push('sem_registro_saida');
          if (horarioParaMinutos(entrada) > limites.entrada + TOLERANCIA_MINUTOS) {
            inconsistencias.push('atraso');
          }
        } else if (saida) {
          inconsistencias.push('sem_registro_entrada');
          if (horarioParaMinutos(saida) < limites.saida - TOLERANCIA_MINUTOS) {
            inconsistencias.push('saida_antecipada');
          }
        }
      } else if (horarios.length > 1) {
        const minEntrada = horarioParaMinutos(entrada!);
        if (minEntrada > limites.entrada + TOLERANCIA_MINUTOS) {
          inconsistencias.push('atraso');
        }

        const minSaida = horarioParaMinutos(saida!);
        if (minSaida < limites.saida - TOLERANCIA_MINUTOS) {
          inconsistencias.push('saida_antecipada');
        }
      }
    }

    resumos.push({
      nome,
      data,
      entrada,
      saida,
      inconsistencias,
      setor: setorMap.get(nome),
      justificado: isJustificado
    });
  }

  return resumos;
}

/**
 * Detecta faltas: dias úteis dentro do período da planilha
 * em que um servidor não possui nenhuma batida.
 */
export function detectarFaltas(
  batidas: BatidaBruta[],
  resumos: ResumoDiario[]
): ResumoDiario[] {
  if (batidas.length === 0) return [];

  // Coleta todas as datas e todos os nomes únicos
  const todasDatas = batidas.map((b) => b.data).sort();
  const inicio = todasDatas[0];
  const fim    = todasDatas[todasDatas.length - 1];

  const nomes = [...new Set(batidas.map((b) => b.nome))];
  const diasUteis = gerarDiasUteis(inicio, fim);

  // Set de "nome|data" que já têm registro
  const presencas = new Set(resumos.map((r) => `${r.nome}|${r.data}`));

  const faltas: ResumoDiario[] = [];

  for (const nome of nomes) {
    for (const dia of diasUteis) {
      if (!presencas.has(`${nome}|${dia}`)) {
        faltas.push({
          nome,
          data: dia,
          entrada: null,
          saida: null,
          inconsistencias: ['falta'],
        });
      }
    }
  }

  return faltas;
}

// ────────────────────────────────────────────────────────────────────────────
// Core — Persistência no Supabase
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converte resumos em registros planos e insere na tabela `inconsistencias`.
 * Retorna a quantidade de registros inseridos.
 */
export async function salvarNoSupabase(
  resumos: ResumoDiario[],
  mapFuncionariosDB: Map<string, FuncionarioDB>
): Promise<number> {
  // Filtra apenas resumos que de fato possuem inconsistências
  const registros: RegistroInconsistencia[] = [];

  for (const r of resumos) {
    for (const tipo of r.inconsistencias) {
      let minutosAtraso: number | null = null;
      let minutosSaidaAntecipada: number | null = null;

      const limitesFunc = mapFuncionariosDB.get(r.nome);
      const limites = getLimites(limitesFunc);

      if (tipo === 'atraso' && r.entrada) {
        minutosAtraso = horarioParaMinutos(r.entrada) - limites.entrada;
      }

      if (tipo === 'saida_antecipada' && r.saida) {
        minutosSaidaAntecipada = limites.saida - horarioParaMinutos(r.saida);
      }

      registros.push({
        nome_servidor: r.nome,
        data: r.data,
        tipo,
        entrada: r.entrada,
        saida: r.saida,
        minutos_atraso: minutosAtraso,
        minutos_saida_antecipada: minutosSaidaAntecipada,
        setor: r.setor,
        cargo: limitesFunc?.cargo || undefined,
        horario_previsto: limitesFunc?.horario_previsto || undefined,
      });
    }
  }

  if (registros.length === 0) {
    console.info('Nenhuma inconsistência para salvar.');
    return 0;
  }

  // Insere em lotes de 500 para respeitar limites da API
  const BATCH = 500;
  let totalInseridos = 0;

  for (let i = 0; i < registros.length; i += BATCH) {
    const lote = registros.slice(i, i + BATCH);
    const payload = lote.map(({ cargo, horario_previsto, ...rest }) => rest);
    
    const { error, data } = await supabase
      .from('inconsistencias')
      .insert(payload)
      .select();

    if (error) {
      console.error(`Erro ao inserir lote ${i / BATCH + 1}:`, error);
      throw new Error(`Falha ao salvar no Supabase: ${error.message}`);
    }

    totalInseridos += data?.length ?? lote.length;
  }

  console.info(`✅ ${totalInseridos} inconsistências salvas no Supabase.`);
  return totalInseridos;
}

// ────────────────────────────────────────────────────────────────────────────
// Pipeline completo — Ler → Processar → Salvar
// ────────────────────────────────────────────────────────────────────────────

export interface ResultadoProcessamento {
  totalBatidas: number;
  totalServidores: number;
  resumos: ResumoDiario[];
  faltas: ResumoDiario[];
  registros: RegistroInconsistencia[];
  totalInconsistencias: number;
  totalSalvos: number;
}

/**
 * Pipeline completo: recebe o ArrayBuffer do Excel, processa tudo
 * e salva no Supabase. Retorna estatísticas do processamento.
 */
export async function processarArquivoControlId(
  buffer: ArrayBuffer
): Promise<ResultadoProcessamento> {
  // 1. Leitura do Excel (com Regra de Ouro aplicada)
  const { batidas, funcionariosExcel } = lerExcel(buffer);

  // 1.5. Sincroniza e busca funcionários no DB
  const mapFuncionariosDB = await sincronizarFuncionarios(funcionariosExcel);

  // 2. Processamento — entrada/saída + classificação
  const resumos = processarBatidas(batidas, mapFuncionariosDB);

  // 3. Detecção de faltas
  const faltas = detectarFaltas(batidas, resumos);

  // 4. Junta tudo
  const todosResumos = [...resumos, ...faltas];

  // 5. Gera registros planos (RegistroInconsistencia[])
  const registros: RegistroInconsistencia[] = [];
  for (const r of todosResumos) {
    for (const tipo of r.inconsistencias) {
      let minutosAtraso: number | null = null;
      let minutosSaidaAntecipada: number | null = null;
      const limites = getLimites(mapFuncionariosDB.get(r.nome));
      
      if (tipo === 'atraso' && r.entrada) {
        minutosAtraso = horarioParaMinutos(r.entrada) - limites.entrada;
      }
      if (tipo === 'saida_antecipada' && r.saida) {
        minutosSaidaAntecipada = limites.saida - horarioParaMinutos(r.saida);
      }
      registros.push({
        nome_servidor: r.nome,
        data: r.data,
        tipo,
        entrada: r.entrada,
        saida: r.saida,
        minutos_atraso: minutosAtraso,
        minutos_saida_antecipada: minutosSaidaAntecipada,
        setor: r.setor,
        cargo: mapFuncionariosDB.get(r.nome)?.cargo || undefined,
        horario_previsto: mapFuncionariosDB.get(r.nome)?.horario_previsto || undefined,
      });
    }
  }

  // 6. Persiste no Supabase
  const totalSalvos = await salvarNoSupabase(todosResumos, mapFuncionariosDB);

  // 7. Estatísticas
  const totalInconsistencias = registros.length;

  return {
    totalBatidas: batidas.length,
    totalServidores: new Set(batidas.map((b) => b.nome)).size,
    resumos,
    faltas,
    registros,
    totalInconsistencias,
    totalSalvos,
  };
}

async function sincronizarFuncionarios(funcionariosExcel: FuncionarioExcel[]): Promise<Map<string, FuncionarioDB>> {
  const mapDB = new Map<string, FuncionarioDB>();
  try {
    const { data: dbFuncionarios, error } = await supabase.from('funcionarios').select('*');
    if (error && error.code !== 'PGRST205') {
      console.error('Erro ao buscar funcionarios:', error);
    }
    
    const dbFuncs = (dbFuncionarios || []) as FuncionarioDB[];
    for (const f of dbFuncs) {
      mapDB.set(f.nome, f);
    }

    if (error?.code !== 'PGRST205') {
      // Upsert
      const toUpsert: any[] = [];
      for (const excel of funcionariosExcel) {
        const dbF = mapDB.get(excel.nome);
        if (!dbF) {
          toUpsert.push({ nome: excel.nome, horario_previsto: excel.horario_previsto });
        } else if (dbF.horario_previsto !== excel.horario_previsto) {
          toUpsert.push({ id: dbF.id, nome: dbF.nome, horario_previsto: excel.horario_previsto });
        }
      }

      if (toUpsert.length > 0) {
        const { error: upsertErr } = await supabase.from('funcionarios').upsert(toUpsert, { onConflict: 'nome' });
        if (upsertErr) console.error('Erro no upsert de funcionários:', upsertErr);
        else {
          const { data: dbRefresh } = await supabase.from('funcionarios').select('*');
          if (dbRefresh) {
            for (const f of dbRefresh as FuncionarioDB[]) {
              mapDB.set(f.nome, f);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro na sincronização de funcionários:', err);
  }
  return mapDB;
}
