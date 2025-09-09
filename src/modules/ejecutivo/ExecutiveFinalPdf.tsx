import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { FinalBudgetRow, FinalBudgetTotals } from './hooks/useExecutiveFinalBudget';

// PDF Styles consistent with Gantt v2
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  
  // Header Section
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  
  headerLeft: {
    flex: 1,
    paddingRight: 20,
  },
  
  headerRight: {
    flex: 1,
    paddingLeft: 20,
  },
  
  logo: {
    width: 120,
    height: 'auto',
    marginBottom: 10,
  },
  
  companyInfo: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.4,
  },
  
  titleSection: {
    alignItems: 'flex-end',
  },
  
  mainTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 5,
    textAlign: 'right',
  },
  
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 2,
  },
  
  projectInfo: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  
  projectTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 6,
  },
  
  projectDetail: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
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
  filters?: {
    searchTerm?: string;
    departmentFilter?: string;
    statusFilter?: string;
  };
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
  filters 
}: ExecutiveFinalPdfProps) {
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {companySettings?.logo_url && (
              <Image style={styles.logo} src={companySettings.logo_url} />
            )}
            <Text style={styles.companyInfo}>
              {companySettings?.company_name || 'DOVITA CONSTRUCCIONES'}{'\n'}
              {companySettings?.website || 'www.dovita.com'}{'\n'}
              {companySettings?.email || 'info@dovita.com'}{'\n'}
              {companySettings?.phone || '(555) 123-4567'}{'\n'}
              {companySettings?.address || 'Dirección de la empresa'}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>PRESUPUESTO EJECUTIVO</Text>
              <Text style={styles.mainTitle}>VISTA FINAL</Text>
              <Text style={styles.subtitle}>Fecha: {today}</Text>
              <Text style={styles.subtitle}>Sistema ERP v2.0</Text>
            </View>
          </View>
        </View>

        {/* Project Info */}
        <View style={styles.projectInfo}>
          <Text style={styles.projectTitle}>Información del Proyecto</Text>
          <Text style={styles.projectDetail}>Cliente: {clientName}</Text>
          <Text style={styles.projectDetail}>Proyecto: {projectName}</Text>
          {filters?.searchTerm && (
            <Text style={styles.projectDetail}>Filtros aplicados: "{filters.searchTerm}"</Text>
          )}
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