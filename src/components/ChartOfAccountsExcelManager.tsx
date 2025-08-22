import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useImportReports } from "@/hooks/useImportReports"
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
  const [departmentValidation, setDepartmentValidation] = useState<any>(null)
  const [showDepartmentModal, setShowDepartmentModal] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<any>(null)
  const { toast } = useToast()
  const { saveImportResult } = useImportReports()

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
      
      // Extract unique departments from Mayores sheet for validation
      const uniqueDepartments: string[] = []
      
      if (workbook.SheetNames.includes('Mayores')) {
        const mayoresSheet = workbook.Sheets['Mayores']
        const mayoresJsonData = XLSX.utils.sheet_to_json(mayoresSheet, { header: 1 })
        
        for (let i = 1; i < mayoresJsonData.length; i++) {
          const row = mayoresJsonData[i] as any[]
          if (row[0] && row[0].toString().trim()) {
            const dept = row[0].toString().trim()
            if (!uniqueDepartments.includes(dept)) {
              uniqueDepartments.push(dept)
            }
          }
        }
      }

      // Also extract departments from Global Construction Subpartidas
      if (workbook.SheetNames.includes('Globales Construcción')) {
        const globalSheet = workbook.Sheets['Globales Construcción']
        const globalJsonData = XLSX.utils.sheet_to_json(globalSheet, { header: 1 })
        
        for (let i = 1; i < globalJsonData.length; i++) {
          const row = globalJsonData[i] as any[]
          if (row[2] && row[2].toString().trim()) {
            const dept = row[2].toString().trim()
            if (!uniqueDepartments.includes(dept)) {
              uniqueDepartments.push(dept)
            }
          }
        }
      }

      // Validate departments using the database function
      if (uniqueDepartments.length > 0) {
        const { data: validation, error } = await supabase
          .rpc('validate_import_departments', { departments: uniqueDepartments })

        if (error) {
          throw new Error(`Error validando departamentos: ${error.message}`)
        }

        // If there are new or invalid departments, show validation modal
        if (validation && typeof validation === 'object') {
          const validationObj = validation as any
          if (validationObj.new?.length > 0 || validationObj.invalid?.length > 0) {
            setDepartmentValidation(validationObj)
            setPendingImportData({ file, workbook })
            setShowDepartmentModal(true)
            return
          }
        }
      }

      // If no department issues, proceed with import
      await processImport(file, workbook)

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al procesar el archivo: " + error.message,
        variant: "destructive",
      })
      setImporting(false)
      event.target.value = ''
    }
  }

  const processImport = async (file: File, workbook: XLSX.WorkBook) => {
    const startTime = Date.now()
    
    try {
      const errors: string[] = []
      let mayoresInserted = 0
      let partidasInserted = 0
      let subpartidasInserted = 0
      let departamentosInserted = 0
      const processedSheets: string[] = []

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!profile) {
        throw new Error("No se pudo obtener el perfil del usuario")
      }

      // Process Mayores sheet with department auto-creation
      if (workbook.SheetNames.includes('Mayores')) {
        processedSheets.push('Mayores')
        const mayoresSheet = workbook.Sheets['Mayores']
        const mayoresJsonData = XLSX.utils.sheet_to_json(mayoresSheet, { header: 1 })

        if (mayoresJsonData.length > 1) {
          for (let i = 1; i < mayoresJsonData.length; i++) {
            const row = mayoresJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
                // Use the ensure_department_exists function to auto-create departments
                const { data: normalizedDept, error: deptError } = await supabase
                  .rpc('ensure_department_exists', { dept_name: row[0].toString().trim() })

                if (deptError) {
                  errors.push(`Error creando departamento en Mayor fila ${i + 1}: ${deptError.message}`)
                  continue
                } else {
                  // Count if this created a new department (simple check)
                  const deptName = row[0].toString().trim().toLowerCase()
                  const existingDepts = ['ventas', 'diseño', 'construccion', 'finanzas', 'contabilidad', 'recursos_humanos', 'direccion_general']
                  if (!existingDepts.includes(deptName)) {
                    departamentosInserted++
                  }
                }

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

      // Process Partidas sheet (unchanged)
      if (workbook.SheetNames.includes('Partidas')) {
        processedSheets.push('Partidas')
        const partidasSheet = workbook.Sheets['Partidas']
        const partidasJsonData = XLSX.utils.sheet_to_json(partidasSheet, { header: 1 })

        if (partidasJsonData.length > 1) {
          for (let i = 1; i < partidasJsonData.length; i++) {
            const row = partidasJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
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

      // Process Subpartidas sheet (unchanged)
      if (workbook.SheetNames.includes('Subpartidas')) {
        processedSheets.push('Subpartidas')
        const subpartidasSheet = workbook.Sheets['Subpartidas']
        const subpartidasJsonData = XLSX.utils.sheet_to_json(subpartidasSheet, { header: 1 })

        if (subpartidasJsonData.length > 1) {
          for (let i = 1; i < subpartidasJsonData.length; i++) {
            const row = subpartidasJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
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

      // Process Global Construction Subpartidas with department auto-creation
      if (workbook.SheetNames.includes('Globales Construcción')) {
        processedSheets.push('Globales Construcción')
        const globalSheet = workbook.Sheets['Globales Construcción']
        const globalJsonData = XLSX.utils.sheet_to_json(globalSheet, { header: 1 })

        if (globalJsonData.length > 1) {
          for (let i = 1; i < globalJsonData.length; i++) {
            const row = globalJsonData[i] as any[]
            if (row.length >= 3 && row[0] && row[1] && row[2]) {
              try {
                // Ensure department exists for global subpartidas
                await supabase.rpc('ensure_department_exists', { dept_name: row[2].toString().trim() })

                const { error } = await supabase
                  .from('chart_of_accounts_subpartidas')
                  .insert({
                    partida_id: null,
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

      const endTime = Date.now()
      const durationSeconds = (endTime - startTime) / 1000
      const totalRowsProcessed = mayoresInserted + partidasInserted + subpartidasInserted + errors.length
      
      const importStatus = errors.length === 0 ? 'completed' : 
                          mayoresInserted + partidasInserted + subpartidasInserted > 0 ? 'partial' : 'failed'

      // Save to import history
      try {
        await saveImportResult({
          file_name: file.name,
          file_size: file.size,
          total_rows_processed: totalRowsProcessed,
          total_rows_successful: mayoresInserted + partidasInserted + subpartidasInserted,
          total_rows_failed: errors.length,
          mayores_inserted: mayoresInserted,
          partidas_inserted: partidasInserted,
          subpartidas_inserted: subpartidasInserted,
          departamentos_inserted: departamentosInserted,
          error_summary: errors,
          processed_sheets: processedSheets,
          duration_seconds: durationSeconds,
          status: importStatus
        });
      } catch (historyError) {
        console.error('Error saving import history:', historyError);
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
          description: `Se importaron ${mayoresInserted + partidasInserted + subpartidasInserted} registros exitosamente. ${departamentosInserted > 0 ? `Se crearon ${departamentosInserted} departamentos nuevos.` : ''}`,
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
    }
  }

  const confirmDepartmentCreation = async () => {
    if (!pendingImportData) return
    
    setShowDepartmentModal(false)
    await processImport(pendingImportData.file, pendingImportData.workbook)
    setPendingImportData(null)
    setDepartmentValidation(null)
  }

  const cancelImport = () => {
    setShowDepartmentModal(false)
    setPendingImportData(null)
    setDepartmentValidation(null)
    setImporting(false)
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

      {/* Department Validation Modal */}
      <Dialog open={showDepartmentModal} onOpenChange={setShowDepartmentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Validación de Departamentos
            </DialogTitle>
            <DialogDescription>
              Se encontraron departamentos que requieren revisión antes de la importación.
            </DialogDescription>
          </DialogHeader>
          
          {departmentValidation && (
            <div className="space-y-4">
              {/* New Departments */}
              {departmentValidation.new?.length > 0 && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Departamentos nuevos que se crearán ({departmentValidation.new.length}):
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {departmentValidation.new.map((dept: any, index: number) => (
                      <li key={index}>
                        • <strong>{dept.original}</strong> 
                        {dept.normalized !== dept.original && (
                          <span> → se normalizará como: <strong>{dept.normalized}</strong></span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Existing Departments */}
              {departmentValidation.existing?.length > 0 && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-2">
                    Departamentos existentes ({departmentValidation.existing.length}):
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {departmentValidation.existing.slice(0, 5).map((dept: any, index: number) => (
                      <li key={index}>• {dept.original}</li>
                    ))}
                    {departmentValidation.existing.length > 5 && (
                      <li className="text-xs italic">... y {departmentValidation.existing.length - 5} más</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Invalid Departments */}
              {departmentValidation.invalid?.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">
                    Departamentos inválidos que causarán errores ({departmentValidation.invalid.length}):
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {departmentValidation.invalid.map((dept: any, index: number) => (
                      <li key={index}>
                        • <strong>{dept.original}</strong> - {dept.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  ¿Deseas continuar con la importación? Los departamentos nuevos se crearán automáticamente, 
                  pero los inválidos causarán errores que podrás revisar después.
                </p>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={confirmDepartmentCreation}
                    disabled={importing}
                    className="flex-1"
                  >
                    {importing ? "Importando..." : "Continuar Importación"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={cancelImport}
                    disabled={importing}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}