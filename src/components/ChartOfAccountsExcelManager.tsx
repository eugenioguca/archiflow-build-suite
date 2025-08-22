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

  // Default departments for template examples (users can add their own)
  const defaultDepartments = [
    "ventas", "diseño", "construccion", "finanzas", 
    "contabilidad", "recursos_humanos", "direccion_general"
  ]

  const downloadTemplate = async () => {
    setExportingTemplate(true)
    try {
      const wb = XLSX.utils.book_new()

      // Instructions sheet - FIRST
      const instructionsData = [
        ["INSTRUCCIONES PARA IMPORTAR CATÁLOGO DE CUENTAS"],
        [""],
        ["ORDEN DE LLENADO OBLIGATORIO:"],
        ["1. Departamentos (nuevos departamentos si los necesitas)"],
        ["2. Mayores"],
        ["3. Partidas"],
        ["4. Subpartidas"],
        [""],
        ["REGLAS IMPORTANTES:"],
        ["• Campo Estado: Solo usar ACTIVO o INACTIVO"],
        ["• Los códigos deben ser únicos"],
        ["• Respetar las dependencias entre niveles"],
        ["• No dejar celdas vacías en campos obligatorios"],
        ["• PUEDES AGREGAR CUALQUIER DEPARTAMENTO NUEVO"],
        [""],
        ["DEPARTAMENTOS:"],
        ["Puedes usar los departamentos existentes o crear nuevos"],
        ["Ejemplos: ventas, diseño, construccion, finanzas, etc."],
        ["No hay restricciones - agrega los que necesites"],
        [""],
        ["EJEMPLOS DE CÓDIGOS:"],
        ["Mayor: VEN001, DIS001, CON001"],
        ["Partida: VEN001-001, DIS001-001"],
        ["Subpartida: VEN001-001-001 o GLOBAL-001"],
        [""],
        ["SUBPARTIDAS GLOBALES:"],
        ["• Es Global = SI: Se aplica SOLO al departamento específico"],
        ["• Es Global = NO: Subpartida normal de una partida"],
        ["• Si Es Global = SI, DEBES llenar 'Departamento Aplicable'"],
        ["• Si Es Global = NO, DEBES llenar 'Código Partida'"],
        [""],
        ["VALIDACIONES ANTES DE IMPORTAR:"],
        ["✓ Verificar que todos los códigos padre existan"],
        ["✓ No duplicar códigos en el mismo archivo"],
        ["✓ Usar solo valores ACTIVO/INACTIVO"],
        [""],
        ["TROUBLESHOOTING COMÚN:"],
        ["Error 'Mayor no encontrado' → Verificar Código Mayor en hoja Partidas"],
        ["Error 'Partida no encontrada' → Verificar Código Partida en hoja Subpartidas"],
        ["Subpartidas globales NO deben tener Código Partida"],
      ]
      const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData)
      XLSX.utils.book_append_sheet(wb, instructionsWs, "INSTRUCCIONES")

      // Departamentos template (NEW - explicit department creation)
      const departamentosData = [
        ["Departamento", "Estado"],
        ["ventas", "ACTIVO"],
        ["diseño", "ACTIVO"],
        ["construccion", "ACTIVO"],
        ["finanzas", "ACTIVO"],
        ["contabilidad", "ACTIVO"],
        ["recursos_humanos", "ACTIVO"],
        ["direccion_general", "ACTIVO"],
      ]
      const departamentosWs = XLSX.utils.aoa_to_sheet(departamentosData)
      XLSX.utils.book_append_sheet(wb, departamentosWs, "Departamentos")

      // Mayores template - IMPROVED
      const mayoresData = [
        ["Departamento", "Código", "Nombre", "Estado"],
        ["ventas", "VEN001", "Ingresos por Ventas", "ACTIVO"],
        ["ventas", "VEN002", "Comisiones de Ventas", "ACTIVO"],
        ["diseño", "DIS001", "Servicios de Diseño", "ACTIVO"],
        ["diseño", "DIS002", "Materiales de Diseño", "ACTIVO"],
        ["construccion", "CON001", "Materiales de Construcción", "ACTIVO"],
        ["construccion", "CON002", "Mano de Obra", "ACTIVO"],
        ["finanzas", "FIN001", "Gastos Financieros", "ACTIVO"],
        ["contabilidad", "CONT001", "Gastos de Contabilidad", "ACTIVO"]
      ]
      const mayoresWs = XLSX.utils.aoa_to_sheet(mayoresData)
      XLSX.utils.book_append_sheet(wb, mayoresWs, "Mayores")

      // Partidas template - IMPROVED
      const partidasData = [
        ["Código Mayor", "Código", "Nombre", "Estado"],
        ["VEN001", "VEN001-001", "Ventas Residenciales", "ACTIVO"],
        ["VEN001", "VEN001-002", "Ventas Comerciales", "ACTIVO"],
        ["VEN002", "VEN002-001", "Comisiones Internas", "ACTIVO"],
        ["DIS001", "DIS001-001", "Diseño Arquitectónico", "ACTIVO"],
        ["DIS001", "DIS001-002", "Diseño de Interiores", "ACTIVO"],
        ["DIS002", "DIS002-001", "Software de Diseño", "ACTIVO"],
        ["CON001", "CON001-001", "Cemento y Concreto", "ACTIVO"],
        ["CON001", "CON001-002", "Acero y Varillas", "ACTIVO"],
        ["CON002", "CON002-001", "Albañilería", "ACTIVO"],
        ["FIN001", "FIN001-001", "Intereses Bancarios", "ACTIVO"],
        ["CONT001", "CONT001-001", "Auditorías Externas", "ACTIVO"]
      ]
      const partidasWs = XLSX.utils.aoa_to_sheet(partidasData)
      XLSX.utils.book_append_sheet(wb, partidasWs, "Partidas")

      // Subpartidas template - UNIFIED (NO MORE SEPARATE GLOBAL SHEET)
      const subpartidasData = [
        ["Código Partida", "Código", "Nombre", "Es Global", "Departamento Aplicable", "Estado"],
        // Regular subpartidas
        ["VEN001-001", "VEN001-001-001", "Casas Unifamiliares", "NO", "", "ACTIVO"],
        ["VEN001-001", "VEN001-001-002", "Condominios", "NO", "", "ACTIVO"],
        ["VEN001-002", "VEN001-002-001", "Oficinas", "NO", "", "ACTIVO"],
        ["DIS001-001", "DIS001-001-001", "Planos Arquitectónicos", "NO", "", "ACTIVO"],
        ["DIS001-002", "DIS001-002-001", "Decoración", "NO", "", "ACTIVO"],
        ["CON001-001", "CON001-001-001", "Cemento Premium", "NO", "", "ACTIVO"],
        // Global subpartidas examples
        ["", "GLOBAL-001", "Transporte de Materiales", "SI", "construccion", "ACTIVO"],
        ["", "GLOBAL-002", "Supervisión de Obra", "SI", "construccion", "ACTIVO"],
        ["", "GLOBAL-003", "Herramientas Menores", "SI", "construccion", "ACTIVO"],
        ["", "GLOBAL-004", "Gastos Administrativos", "SI", "finanzas", "ACTIVO"],
      ]
      const subpartidasWs = XLSX.utils.aoa_to_sheet(subpartidasData)
      XLSX.utils.book_append_sheet(wb, subpartidasWs, "Subpartidas")

      // Reference sheet for validation
      const referenciaData = [
        ["VALORES VÁLIDOS PARA CAMPOS"],
        [""],
        ["ESTADO:"],
        ["ACTIVO"],
        ["INACTIVO"],
        [""],
        ["ES GLOBAL:"],
        ["SI"],
        ["NO"],
        [""],
        ["DEPARTAMENTOS:"],
        ["Puedes usar los existentes o agregar nuevos"],
        ...defaultDepartments.map(dept => [dept]),
        [""],
        ["NOTAS:"],
        ["• Los códigos deben ser únicos en cada nivel"],
        ["• Para subpartidas globales, dejar vacío 'Código Partida'"],
        ["• Es Global = SI requiere 'Departamento Aplicable'"],
        ["• Es Global = NO no debe tener 'Departamento Aplicable'"]
      ]
      const referenciaWs = XLSX.utils.aoa_to_sheet(referenciaData)
      XLSX.utils.book_append_sheet(wb, referenciaWs, "REFERENCIA")

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
      const { data: departamentos } = await supabase
        .from('chart_of_accounts_departamentos')
        .select('*')
        .order('departamento')

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

      // Instructions sheet - FIRST
      const instructionsData = [
        ["INSTRUCCIONES PARA IMPORTAR CATÁLOGO DE CUENTAS"],
        [""],
        ["ESTE ARCHIVO CONTIENE INFORMACIÓN EXISTENTE"],
        ["Puedes modificar los datos y volver a importar"],
        [""],
        ["ORDEN DE LLENADO OBLIGATORIO:"],
        ["1. Departamentos (nuevos departamentos si los necesitas)"],
        ["2. Mayores"],
        ["3. Partidas"],
        ["4. Subpartidas"],
        [""],
        ["REGLAS IMPORTANTES:"],
        ["• Campo Estado: Solo usar ACTIVO o INACTIVO"],
        ["• Los códigos deben ser únicos"],
        ["• Respetar las dependencias entre niveles"],
        ["• No dejar celdas vacías en campos obligatorios"],
        ["• PUEDES AGREGAR CUALQUIER DEPARTAMENTO NUEVO"],
        [""],
        ["SUBPARTIDAS GLOBALES:"],
        ["• Es Global = SI: Se aplica SOLO al departamento específico"],
        ["• Es Global = NO: Subpartida normal de una partida"],
        ["• Si Es Global = SI, DEBES llenar 'Departamento Aplicable'"],
        ["• Si Es Global = NO, DEBES llenar 'Código Partida'"],
      ]
      const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData)
      XLSX.utils.book_append_sheet(wb, instructionsWs, "INSTRUCCIONES")

      // Departamentos with data - NEW FORMAT
      const departamentosData = [
        ["Departamento", "Estado"],
        ...(departamentos?.map(dept => [
          dept.departamento,
          dept.activo ? "ACTIVO" : "INACTIVO"
        ]) || [])
      ]
      const departamentosWs = XLSX.utils.aoa_to_sheet(departamentosData)
      XLSX.utils.book_append_sheet(wb, departamentosWs, "Departamentos")

      // Mayores with data - NEW FORMAT
      const mayoresData = [
        ["Departamento", "Código", "Nombre", "Estado"],
        ...(mayores?.map(mayor => [
          mayor.departamento,
          mayor.codigo,
          mayor.nombre,
          mayor.activo ? "ACTIVO" : "INACTIVO"
        ]) || [])
      ]
      const mayoresWs = XLSX.utils.aoa_to_sheet(mayoresData)
      XLSX.utils.book_append_sheet(wb, mayoresWs, "Mayores")

      // Partidas with data - NEW FORMAT
      const partidasData = [
        ["Código Mayor", "Código", "Nombre", "Estado"],
        ...(partidas?.map(partida => [
          partida.chart_of_accounts_mayor?.codigo || "",
          partida.codigo,
          partida.nombre,
          partida.activo ? "ACTIVO" : "INACTIVO"
        ]) || [])
      ]
      const partidasWs = XLSX.utils.aoa_to_sheet(partidasData)
      XLSX.utils.book_append_sheet(wb, partidasWs, "Partidas")

      // Subpartidas with data - UNIFIED FORMAT
      const subpartidasData = [
        ["Código Partida", "Código", "Nombre", "Es Global", "Departamento Aplicable", "Estado"],
        ...(subpartidas?.map(subpartida => [
          (subpartida as any).es_global ? "" : (subpartida.chart_of_accounts_partidas?.codigo || ""),
          subpartida.codigo,
          subpartida.nombre,
          (subpartida as any).es_global ? "SI" : "NO",
          (subpartida as any).departamento_aplicable || "",
          subpartida.activo ? "ACTIVO" : "INACTIVO"
        ]) || [])
      ]
      const subpartidasWs = XLSX.utils.aoa_to_sheet(subpartidasData)
      XLSX.utils.book_append_sheet(wb, subpartidasWs, "Subpartidas")

      // Reference sheet for validation
      const referenciaData = [
        ["VALORES VÁLIDOS PARA CAMPOS"],
        [""],
        ["ESTADO:"],
        ["ACTIVO"],
        ["INACTIVO"],
        [""],
        ["ES GLOBAL:"],
        ["SI"],
        ["NO"],
        [""],
        ["DEPARTAMENTOS VÁLIDOS:"],
        ...(departamentos?.map(dept => [dept.departamento]) || []),
        [""],
        ["NOTAS:"],
        ["• Los códigos deben ser únicos en cada nivel"],
        ["• Para subpartidas globales, dejar vacío 'Código Partida'"],
        ["• Es Global = SI requiere 'Departamento Aplicable'"],
        ["• Es Global = NO debe tener 'Código Partida' válido"]
      ]
      const referenciaWs = XLSX.utils.aoa_to_sheet(referenciaData)
      XLSX.utils.book_append_sheet(wb, referenciaWs, "REFERENCIA")

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

      // Also extract departments from Subpartidas sheet (Departamento Aplicable column)
      if (workbook.SheetNames.includes('Subpartidas')) {
        const subpartidasSheet = workbook.Sheets['Subpartidas']
        const subpartidasJsonData = XLSX.utils.sheet_to_json(subpartidasSheet, { header: 1 })
        
        for (let i = 1; i < subpartidasJsonData.length; i++) {
          const row = subpartidasJsonData[i] as any[]
          // Check Departamento Aplicable column (index 4)
          if (row[4] && row[4].toString().trim()) {
            const dept = row[4].toString().trim()
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

      // Normalize "Estado" field values
      const normalizeEstado = (value: any): boolean => {
        if (typeof value === 'boolean') return value
        const strVal = value?.toString().toLowerCase().trim()
        return strVal === 'activo' || strVal === 'true' || strVal === '1'
      }

      // Normalize "Es Global" field values  
      const normalizeEsGlobal = (value: any): boolean => {
        if (typeof value === 'boolean') return value
        const strVal = value?.toString().toLowerCase().trim()
        return strVal === 'si' || strVal === 'sí' || strVal === 'true' || strVal === '1'
      }

      // PRE-VALIDATION: Check all dependencies before processing
      console.log("🔍 Realizando pre-validación del archivo...")
      const validationErrors: string[] = []
      const allMayoresCodes: Set<string> = new Set()
      const allPartidasCodes: Set<string> = new Set()

      // Collect all Mayor codes first
      if (workbook.SheetNames.includes('Mayores')) {
        const mayoresSheet = workbook.Sheets['Mayores']
        const mayoresJsonData = XLSX.utils.sheet_to_json(mayoresSheet, { header: 1 })
        
        for (let i = 1; i < mayoresJsonData.length; i++) {
          const row = mayoresJsonData[i] as any[]
          if (row.length >= 4 && row[1]) {
            allMayoresCodes.add(row[1].toString().trim())
          }
        }
      }

      // Collect all Partida codes and validate Mayor references
      if (workbook.SheetNames.includes('Partidas')) {
        const partidasSheet = workbook.Sheets['Partidas']
        const partidasJsonData = XLSX.utils.sheet_to_json(partidasSheet, { header: 1 })
        
        for (let i = 1; i < partidasJsonData.length; i++) {
          const row = partidasJsonData[i] as any[]
          if (row.length >= 4 && row[0] && row[1]) {
            const mayorCode = row[0].toString().trim()
            const partidaCode = row[1].toString().trim()
            
            // Check if Mayor exists
            if (!allMayoresCodes.has(mayorCode)) {
              validationErrors.push(`Partida fila ${i + 1}: No se encontró Mayor '${mayorCode}' en el archivo`)
            }
            
            allPartidasCodes.add(partidaCode)
          }
        }
      }

      // Validate Subpartida references
      if (workbook.SheetNames.includes('Subpartidas')) {
        const subpartidasSheet = workbook.Sheets['Subpartidas']
        const subpartidasJsonData = XLSX.utils.sheet_to_json(subpartidasSheet, { header: 1 })
        
        for (let i = 1; i < subpartidasJsonData.length; i++) {
          const row = subpartidasJsonData[i] as any[]
          if (row.length >= 6 && row[1]) {
            const esGlobal = normalizeEsGlobal(row[3])
            const partidaCode = row[0]?.toString().trim()
            const deptAplicable = row[4]?.toString().trim()

            if (!esGlobal) {
              // Regular subpartida needs valid Partida reference
              if (!partidaCode || !allPartidasCodes.has(partidaCode)) {
                validationErrors.push(`Subpartida fila ${i + 1}: No se encontró Partida '${partidaCode}' en el archivo`)
              }
              if (deptAplicable) {
                validationErrors.push(`Subpartida fila ${i + 1}: Subpartida regular no debe tener 'Departamento Aplicable'`)
              }
            } else {
              // Global subpartida shouldn't have Partida reference
              if (partidaCode) {
                validationErrors.push(`Subpartida fila ${i + 1}: Subpartida global no debe tener 'Código Partida'`)
              }
              if (!deptAplicable) {
                validationErrors.push(`Subpartida fila ${i + 1}: Subpartida global requiere 'Departamento Aplicable'`)
              }
            }
          }
        }
      }

      // If validation errors found, show them and abort
      if (validationErrors.length > 0) {
        console.error("❌ Errores de pre-validación:", validationErrors)
        setImportResult({
          success: false,
          errors: validationErrors,
          mayores_inserted: 0,
          partidas_inserted: 0,
          subpartidas_inserted: 0,
          total_rows: 0
        })
        toast({
          title: "Errores de validación",
          description: `Se encontraron ${validationErrors.length} errores en el archivo. Revisa los resultados.`,
          variant: "destructive",
        })
        return
      }

      console.log("✅ Pre-validación completada exitosamente")

      // PROCESS IN CORRECT ORDER: Departamentos → Mayores → Partidas → Subpartidas
      console.log("📊 Iniciando procesamiento en orden correcto...")

      // Process Departamentos sheet first (NEW)
      if (workbook.SheetNames.includes('Departamentos')) {
        processedSheets.push('Departamentos')
        console.log("🏢 Procesando hoja Departamentos...")
        
        const deptSheet = workbook.Sheets['Departamentos']
        const deptJsonData = XLSX.utils.sheet_to_json(deptSheet, { header: 1 })

        if (deptJsonData.length > 1) {
          for (let i = 1; i < deptJsonData.length; i++) {
            const row = deptJsonData[i] as any[]
            if (row.length >= 2 && row[0]) {
              try {
                const { data: normalizedDept, error: deptError } = await supabase
                  .rpc('ensure_department_exists', { dept_name: row[0].toString().trim() })

                if (deptError) {
                  errors.push(`Error creando departamento fila ${i + 1}: ${deptError.message}`)
                } else {
                  departamentosInserted++
                }
              } catch (error: any) {
                errors.push(`Error en Departamento fila ${i + 1}: ${error.message}`)
              }
            }
          }
        }
        console.log(`✅ Departamentos procesados: ${departamentosInserted} insertados`)
      }

      // Process Mayores sheet with NEW format
      if (workbook.SheetNames.includes('Mayores')) {
        processedSheets.push('Mayores')
        console.log("📋 Procesando hoja Mayores...")
        
        const mayoresSheet = workbook.Sheets['Mayores']
        const mayoresJsonData = XLSX.utils.sheet_to_json(mayoresSheet, { header: 1 })

        if (mayoresJsonData.length > 1) {
          for (let i = 1; i < mayoresJsonData.length; i++) {
            const row = mayoresJsonData[i] as any[]
            if (row.length >= 4 && row[0] && row[1] && row[2]) {
              try {
                // Auto-create department if needed
                await supabase.rpc('ensure_department_exists', { dept_name: row[0].toString().trim() })

                const { error } = await supabase
                  .from('chart_of_accounts_mayor')
                  .insert({
                    departamento: row[0].toString().trim(),
                    codigo: row[1].toString().trim(),
                    nombre: row[2].toString().trim(),
                    activo: normalizeEstado(row[3]),
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
        console.log(`✅ Mayores procesados: ${mayoresInserted} insertados`)
      }

      // Process Partidas sheet with NEW format
      if (workbook.SheetNames.includes('Partidas')) {
        processedSheets.push('Partidas')
        console.log("📄 Procesando hoja Partidas...")
        
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
                    activo: normalizeEstado(row[3]),
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
        console.log(`✅ Partidas procesadas: ${partidasInserted} insertadas`)
      }

      // Process Subpartidas sheet with UNIFIED format (both regular and global)
      if (workbook.SheetNames.includes('Subpartidas')) {
        processedSheets.push('Subpartidas')
        console.log("📝 Procesando hoja Subpartidas unificada...")
        
        const subpartidasSheet = workbook.Sheets['Subpartidas']
        const subpartidasJsonData = XLSX.utils.sheet_to_json(subpartidasSheet, { header: 1 })

        if (subpartidasJsonData.length > 1) {
          for (let i = 1; i < subpartidasJsonData.length; i++) {
            const row = subpartidasJsonData[i] as any[]
            if (row.length >= 6 && row[1] && row[2]) {
              try {
                const esGlobal = normalizeEsGlobal(row[3])
                const partidaCode = row[0]?.toString().trim()
                const subpartidaCode = row[1].toString().trim()
                const nombre = row[2].toString().trim()
                const departamentoAplicable = row[4]?.toString().trim() || null
                const activo = normalizeEstado(row[5])

                let partidaId = null

                if (!esGlobal) {
                  // Regular subpartida - needs Partida reference
                  const { data: partida } = await supabase
                    .from('chart_of_accounts_partidas')
                    .select('id')
                    .eq('codigo', partidaCode)
                    .single()

                  if (!partida) {
                    errors.push(`Error en Subpartida fila ${i + 1}: No se encontró Partida con código ${partidaCode}`)
                    continue
                  }
                  partidaId = partida.id
                } else {
                  // Global subpartida - ensure department exists
                  if (departamentoAplicable) {
                    await supabase.rpc('ensure_department_exists', { dept_name: departamentoAplicable })
                  }
                }

                const { error } = await supabase
                  .from('chart_of_accounts_subpartidas')
                  .insert({
                    partida_id: partidaId,
                    codigo: subpartidaCode,
                    nombre: nombre,
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
        console.log(`✅ Subpartidas procesadas: ${subpartidasInserted} insertadas`)
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
              <p><strong>Departamentos disponibles:</strong> {defaultDepartments.join(', ')} (puedes agregar nuevos)</p>
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