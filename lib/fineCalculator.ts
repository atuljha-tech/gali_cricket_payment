import { isBeforeFeeStart } from './feeConfig'

/**
 * Calculate fine for a payment
 * @param year  - payment year
 * @param month - payment month (1-12)
 * @param dueDate - day of month due (e.g. 10)
 * @param dailyFine - fine per day in ₹
 * @param paidAt - date of payment (or today if still pending)
 */
export function calculateFine(
  year: number,
  month: number,
  dueDate: number,
  dailyFine: number,
  paidAt?: Date
): number {
  // Fee structure started July 2026 — earlier months never carry a fine.
  if (isBeforeFeeStart(year, month)) return 0

  const checkDate = paidAt ? new Date(paidAt) : new Date()

  // Due date is the `dueDate`th day of the given month
  const due = new Date(year, month - 1, dueDate, 23, 59, 59)

  if (checkDate <= due) return 0

  const msPerDay = 1000 * 60 * 60 * 24
  const daysLate = Math.ceil((checkDate.getTime() - due.getTime()) / msPerDay)
  return daysLate * dailyFine
}

/** Generate a receipt number like CRICKET-2026-0001 */
export function generateReceiptNo(year: number, sequence: number): string {
  return `CRICKET-${year}-${String(sequence).padStart(4, '0')}`
}

/** Month name from number */
export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
