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

interface DropdownImportResult {
  type: string
  new_options: string[]
  duplicates_ignored: number
  total_processed: number
}

interface ImportResult {
  success: boolean
  errors: string[]
  dropdown_results: DropdownImportResult[]
  total_rows: number
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

      // Validate headers - only check for the dropdown columns
      const expectedHeaders = [
        "Cuentas de Mayor",
        "Partida", 
        "Descripción del Producto"
      ]

      const headers = (jsonData[0] as string[]) || []
      const missingHeaders = expectedHeaders.filter(header => 
        !headers.some(h => h?.toLowerCase().includes(header.toLowerCase()))
      )

      if (missingHeaders.length > 0) {
        throw new Error(`Faltan las siguientes columnas para alimentar dropdowns: ${missingHeaders.join(', ')}`)
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

      // Get existing dropdown options to prevent duplicates
      const { data: existingOptions } = await supabase
        .from('material_dropdown_options')
        .select('dropdown_type, option_label')
        .eq('is_active', true)

      const existingMap = new Map<string, Set<string>>()
      existingOptions?.forEach(option => {
        if (!existingMap.has(option.dropdown_type)) {
          existingMap.set(option.dropdown_type, new Set())
        }
        existingMap.get(option.dropdown_type)?.add(option.option_label.toLowerCase())
      })

      // Process data to feed dropdowns
      const errors: string[] = []
      const dropdownResults: DropdownImportResult[] = []
      
      // Column mappings
      const columnMappings = [
        { index: 0, type: 'cuentas_mayor', name: 'Cuentas de Mayor' },
        { index: 1, type: 'partidas', name: 'Partida' },
        { index: 3, type: 'descripciones_producto', name: 'Descripción del Producto' }
      ]

      for (const mapping of columnMappings) {
        const uniqueValues = new Set<string>()
        const newOptions: string[] = []
        let duplicatesIgnored = 0
        let totalProcessed = 0

        // Extract unique values from the column
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[]
          const cellValue = row[mapping.index]?.toString().trim()
          
          if (cellValue && cellValue !== '') {
            totalProcessed++
            const lowerValue = cellValue.toLowerCase()
            
            // Check if it's not a duplicate within this import
            if (!uniqueValues.has(lowerValue)) {
              uniqueValues.add(lowerValue)
              
              // Check if it already exists in database
              const existingSet = existingMap.get(mapping.type)
              if (!existingSet?.has(lowerValue)) {
                newOptions.push(cellValue)
              } else {
                duplicatesIgnored++
              }
            } else {
              duplicatesIgnored++
            }
          }
        }

        // Insert new options
        if (newOptions.length > 0) {
          const optionsToInsert = newOptions.map((option, index) => ({
            dropdown_type: mapping.type,
            option_label: option,
            option_value: option.toLowerCase().replace(/\s+/g, '_'),
            order_index: index + 1000, // Add to end of existing options
            is_active: true,
            created_by: profile.id
          }))

          const { error: insertError } = await supabase
            .from('material_dropdown_options')
            .insert(optionsToInsert)

          if (insertError) {
            errors.push(`Error al insertar opciones para ${mapping.name}: ${insertError.message}`)
          }
        }

        dropdownResults.push({
          type: mapping.name,
          new_options: newOptions,
          duplicates_ignored: duplicatesIgnored,
          total_processed: totalProcessed
        })
      }

      setImportResult({
        success: errors.length === 0,
        errors,
        dropdown_results: dropdownResults,
        total_rows: jsonData.length - 1
      })

      const totalNewOptions = dropdownResults.reduce((sum, result) => sum + result.new_options.length, 0)
      
      if (totalNewOptions > 0) {
        toast({
          title: "Dropdowns actualizados",
          description: `Se agregaron ${totalNewOptions} nuevas opciones a los dropdowns.`,
        })
        onImportComplete?.()
      } else {
        toast({
          title: "Sin cambios",
          description: "No se encontraron nuevas opciones para agregar.",
        })
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
        dropdown_results: [],
        total_rows: 0
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
          Alimenta los dropdowns con opciones desde Excel. No carga materiales, solo actualiza las opciones disponibles.
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
                  Selecciona un archivo Excel para alimentar los dropdowns. Solo las columnas "Cuentas de Mayor", "Partida" y "Descripción del Producto" serán procesadas.
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
                  
                  <div className="text-sm space-y-3">
                    <p>Total de filas procesadas: {importResult.total_rows}</p>
                    
                    {importResult.dropdown_results.map((result, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-3">
                        <p className="font-medium text-sm">{result.type}:</p>
                        <p className="text-xs">• {result.new_options.length} nuevas opciones agregadas</p>
                        <p className="text-xs">• {result.duplicates_ignored} duplicados ignorados</p>
                        <p className="text-xs">• {result.total_processed} valores procesados</p>
                        {result.new_options.length > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            Agregadas: {result.new_options.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                    
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