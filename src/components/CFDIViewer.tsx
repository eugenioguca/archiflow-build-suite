import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentViewer } from "./DocumentViewer"
import { Download, Eye, FileText, Info } from "lucide-react"
import { getFileUrl } from "@/lib/fileUtils"

interface CFDIData {
  id: string
  uuid_fiscal: string
  rfc_emisor: string
  rfc_receptor: string
  fecha_emision: string
  subtotal: number
  iva: number
  total: number
  tipo_comprobante: string
  metodo_pago?: string
  forma_pago?: string
  uso_cfdi?: string
  serie?: string
  folio?: string
  conceptos?: any[]
  impuestos?: any
  file_path: string
  xml_content?: string
  status: string
  validation_status?: string
}

interface CFDIViewerProps {
  isOpen: boolean
  onClose: () => void
  cfdiData: CFDIData | null
}

export function CFDIViewer({ isOpen, onClose, cfdiData }: CFDIViewerProps) {
  const [showXML, setShowXML] = useState(false)
  const [xmlUrl, setXmlUrl] = useState<string>("")

  if (!cfdiData) return null

  const handleViewXML = async () => {
    try {
      const { url } = await getFileUrl(cfdiData.file_path, 'cfdi-documents')
      setXmlUrl(url)
      setShowXML(true)
    } catch (error) {
      console.error('Error getting XML URL:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      case 'pending': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getTipoComprobanteLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'I': 'Ingreso',
      'E': 'Egreso',
      'T': 'Traslado',
      'N': 'Nómina',
      'P': 'Pago'
    }
    return tipos[tipo] || tipo
  }

  return (
    <>
      <Dialog open={isOpen && !showXML} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CFDI - {cfdiData.uuid_fiscal}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-1">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(cfdiData.status)}>
                    {cfdiData.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {getTipoComprobanteLabel(cfdiData.tipo_comprobante)}
                  </Badge>
                  {cfdiData.validation_status && (
                    <Badge variant={cfdiData.validation_status === 'valid' ? 'default' : 'destructive'}>
                      {cfdiData.validation_status}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleViewXML}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver XML
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>

              {/* Información General */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">UUID</label>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{cfdiData.uuid_fiscal}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Emisión</label>
                    <p>{formatDate(cfdiData.fecha_emision)}</p>
                  </div>
                  {cfdiData.serie && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Serie</label>
                      <p>{cfdiData.serie}</p>
                    </div>
                  )}
                  {cfdiData.folio && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Folio</label>
                      <p>{cfdiData.folio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emisor y Receptor */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emisor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">RFC</label>
                        <p className="font-mono">{cfdiData.rfc_emisor}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Receptor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">RFC</label>
                        <p className="font-mono">{cfdiData.rfc_receptor}</p>
                      </div>
                      {cfdiData.uso_cfdi && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Uso CFDI</label>
                          <p>{cfdiData.uso_cfdi}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Importes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
                      <p className="text-lg font-semibold">{formatCurrency(cfdiData.subtotal)}</p>
                    </div>
                    <div className="text-center">
                      <label className="text-sm font-medium text-muted-foreground">IVA</label>
                      <p className="text-lg font-semibold">{formatCurrency(cfdiData.iva || 0)}</p>
                    </div>
                    <div className="text-center">
                      <label className="text-sm font-medium text-muted-foreground">Total</label>
                      <p className="text-xl font-bold text-primary">{formatCurrency(cfdiData.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Forma de Pago */}
              {(cfdiData.forma_pago || cfdiData.metodo_pago) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Forma de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    {cfdiData.forma_pago && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Forma de Pago</label>
                        <p>{cfdiData.forma_pago}</p>
                      </div>
                    )}
                    {cfdiData.metodo_pago && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Método de Pago</label>
                        <p>{cfdiData.metodo_pago}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Conceptos */}
              {cfdiData.conceptos && Array.isArray(cfdiData.conceptos) && cfdiData.conceptos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Conceptos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                       {cfdiData.conceptos.map((concepto: any, index: number) => (
                         <div key={`concepto-${concepto?.descripcion || 'concepto'}-${index}`} className="border rounded p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">Descripción:</span> {concepto?.descripcion || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Cantidad:</span> {concepto?.cantidad || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Valor Unitario:</span> {formatCurrency(concepto?.valorUnitario || 0)}
                            </div>
                            <div>
                              <span className="font-medium">Importe:</span> {formatCurrency(concepto?.importe || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* XML Viewer */}
      <DocumentViewer
        isOpen={showXML}
        onClose={() => setShowXML(false)}
        documentUrl={xmlUrl}
        documentName={`CFDI_${cfdiData.uuid_fiscal}.xml`}
        fileType="text/xml"
      />
    </>
  )
}