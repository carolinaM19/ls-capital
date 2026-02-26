/**
 * LS Capital — Underwriting Engine
 *
 * Computes loan structure, cash flows, and 6-year projections
 * for any residential/small commercial deal.
 *
 * All money values use CENTS internally for precision.
 * External callers pass/receive dollars.
 */

export interface UnderwritingInputs {
  purchasePrice: number       // dollars
  grossMonthlyRent: number    // dollars — stabilized market rent
  units: number
  interestRate: number        // percent e.g. 5.99
  maxLtv: number              // percent e.g. 80
  termYears: number           // e.g. 30
  expenseRatio: number        // percent of EGI e.g. 40
  vacancyRate: number         // percent e.g. 5
  rentGrowthRate: number      // percent per year e.g. 3
}

export interface YearProjection {
  year: number
  grossRent: number           // dollars
  egi: number                 // effective gross income (after vacancy)
  noi: number                 // dollars
  debtService: number         // dollars
  cashFlow: number            // dollars (before-tax)
  dscr: number
  cumulativeCashFlow: number
}

export interface UnderwritingOutputs {
  // Loan
  loanAmount: number | null           // dollars
  ltv: number | null                  // percent
  monthlyPayment: number | null       // dollars
  annualDebtService: number | null    // dollars
  equityRequired: number | null       // dollars
  // Income
  effectiveGrossIncome: number | null // dollars/yr
  operatingExpenses: number | null    // dollars/yr
  noi: number | null                  // dollars/yr
  // Returns
  capRate: number | null              // percent
  dscr: number | null
  cashOnCash: number | null           // percent
  // Per-unit
  pricePerUnit: number | null         // dollars
  // Projection
  projection: YearProjection[]
  // Raw cents for DB
  _cents: {
    loanAmount: number | null
    monthlyPayment: number | null
    annualDebtService: number | null
    noi: number | null
    equityRequired: number | null
    pricePerUnit: number | null
  }
}

/**
 * Monthly mortgage payment using standard amortization formula.
 * P * [r(1+r)^n] / [(1+r)^n – 1]
 */
export function monthlyMortgagePayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0
  const r = annualRate / 100 / 12
  const n = termYears * 12
  if (r === 0) return principal / n
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function computeUnderwriting(inputs: UnderwritingInputs): UnderwritingOutputs {
  const {
    purchasePrice, grossMonthlyRent, units, interestRate,
    maxLtv, termYears, expenseRatio, vacancyRate, rentGrowthRate,
  } = inputs

  if (!purchasePrice || purchasePrice <= 0 || !grossMonthlyRent || grossMonthlyRent <= 0) {
    return {
      loanAmount: null, ltv: null, monthlyPayment: null,
      annualDebtService: null, equityRequired: null,
      effectiveGrossIncome: null, operatingExpenses: null,
      noi: null, capRate: null, dscr: null, cashOnCash: null,
      pricePerUnit: units > 0 ? purchasePrice / units : null,
      projection: [],
      _cents: {
        loanAmount: null, monthlyPayment: null, annualDebtService: null,
        noi: null, equityRequired: null, pricePerUnit: units > 0 ? Math.round(purchasePrice / units * 100) : null,
      },
    }
  }

  // ── LOAN ──────────────────────────────────────────────────────────────────
  const loanAmount = purchasePrice * (maxLtv / 100)
  const ltv = maxLtv
  const monthlyPayment = monthlyMortgagePayment(loanAmount, interestRate, termYears)
  const annualDebtService = monthlyPayment * 12
  const equityRequired = purchasePrice - loanAmount

  // ── INCOME ────────────────────────────────────────────────────────────────
  const annualGrossRent = grossMonthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate / 100)
  const operatingExpenses = effectiveGrossIncome * (expenseRatio / 100)
  const noi = effectiveGrossIncome - operatingExpenses

  // ── RETURNS ───────────────────────────────────────────────────────────────
  const capRate = (noi / purchasePrice) * 100
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
  const cashFlow = noi - annualDebtService
  const cashOnCash = equityRequired > 0 ? (cashFlow / equityRequired) * 100 : 0
  const pricePerUnit = units > 0 ? purchasePrice / units : purchasePrice

  // ── 6-YEAR PROJECTION ─────────────────────────────────────────────────────
  let cumulativeCashFlow = 0
  const projection: YearProjection[] = []

  for (let yr = 1; yr <= 6; yr++) {
    const growthFactor = Math.pow(1 + rentGrowthRate / 100, yr - 1)
    const projGrossRent = annualGrossRent * growthFactor
    const projEGI = projGrossRent * (1 - vacancyRate / 100)
    const projExpenses = projEGI * (expenseRatio / 100)
    const projNOI = projEGI - projExpenses
    const projCashFlow = projNOI - annualDebtService
    const projDSCR = annualDebtService > 0 ? projNOI / annualDebtService : 0
    cumulativeCashFlow += projCashFlow

    projection.push({
      year: yr,
      grossRent: Math.round(projGrossRent),
      egi: Math.round(projEGI),
      noi: Math.round(projNOI),
      debtService: Math.round(annualDebtService),
      cashFlow: Math.round(projCashFlow),
      dscr: Math.round(projDSCR * 1000) / 1000,
      cumulativeCashFlow: Math.round(cumulativeCashFlow),
    })
  }

  return {
    loanAmount: Math.round(loanAmount * 100) / 100,
    ltv,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    annualDebtService: Math.round(annualDebtService * 100) / 100,
    equityRequired: Math.round(equityRequired * 100) / 100,
    effectiveGrossIncome: Math.round(effectiveGrossIncome * 100) / 100,
    operatingExpenses: Math.round(operatingExpenses * 100) / 100,
    noi: Math.round(noi * 100) / 100,
    capRate: Math.round(capRate * 1000) / 1000,
    dscr: Math.round(dscr * 1000) / 1000,
    cashOnCash: Math.round(cashOnCash * 1000) / 1000,
    pricePerUnit: Math.round(pricePerUnit * 100) / 100,
    projection,
    _cents: {
      loanAmount: Math.round(loanAmount * 100),
      monthlyPayment: Math.round(monthlyPayment * 100),
      annualDebtService: Math.round(annualDebtService * 100),
      noi: Math.round(noi * 100),
      equityRequired: Math.round(equityRequired * 100),
      pricePerUnit: Math.round(pricePerUnit * 100),
    },
  }
}

/**
 * Stress test: what happens at +200bps rate shock and -10% rent decline?
 * Returns stressed DSCR and whether it still covers.
 */
export function stressTest(inputs: UnderwritingInputs): { stressedDSCR: number; passes: boolean } {
  const stressed = computeUnderwriting({
    ...inputs,
    interestRate: inputs.interestRate + 2.0,
    grossMonthlyRent: inputs.grossMonthlyRent * 0.90,
    vacancyRate: inputs.vacancyRate + 5,
  })

  const dscr = stressed.dscr ?? 0
  return { stressedDSCR: dscr, passes: dscr >= 1.0 }
}
