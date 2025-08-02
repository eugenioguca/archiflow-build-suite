import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import * as XLSX from 'xlsx'

interface MaterialExcelManagerProps {
  projectId: string
  onImportComplete?: () => void
}

interface MaterialImportData {
  cuenta_mayor: string
  partida: string
  sub_partida: number
  descripcion_producto: string
  unit_of_measure: string
  quantity_required: number
  unit_cost: number
  notas_procuracion?: string
  requisito_almacenamiento?: string
}

interface ImportResult {
  success: boolean
  errors: string[]
  imported: number
  total: number
}

export function MaterialExcelManager({ projectId, onImportComplete }: MaterialExcelManagerProps) {
  const [importing, setImporting] = useState(false)
  const [exportingTemplate, setExportingTemplate] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const { toast } = useToast()

  const downloadTemplate = async () => {
    setExportingTemplate(true)
    try {
      // Fetch dropdown options for reference
      const { data: cuentasMayor } = await supabase
        .from('material_dropdown_options')
        .select('option_label')
        .eq('dropdown_type', 'cuentas_mayor')
        .eq('is_active', true)
        .order('order_index')

      const { data: partidas } = await supabase
        .from('material_dropdown_options')
        .select('option_label')
        .eq('dropdown_type', 'partidas')
        .eq('is_active', true)
        .order('order_index')

      const { data: descripciones } = await supabase
        .from('material_dropdown_options')
        .select('option_label')
        .eq('dropdown_type', 'descripciones_producto')
        .eq('is_active', true)
        .order('order_index')

      // Create workbook
      const wb = XLSX.utils.book_new()

      // Main template sheet
      const templateData = [
        [
          "Cuentas de Mayor",
          "Partida", 
          "Sub Partida",
          "Descripción del Producto",
          "Unidad",
          "Cantidad Requerida",
          "Costo Unitario",
          "Notas de Procuración",
          "Requisito de Almacenamiento"
        ],
        [
          "Tierra",
          "Ejemplo de partida",
          1,
          "Ejemplo de descripción",
          "M3",
          100,
          50.00,
          "Opcional",
          "Opcional"
        ]
      ]

      const ws = XLSX.utils.aoa_to_sheet(templateData)
      XLSX.utils.book_append_sheet(wb, ws, "Materiales")

      // Reference sheets for dropdown options
      if (cuentasMayor?.length) {
        const cuentasWs = XLSX.utils.aoa_to_sheet([
          ["Cuentas de Mayor Disponibles"],
          ...cuentasMayor.map(item => [item.option_label])
        ])
        XLSX.utils.book_append_sheet(wb, cuentasWs, "Cuentas de Mayor")
      }

      if (partidas?.length) {
        const partidasWs = XLSX.utils.aoa_to_sheet([
          ["Partidas Disponibles"],
          ...partidas.map(item => [item.option_label])
        ])
        XLSX.utils.book_append_sheet(wb, partidasWs, "Partidas")
      }

      if (descripciones?.length) {
        const descripcionesWs = XLSX.utils.aoa_to_sheet([
          ["Descripciones Disponibles"],
          ...descripciones.map(item => [item.option_label])
        ])
        XLSX.utils.book_append_sheet(wb, descripcionesWs, "Descripciones")
      }

      // Units reference sheet
      const unitsData = [
        ["Unidades Disponibles"],
        ["PZA"], ["M2"], ["M3"], ["ML"], ["KG"], ["TON"], ["LT"], ["GLN"], ["M"]
      ]
      const unitsWs = XLSX.utils.aoa_to_sheet(unitsData)
      XLSX.utils.book_append_sheet(wb, unitsWs, "Unidades")

      // Generate and download
      const fileName = `Template_Materiales_${new Date().toISOString().split('T')[0]}.xlsx`
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

  const exportCurrentData = async () => {
    setExportingData(true)
    try {
      const { data: materials, error } = await supabase
        .from('material_requirements')
        .select(`
          cuenta_mayor,
          partida,
          sub_partida,
          descripcion_producto,
          unit_of_measure,
          quantity_required,
          unit_cost,
          notas_procuracion,
          requisito_almacenamiento
        `)
        .eq('project_id', projectId)

      if (error) throw error

      if (!materials?.length) {
        toast({
          title: "Sin datos",
          description: "No hay materiales para exportar en este proyecto.",
          variant: "destructive",
        })
        return
      }

      const exportData = [
        [
          "Cuentas de Mayor",
          "Partida", 
          "Sub Partida",
          "Descripción del Producto",
          "Unidad",
          "Cantidad Requerida",
          "Costo Unitario",
          "Notas de Procuración",
          "Requisito de Almacenamiento"
        ],
        ...materials.map(material => [
          material.cuenta_mayor || "",
          material.partida || "",
          material.sub_partida || "",
          material.descripcion_producto || "",
          material.unit_of_measure || "",
          material.quantity_required || 0,
          material.unit_cost || 0,
          material.notas_procuracion || "",
          material.requisito_almacenamiento || ""
        ])
      ]

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(exportData)
      XLSX.utils.book_append_sheet(wb, ws, "Materiales")

      const fileName = `Materiales_Proyecto_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Datos exportados",
        description: `Se exportaron ${materials.length} materiales exitosamente.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al exportar datos: " + error.message,
        variant: "destructive",
      })
    } finally {
      setExportingData(false)
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
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        throw new Error("El archivo debe contener al menos una fila de datos además del encabezado")
      }

      // Validate headers
      const expectedHeaders = [
        "Cuentas de Mayor",
        "Partida", 
        "Sub Partida",
        "Descripción del Producto",
        "Unidad",
        "Cantidad Requerida",
        "Costo Unitario"
      ]

      const headers = (jsonData[0] as string[]) || []
      const missingHeaders = expectedHeaders.filter(header => 
        !headers.some(h => h?.toLowerCase().includes(header.toLowerCase()))
      )

      if (missingHeaders.length > 0) {
        throw new Error(`Faltan las siguientes columnas: ${missingHeaders.join(', ')}`)
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!profile) {
        throw new Error("No se pudo obtener el perfil del usuario")
      }

      // Process data
      const errors: string[] = []
      const materialsToInsert: any[] = []

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[]
        if (!row || row.every(cell => !cell)) continue // Skip empty rows

        try {
          const material = {
            project_id: projectId,
            cuenta_mayor: row[0]?.toString().trim() || null,
            partida: row[1]?.toString().trim() || null,
            sub_partida: row[2] ? parseInt(row[2].toString()) : null,
            descripcion_producto: row[3]?.toString().trim() || null,
            unit_of_measure: row[4]?.toString().trim() || null,
            quantity_required: row[5] ? parseFloat(row[5].toString()) : 0,
            unit_cost: row[6] ? parseFloat(row[6].toString()) : 0,
            notas_procuracion: row[7]?.toString().trim() || null,
            requisito_almacenamiento: row[8]?.toString().trim() || null,
            material_name: row[3]?.toString().trim() || `Material ${i}`,
            material_type: row[0]?.toString().trim() || 'general',
            created_by: profile.id
          }

          // Basic validation
          if (!material.cuenta_mayor) {
            errors.push(`Fila ${i + 1}: Cuentas de Mayor es obligatorio`)
            continue
          }

          if (!material.descripcion_producto) {
            errors.push(`Fila ${i + 1}: Descripción del Producto es obligatorio`)
            continue
          }

          if (!material.unit_of_measure) {
            errors.push(`Fila ${i + 1}: Unidad es obligatorio`)
            continue
          }

          if (material.quantity_required <= 0) {
            errors.push(`Fila ${i + 1}: Cantidad Requerida debe ser mayor a 0`)
            continue
          }

          materialsToInsert.push(material)
        } catch (error: any) {
          errors.push(`Fila ${i + 1}: ${error.message}`)
        }
      }

      // Insert materials
      let imported = 0
      if (materialsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('material_requirements')
          .insert(materialsToInsert)

        if (insertError) {
          throw insertError
        }

        imported = materialsToInsert.length
      }

      setImportResult({
        success: errors.length === 0,
        errors,
        imported,
        total: jsonData.length - 1
      })

      if (imported > 0) {
        toast({
          title: "Importación completada",
          description: `Se importaron ${imported} materiales exitosamente.`,
        })
        onImportComplete?.()
      }

      if (errors.length > 0) {
        toast({
          title: "Importación con errores",
          description: `Se encontraron ${errors.length} errores. Revisa el resumen.`,
          variant: "destructive",
        })
      }

    } catch (error: any) {
      toast({
        title: "Error de importación",
        description: error.message,
        variant: "destructive",
      })
      setImportResult({
        success: false,
        errors: [error.message],
        imported: 0,
        total: 0
      })
    } finally {
      setImporting(false)
      event.target.value = '' // Reset input
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Gestión de Excel
        </CardTitle>
        <CardDescription>
          Importa y exporta materiales usando archivos de Excel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Exportar</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex flex-col space-y-2">
                <h4 className="text-sm font-medium">Descargar Template</h4>
                <p className="text-xs text-muted-foreground">
                  Descarga un template de Excel con el formato correcto y opciones de referencia
                </p>
                <Button 
                  onClick={downloadTemplate}
                  disabled={exportingTemplate}
                  className="w-fit"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportingTemplate ? "Generando..." : "Descargar Template"}
                </Button>
              </div>

              <Separator />

              <div className="flex flex-col space-y-2">
                <h4 className="text-sm font-medium">Exportar Datos Actuales</h4>
                <p className="text-xs text-muted-foreground">
                  Exporta todos los materiales actuales del proyecto a Excel
                </p>
                <Button 
                  onClick={exportCurrentData}
                  disabled={exportingData}
                  variant="outline"
                  className="w-fit"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportingData ? "Exportando..." : "Exportar Datos"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Subir Archivo Excel</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Selecciona un archivo Excel con el formato del template para importar materiales
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={importing}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button asChild disabled={importing}>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {importing ? "Importando..." : "Seleccionar Archivo"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {importResult && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <h5 className="font-medium">
                      {importResult.success ? "Importación Exitosa" : "Importación con Errores"}
                    </h5>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p>Total de filas procesadas: {importResult.total}</p>
                    <p>Materiales importados: {importResult.imported}</p>
                    {importResult.errors.length > 0 && (
                      <p>Errores encontrados: {importResult.errors.length}</p>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <h6 className="text-xs font-medium text-red-600 mb-1">Errores:</h6>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <p key={index} className="text-red-600">• {error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}