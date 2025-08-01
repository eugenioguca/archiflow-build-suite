import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface InvoiceTemplate {
  id: string;
  template_name: string;
  company_logo_url?: string;
  header_config: any;
  colors_config: any;
  fonts_config: any;
  layout_config: any;
  footer_config: any;
}

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  template: InvoiceTemplate;
}

export function InvoicePreview({ isOpen, onClose, template }: InvoicePreviewProps) {
  const {
    company_logo_url,
    header_config = {},
    colors_config = {},
    fonts_config = {},
    footer_config = {}
  } = template;

  const styles = {
    page: {
      fontFamily: fonts_config.body_font || 'Arial',
      fontSize: `${fonts_config.body_size || 12}px`,
      color: colors_config.text_color || '#1F2937',
      backgroundColor: colors_config.background_color || '#FFFFFF',
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '30px',
      borderBottom: `2px solid ${colors_config.primary_color || '#3B82F6'}`,
      paddingBottom: '20px'
    },
    logo: {
      maxHeight: header_config.logo_size === 'small' ? '60px' : 
                 header_config.logo_size === 'large' ? '120px' : '90px',
      maxWidth: '200px',
      objectFit: 'contain' as const
    },
    title: {
      fontSize: `${fonts_config.title_size || 24}px`,
      fontFamily: fonts_config.title_font || 'Arial',
      color: colors_config.primary_color || '#3B82F6',
      fontWeight: 'bold',
      margin: '0 0 10px 0'
    },
    subtitle: {
      fontSize: `${fonts_config.subtitle_size || 18}px`,
      fontFamily: fonts_config.subtitle_font || 'Arial',
      color: colors_config.secondary_color || '#64748B',
      margin: '0 0 20px 0'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '20px'
    },
    tableHeader: {
      backgroundColor: colors_config.primary_color || '#3B82F6',
      color: 'white',
      padding: '12px 8px',
      textAlign: 'left' as const,
      fontSize: '14px',
      fontWeight: 'bold'
    },
    tableCell: {
      padding: '10px 8px',
      borderBottom: `1px solid ${colors_config.secondary_color || '#64748B'}`,
      fontSize: '13px'
    },
    total: {
      backgroundColor: colors_config.primary_color || '#3B82F6',
      color: 'white',
      padding: '12px 8px',
      textAlign: 'right' as const,
      fontWeight: 'bold'
    },
    footer: {
      marginTop: '40px',
      textAlign: 'center' as const,
      padding: '20px',
      borderTop: `1px solid ${colors_config.secondary_color || '#64748B'}`,
      fontSize: '12px',
      color: colors_config.secondary_color || '#64748B'
    }
  };

  const sampleData = {
    folio: 'FAC-A-001-2024',
    fecha: new Date().toLocaleDateString('es-MX'),
    cliente: {
      razon_social: 'Ejemplo Cliente S.A. de C.V.',
      rfc: 'EJE010101000',
      domicilio: 'Av. Ejemplo 123, Col. Centro, CP 12345, Ciudad de México'
    },
    conceptos: [
      {
        cantidad: 1,
        descripcion: 'Servicios de consultoría especializada',
        precio_unitario: 15000.00,
        importe: 15000.00
      },
      {
        cantidad: 2,
        descripcion: 'Desarrollo de sistema personalizado',
        precio_unitario: 25000.00,
        importe: 50000.00
      }
    ],
    subtotal: 65000.00,
    iva: 10400.00,
    total: 75400.00
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista Previa - {template.template_name}</DialogTitle>
        </DialogHeader>
        
        <div style={styles.page} className="bg-white">
          {/* Header */}
          <div style={styles.header}>
            <div style={{ 
              order: header_config.logo_position === 'right' ? 2 : 0,
              flex: header_config.logo_position === 'center' ? '1' : 'none',
              textAlign: header_config.logo_position === 'center' ? 'center' : 'left'
            }}>
              {company_logo_url && header_config.show_logo && (
                <img 
                  src={company_logo_url} 
                  alt="Logo de la empresa" 
                  style={styles.logo}
                />
              )}
            </div>
            
            <div style={{ 
              order: header_config.company_info_position === 'left' ? 0 : 2,
              textAlign: 'right',
              flex: 1
            }}>
              <h1 style={styles.title}>FACTURA</h1>
              <div style={styles.subtitle}>
                <strong>Ejemplo Empresa S.A. de C.V.</strong><br />
                RFC: EMP010101000<br />
                Av. Empresa 456, Col. Corporativa<br />
                CP 54321, Ciudad de México
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            <Card className="p-4">
              <h3 style={{ ...styles.subtitle, margin: '0 0 10px 0' }}>Datos del Cliente</h3>
              <p style={{ margin: '5px 0' }}><strong>Razón Social:</strong> {sampleData.cliente.razon_social}</p>
              <p style={{ margin: '5px 0' }}><strong>RFC:</strong> {sampleData.cliente.rfc}</p>
              <p style={{ margin: '5px 0' }}><strong>Domicilio:</strong> {sampleData.cliente.domicilio}</p>
            </Card>
            
            <Card className="p-4">
              <h3 style={{ ...styles.subtitle, margin: '0 0 10px 0' }}>Datos de la Factura</h3>
              <p style={{ margin: '5px 0' }}><strong>Folio:</strong> {sampleData.folio}</p>
              <p style={{ margin: '5px 0' }}><strong>Fecha:</strong> {sampleData.fecha}</p>
              <p style={{ margin: '5px 0' }}><strong>Método de Pago:</strong> PUE</p>
              <p style={{ margin: '5px 0' }}><strong>Forma de Pago:</strong> Transferencia</p>
            </Card>
          </div>

          {/* Conceptos Table */}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Cantidad</th>
                <th style={styles.tableHeader}>Descripción</th>
                <th style={styles.tableHeader}>Precio Unitario</th>
                <th style={styles.tableHeader}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.conceptos.map((concepto, index) => (
                <tr key={index}>
                  <td style={styles.tableCell}>{concepto.cantidad}</td>
                  <td style={styles.tableCell}>{concepto.descripcion}</td>
                  <td style={styles.tableCell}>${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td style={styles.tableCell}>${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ textAlign: 'right', marginBottom: '30px' }}>
            <table style={{ ...styles.table, width: '300px', marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <td style={styles.tableCell}><strong>Subtotal:</strong></td>
                  <td style={styles.tableCell}>${sampleData.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style={styles.tableCell}><strong>IVA (16%):</strong></td>
                  <td style={styles.tableCell}>${sampleData.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style={styles.total}><strong>Total:</strong></td>
                  <td style={styles.total}><strong>${sampleData.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* QR Code placeholder */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              border: `2px dashed ${colors_config.secondary_color || '#64748B'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: colors_config.secondary_color || '#64748B'
            }}>
              Código QR
            </div>
            <div style={{ fontSize: '11px', color: colors_config.secondary_color || '#64748B' }}>
              <p><strong>UUID:</strong> A1B2C3D4-E5F6-7890-ABCD-EF1234567890</p>
              <p><strong>Certificado SAT:</strong> 30001000000400002495</p>
              <p><strong>Fecha de Certificación:</strong> {new Date().toLocaleString('es-MX')}</p>
            </div>
          </div>

          {/* Footer */}
          {footer_config.show_footer && (
            <div style={styles.footer}>
              <p>{footer_config.footer_text || 'Gracias por su preferencia'}</p>
              {footer_config.show_generation_date && (
                <p>Documento generado el {new Date().toLocaleString('es-MX')}</p>
              )}
              {footer_config.show_page_numbers && (
                <p>Página 1 de 1</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}