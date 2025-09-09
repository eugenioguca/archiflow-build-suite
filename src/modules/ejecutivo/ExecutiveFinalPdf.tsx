import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { FinalBudgetRow, FinalBudgetTotals } from './hooks/useExecutiveFinalBudget';

// Professional colors following Gantt v2 reference design
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
  danger: '#EF4444',       // Red for exceeded values
};

// PDF Styles following Gantt v2 design system
const styles = StyleSheet.create({
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  
  // Corporate header - matching Gantt v2
  corporateHeader: {
    backgroundColor: '#2D4B9A', // Blue matching the logo
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    marginBottom: 10,
  },
  
  // Company info - left side
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
  
  // Project info - right side
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
  },
  
  // KPI Section
  kpiSection: {
    flexDirection: 'row',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  
  kpiLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  kpiValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  
  kpiValueParametrico: {
    color: '#1e40af',
  },
  
  kpiValueEjecutivo: {
    color: '#334155',
  },
  
  kpiValuePositive: {
    color: '#16a34a',
  },
  
  kpiValueNegative: {
    color: '#dc2626',
  },
  
  // Table Section
  tableContainer: {
    flex: 1,
  },
  
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textAlign: 'center',
    padding: 2,
  },
  
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  
  tableRowResidual: {
    backgroundColor: '#f8fafc',
  },
  
  tableRowSubpartida: {
    paddingLeft: 8,
  },
  
  tableCell: {
    fontSize: 7,
    color: '#334155',
    padding: 2,
    textAlign: 'left',
  },
  
  tableCellCenter: {
    textAlign: 'center',
  },
  
  tableCellRight: {
    textAlign: 'right',
  },
  
  tableCellBold: {
    fontFamily: 'Helvetica-Bold',
  },
  
  // Column widths (percentages)
  colDepartamento: { width: '12%' },
  colMayor: { width: '15%' },
  colPartida: { width: '15%' },
  colSubpartida: { width: '20%' },
  colUnidad: { width: '8%' },
  colCantidad: { width: '8%' },
  colPrecio: { width: '10%' },
  colImporte: { width: '10%' },
  colOrigen: { width: '12%' },
  
  // Badge styles
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  
  badgeDentro: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  
  badgeExcedido: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
  },
  
  badgeSubpartida: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  
  footerText: {
    fontSize: 7,
    color: '#64748b',
  },
  
  // Utility classes
  subpartidaIndent: {
    marginLeft: 8,
  },
  
  currencyText: {
    fontFamily: 'Helvetica',
  },
});

