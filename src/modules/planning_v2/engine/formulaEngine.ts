/**
 * Formula engine for Planning v2
 * Computes derived fields using topological sort and Decimal.js for precision
 */
import Decimal from 'decimal.js';
import type {
  FieldKey,
  TemplateField,
  FormulaContext,
  ComputationResult,
  FieldNode,
  ComputationOrder,
} from '../domain/types';

// Configure Decimal.js for 6 decimal places
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Build dependency graph from template fields
 */
export function buildDependencyGraph(fields: TemplateField[]): Map<FieldKey, FieldNode> {
  const graph = new Map<FieldKey, FieldNode>();

  for (const field of fields) {
    const dependencies: FieldKey[] = [];
    
    if (field.formula && field.role === 'computed') {
      // Extract field keys from formula (simple regex for now)
      // Looks for patterns like: cantidad_real, desperdicio_pct, etc.
      const matches = field.formula.match(/\b[a-z_]+\b/g) || [];
      dependencies.push(...matches.filter(m => 
        m !== 'SUM' && 
        m !== 'AVG' && 
        m !== 'MIN' && 
        m !== 'MAX' && 
        m !== 'COUNT' &&
        m !== 'WHERE' &&
        m !== 'true' &&
        m !== 'false' &&
        m !== 'null'
      ));
    }

    graph.set(field.key, {
      key: field.key,
      formula: field.formula,
      role: field.role,
      dependencies: [...new Set(dependencies)], // Remove duplicates
    });
  }

  return graph;
}

/**
 * Topological sort with cycle detection
 */
export function topologicalSort(graph: Map<FieldKey, FieldNode>): ComputationOrder {
  const order: FieldKey[] = [];
  const visited = new Set<FieldKey>();
  const visiting = new Set<FieldKey>();
  const cycles: FieldKey[][] = [];

  function visit(key: FieldKey, path: FieldKey[] = []): boolean {
    if (visiting.has(key)) {
      // Cycle detected
      const cycleStart = path.indexOf(key);
      cycles.push([...path.slice(cycleStart), key]);
      return false;
    }

    if (visited.has(key)) {
      return true;
    }

    visiting.add(key);
    const node = graph.get(key);

    if (node) {
      for (const dep of node.dependencies) {
        if (!visit(dep, [...path, key])) {
          return false;
        }
      }
    }

    visiting.delete(key);
    visited.add(key);
    order.push(key);

    return true;
  }

  // Visit all nodes
  for (const key of graph.keys()) {
    if (!visited.has(key)) {
      visit(key);
    }
  }

  return { order, cycles };
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
  // Simple formula evaluator
  // Replace field keys with their values
  let expr = formula;
  
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    expr = expr.replace(regex, value.toString());
  }

  // Evaluate arithmetic expression
  try {
    // Use Decimal for evaluation
    // This is a simple implementation - for production, use a proper expression parser
    const result = new Function('Decimal', `return new Decimal(${expr})`)(Decimal);
    return result;
  } catch (error) {
    console.error('Error evaluating formula:', formula, error);
    return new Decimal(0);
  }
}

/**
 * Compute aggregation functions
 */
function computeAggregation(
  func: string,
  fieldKey: FieldKey,
  items: any[],
  predicate?: string
): Decimal {
  let filtered = items;

  // Apply predicate if provided
  if (predicate) {
    filtered = items.filter(item => {
      // Simple predicate evaluation: "sumable && active"
      const conditions = predicate.split('&&').map(c => c.trim());
      return conditions.every(cond => {
        const [field, expected] = cond.split('==').map(s => s.trim());
        if (expected === 'true') return item[field] === true;
        if (expected === 'false') return item[field] === false;
        return item[field] == expected;
      });
    });
  }

  const values = filtered.map(item => new Decimal(item[fieldKey] || 0));

  switch (func.toUpperCase()) {
    case 'SUM':
      return values.reduce((sum, val) => sum.plus(val), new Decimal(0));
    case 'AVG':
      if (values.length === 0) return new Decimal(0);
      return values.reduce((sum, val) => sum.plus(val), new Decimal(0)).div(values.length);
    case 'MIN':
      if (values.length === 0) return new Decimal(0);
      return Decimal.min(...values);
    case 'MAX':
      if (values.length === 0) return new Decimal(0);
      return Decimal.max(...values);
    case 'COUNT':
      return new Decimal(values.length);
    default:
      return new Decimal(0);
  }
}

/**
 * Compute all fields for an entity
 */
export function computeFields(
  context: FormulaContext
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

  // Initialize input values
  for (const field of fields) {
    if (field.role === 'input') {
      const value = entity[field.key];
      values[field.key] = new Decimal(value !== undefined && value !== null ? value : 0);
    }
  }

  // Compute fields in topological order
  for (const key of order) {
    const node = graph.get(key);
    if (!node) continue;

    if (node.role === 'computed' && node.formula) {
      try {
        // Check if it's an aggregation
        if (node.formula.includes('SUM(') || node.formula.includes('AVG(')) {
          // Parse aggregation: SUM(concepto.total WHERE sumable && active)
          const match = node.formula.match(/(\w+)\((\w+)\.(\w+)(?:\s+WHERE\s+(.+))?\)/);
          if (match && context.allConceptos) {
            const [, func, scope, field, predicate] = match;
            values[key] = computeAggregation(func, field, context.allConceptos, predicate);
          } else {
            values[key] = new Decimal(0);
          }
        } else {
          // Regular formula
          const formula = node.formula || DEFAULT_FORMULAS[key];
          if (formula) {
            values[key] = evaluateFormula(formula, values);
          }
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

  return {
    success: errors.length === 0,
    values,
    errors,
  };
}

/**
 * Format Decimal for display (2 decimals)
 */
export function formatDecimal(value: Decimal | number, decimals: number = 2): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return decimal.toFixed(decimals);
}

/**
 * Format Decimal for storage (6 decimals)
 */
export function toStorageValue(value: Decimal | number): number {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return parseFloat(decimal.toFixed(6));
}
