/**
 * Servicio de importación para Planning v2
 * Soporta Excel y CSV con mapeo de columnas
 */
import * as XLSX from 'xlsx';
import { Decimal } from 'decimal.js';

export interface ImportColumn {
  sourceColumn: string; // Columna del archivo (ej: "A", "Precio", "Column 3")
  targetField: string | null; // Campo de destino o null si no se mapea
  sampleValues: string[]; // Valores de muestra para ayudar al usuario
}

export interface ImportRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: string[];
  isValid: boolean;
}

export interface ImportResult {
  columns: ImportColumn[];
  rows: ImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

const AVAILABLE_FIELDS = [
  { key: 'code', label: 'Código', required: false },
  { key: 'short_description', label: 'Descripción Corta', required: true },
  { key: 'long_description', label: 'Descripción Larga', required: false },
  { key: 'unit', label: 'Unidad', required: true },
  { key: 'cantidad_real', label: 'Cantidad Real', required: true },
  { key: 'desperdicio_pct', label: '% Desperdicio', required: false },
  { key: 'precio_real', label: 'Precio Real', required: true },
  { key: 'honorarios_pct', label: '% Honorarios', required: false },
  { key: 'provider', label: 'Proveedor', required: false },
  { key: 'wbs_code', label: 'WBS Code', required: false },
];

export const importService = {
  /**
   * Obtener campos disponibles para mapeo
   */
  getAvailableFields() {
    return AVAILABLE_FIELDS;
  },

  /**
   * Parsear archivo Excel o CSV
   */
  async parseFile(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

          if (!jsonData || jsonData.length < 2) {
            reject(new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos'));
            return;
          }

          // Primera fila son encabezados
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);

          // Crear columnas con valores de muestra
          const columns: ImportColumn[] = headers.map((header, index) => {
            const sampleValues = dataRows
              .slice(0, 5)
              .map(row => row[index])
              .filter(val => val !== undefined && val !== null && val !== '')
              .map(val => String(val));

            return {
              sourceColumn: header || `Columna ${index + 1}`,
              targetField: null,
              sampleValues,
            };
          });

          // Crear filas sin mapeo aún (se hará después)
          const rows: ImportRow[] = dataRows.map((row, index) => ({
            rowIndex: index + 2, // +2 porque índice 0 son headers y queremos número de fila Excel
            data: {},
            errors: [],
            isValid: false,
          }));

          resolve({
            columns,
            rows,
            totalRows: rows.length,
            validRows: 0,
            invalidRows: 0,
          });
        } catch (error) {
          reject(new Error(`Error al parsear archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsBinaryString(file);
    });
  },

  /**
   * Aplicar mapeo de columnas y validar datos
   */
  applyColumnMapping(
    rawData: any[][],
    columnMapping: Map<string, string> // sourceColumn → targetField
  ): ImportRow[] {
    if (!rawData || rawData.length < 2) return [];

    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    return dataRows.map((row, index) => {
      const mappedData: Record<string, any> = {};
      const errors: string[] = [];

      // Aplicar mapeo
      headers.forEach((header, colIndex) => {
        const targetField = columnMapping.get(header);
        if (targetField) {
          const rawValue = row[colIndex];
          mappedData[targetField] = rawValue;
        }
      });

      // Validar campos requeridos
      const requiredFields = AVAILABLE_FIELDS.filter(f => f.required);
      requiredFields.forEach(field => {
        if (!mappedData[field.key] || String(mappedData[field.key]).trim() === '') {
          errors.push(`Campo requerido faltante: ${field.label}`);
        }
      });

      // Validar y parsear números
      const numericFields = ['cantidad_real', 'desperdicio_pct', 'precio_real', 'honorarios_pct'];
      numericFields.forEach(field => {
        if (mappedData[field] !== undefined && mappedData[field] !== null && mappedData[field] !== '') {
          const parsed = this.parseNumber(mappedData[field]);
          if (parsed === null) {
            errors.push(`Formato numérico inválido en ${field}: "${mappedData[field]}"`);
          } else {
            mappedData[field] = parsed;
          }
        }
      });

      // Validar rangos
      if (mappedData.desperdicio_pct !== undefined) {
        const val = Number(mappedData.desperdicio_pct);
        if (val < 0 || val > 100) {
          errors.push('% Desperdicio debe estar entre 0 y 100');
        }
      }

      if (mappedData.honorarios_pct !== undefined) {
        const val = Number(mappedData.honorarios_pct);
        if (val < 0 || val > 100) {
          errors.push('% Honorarios debe estar entre 0 y 100');
        }
      }

      return {
        rowIndex: index + 2,
        data: mappedData,
        errors,
        isValid: errors.length === 0,
      };
    });
  },

  /**
   * Parsear número con soporte para separadores mexicanos
   * Soporta: 1,234.56 | 1.234,56 | 1234.56 | 1234,56
   */
  parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    
    const str = String(value).trim();
    
    // Si ya es un número válido
    if (!isNaN(Number(str))) {
      return Number(str);
    }

    // Remover espacios
    let cleaned = str.replace(/\s/g, '');

    // Detectar formato: si tiene coma y punto, el último es el decimal
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      // Determinar cuál es el separador decimal (el último)
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastDot > lastComma) {
        // Formato: 1,234.56 (separador de miles coma, decimal punto)
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // Formato: 1.234,56 (separador de miles punto, decimal coma)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (hasComma && !hasDot) {
      // Solo coma: puede ser decimal o miles
      // Si solo hay una coma y viene después de 3 dígitos desde el final, es miles
      const commaPos = cleaned.indexOf(',');
      const afterComma = cleaned.substring(commaPos + 1);
      
      if (afterComma.length === 3 && cleaned.length > 4) {
        // Es separador de miles: 1,234
        cleaned = cleaned.replace(',', '');
      } else {
        // Es decimal: 12,56
        cleaned = cleaned.replace(',', '.');
      }
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  },

  /**
   * Validar que el mapeo es correcto
   */
  validateMapping(columnMapping: Map<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = AVAILABLE_FIELDS.filter(f => f.required);
    const mappedFields = new Set(columnMapping.values());

    requiredFields.forEach(field => {
      if (!mappedFields.has(field.key)) {
        errors.push(`Falta mapear el campo requerido: ${field.label}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Persistir importación de forma atómica usando Edge Function
   * Si alguna fila falla, toda la importación se revierte
   */
  async persistImport(
    budgetId: string,
    partidaId: string,
    validRows: ImportRow[],
    referenceTotal?: number
  ): Promise<{ success: boolean; message: string; importedCount?: number; errors?: string[] }> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Preparar filas para importación atómica
      const rows = validRows.map(row => ({
        code: row.data.code || null,
        description: row.data.short_description,
        unit: row.data.unit,
        cantidad_real: row.data.cantidad_real || 0,
        desperdicio_pct: row.data.desperdicio_pct || 0,
        precio_real: row.data.precio_real || 0,
        honorarios_pct: row.data.honorarios_pct || 0,
        proveedor: row.data.provider || null,
        wbs: row.data.wbs_code || null,
      }));

      // Llamar a Edge Function de importación atómica
      const { data, error } = await supabase.functions.invoke('planning-import-atomic', {
        body: {
          budgetId,
          partidaId,
          rows,
          referenceTotal,
        },
      });

      if (error) {
        console.error('Error en Edge Function:', error);
        return {
          success: false,
          message: `Importación revertida. ${error.message}`,
          errors: [error.message],
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          message: data?.error || 'Importación revertida. Error desconocido',
          errors: [data?.error || 'Error desconocido'],
        };
      }

      return {
        success: true,
        message: data.message,
        importedCount: data.importedCount,
      };
      
    } catch (error) {
      console.error('Error crítico en persistImport:', error);
      return {
        success: false,
        message: 'Importación revertida. Error crítico en el proceso de importación.',
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
      };
    }
  },

  /**
   * Generar sugerencias automáticas de mapeo
   */
  suggestMapping(columns: ImportColumn[]): Map<string, string> {
    const mapping = new Map<string, string>();
    
    const keywords: Record<string, string[]> = {
      code: ['codigo', 'code', 'clave', 'id'],
      short_description: ['descripcion', 'description', 'desc', 'concepto', 'nombre', 'name'],
      long_description: ['descripcion larga', 'long description', 'detalle', 'detail'],
      unit: ['unidad', 'unit', 'medida', 'um', 'u.m.'],
      cantidad_real: ['cantidad', 'quantity', 'qty', 'cant', 'cantidad real'],
      desperdicio_pct: ['desperdicio', 'waste', 'merma', '%desperdicio', '% desperdicio'],
      precio_real: ['precio', 'price', 'pu', 'p.u.', 'precio unitario', 'precio real'],
      honorarios_pct: ['honorarios', 'fee', '%honorarios', '% honorarios'],
      provider: ['proveedor', 'provider', 'supplier', 'vendedor'],
      wbs_code: ['wbs', 'wbs code', 'codigo wbs', 'wbs_code'],
    };

    columns.forEach(col => {
      const colLower = col.sourceColumn.toLowerCase().trim();
      
      for (const [fieldKey, fieldKeywords] of Object.entries(keywords)) {
        if (fieldKeywords.some(keyword => colLower.includes(keyword))) {
          mapping.set(col.sourceColumn, fieldKey);
          break;
        }
      }
    });

    return mapping;
  },
};
