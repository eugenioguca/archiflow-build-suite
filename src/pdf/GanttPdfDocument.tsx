import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import type { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import type { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';

  // Professional colors following the reference design
  const COLORS = {
    primary: '#1E3A8A',      // Corporate blue
    accent: '#3B82F6',       // Activity blue  
    secondary: '#F8FAFC',    // Light background
    text: '#1F2937',         // Dark text
    textLight: '#6B7280',    // Light text
    border: '#E5E7EB',       // Borders
    white: '#FFFFFF',
    success: '#10B981',      // Green for positive values
    warning: '#F59E0B',      // Orange
  };

const styles = StyleSheet.create({
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  
  // Corporate header - barra azul superior
  corporateHeader: {
    backgroundColor: '#2D4B9A', // Blue matching the logo
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    marginBottom: 10,
  },
  
  // Company info - lado izquierdo
  companySection: {
    flex: 1,
  },
  companyName: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  companyLogo: {
    width: 200,
    height: 60,
    marginBottom: 4,
    objectFit: 'contain',
  },
  companyContact: {
    color: COLORS.white,
    fontSize: 8,
    opacity: 0.9,
  },
  
  // Project info - lado derecho
  projectSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  documentTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectInfo: {
    color: COLORS.white,
    fontSize: 8,
    textAlign: 'right',
    opacity: 0.9,
  },
  
  // Project details section
  projectDetails: {
    backgroundColor: COLORS.secondary,
    padding: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsLeft: {
    flex: 1,
  },
  detailsRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 7,
    color: COLORS.textLight,
    marginBottom: 1,
  },
  detailValue: {
    fontSize: 8,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  
  // Financial summary - compacto
  financialSummary: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 6,
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: COLORS.white,
    fontSize: 7,
    opacity: 0.8,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Main content - layout integrado
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Tabla de partidas - lado izquierdo
  partidasSection: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  
  // Header de partidas
  partidasHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 30,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerCell: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noColumn: { width: 20 },
  partidaColumn: { flex: 1, paddingLeft: 4, textAlign: 'left' },
  importeColumn: { width: 50, textAlign: 'right' },
  percentColumn: { width: 30, textAlign: 'right' },
  
  // Filas de partidas
  partidaRow: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  partidaRowZebra: {
    backgroundColor: COLORS.secondary,
  },
  
  // Cells de partidas
  noCell: {
    width: 20,
    fontSize: 7,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  partidaNameCell: {
    flex: 1,
    fontSize: 7,
    color: COLORS.text,
    paddingLeft: 4,
  },
  importeCell: {
    width: 50,
    fontSize: 7,
    color: COLORS.text,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  percentCell: {
    width: 30,
    fontSize: 7,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  
  // Cronograma section - lado derecho
  cronogramaSection: {
    flex: 1,
  },
  
  // Headers del cronograma
  cronogramaHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 30,
  },
  monthsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  monthHeader: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.white,
    paddingVertical: 2,
  },
  monthTitle: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  weeksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekNumber: {
    color: COLORS.white,
    fontSize: 6,
  },
  
  // Timeline rows
  timelineRow: {
    flexDirection: 'row',
    height: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  timelineRowZebra: {
    backgroundColor: COLORS.secondary,
  },
  monthTimelineSection: {
    flex: 1,
    flexDirection: 'row',
    borderRightWidth: 0.5,
    borderRightColor: COLORS.border,
  },
  weekTimelineCell: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activityBar: {
    height: 10,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    width: '90%',
  },
  
  // Matrix table (Page 2)
  matrixTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  matrixTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  matrixHeaderRow: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 28,
    alignItems: 'center',
  },
  matrixDataRow: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  matrixRowZebra: {
    backgroundColor: COLORS.secondary,
  },
  matrixHeaderCell: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  matrixCell: {
    fontSize: 7,
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  matrixLabelCell: {
    textAlign: 'left',
    fontWeight: 'bold',
    paddingLeft: 8,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  footerText: {
    color: COLORS.white,
    fontSize: 7,
  },
  
  // Notes
  notes: {
    marginTop: 10,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 7,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

interface GanttPdfContentProps {
  plan: GanttPlan;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  referenceLines?: Array<{
    id: string;
    position_month: string;
    position_week: number;
    label: string;
    color: string;
  }>;
  client: any;
  project: any;
  companyBranding: any;
}

const GanttPdfContent: React.FC<GanttPdfContentProps> = ({
  plan,
  lines,
  mayores,
  overrides,
  referenceLines = [],
  client,
  project,
  companyBranding
}) => {
  console.log('🎨 PDF RENDER: Company name will be white with fontSize 20');
  console.log('💚 PDF RENDER: Discounts will be green color:', COLORS.success);
  console.log('📊 PDF RENDER: Total row will use normal text color:', COLORS.text);
  
  // Function to load and convert image to base64
  const loadImageAsBase64 = async (imageUrl: string): Promise<string> => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      throw error;
    }
  };
  
  const renderCompanyLogo = () => {
    // Use the uploaded logo - it should work with absolute path in @react-pdf/renderer
    const logoSrc = window.location.origin + '/lovable-uploads/d967a2e5-99bb-4992-8a2d-f0887371c03c.png';
    
    try {
      return (
        <Image 
          style={styles.companyLogo} 
          src={logoSrc}
        />
      );
    } catch (error) {
      console.log('PDF: Error loading logo, falling back to text');
      return (
        <Text style={styles.companyName}>DOVITA</Text>
      );
    }
  };
  
  // Calculate financial summary correctly
  const mayorLines = lines.filter(line => !line.is_discount);
  const discountLines = lines.filter(line => line.is_discount);
  const subtotal = mayorLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const totalDescuentos = discountLines.reduce((sum, line) => sum + (line.amount || 0), 0);
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
  
  // Robust pagination logic for table rows
  const ROW_HEIGHT = 24; // Height of each row in points
  const HEADER_HEIGHT = 30; // Height of table header
  const TOTALS_BLOCK_HEIGHT = 72; // Height for subtotal + discount rows + total (3 rows minimum)
  const AVAILABLE_HEIGHT_FIRST_PAGE = 400; // Available space for table on first page (after headers, project details, etc.)
  const AVAILABLE_HEIGHT_OTHER_PAGES = 520; // Available space on subsequent pages
  const FOOTER_HEIGHT = 40; // Space for footer
  
  // Calculate actual totals block height based on discount lines
  const actualTotalsHeight = (1 + discountLines.length + 1) * ROW_HEIGHT; // subtotal + discounts + total
  
  // Calculate rows that can fit per page
  const rowsPerFirstPage = Math.floor((AVAILABLE_HEIGHT_FIRST_PAGE - HEADER_HEIGHT - FOOTER_HEIGHT) / ROW_HEIGHT);
  const rowsPerOtherPages = Math.floor((AVAILABLE_HEIGHT_OTHER_PAGES - HEADER_HEIGHT - FOOTER_HEIGHT) / ROW_HEIGHT);
  
  // Manual pagination with totals space reservation
  function paginateRowsWithTotalsSpace(lines: GanttLine[]) {
    const pages: GanttLine[][] = [];
    let currentPage: GanttLine[] = [];
    let remainingLines = [...lines];
    let isFirstPage = true;
    
    while (remainingLines.length > 0) {
      const maxRowsForThisPage = isFirstPage ? rowsPerFirstPage : rowsPerOtherPages;
      const availableHeight = isFirstPage ? 
        AVAILABLE_HEIGHT_FIRST_PAGE - HEADER_HEIGHT - FOOTER_HEIGHT : 
        AVAILABLE_HEIGHT_OTHER_PAGES - HEADER_HEIGHT - FOOTER_HEIGHT;
      
      // If this is potentially the last page, reserve space for totals
      const isLastPage = remainingLines.length <= maxRowsForThisPage;
      const maxRowsConsideringTotals = isLastPage ? 
        Math.floor((availableHeight - actualTotalsHeight) / ROW_HEIGHT) : 
        maxRowsForThisPage;
      
      const rowsToTake = Math.min(remainingLines.length, Math.max(1, maxRowsConsideringTotals));
      
      // If we can't fit at least one row plus totals, move some rows to previous page
      if (isLastPage && rowsToTake <= 0 && pages.length > 0) {
        // Move last few rows from previous page to make room
        const previousPage = pages[pages.length - 1];
        const rowsToMove = Math.min(2, previousPage.length - 1); // Move at most 2 rows, keep at least 1
        if (rowsToMove > 0) {
          const movedRows = previousPage.splice(-rowsToMove);
          remainingLines = [...movedRows, ...remainingLines];
          continue;
        }
      }
      
      currentPage = remainingLines.splice(0, Math.max(1, rowsToTake));
      pages.push(currentPage);
      isFirstPage = false;
    }
    
    return pages;
  }
  
  // Apply robust pagination
  const pageChunks = paginateRowsWithTotalsSpace(displayLines);
  const totalPages = pageChunks.length + 1; // +1 for matrix page
  
  // Render table header component
  const renderTableHeader = () => (
    <View style={styles.partidasHeader}>
      <Text style={[styles.headerCell, styles.noColumn]}>No.</Text>
      <Text style={[styles.headerCell, styles.partidaColumn]}>PARTIDA</Text>
      <Text style={[styles.headerCell, styles.importeColumn]}>IMPORTE</Text>
      <Text style={[styles.headerCell, styles.percentColumn]}>%</Text>
    </View>
  );
  
  // Render cronograma header component
  const renderCronogramaHeader = () => (
    <View style={styles.cronogramaHeader}>
      <View style={styles.monthsContainer}>
        {months.map((month) => {
          const year = Math.floor(parseInt(month) / 100);
          const monthNum = parseInt(month) % 100;
          const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-MX', { month: 'short' });
          
          return (
            <View key={month} style={styles.monthHeader}>
              <Text style={styles.monthTitle}>{monthName.toUpperCase()} {year}</Text>
              <View style={styles.weeksRow}>
                <Text style={styles.weekNumber}>1</Text>
                <Text style={styles.weekNumber}>2</Text>
                <Text style={styles.weekNumber}>3</Text>
                <Text style={styles.weekNumber}>4</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
  
  // Render table rows for a specific page with wrap protection
  const renderTableRows = (pageLines: GanttLine[], startIndex: number) => (
    <>
      {pageLines.map((line, lineIndex) => {
        const mayor = mayores.find(m => m.id === line.mayor_id);
        const percentage = subtotal > 0 ? ((line.amount || 0) / subtotal * 100).toFixed(1) : '0.0';
        const globalIndex = startIndex + lineIndex;
        
        return (
          <View 
            key={line.id} 
            style={[styles.partidaRow, globalIndex % 2 === 1 ? styles.partidaRowZebra : null]}
            wrap={false} // Prevent row from breaking across pages
          >
            <Text style={styles.noCell}>{globalIndex + 1}</Text>
            <Text style={styles.partidaNameCell}>
              {mayor?.nombre?.substring(0, 18) || 'Sin categoría'}
              {(mayor?.nombre?.length || 0) > 18 ? '...' : ''}
            </Text>
            <Text style={styles.importeCell}>
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(line.amount || 0)}
            </Text>
            <Text style={styles.percentCell}>{percentage}%</Text>
          </View>
        );
      })}
    </>
  );
  
  // Render timeline rows for a specific page with wrap protection
  const renderTimelineRows = (pageLines: GanttLine[], startIndex: number) => (
    <View style={{ position: 'relative' }}>
      {pageLines.map((line, lineIndex) => {
        const globalIndex = startIndex + lineIndex;
        return (
          <View 
            key={line.id} 
            style={[styles.timelineRow, globalIndex % 2 === 1 ? styles.timelineRowZebra : null]}
            wrap={false} // Prevent row from breaking across pages
          >
            {months.map((month) => (
              <View key={`${line.id}-${month}`} style={styles.monthTimelineSection}>
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
                    <View key={`${line.id}-${month}-W${week}`} style={styles.weekTimelineCell}>
                      {hasActivity && <View style={styles.activityBar} />}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
  
  // Render reference lines as continuous overlays covering only the partida rows in each page
  const renderReferenceLines = (pageLines: GanttLine[]) => {
    // Filter to only include partida lines (not discount lines)
    const partidaLines = pageLines.filter(line => !line.is_discount);
    
    // Only render if there are partida lines on this page
    if (partidaLines.length === 0) return null;
    
    return (
      <>
        {referenceLines.map((line) => {
          const monthIndex = months.findIndex(m => m === line.position_month);
          if (monthIndex === -1) return null;
          
          // Calculate horizontal position: END of selected week (weekNumber is 1-based)  
          const monthWidth = 100 / months.length; // Percentage width per month
          const weekWidth = monthWidth / 4;
          const leftPosition = (monthIndex * monthWidth) + (line.position_week * weekWidth);
          
          // Calculate vertical positioning:
          // The timeline rows start right after the cronograma header (blue header with months/weeks)
          // Each timeline row has exactly ROW_HEIGHT height
          // We need to cover from first partida row to last partida row on this page
          const cronogramaHeaderHeight = 60; // Height of the blue cronograma header with months/weeks
          const firstRowTop = cronogramaHeaderHeight; // First timeline row starts after cronograma header
          const totalRowsHeight = partidaLines.length * ROW_HEIGHT; // Height covering all partida rows
          
          return (
            <View
              key={`ref-line-${line.id}`}
              style={{
                position: 'absolute',
                left: `${leftPosition}%`,
                top: firstRowTop, // Start right after cronograma header (blue header)
                height: totalRowsHeight, // Cover exactly all partida rows, no more, no less
                width: 2,
                backgroundColor: line.color || '#ef4444',
                zIndex: 100 // Extremely high z-index to appear above row backgrounds, alternating colors, and activities
              }}
            />
          );
        })}
      </>
    );
  };
  
  // Render totals section (only on last page) with wrap protection
  const renderTotals = () => (
    <View wrap={false}> {/* Protect entire totals block from breaking */}
      {/* Subtotal Row */}
      <View style={[styles.partidaRow, { backgroundColor: '#f3f4f6' }]} wrap={false}>
        <Text style={styles.noCell}></Text>
        <Text style={[styles.partidaNameCell, { fontWeight: 'bold' }]}>SUBTOTAL</Text>
        <Text style={[styles.importeCell, { fontWeight: 'bold' }]}>
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(subtotal)}
        </Text>
        <Text style={[styles.percentCell, { fontWeight: 'bold' }]}>100.0%</Text>
      </View>
      
      {/* Discount Rows */}
      {discountLines.map((line) => (
        <View key={line.id} style={[styles.partidaRow, { backgroundColor: '#f0fdf4' }]} wrap={false}>
          <Text style={styles.noCell}></Text>
          <Text style={[styles.partidaNameCell, { color: COLORS.success }]}>
            {line.label || 'Descuento'}
          </Text>
          <Text style={[styles.importeCell, { color: COLORS.success }]}>
            -{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(line.amount || 0)}
          </Text>
          <Text style={styles.percentCell}></Text>
        </View>
      ))}
      
      {/* Total Row */}
      <View style={[styles.partidaRow, { backgroundColor: '#f3f4f6' }]} wrap={false}>
        <Text style={styles.noCell}></Text>
        <Text style={[styles.partidaNameCell, { fontWeight: 'bold', color: COLORS.text }]}>TOTAL</Text>
        <Text style={[styles.importeCell, { fontWeight: 'bold', color: COLORS.text }]}>
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(total)}
        </Text>
        <Text style={[styles.percentCell, { fontWeight: 'bold', color: COLORS.text }]}>
        </Text>
      </View>
    </View>
  );

  return (
    <Document>
      {/* Gantt Chart Pages */}
      {pageChunks.map((pageLines, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastGanttPage = pageIndex === pageChunks.length - 1;
        const startIndex = pageIndex === 0 ? 0 : rowsPerFirstPage + (pageIndex - 1) * rowsPerOtherPages;
        
        return (
          <Page key={`gantt-page-${pageIndex}`} size="LETTER" orientation="landscape" style={styles.page}>
            {/* Corporate Header - Only on first page */}
            {isFirstPage && (
              <>
                <View style={styles.corporateHeader}>
                  <View style={styles.companySection}>
                    {renderCompanyLogo()}
                    <Text style={styles.companyContact}>
                      {[companyBranding?.website, companyBranding?.email, companyBranding?.phone].filter(Boolean).join(' | ')}
                    </Text>
                  </View>
                  <View style={styles.projectSection}>
                    <Text style={styles.documentTitle}>CRONOGRAMA DE GANTT</Text>
                    <Text style={styles.projectInfo}>{project?.project_name || 'Proyecto'}</Text>
                    <Text style={styles.projectInfo}>Cliente: {client?.full_name || 'Cliente'}</Text>
                  </View>
                </View>

                {/* Project Details */}
                <View style={styles.projectDetails}>
                  <View style={styles.detailsLeft}>
                    <Text style={styles.detailLabel}>PROYECTO:</Text>
                    <Text style={styles.detailValue}>{project?.project_name ? `${project.project_name} – ${client?.full_name || 'Cliente'}` : 'N/A'}</Text>
                    <Text style={styles.detailLabel}>UBICACIÓN:</Text>
                    <Text style={styles.detailValue}>{project?.project_location || 'N/A'}</Text>
                    <Text style={styles.detailLabel}>SUPERFICIE DE TERRENO:</Text>
                    <Text style={styles.detailValue}>{project?.land_surface_area ? `${project.land_surface_area} m²` : 'N/A'}</Text>
                    <Text style={styles.detailLabel}>ÁREA DE CONSTRUCCIÓN:</Text>
                    <Text style={styles.detailValue}>{project?.construction_area ? `${project.construction_area} m²` : 'N/A'}</Text>
                  </View>
                  <View style={styles.detailsRight}>
                    <Text style={styles.detailLabel}>CLIENTE:</Text>
                    <Text style={styles.detailValue}>{client?.full_name || 'N/A'}</Text>
                    <Text style={styles.detailLabel}>INICIO:</Text>
                    <Text style={styles.detailValue}>{project?.construction_start_date || 'N/A'}</Text>
                    <Text style={styles.detailLabel}>DURACIÓN:</Text>
                    <Text style={styles.detailValue}>{plan.months_count} meses</Text>
                  </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.financialSummary}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>SUBTOTAL</Text>
                    <Text style={styles.summaryValue}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(subtotal)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>DESCUENTOS</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>-{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(totalDescuentos)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>TOTAL</Text>
                    <Text style={styles.summaryValue}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(total)}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Main Integrated Content */}
            <View style={styles.mainContent}>
              {/* Partidas Section - Left Side */}
              <View style={styles.partidasSection}>
                {/* Table Header - Always show */}
                {renderTableHeader()}
                
                {/* Data Rows for this page */}
                {renderTableRows(pageLines, startIndex)}
                
                {/* Totals - Only on last gantt page */}
                {isLastGanttPage && renderTotals()}
              </View>

              {/* Cronograma Section - Right Side */}
              <View style={styles.cronogramaSection}>
                {/* Cronograma Header - Always show */}
                {renderCronogramaHeader()}
                
                {/* Timeline Rows and Reference Lines Container */}
                <View style={{ position: 'relative' }}>
                  {/* Timeline Rows for this page */}
                  {renderTimelineRows(pageLines, startIndex)}
                  
                  {/* Reference Lines Overlay - continuous across all rows */}
                  {renderReferenceLines(pageLines)}
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                DOVITA • Confidencial
              </Text>
              <Text style={styles.footerText}>Página {pageIndex + 1} de {totalPages}</Text>
              <Text style={styles.footerText}>Generado: {new Date().toLocaleDateString('es-MX')}</Text>
            </View>
          </Page>
        );
      })}

      {/* Matrix Page - Always last page */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.corporateHeader}>
          <View style={styles.companySection}>
            {renderCompanyLogo()}
          </View>
          <View style={styles.projectSection}>
            <Text style={styles.documentTitle}>MATRIZ NUMÉRICA MENSUAL</Text>
            <Text style={styles.projectInfo}>{project?.project_name || 'Proyecto'}</Text>
          </View>
        </View>

        <Text style={styles.matrixTitle}>Matriz Numérica de Flujo Mensual</Text>

        {/* Matrix Table */}
        <View style={styles.matrixTable}>
          {/* Headers */}
          <View style={styles.matrixHeaderRow}>
            <Text style={[styles.matrixHeaderCell, { width: '25%' }]}>CONCEPTO</Text>
            {months.map((month) => {
              const year = Math.floor(parseInt(month) / 100);
              const monthNum = parseInt(month) % 100;
              const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-MX', { month: 'short' });
              
              return (
                <Text key={month} style={[styles.matrixHeaderCell, { width: `${75/months.length}%` }]}>
                  {monthName.toUpperCase()} {year}
                </Text>
              );
            })}
          </View>

          {/* Matrix Rows with real calculations and overrides */}
          {[
            { label: 'Gasto en Obra (MXN)', key: 'gasto_obra' },
            { label: '% Avance Parcial', key: 'avance_parcial' },
            { label: '% Avance Acumulado', key: 'avance_acumulado' },
            { label: 'Ministraciones (MXN)', key: 'ministraciones' },
            { label: '% Inversión Acumulada', key: 'inversion_acumulada' },
            { label: 'Fecha Tentativa de Pago', key: 'fecha_pago' }
          ].map((row, rowIndex) => (
            <View key={row.key} style={[styles.matrixDataRow, rowIndex % 2 === 1 ? styles.matrixRowZebra : null]}>
              <Text style={[styles.matrixCell, styles.matrixLabelCell, { width: '25%' }]}>{row.label}</Text>
              {months.map((month, monthIndex) => {
                // Check for override
                const hasOverride = overrides.some(o => o.mes === parseInt(month, 10) && o.concepto === row.key);
                const override = overrides.find(o => o.mes === parseInt(month, 10) && o.concepto === row.key);
                
                // Calculate automatic values (same logic as MatrixSection)
                let automaticValue = 0;
                if (row.key === 'gasto_obra') {
                  // Calculate monthly expenditure based on activities
                  automaticValue = mayorLines.reduce((sum, line) => {
                    if (!line.activities || line.activities.length === 0) return sum;
                    
                    let activeWeeksInMonth = 0;
                    line.activities.forEach(activity => {
                      const cells = expandRangeToMonthWeekCells(
                        activity.start_month,
                        activity.start_week,
                        activity.end_month,
                        activity.end_week
                      );
                      activeWeeksInMonth += cells.filter(cell => cell.month === month).length;
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
                      return sum + proportionalAmount;
                    }
                    return sum;
                  }, 0);
                } else if (row.key === 'avance_parcial') {
                  // Calculate partial progress from gasto_obra
                  const gastoMensual = mayorLines.reduce((sum, line) => {
                    if (!line.activities || line.activities.length === 0) return sum;
                    
                    let activeWeeksInMonth = 0;
                    line.activities.forEach(activity => {
                      const cells = expandRangeToMonthWeekCells(
                        activity.start_month,
                        activity.start_week,
                        activity.end_month,
                        activity.end_week
                      );
                      activeWeeksInMonth += cells.filter(cell => cell.month === month).length;
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
                      return sum + proportionalAmount;
                    }
                    return sum;
                  }, 0);
                  automaticValue = subtotal > 0 ? (gastoMensual / subtotal) * 100 : 0;
                } else if (row.key === 'avance_acumulado') {
                  // Calculate cumulative progress up to this month
                  let cumulativeSpending = 0;
                  for (let i = 0; i <= monthIndex; i++) {
                    const monthToCalc = months[i];
                    const gastoMensual = mayorLines.reduce((sum, line) => {
                      if (!line.activities || line.activities.length === 0) return sum;
                      
                      let activeWeeksInMonth = 0;
                      line.activities.forEach(activity => {
                        const cells = expandRangeToMonthWeekCells(
                          activity.start_month,
                          activity.start_week,
                          activity.end_month,
                          activity.end_week
                        );
                        activeWeeksInMonth += cells.filter(cell => cell.month === monthToCalc).length;
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
                        return sum + proportionalAmount;
                      }
                      return sum;
                    }, 0);
                    cumulativeSpending += gastoMensual;
                  }
                  automaticValue = subtotal > 0 ? (cumulativeSpending / subtotal) * 100 : 0;
                } else {
                  // For ministraciones, inversion_acumulada, fecha_pago - no automatic value
                  automaticValue = 0;
                }
                
                // Use override value if exists, otherwise use automatic or default
                let cellValue = '';
                if (hasOverride && override) {
                  if (row.key === 'fecha_pago') {
                    let displayText = override.valor;
                    // Handle "none" value
                    if (displayText === 'none' || !displayText) {
                      displayText = '-';
                    } else {
                      // If it's a number, format as "Día X"
                      const numValue = parseInt(override.valor, 10);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 31) {
                        displayText = `Día ${numValue}`;
                      }
                    }
                    cellValue = displayText;
                  } else if (row.key.includes('avance') || row.key.includes('inversion')) {
                    cellValue = `${parseFloat(override.valor).toFixed(1)}%`;
                  } else {
                    cellValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(parseFloat(override.valor));
                  }
                } else {
                  // Use automatic values
                  if (row.key === 'fecha_pago') {
                    cellValue = '-';
                  } else if (row.key === 'gasto_obra') {
                    cellValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(automaticValue);
                  } else if (row.key.includes('avance')) {
                    cellValue = `${automaticValue.toFixed(1)}%`;
                  } else if (row.key === 'ministraciones') {
                    cellValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(0);
                  } else if (row.key === 'inversion_acumulada') {
                    cellValue = '0.0%';
                  }
                }
                
                return (
                  <Text key={`${row.key}-${month}`} style={[styles.matrixCell, { width: `${75/months.length}%` }]}>
                    {cellValue}{hasOverride ? '*' : ''}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.notes}>
          <Text style={styles.noteText}>
            * Las barras azules en el cronograma representan las semanas programadas de ejecución de cada partida.
          </Text>
          <Text style={styles.noteText}>
            * Valor editado manualmente - Los valores sin asterisco son calculados automáticamente desde el cronograma.
          </Text>
          <Text style={styles.noteText}>
            * Este documento es confidencial y de uso exclusivo para la gestión del proyecto.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DOVITA • Confidencial
          </Text>
          <Text style={styles.footerText}>Página {totalPages} de {totalPages}</Text>
          <Text style={styles.footerText}>Generado: {new Date().toLocaleDateString('es-MX')}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Export function that creates the PDF document
export const GanttPdfDocument = (props: GanttPdfContentProps) => {
  return <GanttPdfContent {...props} />;
};