import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { RegistroInconsistencia } from '../../services/ControlIdParser';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiSub: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 7,
    fontWeight: 700,
  },
  badgeFalta: { backgroundColor: '#fee2e2' },
  badgeTextFalta: { color: '#ef4444' },
  badgeAtraso: { backgroundColor: '#fef3c7' },
  badgeTextAtraso: { color: '#f59e0b' },
  badgeSaida: { backgroundColor: '#e0e7ff' },
  badgeTextSaida: { color: '#4f6ef7' },
  badgeSemEntrada: { backgroundColor: '#f3e8ff' },
  badgeTextSemEntrada: { color: '#8b5cf6' },
  badgeSemSaida: { backgroundColor: '#fce7f3' },
  badgeTextSemSaida: { color: '#ec4899' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  // Column widths
  colData: { width: '10%' },
  colDia: { width: '8%' },
  colNome: { width: '30%' },
  colEntrada: { width: '10%' },
  colSaida: { width: '10%' },
  colStatus: { width: '15%', alignItems: 'flex-start' },
  colJustificativa: { width: '17%' },
});

interface Props {
  data: RegistroInconsistencia[];
  period: string;
}

const diaDaSemana = (dataStr: string): string => {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [y, m, d] = dataStr.split('-').map(Number);
  return dias[new Date(y, m - 1, d).getDay()];
};

const getBadgeStyle = (tipo: string) => {
  if (tipo === 'falta') return { badge: styles.badgeFalta, text: styles.badgeTextFalta, label: 'Falta' };
  if (tipo === 'atraso') return { badge: styles.badgeAtraso, text: styles.badgeTextAtraso, label: 'Atraso' };
  if (tipo === 'sem_registro_entrada') return { badge: styles.badgeSemEntrada, text: styles.badgeTextSemEntrada, label: 'S/ Entrada' };
  if (tipo === 'sem_registro_saida') return { badge: styles.badgeSemSaida, text: styles.badgeTextSemSaida, label: 'S/ Saída' };
  return { badge: styles.badgeSaida, text: styles.badgeTextSaida, label: 'Saída Ant.' };
};

export default function RelatorioPDF({ data, period }: Props) {
  const faltas = data.filter((r) => r.tipo === 'falta').length;
  const atrasos = data.filter((r) => r.tipo === 'atraso').length;
  const saidas = data.filter((r) => r.tipo === 'saida_antecipada').length;
  const batidasUnicas = data.filter((r) => r.tipo === 'sem_registro_entrada' || r.tipo === 'sem_registro_saida').length;
  const totalServidores = new Set(data.map((r) => r.nome_servidor)).size;
  
  const emissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const sortedData = [...data].sort((a, b) => {
    const nomeA = a.nome_servidor || '';
    const nomeB = b.nome_servidor || '';
    return nomeA.localeCompare(nomeB);
  });

  return (
    <Document title="Relatório Oficial - Imprensa Oficial do Estado do Amazonas">
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Imprensa Oficial do Estado do Amazonas</Text>
            <Text style={styles.subtitle}>Relatório Oficial de Inconsistências</Text>
            <Text style={[styles.subtitle, { color: '#4f46e5', marginTop: 3, fontWeight: 600 }]}>{period}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.subtitle}>Emitido em:</Text>
            <Text style={[styles.subtitle, { fontWeight: 600, color: '#0f172a', marginTop: 2 }]}>{emissao}</Text>
          </View>
        </View>

        {/* SUMMARY KPIs */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Ocorrências</Text>
            <Text style={styles.kpiValue}>{data.length}</Text>
            <Text style={styles.kpiSub}>Filtro aplicado</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Servidores</Text>
            <Text style={styles.kpiValue}>{totalServidores}</Text>
            <Text style={styles.kpiSub}>Com alguma inconsistência</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Detalhamento</Text>
            <Text style={[styles.kpiValue, { fontSize: 14, marginTop: 4 }]}>
              {faltas} Faltas
            </Text>
            <Text style={[styles.kpiSub, { color: '#0f172a' }]}>{atrasos} Atrasos · {saidas} Saídas · {batidasUnicas} B. Únicas</Text>
          </View>
        </View>

        {/* TABLE */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.tableHeaderCell, styles.colData]}>Data</Text>
            <Text style={[styles.tableHeaderCell, styles.colDia]}>Dia</Text>
            <Text style={[styles.tableHeaderCell, styles.colNome]}>Servidor</Text>
            <Text style={[styles.tableHeaderCell, styles.colEntrada]}>Entrada</Text>
            <Text style={[styles.tableHeaderCell, styles.colSaida]}>Saída</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.tableHeaderCell, styles.colJustificativa]}>Justificativa</Text>
          </View>

          {/* Table Rows */}
          {sortedData.map((row, i) => {
            const badge = getBadgeStyle(row.tipo);
            return (
              <View style={styles.tableRow} key={i} wrap={false}>
                <Text style={[styles.tableCell, styles.colData]}>
                  {row.data.split('-').reverse().join('/')}
                </Text>
                <Text style={[styles.tableCell, styles.colDia]}>
                  {diaDaSemana(row.data)}
                </Text>
                <View style={[styles.colNome]}>
                  <Text style={[styles.tableCell, { fontWeight: 600, color: '#0f172a' }]}>
                    {row.nome_servidor}
                  </Text>
                  {(row.cargo || row.horario_previsto) && (
                    <Text style={{ fontSize: 7, color: '#64748b', marginTop: 2 }}>
                      {[row.cargo, row.horario_previsto].filter(Boolean).join(' • ')}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colEntrada]}>
                  {row.entrada || '—'}
                </Text>
                <Text style={[styles.tableCell, styles.colSaida]}>
                  {row.saida || '—'}
                </Text>
                <View style={[styles.colStatus]}>
                  <View style={[styles.badge, badge.badge]}>
                    <Text style={[styles.badgeText, badge.text]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, styles.colJustificativa, { color: '#64748b' }]}>
                  {row.justificativa || '—'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Imprensa Oficial do Estado do Amazonas - Uso Interno</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
}
