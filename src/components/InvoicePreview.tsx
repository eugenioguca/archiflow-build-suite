import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, FileText, Calendar, Building, Mail, Phone } from 'lucide-react';

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

  // Modern blue color palette
  const primaryColor = colors_config.primary_color || '#2563EB'; // Blue-600
  const secondaryColor = colors_config.secondary_color || '#3B82F6'; // Blue-500  
  const accentColor = colors_config.accent_color || '#1E40AF'; // Blue-700
  const lightBlue = '#EFF6FF'; // Blue-50
  const mediumBlue = '#DBEAFE'; // Blue-100
  const textColor = colors_config.text_color || '#1E293B';
  const backgroundColor = colors_config.background_color || '#FFFFFF';

  // Preview data - Replace with actual invoice data from props
  const previewData = {
    folio: 'PREV-001-2024',
    fecha: new Date().toLocaleDateString('es-MX'),
    serie: 'PREV',
    numero: '001',
    cliente: {
      razon_social: 'Vista Previa - Cliente',
      rfc: 'PREV01010000',
      domicilio: 'Vista previa del domicilio',
      ciudad: 'Ciudad, CP 00000',
      email: 'preview@template.com',
      telefono: '+52 00 0000-0000'
    },
    conceptos: [
      {
        cantidad: 1,
        descripcion: 'Concepto de vista previa 1',
        precio_unitario: 1000.00,
        importe: 1000.00
      },
      {
        cantidad: 1,
        descripcion: 'Concepto de vista previa 2',
        precio_unitario: 2000.00,
        importe: 2000.00
      }
    ],
    subtotal: 3000.00,
    iva: 480.00,
    total: 3480.00
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Vista Previa - {template.template_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <div 
            className="bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-100"
            style={{
              fontFamily: fonts_config.body_font || "'Inter', sans-serif",
              fontSize: `${fonts_config.body_size || 14}px`,
              color: textColor,
              maxWidth: '900px',
              margin: '0 auto'
            }}
          >
            {/* Modern Header with Gradient */}
            <div 
              className="relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                padding: '2rem'
              }}
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              
              <div className="relative z-10 flex justify-between items-start text-white">
                <div className="flex items-center space-x-6">
                  {company_logo_url && header_config.show_logo && (
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 shadow-xl">
                      <img 
                        src={company_logo_url} 
                        alt="Logo de la empresa" 
                        className="max-h-16 w-auto filter brightness-0 invert"
                      />
                    </div>
                  )}
                  <div>
                    <h1 
                      style={{
                        fontSize: `${fonts_config.title_size || 32}px`,
                        fontFamily: fonts_config.title_font || "'Inter', sans-serif",
                        fontWeight: '800',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      FACTURA
                    </h1>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                        {previewData.serie}-{previewData.numero}
                      </Badge>
                      <span className="text-white/90 font-medium">
                        {previewData.folio}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-white/15 backdrop-blur-md rounded-lg p-4 shadow-xl">
                    <h2 className="text-xl font-bold mb-2">Ejemplo Empresa S.A. de C.V.</h2>
                    <div className="text-sm text-white/90 space-y-1">
                      <p className="font-semibold">RFC: EMP010101000</p>
                      <p>Av. Empresa 456, Col. Corporativa</p>
                      <p>CP 54321, Ciudad de México</p>
                      <div className="flex items-center justify-end space-x-2 mt-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-xs">facturacion@ejemplo.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 space-y-8">
              {/* Client and Invoice Info Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900">Datos del Cliente</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Razón Social</p>
                        <p className="font-semibold text-gray-900">{previewData.cliente.razon_social}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">RFC</p>
                        <p className="font-mono font-semibold text-gray-900">{previewData.cliente.rfc}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Domicilio</p>
                        <p className="text-gray-800">{previewData.cliente.domicilio}</p>
                        <p className="text-gray-800">{previewData.cliente.ciudad}</p>
                      </div>
                      <div className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{previewData.cliente.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{previewData.cliente.telefono}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-25">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-700" />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900">Información Fiscal</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Fecha de Emisión</p>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <p className="font-semibold text-gray-900">{previewData.fecha}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Serie y Folio</p>
                        <p className="font-mono font-semibold text-gray-900">{previewData.folio}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Método de Pago</p>
                        <Badge variant="outline" className="mt-1 border-blue-300 text-blue-700">PUE - Pago en una sola exhibición</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Forma de Pago</p>
                        <Badge variant="outline" className="mt-1 border-blue-300 text-blue-700">03 - Transferencia electrónica</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Modern Concepts Table */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <div 
                  className="px-6 py-4 text-white font-bold"
                  style={{
                    background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`
                  }}
                >
                  <h3 className="text-lg">Conceptos Facturados</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Cant.</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Descripción</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Precio Unit.</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.conceptos.map((concepto, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">{concepto.cantidad}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{concepto.descripcion}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-mono font-medium text-gray-900">
                              ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-mono font-bold text-gray-900">
                              ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Modern Totals Section */}
              <div className="flex justify-end">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white w-full max-w-md">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Subtotal:</span>
                        <span className="font-mono text-lg font-semibold">
                          ${previewData.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">IVA (16%):</span>
                        <span className="font-mono text-lg font-semibold text-blue-600">
                          ${previewData.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="border-t pt-4">
                        <div 
                          className="flex justify-between items-center text-white p-4 rounded-lg shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`
                          }}
                        >
                          <span className="text-xl font-bold">TOTAL:</span>
                          <span className="text-2xl font-mono font-bold">
                            ${previewData.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* QR Code and Fiscal Data */}
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 via-blue-25 to-blue-50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start space-x-8">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-white shadow-inner"
                        style={{ borderColor: secondaryColor }}
                      >
                        <QrCode className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Código QR</h4>
                        <p className="text-sm text-gray-600">Escanea para verificar</p>
                        <p className="text-sm text-gray-600">la autenticidad del CFDI</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 max-w-md">
                      <h4 className="font-bold text-gray-900 mb-3">Información Fiscal</h4>
                      <div className="space-y-2 text-sm">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-gray-600">UUID Fiscal:</p>
                          <p className="font-mono text-xs text-gray-800 break-all">A1B2C3D4-E5F6-7890-ABCD-EF1234567890</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-gray-600">Certificado SAT:</p>
                          <p className="font-mono text-gray-800">30001000000400002495</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-gray-600">Fecha de Certificación:</p>
                          <p className="text-gray-800">{new Date().toLocaleString('es-MX')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Modern Footer */}
            {footer_config.show_footer && (
              <div 
                className="text-center py-6 text-white"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}dd, ${accentColor}dd)`
                }}
              >
                <div className="bg-white/10 backdrop-blur-sm mx-8 rounded-lg p-4">
                  <p className="font-medium text-lg">
                    {footer_config.footer_text || 'Gracias por su preferencia'}
                  </p>
                  <div className="flex justify-center space-x-6 mt-2 text-sm text-white/90">
                    {footer_config.show_generation_date && (
                      <p>Generado: {new Date().toLocaleString('es-MX')}</p>
                    )}
                    {footer_config.show_page_numbers && (
                      <p>Página 1 de 1</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}