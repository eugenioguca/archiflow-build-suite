/**
 * Zod schemas for Planning v2 with Spanish error messages
 */
import { z } from 'zod';

// Spanish error messages
const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === 'string') {
      return { message: 'Debe ser texto' };
    }
    if (issue.expected === 'number') {
      return { message: 'Debe ser un número' };
    }
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `Mínimo ${issue.minimum} caracteres` };
    }
    if (issue.type === 'number') {
      return { message: `Debe ser mayor o igual a ${issue.minimum}` };
    }
  }
  if (issue.code === z.ZodIssueCode.too_big) {
    if (issue.type === 'string') {
      return { message: `Máximo ${issue.maximum} caracteres` };
    }
    if (issue.type === 'number') {
      return { message: `Debe ser menor o igual a ${issue.maximum}` };
    }
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(errorMap);

/**
 * Budget schemas
 */
export const budgetStatusSchema = z.enum(['draft', 'published', 'closed'], {
  errorMap: () => ({ message: 'Estado inválido. Debe ser: borrador, publicado o cerrado' }),
});

const baseBudgetSchema = z.object({
  project_id: z.string().uuid('ID de proyecto inválido').nullable(),
  client_id: z.string().uuid('ID de cliente inválido').nullable(),
  name: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
  currency: z.string().min(3, 'Código de moneda inválido').max(3, 'Código de moneda inválido').default('MXN'),
  status: budgetStatusSchema.default('draft'),
  settings: z.record(z.any()).default({}),
});

export const createBudgetSchema = baseBudgetSchema.refine(
  (data) => data.project_id !== null || data.client_id !== null,
  { message: 'Debe especificar un proyecto o un cliente' }
);

export const updateBudgetSchema = baseBudgetSchema.partial();

/**
 * Partida schemas
 */
export const createPartidaSchema = z.object({
  budget_id: z.string().uuid('ID de presupuesto inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
  order_index: z.number().int('Debe ser un número entero').min(0, 'Debe ser mayor o igual a 0'),
  active: z.boolean().default(true),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').nullable().default(null),
});

export const updatePartidaSchema = createPartidaSchema.partial().omit({ budget_id: true });

/**
 * Concepto schemas
 */
export const createConceptoSchema = z.object({
  partida_id: z.string().uuid('ID de partida inválido'),
  code: z.string().max(50, 'Máximo 50 caracteres').nullable().default(null),
  short_description: z.string().min(1, 'La descripción corta es obligatoria').max(200, 'Máximo 200 caracteres'),
  long_description: z.string().max(2000, 'Máximo 2000 caracteres').nullable().default(null),
  unit: z.string().min(1, 'La unidad es obligatoria').max(20, 'Máximo 20 caracteres'),
  provider: z.string().max(200, 'Máximo 200 caracteres').nullable().default(null),
  
  active: z.boolean().default(true),
  sumable: z.boolean().default(true),
  order_index: z.number().int('Debe ser un número entero').min(0, 'Debe ser mayor o igual a 0'),
  
  // Cantidades
  cantidad_real: z.number().min(0, 'Debe ser mayor o igual a 0').default(0),
  desperdicio_pct: z.number().min(0, 'Debe ser mayor o igual a 0').max(1, 'Máximo 100%').default(0),
  
  // Precios
  precio_real: z.number().min(0, 'Debe ser mayor o igual a 0').default(0),
  honorarios_pct: z.number().min(0, 'Debe ser mayor o igual a 0').max(1, 'Máximo 100%').default(0),
  
  // WBS
  wbs_code: z.string().max(50, 'Máximo 50 caracteres').nullable().default(null),
  
  // Metadata
  props: z.record(z.any()).default({}),
});

export const updateConceptoSchema = createConceptoSchema.partial().omit({ partida_id: true });

/**
 * WBS Code schema
 */
export const wbsCodeSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(50, 'Máximo 50 caracteres'),
  departamento: z.string().max(100, 'Máximo 100 caracteres').nullable(),
  mayor: z.string().max(100, 'Máximo 100 caracteres').nullable(),
  partida: z.string().max(100, 'Máximo 100 caracteres').nullable(),
  subpartida: z.string().max(100, 'Máximo 100 caracteres').nullable(),
  description: z.string().max(500, 'Máximo 500 caracteres').nullable(),
});

/**
 * Template schemas
 */
export const createTemplateFieldSchema = z.object({
  template_id: z.string().uuid('ID de plantilla inválido'),
  key: z.string().min(1, 'La clave es obligatoria').max(100, 'Máximo 100 caracteres'),
  label: z.string().min(1, 'La etiqueta es obligatoria').max(200, 'Máximo 200 caracteres'),
  type: z.string().min(1, 'El tipo es obligatorio').max(50, 'Máximo 50 caracteres'),
  role: z.enum(['input', 'computed'], { errorMap: () => ({ message: 'Rol inválido' }) }),
  default_value: z.any(),
  formula: z.string().max(1000, 'Máximo 1000 caracteres').nullable().default(null),
  visible: z.boolean().default(true),
  helptext: z.string().max(500, 'Máximo 500 caracteres').nullable().default(null),
});

/**
 * Validation helper
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  
  return { success: false, errors };
}
