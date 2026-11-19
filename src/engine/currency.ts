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

/**
 * Formats integer paise into standard Indian Rupee notation with 2 decimal places (e.g. ₹1,45,250.00 or ₹250.50).
 */
export function formatPaise(
  paise: number,
  options?: {
    showDecimals?: boolean;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  // Always show two decimal numbers by default (e.g. ₹18,000.00, ₹1,11,009.00, ₹0.00)
  const { showDecimals = true, showSign = false, compact = false } = options || {};
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  if (compact && absPaise >= 10000000) { // 1 Crore
    const cr = (rupees / 10000000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}₹${cr} Cr`;
  }
  if (compact && absPaise >= 100000) { // 1 Lakh
    const lk = (rupees / 100000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}₹${lk} L`;
  }
  if (compact && absPaise >= 1000) { // 1k
    const k = (rupees / 1000).toFixed(2);
    return `${isNegative ? '-' : showSign ? '+' : ''}₹${k}k`;
  }

  // Format using Indian Numbering System
  const parts = rupees.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian comma separation: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = showDecimals !== false
    ? `₹${formattedInt}.${decimalPart}`
    : `₹${formattedInt}`;

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

