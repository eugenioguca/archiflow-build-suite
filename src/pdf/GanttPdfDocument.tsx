import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line
} from '@react-pdf/renderer';
import type { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import type { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import type { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { formatCurrency } from '@/utils/gantt-v2/currency';
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
  
  // Header styles
  headerBar: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
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
  
  // Project info section
  projectInfoSection: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    marginBottom: 16,
  },
  projectInfoHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#334155',
  },
  projectInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  projectInfoColumn: {
    flex: 1,
    paddingRight: 16,
  },
  projectInfoItem: {
    fontSize: 9,
    marginBottom: 4,
    color: '#475569',
  },
  
  // Financial summary
  financialSummary: {
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  financialTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  financialItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  financialItem: {
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
    flex: 1,
  },
  
  // Table styles
  tableHeader: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  tableRowZebra: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 8,
    color: '#475569',
  },
  
  // Gantt chart styles
  ganttSection: {
    marginTop: 20,
  },
  ganttTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#334155',
  },
  ganttGrid: {
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  ganttHeader: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    height: 32,
    alignItems: 'center',
  },
  ganttHeaderCell: {
    color: '#FFFFFF',
    fontSize: 7,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#FFFFFF',
  },
  ganttRow: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  ganttMayorCell: {
    width: 240,
    paddingLeft: 8,
    paddingRight: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
  },
  ganttMayorText: {
    fontSize: 7,
    color: '#475569',
  },
  
  // Matrix styles
  matrixSection: {
    marginTop: 20,
  },
  matrixTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#334155',
  },
  matrixHeader: {
    backgroundColor: '#1E66F5',
    flexDirection: 'row',
    height: 32,
    alignItems: 'center',
  },
  matrixHeaderCell: {
    color: '#FFFFFF',
    fontSize: 8,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#FFFFFF',
  },
  matrixRow: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  matrixLabelCell: {
    width: 120,
    paddingLeft: 8,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
  },
  matrixDataCell: {
    textAlign: 'right',
    paddingRight: 8,
    fontSize: 7,
    color: '#475569',
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
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
  notesSection: {
    marginTop: 12,
  },
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
  const monthRange = generateMonthRange(plan.start_month, plan.months_count);
  const mayorLines = lines.filter(line => !line.is_discount);
  const discountLines = lines.filter(line => line.is_discount);
  const totalSubtotal = mayorLines.reduce((sum, line) => sum + line.amount, 0);
  const totalDiscount = discountLines.reduce((sum, line) => sum + line.amount, 0);
  const total = totalSubtotal + totalDiscount;
  
  // Calculate matrix data
  const gastoEnObra: Record<string, number> = {};
  const avanceAcumulado: Record<string, number> = {};
  const avanceParcial: Record<string, number> = {};
  
  monthRange.forEach(month => {
    let monthTotal = 0;
    
    mayorLines.forEach(line => {
      if (!line.activities || line.activities.length === 0) return;
      
      let activeWeeksInMonth = 0;
      line.activities.forEach(activity => {
        const cells = expandRangeToMonthWeekCells(
          activity.start_month,
          activity.start_week,
          activity.end_month,
          activity.end_week
        );
        
        activeWeeksInMonth += cells.filter(cell => cell.month === month.value).length;
      });
      
      let totalActiveWeeks = 0;
      line.activities.forEach(activity => {
        const cells = expandRangeToMonthWeekCells(
          activity.start_month,
          activity.start_week,
          activity.end_month,
          activity.end_week
        );
        totalActiveWeeks += cells.length;
      });
      
      if (totalActiveWeeks > 0) {
        const proportionalAmount = (line.amount * activeWeeksInMonth) / totalActiveWeeks;
        monthTotal += proportionalAmount;
      }
    });
    
    gastoEnObra[month.value] = monthTotal;
  });

  // Calculate cumulative percentages
  let cumulativeSpending = 0;
  monthRange.forEach(month => {
    cumulativeSpending += gastoEnObra[month.value] || 0;
    avanceAcumulado[month.value] = totalSubtotal > 0 ? (cumulativeSpending / totalSubtotal) * 100 : 0;
    
    const monthSpending = gastoEnObra[month.value] || 0;
    avanceParcial[month.value] = totalSubtotal > 0 ? (monthSpending / totalSubtotal) * 100 : 0;
  });

  // Calculate layout constants
  const cellWidth = 18;
  const leftColWidth = 240;
  const usableWidth = 792 - 48 - leftColWidth; // Letter landscape - margins - left col
  const monthsPerPage = Math.floor(usableWidth / (cellWidth * 4));

  const renderHeader = (pageNumber: number, totalPages: number) => (
    <>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.companyName}>
            {companyBranding?.company_name || 'DOVITA CONSTRUCCIONES'}
          </Text>
          <Text style={styles.contactInfo}>
            {[
              companyBranding?.website,
              companyBranding?.email,
              companyBranding?.phone,
              companyBranding?.address
            ].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.documentTitle}>CRONOGRAMA DE GANTT V2</Text>
          <Text style={styles.documentInfo}>
            Generado: {new Date().toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric'
            })}
          </Text>
          <Text style={styles.documentInfo}>Sistema Dovita v2.0</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {companyBranding?.company_name || 'DOVITA CONSTRUCCIONES'} - Sistema de Gestión de Proyectos - Confidencial
        </Text>
        <Text style={styles.footerText}>Página {pageNumber} de {totalPages}</Text>
        <Text style={styles.footerText}>{companyBranding?.website || 'www.dovita.com'}</Text>
      </View>
    </>
  );

  const renderProjectInfo = () => (
    <View style={styles.projectInfoSection}>
      <Text style={styles.projectInfoHeader}>INFORMACIÓN DEL PROYECTO</Text>
      <View style={styles.projectInfoRow}>
        <View style={styles.projectInfoColumn}>
          <Text style={styles.projectInfoItem}>Cliente: {client?.full_name || 'N/A'}</Text>
          <Text style={styles.projectInfoItem}>Email: {client?.email || 'N/A'}</Text>
          <Text style={styles.projectInfoItem}>Teléfono: {client?.phone || 'N/A'}</Text>
        </View>
        <View style={styles.projectInfoColumn}>
          <Text style={styles.projectInfoItem}>Proyecto: {project?.project_name || 'N/A'}</Text>
          <Text style={styles.projectInfoItem}>Ubicación: {project?.project_location || 'N/A'}</Text>
          <Text style={styles.projectInfoItem}>
            Período: {new Date(parseInt(plan.start_month.substring(0, 4)), parseInt(plan.start_month.substring(4, 6)) - 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} - {new Date(parseInt(monthRange[monthRange.length - 1].value.substring(0, 4)), parseInt(monthRange[monthRange.length - 1].value.substring(4, 6)) - 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFinancialSummary = () => (
    <View style={styles.financialSummary}>
      <Text style={styles.financialTitle}>RESUMEN FINANCIERO</Text>
      <View style={styles.financialItems}>
        <Text style={styles.financialItem}>Subtotal: {formatCurrency(totalSubtotal)}</Text>
        <Text style={styles.financialItem}>Descuentos: {formatCurrency(totalDiscount)}</Text>
        <Text style={styles.financialItem}>Total: {formatCurrency(total)}</Text>
        <Text style={styles.financialItem}>Período: {plan.months_count} meses</Text>
      </View>
    </View>
  );

  const renderPartidaTable = () => {
    const colWidths = [40, 60, 180, 80, 60];
    
    return (
      <View>
        <Text style={[styles.ganttTitle, { marginTop: 0 }]}>TABLA DE PARTIDAS</Text>
        
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: colWidths[0], textAlign: 'center' }]}>No.</Text>
          <Text style={[styles.tableHeaderText, { width: colWidths[1], textAlign: 'center' }]}>Código</Text>
          <Text style={[styles.tableHeaderText, { width: colWidths[2] }]}>Mayor</Text>
          <Text style={[styles.tableHeaderText, { width: colWidths[3], textAlign: 'right' }]}>Importe</Text>
          <Text style={[styles.tableHeaderText, { width: colWidths[4], textAlign: 'right' }]}>%</Text>
        </View>

        {/* Table Rows */}
        {lines.map((line, idx) => {
          const mayor = mayores.find(m => m.id === line.mayor_id);
          const percentage = totalSubtotal > 0 ? ((line.amount / totalSubtotal) * 100) : 0;
          
          return (
            <View 
              key={line.id} 
              style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowZebra : {}]}
            >
              <Text style={[styles.tableCell, { width: colWidths[0], textAlign: 'center' }]}>
                {idx + 1}
              </Text>
              <Text style={[styles.tableCell, { width: colWidths[1] }]}>
                {mayor?.codigo || 'N/A'}
              </Text>
              <Text style={[styles.tableCell, { width: colWidths[2] }]}>
                {mayor?.nombre?.length > 35 ? `${mayor.nombre.substring(0, 32)}...` : mayor?.nombre || 'Mayor no encontrado'}
              </Text>
              <Text style={[styles.tableCell, { width: colWidths[3], textAlign: 'right' }]}>
                {formatCurrency(line.amount)}
              </Text>
              <Text style={[styles.tableCell, { width: colWidths[4], textAlign: 'right' }]}>
                {percentage.toFixed(2)}%
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderGanttChart = (startMonthIndex: number, endMonthIndex: number) => {
    const displayMonths = monthRange.slice(startMonthIndex, endMonthIndex + 1);
    
    return (
      <View style={styles.ganttSection}>
        <Text style={styles.ganttTitle}>CRONOGRAMA VISUAL</Text>
        
        {/* Gantt Header */}
        <View style={styles.ganttHeader}>
          <View style={[styles.ganttHeaderCell, { width: leftColWidth }]}>
            <Text>PARTIDA / MAYOR</Text>
          </View>
          {displayMonths.map(month => (
            <React.Fragment key={month.value}>
              {[1, 2, 3, 4].map(week => (
                <View key={`${month.value}-W${week}`} style={[styles.ganttHeaderCell, { width: cellWidth }]}>
                  <Text style={{ fontSize: 6 }}>
                    {week === 1 ? new Date(parseInt(month.value.substring(0, 4)), parseInt(month.value.substring(4, 6)) - 1).toLocaleDateString('es-MX', { month: 'short' }) : `W${week}`}
                  </Text>
                </View>
              ))}
            </React.Fragment>
          ))}
        </View>

        {/* Gantt Rows */}
        {mayorLines.map((line, lineIdx) => {
          const mayor = mayores.find(m => m.id === line.mayor_id);
          
          return (
            <View key={line.id} style={[styles.ganttRow, lineIdx % 2 === 0 ? { backgroundColor: '#F8FAFC' } : {}]}>
              <View style={styles.ganttMayorCell}>
                <Text style={styles.ganttMayorText}>{mayor?.codigo || 'N/A'}</Text>
                <Text style={[styles.ganttMayorText, { fontSize: 6 }]}>
                  {mayor?.nombre?.length > 30 ? `${mayor.nombre.substring(0, 27)}...` : mayor?.nombre || 'Mayor no encontrado'}
                </Text>
              </View>
              
              {displayMonths.map(month => (
                <React.Fragment key={month.value}>
                  {[1, 2, 3, 4].map(week => {
                    // Check if this week has activity
                    let hasActivity = false;
                    if (line.activities && line.activities.length > 0) {
                      line.activities.forEach(activity => {
                        const cells = expandRangeToMonthWeekCells(
                          activity.start_month,
                          activity.start_week,
                          activity.end_month,
                          activity.end_week
                        );
                        
                        if (cells.some(cell => cell.month === month.value && cell.week === week)) {
                          hasActivity = true;
                        }
                      });
                    }
                    
                    return (
                      <View 
                        key={`${month.value}-W${week}`} 
                        style={{
                          width: cellWidth,
                          height: 24,
                          borderRightWidth: 0.5,
                          borderRightColor: '#E2E8F0',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {hasActivity && (
                          <Svg width={cellWidth - 2} height={16}>
                            <Rect
                              x={1}
                              y={2}
                              width={cellWidth - 4}
                              height={12}
                              fill="#1E66F5"
                              rx={2}
                            />
                          </Svg>
                        )}
                      </View>
                    );
                  })}
                </React.Fragment>
              ))}
            </View>
          );
        })}
        
        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.noteText}>
            Las barras azules representan las semanas programadas de ejecución.
          </Text>
          {overrides.length > 0 && (
            <Text style={styles.noteText}>
              * Algunos valores pueden tener ajustes manuales.
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderMatrix = (startMonthIndex: number, endMonthIndex: number) => {
    const displayMonths = monthRange.slice(startMonthIndex, endMonthIndex + 1);
    const cellWidth = 60;
    
    const matrixRows = [
      { 
        label: 'Gasto en Obra', 
        data: gastoEnObra, 
        format: 'currency',
        total: Object.values(gastoEnObra).reduce((sum, val) => sum + val, 0)
      },
      { 
        label: '% Avance Parcial', 
        data: avanceParcial, 
        format: 'percentage',
        total: Object.values(avanceParcial).reduce((sum, val) => sum + val, 0)
      },
      { 
        label: '% Avance Acumulado', 
        data: avanceAcumulado, 
        format: 'percentage',
        total: Math.max(...Object.values(avanceAcumulado))
      },
      { 
        label: 'Ministraciones', 
        data: {}, 
        format: 'currency',
        total: 0
      },
      { 
        label: '% Inversión Acum.', 
        data: {}, 
        format: 'percentage',
        total: 0
      }
    ];
    
    return (
      <View style={styles.matrixSection}>
        <Text style={styles.matrixTitle}>MATRIZ NUMÉRICA MENSUAL</Text>
        
        {/* Matrix Header */}
        <View style={styles.matrixHeader}>
          <View style={[styles.matrixHeaderCell, { width: 120 }]}>
            <Text>CONCEPTO</Text>
          </View>
          {displayMonths.map(month => (
            <View key={month.value} style={[styles.matrixHeaderCell, { width: cellWidth }]}>
              <Text style={{ fontSize: 7 }}>
                {new Date(parseInt(month.value.substring(0, 4)), parseInt(month.value.substring(4, 6)) - 1).toLocaleDateString('es-MX', { month: 'short' })}
              </Text>
            </View>
          ))}
          <View style={[styles.matrixHeaderCell, { width: cellWidth, backgroundColor: '#FF9800' }]}>
            <Text>TOTAL</Text>
          </View>
        </View>

        {/* Matrix Rows */}
        {matrixRows.map((row, rowIdx) => (
          <View key={row.label} style={[styles.matrixRow, rowIdx % 2 === 0 ? { backgroundColor: '#F8FAFC' } : {}]}>
            <View style={styles.matrixLabelCell}>
              <Text style={{ fontSize: 8, color: '#475569' }}>{row.label}</Text>
            </View>
            
            {displayMonths.map(month => {
              const value = row.data[month.value] || 0;
              let displayValue = '';
              
              if (row.format === 'currency') {
                displayValue = value > 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`;
              } else if (row.format === 'percentage') {
                displayValue = `${value.toFixed(1)}%`;
              }
              
              return (
                <View key={month.value} style={[styles.matrixDataCell, { width: cellWidth }]}>
                  <Text>{displayValue}</Text>
                </View>
              );
            })}
            
            {/* Total Cell */}
            <View style={[styles.matrixDataCell, { width: cellWidth, backgroundColor: '#FFF3E0' }]}>
              <Text style={{ fontWeight: 'bold' }}>
                {row.format === 'currency' 
                  ? (row.total > 1000 ? `$${(row.total / 1000).toFixed(0)}K` : `$${row.total.toFixed(0)}`)
                  : `${row.total.toFixed(1)}%`
                }
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Calculate number of pages needed
  const ganttPages = Math.ceil(plan.months_count / monthsPerPage);
  const matrixPages = Math.ceil(plan.months_count / 10); // Assume 10 months per matrix page
  const totalPages = 1 + ganttPages + matrixPages; // Cover page + Gantt pages + Matrix pages

  return (
    <Document>
      {/* Cover Page */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {renderHeader(1, totalPages)}
        {renderProjectInfo()}
        {renderFinancialSummary()}
        {renderPartidaTable()}
      </Page>

      {/* Gantt Chart Pages */}
      {Array.from({ length: ganttPages }, (_, pageIdx) => {
        const startMonthIndex = pageIdx * monthsPerPage;
        const endMonthIndex = Math.min(startMonthIndex + monthsPerPage - 1, monthRange.length - 1);
        
        return (
          <Page key={`gantt-${pageIdx}`} size="LETTER" orientation="landscape" style={styles.page}>
            {renderHeader(2 + pageIdx, totalPages)}
            {renderGanttChart(startMonthIndex, endMonthIndex)}
          </Page>
        );
      })}

      {/* Matrix Pages */}
      {Array.from({ length: matrixPages }, (_, pageIdx) => {
        const startMonthIndex = pageIdx * 10;
        const endMonthIndex = Math.min(startMonthIndex + 9, monthRange.length - 1);
        
        return (
          <Page key={`matrix-${pageIdx}`} size="LETTER" orientation="landscape" style={styles.page}>
            {renderHeader(2 + ganttPages + pageIdx, totalPages)}
            {renderMatrix(startMonthIndex, endMonthIndex)}
          </Page>
        );
      })}
    </Document>
  );
};

// Export function that creates the PDF document
export const GanttPdfDocument = (props: GanttPdfContentProps) => {
  return <GanttPdfContent {...props} />;
};