/**
 * Optimized formula engine with incremental recomputation
 * Only recomputes affected fields based on dependency graph
 */
import Decimal from 'decimal.js';
import type {
  FieldKey,
  TemplateField,
  FormulaContext,
  ComputationResult,
  FieldNode,
} from '../domain/types';
import { buildDependencyGraph, topologicalSort } from './formulaEngine';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Build reverse dependency graph (which fields depend on a given field)
 */
function buildReverseDependencies(graph: Map<FieldKey, FieldNode>): Map<FieldKey, Set<FieldKey>> {
  const reverseDeps = new Map<FieldKey, Set<FieldKey>>();

  for (const [key, node] of graph.entries()) {
    for (const dep of node.dependencies) {
      if (!reverseDeps.has(dep)) {
        reverseDeps.set(dep, new Set());
      }
      reverseDeps.get(dep)!.add(key);
    }
  }

  return reverseDeps;
}

/**
 * Find all fields that need recomputation when changedFields are updated
 */
function findAffectedFields(
  changedFields: Set<FieldKey>,
  reverseDeps: Map<FieldKey, Set<FieldKey>>
): Set<FieldKey> {
  const affected = new Set<FieldKey>();
  const queue = Array.from(changedFields);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseDeps.get(current) || new Set();

    for (const dependent of dependents) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return affected;
}

/**
 * Default formulas for core fields
 */
const DEFAULT_FORMULAS: Record<FieldKey, string> = {
  cantidad: 'cantidad_real * (1 + desperdicio_pct)',
  pu: 'precio_real * (1 + honorarios_pct)',
  total_real: 'precio_real * cantidad_real',
  total: 'pu * cantidad',
};

/**
 * Evaluate a formula in context
 */
function evaluateFormula(
  formula: string,
  context: Record<string, Decimal>
): Decimal {
  let expr = formula;
  
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    expr = expr.replace(regex, value.toString());
  }

  try {
    const result = new Function('Decimal', `return new Decimal(${expr})`)(Decimal);
    return result;
  } catch (error) {
    console.error('Error evaluating formula:', formula, error);
    return new Decimal(0);
  }
}

/**
 * Incremental computation: only recompute changed and affected fields
 */
export function computeFieldsIncremental(
  context: FormulaContext,
  changedFields?: Set<FieldKey>
): ComputationResult {
  const { entity, fields } = context;
  const graph = buildDependencyGraph(fields);
  const { order, cycles } = topologicalSort(graph);

  const errors: ComputationResult['errors'] = [];
  const values: Record<FieldKey, Decimal> = {};

  // Report cycles
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push({
        field: cycle[0],
        message: `Dependencia circular detectada: ${cycle.join(' → ')}`,
        dependencies: cycle,
      });
    }
    return { success: false, values, errors };
  }

  // Initialize ALL input values (needed for formula evaluation)
  for (const field of fields) {
    if (field.role === 'input') {
      const value = entity[field.key];
      values[field.key] = new Decimal(value !== undefined && value !== null ? value : 0);
    }
  }

  // If no changedFields specified, compute everything
  if (!changedFields || changedFields.size === 0) {
    // Full recomputation
    for (const key of order) {
      const node = graph.get(key);
      if (!node) continue;

      if (node.role === 'computed' && node.formula) {
        try {
          const formula = node.formula || DEFAULT_FORMULAS[key];
          if (formula) {
            values[key] = evaluateFormula(formula, values);
          }
        } catch (error) {
          errors.push({
            field: key,
            message: `Error al calcular ${key}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          });
          values[key] = new Decimal(0);
        }
      }
    }
  } else {
    // Incremental recomputation
    const reverseDeps = buildReverseDependencies(graph);
    const affectedFields = findAffectedFields(changedFields, reverseDeps);

    // First, load existing computed values that are NOT affected
    for (const field of fields) {
      if (field.role === 'computed' && !affectedFields.has(field.key)) {
        const value = entity[field.key];
        values[field.key] = new Decimal(value !== undefined && value !== null ? value : 0);
      }
    }

    // Then, recompute only affected fields in topological order
    for (const key of order) {
      if (!affectedFields.has(key)) continue;

      const node = graph.get(key);
      if (!node) continue;

      if (node.role === 'computed' && node.formula) {
        try {
          const formula = node.formula || DEFAULT_FORMULAS[key];
          if (formula) {
            values[key] = evaluateFormula(formula, values);
          }
        } catch (error) {
          errors.push({
            field: key,
            message: `Error al calcular ${key}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          });
          values[key] = new Decimal(0);
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    values,
    errors,
  };
}

/**
 * Helper to determine which input fields changed
 */
export function detectChangedFields(
  oldEntity: Record<string, any>,
  newEntity: Record<string, any>,
  inputFields: string[]
): Set<FieldKey> {
  const changed = new Set<FieldKey>();

  for (const field of inputFields) {
    const oldValue = oldEntity[field];
    const newValue = newEntity[field];

    if (oldValue !== newValue) {
      changed.add(field);
    }
  }

  return changed;
}
