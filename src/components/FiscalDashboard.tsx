import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calculator, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  FileText,
  Calendar,
  Eye
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { CFDISearchPanel } from "./CFDISearchPanel"

interface FiscalMetrics {
  totalIngresos: number
  totalGastos: number
  totalIVA: number
  totalISR: number
  cfdisPendientes: number
  cfdisProcesados: number
  complementosPendientes: number
}

export function FiscalDashboard() {
  const [metrics, setMetrics] = useState<FiscalMetrics>({
    totalIngresos: 0,
    totalGastos: 0,
    totalIVA: 0,
    totalISR: 0,
    cfdisPendientes: 0,
    cfdisProcesados: 0,
    complementosPendientes: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchFiscalMetrics()
  }, [])

  const fetchFiscalMetrics = async () => {
    setIsLoading(true)
    try {
      const [
        ingresosResult,
        gastosResult,
        cfdiResult,
        complementosResult
      ] = await Promise.all([
        supabase.from('incomes').select('amount, tax_amount'),
        supabase.from('expenses').select('amount, tax_amount'),
        supabase.from('cfdi_documents').select('status, iva, isr, total'),
        supabase.from('payment_complements').select('status')
      ])

      const ingresos = ingresosResult.data || []
      const gastos = gastosResult.data || []
      const cfdis = cfdiResult.data || []
      const complementos = complementosResult.data || []

      const totalIngresos = ingresos.reduce((sum, item) => sum + (item.amount || 0), 0)
      const totalGastos = gastos.reduce((sum, item) => sum + (item.amount || 0), 0)
      const totalIVA = cfdis.reduce((sum, item) => sum + (item.iva || 0), 0)
      const totalISR = cfdis.reduce((sum, item) => sum + (item.isr || 0), 0)
      
      const cfdisProcesados = cfdis.filter(c => c.status === 'active').length
      const cfdisPendientes = cfdis.filter(c => c.status === 'pending').length
      const complementosPendientes = complementos.filter(c => c.status === 'pending').length

      setMetrics({
        totalIngresos,
        totalGastos,
        totalIVA,
        totalISR,
        cfdisPendientes,
        cfdisProcesados,
        complementosPendientes
      })
    } catch (error) {
      console.error('Error fetching fiscal metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const calculateIVABalance = () => {
    return metrics.totalIVA // Simplified calculation
  }

  const calculateISRBalance = () => {
    return metrics.totalISR // Simplified calculation
  }

  const getComplianceStatus = () => {
    const pendingRatio = metrics.cfdisPendientes / (metrics.cfdisProcesados + metrics.cfdisPendientes || 1)
    if (pendingRatio < 0.1) return { status: 'excellent', color: 'bg-green-500', label: 'Excelente' }
    if (pendingRatio < 0.3) return { status: 'good', color: 'bg-blue-500', label: 'Bueno' }
    if (pendingRatio < 0.5) return { status: 'warning', color: 'bg-yellow-500', label: 'Atención' }
    return { status: 'critical', color: 'bg-red-500', label: 'Crítico' }
  }

  const compliance = getComplianceStatus()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando métricas fiscales...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Fiscal</h2>
        <Button onClick={fetchFiscalMetrics} variant="outline">
          Actualizar Datos
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalIngresos)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gastos Totales</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalGastos)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IVA Acumulado</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateIVABalance())}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ISR Acumulado</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateISRBalance())}</p>
              </div>
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Estado de Cumplimiento Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado General</span>
                <Badge className={compliance.color}>{compliance.label}</Badge>
              </div>
              <Progress 
                value={(metrics.cfdisProcesados / (metrics.cfdisProcesados + metrics.cfdisPendientes || 1)) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {metrics.cfdisProcesados} procesados, {metrics.cfdisPendientes} pendientes
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CFDIs Procesados</span>
                <span className="text-sm font-bold">{metrics.cfdisProcesados}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Documentos validados</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pendientes</span>
                <span className="text-sm font-bold text-yellow-600">{metrics.cfdisPendientes}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Requieren atención</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="cfdi">CFDIs</TabsTrigger>
          <TabsTrigger value="taxes">Impuestos</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Flujo de Efectivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Ingresos</span>
                    <span className="font-bold text-green-600">+{formatCurrency(metrics.totalIngresos)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Gastos</span>
                    <span className="font-bold text-red-600">-{formatCurrency(metrics.totalGastos)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Flujo Neto</span>
                    <span className={`font-bold ${metrics.totalIngresos - metrics.totalGastos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(metrics.totalIngresos - metrics.totalGastos)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas Fiscales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.cfdisPendientes > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">{metrics.cfdisPendientes} CFDIs pendientes de procesar</span>
                    </div>
                  )}
                  
                  {metrics.complementosPendientes > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{metrics.complementosPendientes} complementos de pago pendientes</span>
                    </div>
                  )}

                  {metrics.cfdisPendientes === 0 && metrics.complementosPendientes === 0 && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Todo al corriente</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cfdi" className="space-y-4">
          <CFDISearchPanel />
        </TabsContent>

        <TabsContent value="taxes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>IVA por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>IVA Causado</span>
                    <span className="font-bold">{formatCurrency(metrics.totalIVA)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA Acreditable</span>
                    <span className="font-bold">$0.00</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="font-bold">IVA a Pagar</span>
                    <span className="font-bold text-red-600">{formatCurrency(calculateIVABalance())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ISR por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>ISR Retenido</span>
                    <span className="font-bold">{formatCurrency(metrics.totalISR)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagos Provisionales</span>
                    <span className="font-bold">$0.00</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="font-bold">Saldo a Favor</span>
                    <span className="font-bold text-green-600">{formatCurrency(calculateISRBalance())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cumplimiento Normativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{metrics.cfdisProcesados}</div>
                  <p className="text-sm text-muted-foreground">CFDIs Validados</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{metrics.cfdisPendientes}</div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">100%</div>
                  <p className="text-sm text-muted-foreground">Cobertura</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}