// AURIX - Date & Month Utilities
// Pure arithmetic, zero timezone offset bugs, institutional reliability.

/**
 * Returns current local year-month string ('YYYY-MM').
 */
export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns today's local date string ('YYYY-MM-DD').
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates previous month string ('YYYY-MM') without timezone drift.
 */
export function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  let newYear = year;
  let newMonth = month - 1;
  if (newMonth < 1) {
    newMonth = 12;
    newYear -= 1;
  }
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

/**
 * Calculates next month string ('YYYY-MM') without timezone drift.
 */
export function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  let newYear = year;
  let newMonth = month + 1;
  if (newMonth > 12) {
    newMonth = 1;
    newYear += 1;
  }
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

/**
 * Returns number of days in the given month ('YYYY-MM').
 */
export function getDaysInMonth(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Returns the last calendar date of the month ('YYYY-MM-DD').
 */
export function getMonthEndDate(monthStr: string): string {
  const days = getDaysInMonth(monthStr);
  return `${monthStr}-${String(days).padStart(2, '0')}`;
}

/**
 * Formats 'YYYY-MM' to short display, e.g. "Nov 2026".
 */
export function formatMonthShort(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/**
 * Formats 'YYYY-MM' to full display, e.g. "November 2026".
 */
export function formatMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Checks if the given monthStr is the current ongoing calendar month.
 */
export function isCurrentMonth(monthStr: string): boolean {
  return monthStr === getCurrentMonthStr();
}

/**
 * Checks if the given monthStr is in the past.
 */
export function isPastMonth(monthStr: string): boolean {
  return monthStr < getCurrentMonthStr();
}

/**
 * Checks if the given monthStr is in the future.
 */
export function isFutureMonth(monthStr: string): boolean {
  return monthStr > getCurrentMonthStr();
}

