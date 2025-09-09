/**
 * Utility functions for monetary value parsing and formatting
 */

/**
 * Parse monetary string to number, removing currency symbols and separators
 * @param value - String like "$ 1,234.56" or "1,234.56"
 * @returns Number value
 */
export function toNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbols, spaces, and thousand separators
  const cleaned = value.toString().replace(/[$\s,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number to monetary string
 * @param value - Number to format
 * @returns Formatted string like "$ 1,234.56"
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Validate if a monetary value is valid
 * @param cantidad - Quantity value
 * @param precioUnitario - Unit price value
 * @returns Object with validation result and error message
 */
export function validateMonetaryInput(cantidad: number, precioUnitario: number) {
  if (cantidad <= 0) {
    return { isValid: false, error: 'La cantidad debe ser mayor a 0' };
  }
  
  if (precioUnitario < 0) {
    return { isValid: false, error: 'El precio unitario no puede ser negativo' };
  }
  
  return { isValid: true, error: null };
}