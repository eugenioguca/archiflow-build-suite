/**
 * Monetary utilities for Planning v2
 * Uses existing monetary utils but adds Planning v2 specific formatting
 */
import Decimal from 'decimal.js';
import { toNumber, formatMoney } from '@/utils/monetaryUtils';
import { formatCurrency } from '@/utils/gantt-v2/currency';

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Parse input to Decimal (6 decimals precision)
 */
export function parseToDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === 'string') {
    return new Decimal(toNumber(value));
  }
  return new Decimal(value);
}

/**
 * Format for storage (6 decimals)
 */
export function toStoragePrecision(value: Decimal | number): number {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return parseFloat(decimal.toFixed(6));
}

/**
 * Format for display (2 decimals by default)
 */
export function toDisplayPrecision(value: Decimal | number, decimals: number = 2): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return decimal.toFixed(decimals);
}

/**
 * Format as currency (MXN)
 */
export function formatAsCurrency(value: Decimal | number): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return formatCurrency(parseFloat(decimal.toString()));
}

/**
 * Format percentage (0.15 -> "15.00%")
 */
export function formatAsPercentage(value: Decimal | number, decimals: number = 2): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return `${decimal.times(100).toFixed(decimals)}%`;
}

/**
 * Parse percentage input ("15%" -> 0.15)
 */
export function parsePercentage(value: string): Decimal {
  const cleaned = value.replace('%', '').trim();
  return new Decimal(cleaned).div(100);
}

/**
 * Safe division (returns 0 if divisor is 0)
 */
export function safeDivide(numerator: Decimal, denominator: Decimal): Decimal {
  if (denominator.isZero()) return new Decimal(0);
  return numerator.div(denominator);
}

/**
 * Safe percentage calculation
 */
export function calculatePercentage(part: Decimal, total: Decimal): Decimal {
  if (total.isZero()) return new Decimal(0);
  return part.div(total).times(100);
}
