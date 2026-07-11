/**
 * The GOC monthly fee structure was introduced in July 2026.
 * Any month before this is "not applicable" — it must never show a fee,
 * a fine, or count as a pending/outstanding due anywhere in the app.
 */
export const FEE_START_YEAR = 2026
export const FEE_START_MONTH = 7 // July

/** True if the given month/year is before the fee structure existed. */
export function isBeforeFeeStart(year: number, month: number): boolean {
  return year < FEE_START_YEAR || (year === FEE_START_YEAR && month < FEE_START_MONTH)
}

/**
 * How many months of a given year actually carry a fee
 * (Jul–Dec in 2026 = 6; a full 12 in later years; 0 before 2026).
 */
export function applicableMonthCount(year: number): number {
  if (year < FEE_START_YEAR) return 0
  if (year === FEE_START_YEAR) return 12 - FEE_START_MONTH + 1
  return 12
}

/**
 * How many months of a year are actually "due" as of now — i.e. fee applies
 * and the month is not in the future. Used to decide who is fully paid up.
 */
export function dueMonthCount(year: number, currentYear: number, currentMonth: number): number {
  if (year < FEE_START_YEAR || year > currentYear) return 0
  const first = year === FEE_START_YEAR ? FEE_START_MONTH : 1
  const last = year === currentYear ? currentMonth : 12
  return Math.max(0, last - first + 1)
}
