import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import * as XLSX from 'xlsx'

interface ChartOfAccountsExcelManagerProps {
  onImportComplete?: () => void
}

interface ImportResult {
  success: boolean
  errors: string[]
  mayores_inserted: number
  partidas_inserted: number
  subpartidas_inserted: number
  total_rows: number
}

export function ChartOfAccountsExcelManager({ onImportComplete }: ChartOfAccountsExcelManagerProps) {
  const [importing, setImporting] = useState(false)
  const [exportingTemplate, setExportingTemplate] = useState(false)
  const [exportingTemplateWithData, setExportingTemplateWithData] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const { toast } = useToast()

  const departamentos = [
    { value: "ventas", label: "Ventas" },
    { value: "diseño", label: "Diseño" },
    { value: "construccion", label: "Construcción" },
    { value: "finanzas", label: "Finanzas" },
    { value: "contabilidad", label: "Contabilidad" },
    { value: "recursos_humanos", label: "Recursos Humanos" },
    { value: "direccion_general", label: "Dirección General" },
  ]

  const downloadTemplate = async () => {
    setExportingTemplate(true)
    try {
      const wb = XLSX.utils.book_new()

      // Mayores template
      const mayoresData = [
        ["Departamento", "Código", "Nombre", "Activo"],
        ["ventas", "VEN001", "Ejemplo Mayor Ventas", "true"],
        ["diseño", "DIS001", "Ejemplo Mayor Diseño", "true"],
        ["construccion", "CON001", "Ejemplo Mayor Construcción", "true"]
      ]
      const mayoresWs = XLSX.utils.aoa_to_sheet(mayoresData)
      XLSX.utils.book_append_sheet(wb, mayoresWs, "Mayores")

      // Partidas template
      const partidasData = [
        ["Código Mayor", "Código", "Nombre", "Activo"],
        ["VEN001", "VEN001-001", "Ejemplo Partida Ventas", "true"],
        ["DIS001", "DIS001-001", "Ejemplo Partida Diseño", "true"],
        ["CON001", "CON001-001", "Ejemplo Partida Construcción", "true"]
      ]
      const partidasWs = XLSX.utils.aoa_to_sheet(partidasData)
      XLSX.utils.book_append_sheet(wb, partidasWs, "Partidas")

      // Subpartidas template
      const subpartidasData = [
        ["Código Partida", "Código", "Nombre", "Es Global", "Departamento Aplicable", "Activo"],
        ["VEN001-001", "VEN001-001-001", "Ejemplo Subpartida Ventas", "false", "", "true"],
        ["DIS001-001", "DIS001-001-001", "Ejemplo Subpartida Diseño", "false", "", "true"],
        ["CON001-001", "CON001-001-001", "Ejemplo Subpartida Construcción", "false", "", "true"]
      ]
      const subpartidasWs = XLSX.utils.aoa_to_sheet(subpartidasData)
      XLSX.utils.book_append_sheet(wb, subpartidasWs, "Subpartidas")

      // Global Construction Subpartidas template
      const globalSubpartidasData = [
        ["Código", "Nombre", "Departamento Aplicable", "Activo"],
        ["CON-GLOBAL-001", "Material de Construcción", "construccion", "true"],
        ["CON-GLOBAL-002", "Mano de Obra", "construccion", "true"],
        ["CON-GLOBAL-003", "Equipo y Herramientas", "construccion", "true"]
      ]
      const globalSubpartidasWs = XLSX.utils.aoa_to_sheet(globalSubpartidasData)
      XLSX.utils.book_append_sheet(wb, globalSubpartidasWs, "Globales Construcción")

      // Departamentos reference
      const departamentosData = [
        ["Departamentos Disponibles"],
        ...departamentos.map(dept => [dept.value])
      ]
      const departamentosWs = XLSX.utils.aoa_to_sheet(departamentosData)
      XLSX.utils.book_append_sheet(wb, departamentosWs, "Referencia Departamentos")

      const fileName = `Template_Catalogo_Cuentas_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Template descargado",
        description: "El template de Excel ha sido descargado exitosamente.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al generar el template: " + error.message,
        variant: "destructive",
      })
    } finally {
      setExportingTemplate(false)
    }
  }

  const downloadTemplateWithData = async () => {
    setExportingTemplateWithData(true)
    try {
      // Fetch existing data
      const { data: mayores } = await supabase
        .from('chart_of_accounts_mayor')
        .select('*')
        .order('codigo')

      const { data: partidas } = await supabase
        .from('chart_of_accounts_partidas')
        .select('*, chart_of_accounts_mayor(codigo)')
        .order('codigo')

      const { data: subpartidas } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('*, chart_of_accounts_partidas(codigo)')
        .order('codigo')

      const wb = XLSX.utils.book_new()

      // Mayores with data
      const mayoresData = [
        ["Departamento", "Código", "Nombre", "Activo"],
        ...(mayores?.map(mayor => [
          mayor.departamento,
          mayor.codigo,
          mayor.nombre,
          mayor.activo.toString()
        ]) || [])
      ]
      const mayoresWs = XLSX.utils.aoa_to_sheet(mayoresData)
      XLSX.utils.book_append_sheet(wb, mayoresWs, "Mayores")

      // Partidas with data
      const partidasData = [
        ["Código Mayor", "Código", "Nombre", "Activo"],
        ...(partidas?.map(partida => [
          partida.chart_of_accounts_mayor?.codigo || "",
          partida.codigo,
          partida.nombre,
          partida.activo.toString()
        ]) || [])
      ]
      const partidasWs = XLSX.utils.aoa_to_sheet(partidasData)
      XLSX.utils.book_append_sheet(wb, partidasWs, "Partidas")

      // Subpartidas with data
      const subpartidasData = [
        ["Código Partida", "Código", "Nombre", "Es Global", "Departamento Aplicable", "Activo"],
        ...(subpartidas?.map(subpartida => [
          subpartida.chart_of_accounts_partidas?.codigo || "",
          subpartida.codigo,
          subpartida.nombre,
          (subpartida as any).es_global?.toString() || "false",
          (subpartida as any).departamento_aplicable || "",
          subpartida.activo.toString()
        ]) || [])
      ]
      const subpartidasWs = XLSX.utils.aoa_to_sheet(subpartidasData)
      XLSX.utils.book_append_sheet(wb, subpartidasWs, "Subpartidas")

      // Global subpartidas with data
      const { data: globalSubpartidas } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('*')
        .eq('es_global', true)
        .order('codigo')

      const globalSubpartidasData = [
        ["Código", "Nombre", "Departamento Aplicable", "Activo"],
        ...(globalSubpartidas?.map(subpartida => [
          subpartida.codigo,
          subpartida.nombre,
          subpartida.departamento_aplicable || "",
          subpartida.activo.toString()
        ]) || [])
      ]
      const globalSubpartidasWs = XLSX.utils.aoa_to_sheet(globalSubpartidasData)
      XLSX.utils.book_append_sheet(wb, globalSubpartidasWs, "Globales Construcción")

      // Departamentos reference
      const departamentosData = [
        ["Departamentos Disponibles"],
        ...departamentos.map(dept => [dept.value])
      ]
      const departamentosWs = XLSX.utils.aoa_to_sheet(departamentosData)
      XLSX.utils.book_append_sheet(wb, departamentosWs, "Referencia Departamentos")

      const fileName = `Catalogo_Cuentas_Con_Datos_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Template con información descargado",
        description: "El template de Excel con toda la información existente ha sido descargado exitosamente.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al generar el template con información: " + error.message,
        variant: "destructive",
      })
    } finally {
      setExportingTemplateWithData(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      
      const errors: string[] = []
      let mayoresInserted = 0
      let partidasInserted = 0
      let subpartidasInserted = 0

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!profile) {
        throw new Error("No se pudo obtener el perfil del usuario")
      }

      // Process Mayores sheet
      if (workbook.SheetNames.includes('Mayores')) {
        const mayoresSheet = workbook.Sheets['Mayores']
        const mayoresJsonData = XLSX.utils.sheet_to_json(mayoresSheet, { header: 1 })

        if (mayoresJsonData.length > 1) {
          for (let i = 1; i < mayoresJsonData.length; i++) {
            const row = mayoresJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
                const { error } = await supabase
                  .from('chart_of_accounts_mayor')
                  .insert({
                    departamento: row[0].toString().trim(),
                    codigo: row[1].toString().trim(),
                    nombre: row[2].toString().trim(),
                    activo: row[3]?.toString().toLowerCase() === 'true',
                    created_by: profile.id
                  })

                if (error) {
                  errors.push(`Error en Mayor fila ${i + 1}: ${error.message}`)
                } else {
                  mayoresInserted++
                }
              } catch (error: any) {
                errors.push(`Error en Mayor fila ${i + 1}: ${error.message}`)
              }
            }
          }
        }
      }

      // Process Partidas sheet
      if (workbook.SheetNames.includes('Partidas')) {
        const partidasSheet = workbook.Sheets['Partidas']
        const partidasJsonData = XLSX.utils.sheet_to_json(partidasSheet, { header: 1 })

        if (partidasJsonData.length > 1) {
          for (let i = 1; i < partidasJsonData.length; i++) {
            const row = partidasJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
                // Find mayor by codigo
                const { data: mayor } = await supabase
                  .from('chart_of_accounts_mayor')
                  .select('id')
                  .eq('codigo', row[0].toString().trim())
                  .single()

                if (!mayor) {
                  errors.push(`Error en Partida fila ${i + 1}: No se encontró Mayor con código ${row[0]}`)
                  continue
                }

                const { error } = await supabase
                  .from('chart_of_accounts_partidas')
                  .insert({
                    mayor_id: mayor.id,
                    codigo: row[1].toString().trim(),
                    nombre: row[2].toString().trim(),
                    activo: row[3]?.toString().toLowerCase() === 'true',
                    created_by: profile.id
                  })

                if (error) {
                  errors.push(`Error en Partida fila ${i + 1}: ${error.message}`)
                } else {
                  partidasInserted++
                }
              } catch (error: any) {
                errors.push(`Error en Partida fila ${i + 1}: ${error.message}`)
              }
            }
          }
        }
      }

      // Process Subpartidas sheet
      if (workbook.SheetNames.includes('Subpartidas')) {
        const subpartidasSheet = workbook.Sheets['Subpartidas']
        const subpartidasJsonData = XLSX.utils.sheet_to_json(subpartidasSheet, { header: 1 })

        if (subpartidasJsonData.length > 1) {
          for (let i = 1; i < subpartidasJsonData.length; i++) {
            const row = subpartidasJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
                // Find partida by codigo
                const { data: partida } = await supabase
                  .from('chart_of_accounts_partidas')
                  .select('id')
                  .eq('codigo', row[0].toString().trim())
                  .single()

                if (!partida) {
                  errors.push(`Error en Subpartida fila ${i + 1}: No se encontró Partida con código ${row[0]}`)
                  continue
                }

                const esGlobal = row[3]?.toString().toLowerCase() === 'true'
                const departamentoAplicable = row[4]?.toString().trim() || null
                const activo = row[5]?.toString().toLowerCase() === 'true'

                const { error } = await supabase
                  .from('chart_of_accounts_subpartidas')
                  .insert({
                    partida_id: partida.id,
                    codigo: row[1].toString().trim(),
                    nombre: row[2].toString().trim(),
                    es_global: esGlobal,
                    departamento_aplicable: departamentoAplicable,
                    activo: activo,
                    created_by: profile.id
                  })

                if (error) {
                  errors.push(`Error en Subpartida fila ${i + 1}: ${error.message}`)
                } else {
                  subpartidasInserted++
                }
              } catch (error: any) {
                errors.push(`Error en Subpartida fila ${i + 1}: ${error.message}`)
              }
            }
          }
        }
      }

      // Process Global Construction Subpartidas sheet
      if (workbook.SheetNames.includes('Globales Construcción')) {
        const globalSheet = workbook.Sheets['Globales Construcción']
        const globalJsonData = XLSX.utils.sheet_to_json(globalSheet, { header: 1 })

        if (globalJsonData.length > 1) {
          for (let i = 1; i < globalJsonData.length; i++) {
            const row = globalJsonData[i] as any[]
            if (row.length >= 3 && row[0] && row[1] && row[2]) {
              try {
                const { error } = await supabase
                  .from('chart_of_accounts_subpartidas')
                  .insert({
                    partida_id: null, // Global subpartidas don't belong to a specific partida
                    codigo: row[0].toString().trim(),
                    nombre: row[1].toString().trim(),
                    es_global: true,
                    departamento_aplicable: row[2].toString().trim(),
                    activo: row[3]?.toString().toLowerCase() === 'true',
                    created_by: profile.id
                  })

                if (error) {
                  errors.push(`Error en Subpartida Global fila ${i + 1}: ${error.message}`)
                } else {
                  subpartidasInserted++
                }
              } catch (error: any) {
                errors.push(`Error en Subpartida Global fila ${i + 1}: ${error.message}`)
              }
            }
          }
        }
      }

      setImportResult({
        success: errors.length === 0,
        errors,
        mayores_inserted: mayoresInserted,
        partidas_inserted: partidasInserted,
        subpartidas_inserted: subpartidasInserted,
        total_rows: mayoresInserted + partidasInserted + subpartidasInserted
      })

      if (mayoresInserted + partidasInserted + subpartidasInserted > 0) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${mayoresInserted + partidasInserted + subpartidasInserted} registros exitosamente.`,
        })
        onImportComplete?.()
      }

      if (errors.length > 0) {
        toast({
          title: "Importación con errores",
          description: `Se completó la importación pero con ${errors.length} errores.`,
          variant: "destructive",
        })
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al procesar el archivo: " + error.message,
        variant: "destructive",
      })
      setImportResult({
        success: false,
        errors: [error.message],
        mayores_inserted: 0,
        partidas_inserted: 0,
        subpartidas_inserted: 0,
        total_rows: 0
      })
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Gestión de Excel - Catálogo de Cuentas
          </CardTitle>
          <CardDescription>
            Descarga templates, importa datos desde Excel o exporta información existente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Download Templates Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Template Básico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Descarga el template vacío para crear nuevas cuentas
                </p>
                <Button 
                  onClick={downloadTemplate}
                  disabled={exportingTemplate}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportingTemplate ? "Generando..." : "Descargar Template"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Template con Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Descarga el template con todos los datos existentes
                </p>
                <Button 
                  onClick={downloadTemplateWithData}
                  disabled={exportingTemplateWithData}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportingTemplateWithData ? "Generando..." : "Descargar con Datos"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cargar Excel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Importa cuentas desde un archivo Excel
                </p>
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={importing}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById('excel-upload')?.click()}
                    disabled={importing}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? "Importando..." : "Cargar Excel"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Resultados de Importación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{importResult.mayores_inserted}</div>
                    <div className="text-sm text-muted-foreground">Mayores Insertados</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.partidas_inserted}</div>
                    <div className="text-sm text-muted-foreground">Partidas Insertadas</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{importResult.subpartidas_inserted}</div>
                    <div className="text-sm text-muted-foreground">Subpartidas Insertadas</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="font-medium text-red-800 mb-2">Errores encontrados:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Instrucciones de Uso</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Template Básico:</strong> Contiene hojas para Mayores, Partidas y Subpartidas con ejemplos y una hoja de referencia de departamentos.</p>
              <p><strong>Template con Información:</strong> Incluye todos los datos existentes en la base de datos para facilitar la edición masiva.</p>
              <p><strong>Cargar Excel:</strong> Procesa archivos con las hojas Mayores, Partidas y Subpartidas. Mantiene las relaciones jerárquicas entre ellos.</p>
              <p><strong>Departamentos disponibles:</strong> {departamentos.map(d => d.label).join(', ')}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}