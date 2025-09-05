import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import type { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import type { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';

// Define colors and styles
const styles = StyleSheet.create({
  // Page and layout
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  
  // Compact Header styles
  compactHeader: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactInfo: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  documentTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  documentInfo: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  
  // Compact financial summary
  compactFinancialSummary: {
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
    marginBottom: 8,
  },
  financialItem: {
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
    flex: 1,
  },
  
  // Integrated Gantt styles
  integratedGantt: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  ganttHeaders: {
    flexDirection: 'row',
    backgroundColor: '#1E66F5',
    height: 24,
  },
  leftColumnHeader: {
    width: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#FFFFFF',
  },
  leftHeaderText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  monthHeadersContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  monthHeaderCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: '#FFFFFF',
  },
  monthHeaderText: {
    color: '#FFFFFF',
    fontSize: 7,
    textAlign: 'center',
    paddingVertical: 2,
  },
  weekHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekHeaderText: {
    color: '#FFFFFF',
    fontSize: 6,
  },
  
  // Gantt data rows
  ganttDataRow: {
    flexDirection: 'row',
    height: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  partidaInfo: {
    width: 180,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
  },
  partidaNumber: {
    fontSize: 6,
    width: 15,
    color: '#64748B',
  },
  partidaName: {
    fontSize: 6,
    flex: 1,
    color: '#334155',
  },
  partidaAmount: {
    fontSize: 6,
    width: 40,
    textAlign: 'right',
    color: '#475569',
  },
  partidaPercent: {
    fontSize: 6,
    width: 25,
    textAlign: 'right',
    color: '#64748B',
  },
  timelineRow: {
    flex: 1,
    flexDirection: 'row',
  },
  monthTimelineContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    height: 20,
    borderRightWidth: 0.25,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityBar: {
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    width: '80%',
  },
  zebraRow: {
    backgroundColor: '#F8FAFC',
  },
  
  // Matrix styles for page 2
  matrixTable: {
    marginTop: 16,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  matrixHeaderRow: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    height: 24,
  },
  matrixCell: {
    fontSize: 7,
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
    textAlign: 'center',
  },
  matrixHeaderCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  matrixDataRow: {
    flexDirection: 'row',
    height: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  matrixTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  
  // Footer styles
  footer: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 7,
  },
  
  // Notes
  noteText: {
    fontSize: 7,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 2,
  },
});

interface GanttPdfContentProps {
  plan: GanttPlan;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  client: any;
  project: any;
  companyBranding: any;
}

const GanttPdfContent: React.FC<GanttPdfContentProps> = ({
  plan,
  lines,
  mayores,
  overrides,
  client,
  project,
  companyBranding
}) => {
  // Calculate financial summary
  const subtotal = lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const totalDescuentos = lines.filter(l => l.is_discount).reduce((sum, line) => sum + Math.abs(line.amount || 0), 0);
  const total = subtotal - totalDescuentos;

  // Calculate months for the plan
  const startYear = Math.floor(parseInt(plan.start_month) / 100);
  const startMonth = parseInt(plan.start_month) % 100;
  const months: string[] = [];
  
  for (let i = 0; i < plan.months_count; i++) {
    let currentYear = startYear;
    let currentMonth = startMonth + i;
    
    while (currentMonth > 12) {
      currentMonth -= 12;
      currentYear += 1;
    }
    
    const monthStr = currentYear * 100 + currentMonth;
    months.push(monthStr.toString());
  }

  // Filter non-discount lines for display
  const displayLines = lines.filter(line => !line.is_discount);

  return (
    <Document>
      {/* Page 1: Integrated Gantt Chart */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.companyName, { fontSize: 12, marginBottom: 2 }]}>{companyBranding?.company_name || 'DOVITA CONSTRUCCIONES'}</Text>
            <Text style={styles.contactInfo}>
              {[companyBranding?.website, companyBranding?.email, companyBranding?.phone].filter(Boolean).join(' | ')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.documentTitle, { fontSize: 11 }]}>CRONOGRAMA DE GANTT</Text>
            <Text style={[styles.documentInfo, { fontSize: 7 }]}>{project?.project_name || 'Proyecto'}</Text>
            <Text style={[styles.documentInfo, { fontSize: 7 }]}>Cliente: {client?.full_name || 'Cliente'}</Text>
          </View>
        </View>

        {/* Compact Financial Summary */}
        <View style={styles.compactFinancialSummary}>
          <Text style={[styles.financialItem, { fontSize: 7 }]}>Subtotal: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(subtotal)}</Text>
          <Text style={[styles.financialItem, { fontSize: 7 }]}>Total: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(total)}</Text>
          <Text style={[styles.financialItem, { fontSize: 7 }]}>Periodo: {plan.months_count} meses</Text>
        </View>

        {/* Integrated Gantt Chart */}
        <View style={styles.integratedGantt}>
          {/* Headers */}
          <View style={styles.ganttHeaders}>
            {/* Left column header */}
            <View style={styles.leftColumnHeader}>
              <Text style={styles.leftHeaderText}>PARTIDAS</Text>
            </View>
            
            {/* Month headers */}
            <View style={styles.monthHeadersContainer}>
              {months.map((month, index) => {
                const year = Math.floor(parseInt(month) / 100);
                const monthNum = parseInt(month) % 100;
                const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-MX', { month: 'short' });
                
                return (
                  <View key={month} style={styles.monthHeaderCell}>
                    <Text style={styles.monthHeaderText}>{monthName} {year}</Text>
                    <View style={styles.weekHeadersRow}>
                      <Text style={styles.weekHeaderText}>1</Text>
                      <Text style={styles.weekHeaderText}>2</Text>
                      <Text style={styles.weekHeaderText}>3</Text>
                      <Text style={styles.weekHeaderText}>4</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Data rows */}
          {displayLines.map((line, lineIndex) => {
            const mayor = mayores.find(m => m.id === line.mayor_id);
            const percentage = subtotal > 0 ? ((line.importe || line.amount || 0) / subtotal * 100).toFixed(1) : '0.0';
            
            return (
              <View key={line.id} style={[styles.ganttDataRow, lineIndex % 2 === 1 ? styles.zebraRow : null]}>
                {/* Left column with partida info */}
                <View style={styles.partidaInfo}>
                  <Text style={styles.partidaNumber}>{lineIndex + 1}</Text>
                  <Text style={styles.partidaName} numberOfLines={1}>
                    {mayor?.nombre || 'Sin categoría'}
                  </Text>
                  <Text style={styles.partidaAmount}>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(line.importe || line.amount || 0)}
                  </Text>
                  <Text style={styles.partidaPercent}>{percentage}%</Text>
                </View>
                
                {/* Timeline cells */}
                <View style={styles.timelineRow}>
                  {months.map((month) => (
                    <View key={`${line.id}-${month}`} style={styles.monthTimelineContainer}>
                      {[1, 2, 3, 4].map((week) => {
                        // Check if this line has activities in this month/week
                        const hasActivity = line.activities?.some(activity => {
                          const cells = expandRangeToMonthWeekCells(
                            activity.start_month,
                            activity.start_week,
                            activity.end_month,
                            activity.end_week
                          );
                          return cells.some(cell => cell.month === month && cell.week === week);
                        });
                        
                        return (
                          <View key={`${line.id}-${month}-W${week}`} style={styles.weekCell}>
                            {hasActivity && <View style={styles.activityBar} />}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyBranding?.company_name || 'DOVITA CONSTRUCCIONES'} – Sistema de Gestión de Proyectos – Confidencial
          </Text>
          <Text style={styles.footerText}>Página 1 de 2</Text>
          <Text style={styles.footerText}>{companyBranding?.website || 'www.dovita.com'}</Text>
        </View>
      </Page>

      {/* Page 2: Numerical Matrix */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.compactHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.companyName, { fontSize: 12, marginBottom: 2 }]}>{companyBranding?.company_name || 'DOVITA CONSTRUCCIONES'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.documentTitle, { fontSize: 11 }]}>MATRIZ NUMÉRICA MENSUAL</Text>
          </View>
        </View>

        <Text style={styles.matrixTitle}>Matriz Numérica Mensual</Text>

        {/* Matrix Table */}
        <View style={styles.matrixTable}>
          {/* Headers */}
          <View style={styles.matrixHeaderRow}>
            <Text style={[styles.matrixCell, styles.matrixHeaderCell, { width: '20%' }]}>Concepto</Text>
            {months.map((month) => {
              const year = Math.floor(parseInt(month) / 100);
              const monthNum = parseInt(month) % 100;
              const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
              
              return (
                <Text key={month} style={[styles.matrixCell, styles.matrixHeaderCell, { width: `${80/months.length}%` }]}>
                  {monthName}
                </Text>
              );
            })}
          </View>

          {/* Matrix Rows */}
          {[
            { label: 'Gasto en Obra (MXN)', key: 'gasto' },
            { label: '% Avance Parcial', key: 'avance_parcial' },
            { label: '% Avance Acumulado', key: 'avance_acum' },
            { label: 'Ministraciones (MXN)', key: 'ministraciones' },
            { label: '% Inversión Acum.', key: 'inversion_acum' },
            { label: 'Fecha Tentativa de Pago', key: 'fecha_pago' }
          ].map((row, rowIndex) => (
            <View key={row.key} style={[styles.matrixDataRow, rowIndex % 2 === 1 ? styles.zebraRow : null]}>
              <Text style={[styles.matrixCell, { width: '20%', textAlign: 'left', paddingLeft: 8 }]}>{row.label}</Text>
              {months.map((month, monthIndex) => (
                <Text key={`${row.key}-${month}`} style={[styles.matrixCell, { width: `${80/months.length}%` }]}>
                  {row.key === 'fecha_pago' ? `Pago ${monthIndex + 1}` : 
                   row.key === 'gasto' ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(0) :
                   row.key.includes('avance') || row.key.includes('inversion') ? '0.0%' : 
                   '$ 0'}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Notes */}
        <Text style={[styles.noteText, { marginTop: 16, textAlign: 'center' }]}>
          * Las barras azules representan las semanas programadas de ejecución. Algunos valores pueden tener ajustes manuales.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyBranding?.company_name || 'DOVITA CONSTRUCCIONES'} – Sistema de Gestión de Proyectos – Confidencial
          </Text>
          <Text style={styles.footerText}>Página 2 de 2</Text>
          <Text style={styles.footerText}>{companyBranding?.website || 'www.dovita.com'}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Export function that creates the PDF document
export const GanttPdfDocument = (props: GanttPdfContentProps) => {
  return <GanttPdfContent {...props} />;
};