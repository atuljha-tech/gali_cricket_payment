/**
 * Payment Allocation Engine
 *
 * Handles flexible payment amounts for monthly cricket subscriptions.
 * Rules:
 *   - Monthly fee = MONTHLY_FEE (₹30 default)
 *   - Any amount can be paid
 *   - Amount is applied month-by-month from the earliest unpaid month
 *   - Excess after full months = Credit (stored on Player.creditBalance)
 *   - Shortfall for current month = Due (stored on Player.dueBalance)
 *   - Future payments first use existing credit before calculating new due
 */

export interface MonthAllocation {
  month: number
  year: number
  status: 'paid' | 'partial'
  amountApplied: number   // how much of this payment went to this month
  credit: number           // credit generated (only for last entry when excess remains)
  due: number              // due remaining (only for partial month)
}

export interface AllocationResult {
  months: MonthAllocation[]
  creditGenerated: number   // net new credit from this payment
  dueRemaining: number      // net due after this payment
  totalApplied: number      // sum of amountApplied across all months
}

/**
 * Allocate a payment amount across months.
 *
 * @param amountPaid     - amount the player paid NOW (not including credit)
 * @param existingCredit - player's existing credit before this payment
 * @param existingDue    - player's existing due before this payment
 * @param startMonth     - first unpaid month (1-12)
 * @param startYear      - year of startMonth
 * @param monthlyFee     - configured monthly fee (default ₹30)
 * @returns AllocationResult with per-month breakdown
 */
export function allocatePayment(
  amountPaid: number,
  existingCredit: number,
  existingDue: number,
  startMonth: number,
  startYear: number,
  monthlyFee: number = 30
): AllocationResult {
  // Total available = new payment + any existing credit
  let pool = amountPaid + existingCredit

  // First, settle any existing due
  const dueSettled = Math.min(pool, existingDue)
  pool -= dueSettled
  const remainingDue = existingDue - dueSettled

  const months: MonthAllocation[] = []
  let m = startMonth
  let y = startYear

  // If there was an existing partial month due, handle it first
  if (remainingDue === 0 && existingDue > 0 && dueSettled > 0) {
    // The existing due was cleared but we don't know exactly which month it was for.
    // The caller should have adjusted startMonth to be the next month.
    // This is handled by the API layer.
  }

  // Allocate remaining pool to complete months
  while (pool >= monthlyFee) {
    months.push({
      month: m,
      year: y,
      status: 'paid',
      amountApplied: monthlyFee,
      credit: 0,
      due: 0,
    })
    pool -= monthlyFee
    // advance month
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }

  // Remaining pool is either credit (> 0) or partial payment
  let creditGenerated = 0
  let dueRemaining = 0

  if (pool > 0) {
    // Partial: pool < monthlyFee, current month partially paid
    months.push({
      month: m,
      year: y,
      status: 'partial',
      amountApplied: pool,
      credit: 0,
      due: monthlyFee - pool,
    })
    dueRemaining = monthlyFee - pool
    pool = 0
  }

  // If pool ended exactly at 0, no credit, no due for new months
  // If pool is 0 with no partial, credit = 0
  creditGenerated = pool // should be 0 here; pool captured below

  // Re-calc: credit is whatever remains after all months and partial
  // The above loop leaves pool at 0 when we have a partial. Recalculate from scratch.
  return computeAllocation(amountPaid, existingCredit, existingDue, startMonth, startYear, monthlyFee)
}

function computeAllocation(
  amountPaid: number,
  existingCredit: number,
  existingDue: number,
  startMonth: number,
  startYear: number,
  monthlyFee: number
): AllocationResult {
  let pool = amountPaid + existingCredit

  const months: MonthAllocation[] = []

  // Settle existing due first
  let remainingDue = existingDue
  if (remainingDue > 0) {
    const settle = Math.min(pool, remainingDue)
    pool -= settle
    remainingDue -= settle
  }

  // Allocate complete months
  let m = startMonth
  let y = startYear

  while (pool >= monthlyFee) {
    months.push({
      month: m,
      year: y,
      status: 'paid',
      amountApplied: monthlyFee,
      credit: 0,
      due: 0,
    })
    pool -= monthlyFee
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }

  // Handle remainder
  let creditGenerated = 0
  let dueRemaining = remainingDue

  if (pool > 0 && pool < monthlyFee) {
    // Partial month
    months.push({
      month: m,
      year: y,
      status: 'partial',
      amountApplied: pool,
      credit: 0,
      due: monthlyFee - pool,
    })
    dueRemaining += monthlyFee - pool
    pool = 0
  } else if (pool === 0) {
    // Exact amount, no credit no partial due for new months
    creditGenerated = 0
  }

  // If after completing all months there's still pool left (shouldn't happen here as pool < monthlyFee would have been caught above)
  // Actually if pool == 0 after the while loop, we are done
  // creditGenerated = pool (which is 0 or was handled as partial)
  creditGenerated = pool

  const totalApplied = months.reduce((s, x) => s + x.amountApplied, 0)

  return {
    months,
    creditGenerated,
    dueRemaining,
    totalApplied,
  }
}
