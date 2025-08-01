import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Calendar, FileText, Eye } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { CFDIViewer } from "./CFDIViewer"

interface CFDIDocument {
  id: string
  uuid_fiscal: string
  rfc_emisor: string
  rfc_receptor: string
  fecha_emision: string
  subtotal: number
  iva: number | null
  total: number
  tipo_comprobante: string
  status: string
  validation_status?: string | null
  file_path: string
  metodo_pago?: string | null
  forma_pago?: string | null
  uso_cfdi?: string | null
  serie?: string | null
  folio?: string | null
  conceptos?: any | null
  impuestos?: any | null
  xml_content?: string | null
  client_id?: string | null
  expense_id?: string | null
  income_id?: string | null
  supplier_id?: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export function CFDISearchPanel() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cfdiDocuments, setCfdiDocuments] = useState<CFDIDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<CFDIDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCFDI, setSelectedCFDI] = useState<CFDIDocument | null>(null)
  const [showCFDIViewer, setShowCFDIViewer] = useState(false)

  useEffect(() => {
    fetchCFDIDocuments()
  }, [])

  useEffect(() => {
    filterDocuments()
  }, [searchTerm, cfdiDocuments])

  const fetchCFDIDocuments = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('cfdi_documents')
        .select('*')
        .order('fecha_emision', { ascending: false })

      if (error) throw error
      setCfdiDocuments(data || [])
    } catch (error) {
      console.error('Error fetching CFDI documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterDocuments = () => {
    if (!searchTerm.trim()) {
      setFilteredDocuments(cfdiDocuments)
      return
    }

    const filtered = cfdiDocuments.filter(doc => 
      doc.uuid_fiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.rfc_emisor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.rfc_receptor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tipo_comprobante.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.serie && doc.serie.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.folio && doc.folio.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredDocuments(filtered)
  }

  const handleViewCFDI = (cfdi: CFDIDocument) => {
    setSelectedCFDI(cfdi)
    setShowCFDIViewer(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX')
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Búsqueda de Documentos CFDI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por UUID, RFC, Serie, Folio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Fechas
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredDocuments.length} de {cfdiDocuments.length} documentos
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando documentos...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((cfdi) => (
            <Card key={cfdi.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(cfdi.status)}>
                          {cfdi.status}
                        </Badge>
                        <Badge variant="outline">
                          {getTipoComprobanteLabel(cfdi.tipo_comprobante)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">UUID</p>
                      <p className="font-mono text-xs">{cfdi.uuid_fiscal}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Emisor</p>
                      <p className="font-medium">{cfdi.rfc_emisor}</p>
                      <p className="text-sm text-muted-foreground mt-1">Receptor</p>
                      <p className="font-medium">{cfdi.rfc_receptor}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Fecha</p>
                      <p className="font-medium">{formatDate(cfdi.fecha_emision)}</p>
                      {cfdi.serie && cfdi.folio && (
                        <>
                          <p className="text-sm text-muted-foreground mt-1">Serie-Folio</p>
                          <p className="font-medium">{cfdi.serie}-{cfdi.folio}</p>
                        </>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(cfdi.total)}</p>
                      <p className="text-sm text-muted-foreground">
                        Subtotal: {formatCurrency(cfdi.subtotal)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        IVA: {formatCurrency(cfdi.iva || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCFDI(cfdi)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDocuments.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No se encontraron documentos con ese criterio' : 'No hay documentos CFDI'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <CFDIViewer
        isOpen={showCFDIViewer}
        onClose={() => setShowCFDIViewer(false)}
        cfdiData={selectedCFDI}
      />
    </div>
  )
}