interface ExecutiveFinalPdfProps {
  rows: FinalBudgetRow[];
  totals: FinalBudgetTotals;
  companySettings?: {
    company_name: string;
    logo_url?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  clientName: string;
  projectName: string;
  projectData?: {
    location?: string;
    constructionArea?: number;
    landArea?: number;
    startDate?: string;
  };
  filters?: {
    searchTerm?: string;
    departmentFilter?: string;
    statusFilter?: string;
    groupByMayor?: boolean;
  };
  groupByMayor?: boolean;
  groupedData?: Map<string, { mayor: string, rows: FinalBudgetRow[], total: number }>;
}

const formatCurrency = (amount: number): string => {
  return `$${Math.abs(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
};

export function ExecutiveFinalPdf({ 
  rows, 
  totals, 
  companySettings, 
  clientName, 
  projectName, 
  projectData,
  filters,
  groupByMayor = false,
  groupedData
}: ExecutiveFinalPdfProps) {
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Function to render company logo - same approach as Gantt PDF
  const renderCompanyLogo = () => {
    // Use the same logo that works in Gantt PDF
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
        <Text style={styles.companyName}>
          {companySettings?.company_name || 'DOVITA CONSTRUCCIONES'}
        </Text>
      );
    }
  };

  // Group rows by partida for better page breaks
  const groupedRows = rows.reduce((acc, row) => {
    const key = `${row.mayor_id}-${row.partida_id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {} as Record<string, FinalBudgetRow[]>);

  const renderTableHeader = () => (
    <View style={styles.tableHeader} fixed>
      <Text style={[styles.tableHeaderCell, styles.colDepartamento]}>Departamento</Text>
      <Text style={[styles.tableHeaderCell, styles.colMayor]}>Mayor</Text>
      <Text style={[styles.tableHeaderCell, styles.colPartida]}>Partida</Text>
      <Text style={[styles.tableHeaderCell, styles.colSubpartida]}>Subpartida</Text>
      <Text style={[styles.tableHeaderCell, styles.colUnidad]}>Unidad</Text>
      <Text style={[styles.tableHeaderCell, styles.colCantidad]}>Cantidad</Text>
      <Text style={[styles.tableHeaderCell, styles.colPrecio]}>P.U.</Text>
      <Text style={[styles.tableHeaderCell, styles.colImporte]}>Importe</Text>
      <Text style={[styles.tableHeaderCell, styles.colOrigen]}>Origen</Text>
    </View>
  );

  const renderTableRow = (row: FinalBudgetRow) => {
    const isResidual = row.tipo === 'residual';
    const isSubpartida = row.tipo === 'subpartida';

    return (
      <View 
        key={row.id} 
        style={[
          styles.tableRow, 
          isResidual && styles.tableRowResidual,
          isSubpartida && styles.tableRowSubpartida
        ]}
      >
        <Text style={[styles.tableCell, styles.colDepartamento]}>{row.departamento}</Text>
        <View style={[styles.colMayor, { padding: 2 }]}>
          <Text style={[styles.tableCell, styles.tableCellBold]}>{row.mayor_nombre}</Text>
          <Text style={[styles.tableCell, { fontSize: 6, color: '#64748b' }]}>{row.mayor_codigo}</Text>
        </View>
        <View style={[styles.colPartida, { padding: 2 }]}>
          <Text style={[styles.tableCell, styles.tableCellBold]}>{row.partida_nombre}</Text>
          <Text style={[styles.tableCell, { fontSize: 6, color: '#64748b' }]}>{row.partida_codigo}</Text>
        </View>
        <View style={[styles.colSubpartida, { padding: 2 }]}>
          {row.subpartida_nombre ? (
            <>
              <Text style={[styles.tableCell, isSubpartida && styles.subpartidaIndent]}>
                {isSubpartida ? '├─ ' : ''}{row.subpartida_nombre}
              </Text>
              {row.subpartida_codigo && (
                <Text style={[styles.tableCell, { fontSize: 6, color: '#64748b' }, isSubpartida && styles.subpartidaIndent]}>
                  {row.subpartida_codigo}
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.tableCell, styles.tableCellCenter]}>—</Text>
          )}
        </View>
        <Text style={[styles.tableCell, styles.tableCellCenter, styles.colUnidad]}>
          {row.unidad || '—'}
        </Text>
        <Text style={[styles.tableCell, styles.tableCellCenter, styles.colCantidad]}>
          {row.cantidad ? row.cantidad.toLocaleString('es-MX') : '—'}
        </Text>
        <Text style={[styles.tableCell, styles.tableCellRight, styles.colPrecio, styles.currencyText]}>
          {row.precio_unitario ? formatCurrency(row.precio_unitario) : '—'}
        </Text>
        <Text style={[
          styles.tableCell, 
          styles.tableCellRight, 
          styles.tableCellBold, 
          styles.colImporte, 
          styles.currencyText,
          isResidual && row.estado === 'excedido' && { color: '#dc2626' },
          isResidual && row.estado === 'dentro' && row.importe > 0 && { color: '#16a34a' }
        ]}>
          {formatCurrency(row.importe)}
        </Text>
        <View style={[styles.colOrigen, { padding: 2, alignItems: 'center' }]}>
          <Text style={[
            styles.badge,
            isResidual && row.estado === 'excedido' && styles.badgeExcedido,
            isResidual && row.estado === 'dentro' && styles.badgeDentro,
            isSubpartida && styles.badgeSubpartida
          ]}>
            {isResidual 
              ? (row.estado === 'excedido' ? 'Excedido' : 'Residual')
              : 'Subpartida'
            }
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Corporate Header - matching Gantt v2 */}
        <View style={styles.corporateHeader}>
          <View style={styles.companySection}>
            {renderCompanyLogo()}
            <Text style={styles.companyContact}>
              {companySettings?.website || 'www.dovita.com'} | {companySettings?.email || 'info@dovita.com'} | {companySettings?.phone || '(555) 123-4567'}
              {'\n'}{companySettings?.address || 'Dirección de la empresa'}
            </Text>
          </View>
          
          <View style={styles.projectSection}>
            <Text style={styles.documentTitle}>PRESUPUESTO EJECUTIVO</Text>
            <Text style={styles.documentTitle}>VISTA FINAL</Text>
            <Text style={styles.projectInfo}>Fecha: {today}</Text>
            <Text style={styles.projectInfo}>Sistema ERP v2.0</Text>
          </View>
        </View>

        {/* Project Details Section */}
        <View style={styles.projectDetails}>
          <View style={styles.detailsLeft}>
            <Text style={styles.detailLabel}>CLIENTE</Text>
            <Text style={styles.detailValue}>{clientName}</Text>
            <Text style={styles.detailLabel}>PROYECTO</Text>
            <Text style={styles.detailValue}>{projectName}</Text>
            {projectData?.location && (
              <>
                <Text style={styles.detailLabel}>UBICACIÓN</Text>
                <Text style={styles.detailValue}>{projectData.location}</Text>
              </>
            )}
          </View>
          <View style={styles.detailsRight}>
            {projectData?.constructionArea && (
              <>
                <Text style={styles.detailLabel}>ÁREA DE CONSTRUCCIÓN</Text>
                <Text style={styles.detailValue}>{projectData.constructionArea} m²</Text>
              </>
            )}
            {projectData?.landArea && (
              <>
                <Text style={styles.detailLabel}>SUPERFICIE DE TERRENO</Text>
                <Text style={styles.detailValue}>{projectData.landArea} m²</Text>
              </>
            )}
            {projectData?.startDate && (
              <>
                <Text style={styles.detailLabel}>FECHA DE INICIO</Text>
                <Text style={styles.detailValue}>{new Date(projectData.startDate).toLocaleDateString('es-MX')}</Text>
              </>
            )}
            {filters?.searchTerm && (
              <>
                <Text style={styles.detailLabel}>FILTROS APLICADOS</Text>
                <Text style={styles.detailValue}>"{filters.searchTerm}"</Text>
              </>
            )}
          </View>
        </View>

        {/* KPI Summary */}
        <View style={styles.kpiSection}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Paramétrico</Text>
            <Text style={[styles.kpiValue, styles.kpiValueParametrico]}>
              {formatCurrency(totals.totalParametrico)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Ejecutivo</Text>
            <Text style={[styles.kpiValue, styles.kpiValueEjecutivo]}>
              {formatCurrency(totals.totalEjecutivo)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Residual</Text>
            <Text style={[
              styles.kpiValue, 
              totals.totalResidual >= 0 ? styles.kpiValuePositive : styles.kpiValueNegative
            ]}>
              {formatCurrency(totals.totalResidual)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Diferencia</Text>
            <Text style={[
              styles.kpiValue,
              Math.abs(totals.diferencia) < 0.01 ? styles.kpiValuePositive : styles.kpiValueNegative
            ]}>
              {formatCurrency(totals.diferencia)}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          {renderTableHeader()}
          
          {Object.entries(groupedRows).map(([groupKey, groupRows], groupIndex) => (
            <View key={groupKey} wrap={false}>
              {groupRows.map(renderTableRow)}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento confidencial - {companySettings?.company_name || 'DOVITA CONSTRUCCIONES'}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => 
            `Página ${pageNumber} de ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
}