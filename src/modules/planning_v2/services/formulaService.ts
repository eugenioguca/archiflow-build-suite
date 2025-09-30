/**
 * Formula validation and evaluation service for Planning v2
 */

export interface FormulaField {
  key: string;
  label: string;
  type: 'number' | 'text';
}

export const AVAILABLE_FIELDS: FormulaField[] = [
  { key: 'cantidad_real', label: 'Cantidad Real', type: 'number' },
  { key: 'desperdicio_pct', label: '% Desperdicio', type: 'number' },
  { key: 'cantidad', label: 'Cantidad', type: 'number' },
  { key: 'precio_real', label: 'Precio Real', type: 'number' },
  { key: 'honorarios_pct', label: '% Honorarios', type: 'number' },
  { key: 'pu', label: 'PU', type: 'number' },
  { key: 'total', label: 'Total', type: 'number' },
];

export interface FormulaValidationResult {
  isValid: boolean;
  errors: string[];
  dependencies: string[];
}

/**
 * Extract field dependencies from formula
 */
export function extractDependencies(formula: string): string[] {
  const fieldKeys = AVAILABLE_FIELDS.map(f => f.key);
  const dependencies: string[] = [];
  
  // Match field names wrapped in brackets or standalone
  const pattern = new RegExp(`\\b(${fieldKeys.join('|')})\\b`, 'g');
  const matches = formula.match(pattern);
  
  if (matches) {
    dependencies.push(...new Set(matches));
  }
  
  return dependencies;
}

/**
 * Validate formula syntax and dependencies
 */
export function validateFormula(formula: string): FormulaValidationResult {
  const errors: string[] = [];
  const dependencies = extractDependencies(formula);
  
  if (!formula || formula.trim() === '') {
    errors.push('La fórmula no puede estar vacía');
    return { isValid: false, errors, dependencies: [] };
  }
  
  // Check for circular dependencies (basic check)
  // More advanced would require full dependency graph
  
  // Check for balanced parentheses
  let balance = 0;
  for (const char of formula) {
    if (char === '(') balance++;
    if (char === ')') balance--;
    if (balance < 0) {
      errors.push('Paréntesis desbalanceados');
      break;
    }
  }
  if (balance !== 0) {
    errors.push('Paréntesis desbalanceados');
  }
  
  // Check for invalid characters (allow numbers, operators, parentheses, field names, dots, spaces)
  const validPattern = /^[0-9a-z_+\-*/().%\s]+$/i;
  if (!validPattern.test(formula)) {
    errors.push('La fórmula contiene caracteres inválidos');
  }
  
  // Check for invalid operators sequence
  const invalidSequences = ['++', '--', '**', '//', '+-', '-+', '*+', '/+'];
  for (const seq of invalidSequences) {
    if (formula.includes(seq)) {
      errors.push(`Secuencia de operadores inválida: ${seq}`);
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    dependencies,
  };
}

/**
 * Evaluate formula with given field values
 */
export function evaluateFormula(
  formula: string,
  fieldValues: Record<string, number>
): number | null {
  try {
    // Replace field names with their values
    let expression = formula;
    
    for (const [key, value] of Object.entries(fieldValues)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    }
    
    // Evaluate the expression safely
    // Note: In production, use a proper math parser library
    // This is a simple implementation for demo purposes
    const result = Function(`"use strict"; return (${expression})`)();
    
    if (typeof result === 'number' && !isNaN(result)) {
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Error evaluating formula:', error);
    return null;
  }
}

/**
 * Get field suggestions for autocomplete
 */
export function getFieldSuggestions(input: string): FormulaField[] {
  const lowerInput = input.toLowerCase();
  
  return AVAILABLE_FIELDS.filter(
    field =>
      field.key.toLowerCase().includes(lowerInput) ||
      field.label.toLowerCase().includes(lowerInput)
  );
}
