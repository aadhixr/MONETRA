// AURIX - Integer Paise Currency Engine
// Adheres strictly to institutional fintech standards: Zero IEEE 754 floating point distortion.

/**
 * Converts a standard INR decimal amount (e.g., 250.50 or '250.50') to integer paise (25050).
 */
export function toPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    // Strip any commas, spaces, currency symbols
    const cleaned = rupees.replace(/[^0-9.-]/g, '');
    if (!cleaned || isNaN(Number(cleaned))) return 0;
    const val = parseFloat(cleaned);
    return Math.round(val * 100);
  }
  if (isNaN(rupees) || !isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise back to Rupee float for display/formatting.
 */
export function toRupees(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return paise / 100;
}

let activeCurrencySymbol = '₹';

/**
 * Sets the active global currency symbol across the application (e.g. '$', '€', '£', 'د.إ', '₹').
 */
export function setGlobalCurrencySymbol(symbol: string): void {
  if (symbol && typeof symbol === 'string') {
    activeCurrencySymbol = symbol;
  }
}

/**
 * Returns the current active global currency symbol.
 */
export function getGlobalCurrencySymbol(): string {
  return activeCurrencySymbol;
}

/**
 * Formats integer paise/cents into standard currency notation with 2 decimal places (e.g. ₹1,45,250.00, $1,487.66, €250.50).
 */
export function formatPaise(
  paise: number,
  options?: {
    showDecimals?: boolean;
    showSign?: boolean;
    compact?: boolean;
    symbol?: string;
  }
): string {
  const { showDecimals = true, showSign = false, compact = false, symbol = activeCurrencySymbol } = options || {};
  const activeSymbol = symbol || activeCurrencySymbol || '₹';
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const units = absPaise / 100;

  if (compact && absPaise >= 10000000 && activeSymbol === '₹') { // 1 Crore (INR)
    const cr = (units / 10000000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}${activeSymbol}${cr} Cr`;
  }
  if (compact && absPaise >= 100000 && activeSymbol === '₹') { // 1 Lakh (INR)
    const lk = (units / 100000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}${activeSymbol}${lk} L`;
  }
  if (compact && absPaise >= 1000000) { // 1 Million
    const m = (units / 1000000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}${activeSymbol}${m}M`;
  }
  if (compact && absPaise >= 1000) { // 1k
    const k = (units / 1000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}${activeSymbol}${k}k`;
  }

  // Format using Standard Numbering System
  const parts = units.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  let formattedInt = integerPart;
  if (activeSymbol === '₹') {
    // Indian comma separation: last 3 digits, then groups of 2 digits
    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  } else {
    // Standard Western comma separation (groups of 3)
    formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const result = showDecimals !== false
    ? `${activeSymbol}${formattedInt}.${decimalPart}`
    : `${activeSymbol}${formattedInt}`;

  if (isNegative) return `-${result}`;
  if (showSign && paise > 0) return `+${result}`;
  return result;
}

/**
 * Arithmetic helper functions for integer paise
 */
export const PaiseMath = {
  add: (a: number, b: number): number => Math.round(a) + Math.round(b),
  subtract: (a: number, b: number): number => Math.round(a) - Math.round(b),
  multiply: (a: number, factor: number): number => Math.round(a * factor),
  divide: (a: number, divisor: number): number => (divisor === 0 ? 0 : Math.round(a / divisor)),
  sum: (items: number[]): number => items.reduce((acc, curr) => acc + Math.round(curr || 0), 0),
  percentage: (part: number, total: number): number => {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
  },
  percentageExceedable: (part: number, total: number): number => {
    if (total <= 0) return 0;
    return Math.round((part / total) * 100);
  }
};

