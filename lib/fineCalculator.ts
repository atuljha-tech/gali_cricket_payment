/**
 * Fine system has been removed.
 * This file is kept for its non-fine utilities (receipt numbering, month names).
 */

import { isBeforeFeeStart } from './feeConfig'

/**
 * @deprecated Fine system removed. Always returns 0.
 */
export function calculateFine(
  _year: number,
  _month: number,
  _dueDate: number,
  _dailyFine: number,
  _paidAt?: Date
): number {
  return 0
}

/** Generate a receipt number like CRICKET-2026-0001 */
export function generateReceiptNo(year: number, sequence: number): string {
  return `CRICKET-${year}-${String(sequence).padStart(4, '0')}`
}

/** Month name from number (1-indexed, index 0 unused) */
export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Keep isBeforeFeeStart re-exported for backward compat
export { isBeforeFeeStart }
