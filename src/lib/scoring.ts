/**
 * LS Capital — Bankability Score Engine
 *
 * FORMULA DOCUMENTATION
 * ─────────────────────
 * The Bankability Score (0–100) measures how suitable a deal is for
 * LS Finance's private credit structure: 80% LTV @ 5.99%, 30yr, $10M cap.
 *
 * Seven weighted factors:
 *
 * 1. DSCR Strength (25% default)
 *    - DSCR < 1.0  → 0 pts (loan not serviceable)
 *    - 1.0–1.10    → 20 pts
 *    - 1.10–1.20   → 40 pts
 *    - 1.20–1.30   → 65 pts  ← LS Finance minimum = 1.20
 *    - 1.30–1.50   → 85 pts
 *    - > 1.50      → 100 pts
 *
 * 2. LTV Feasibility (20% default)
 *    - > 80% LTV needed → 0 pts (deal requires more than max leverage)
 *    - 75–80%           → 60 pts
 *    - 70–75%           → 80 pts
 *    - < 70%            → 100 pts
 *    Note: We always lend at 80%, so this measures value buffer
 *
 * 3. Cap Rate Band (15% default)
 *    - < 4.0%   → 10 pts (compressed yield)
 *    - 4.0–5.0  → 40 pts
 *    - 5.0–6.0  → 65 pts
 *    - 6.0–7.5  → 85 pts
 *    - > 7.5%   → 100 pts
 *
 * 4. Value-Add Signals (15% default)
 *    - Keyword detection in description:
 *      under-market, renovation, vacancy, value-add, deferred maintenance,
 *      upside, below market, reposition, distressed, cosmetic, rehab,
 *      motivated seller, upside, turnaround, management improvement
 *    - 0 keywords → 20 pts (no story)
 *    - 1 keyword  → 50 pts
 *    - 2 keywords → 70 pts
 *    - 3+ keywords → 95 pts
 *
 * 5. Price Per Unit vs Region (10% default)
 *    - Uses national thresholds (regional model in Phase 2):
 *    - > $300K/unit  → 10 pts
 *    - $200–300K     → 30 pts
 *    - $100–200K     → 70 pts
 *    - $50–100K      → 90 pts
 *    - < $50K        → 75 pts (too cheap may = distress risk)
 *
 * 6. Data Completeness (10% default)
 *    - Rewards complete data packages: price, rents, occupancy, sqft, year built
 *    - 8+ fields populated → 100 pts
 *    - Linear scale below
 *
 * 7. Stress Test Resilience (5% default)
 *    - Applies +200bps rate shock + -10% rent decline + +5% vacancy
 *    - Stressed DSCR ≥ 1.10 → 100 pts
 *    - 1.0–1.10 → 60 pts
 *    - < 1.0    → 0 pts
 *
 * Final score = Σ (factor_score × weight) → rounded to integer
 */

import { stressTest } from './underwriting'

const VALUE_ADD_KEYWORDS = [
  'under-market', 'under market', 'below market', 'below-market',
  'renovation', 'renovate', 'rehab', 'rehabilitation',
  'value add', 'value-add', 'value play',
  'vacancy', 'vacant', 'distressed', 'distress',
  'deferred maintenance', 'deferred',
  'upside', 'repositioning', 'reposition',
  'motivated seller', 'motivated',
  'cosmetic', 'cosmetic upgrade', 'management improvement',
  'turnaround', 'mismanaged',
]

export interface ScoringInputs {
  dscr: number | null
  ltvUsed: number | null          // the LTV we'd use (should be ≤ 80)
  capRate: number | null
  description: string | null
  pricePerUnit: number | null     // dollars
  units: number
  occupancyRate: number | null
  hasRentData: boolean
  hasSqFt: boolean
  hasYearBuilt: boolean
  // For stress test
  uwInputs?: {
    purchasePrice: number
    grossMonthlyRent: number
    interestRate: number
    maxLtv: number
    termYears: number
    expenseRatio: number
    vacancyRate: number
    rentGrowthRate: number
  }
}

export interface ScoreBreakdown {
  dscrScore: number
  ltvScore: number
  capRateScore: number
  valueAddScore: number
  pricePerUnitScore: number
  completenessScore: number
  stressTestScore: number
  total: number
  details: Record<string, string>
  weights: Record<string, number>
}

// Default weights — admin can override
export const DEFAULT_WEIGHTS = {
  dscr: 0.25,
  ltv: 0.20,
  cap_rate: 0.15,
  value_add: 0.15,
  price_per_unit: 0.10,
  data_completeness: 0.10,
  stress_test: 0.05,
}

function scoreDSCR(dscr: number | null): { score: number; detail: string } {
  if (dscr === null) return { score: 0, detail: 'DSCR not computed (missing rent data)' }
  if (dscr < 1.0) return { score: 0, detail: `DSCR ${dscr.toFixed(2)} — loan not serviceable` }
  if (dscr < 1.10) return { score: 20, detail: `DSCR ${dscr.toFixed(2)} — tight coverage` }
  if (dscr < 1.20) return { score: 40, detail: `DSCR ${dscr.toFixed(2)} — below LS Finance minimum` }
  if (dscr < 1.30) return { score: 65, detail: `DSCR ${dscr.toFixed(2)} — meets minimum (1.20)` }
  if (dscr < 1.50) return { score: 85, detail: `DSCR ${dscr.toFixed(2)} — strong coverage` }
  return { score: 100, detail: `DSCR ${dscr.toFixed(2)} — excellent coverage` }
}

function scoreLTV(ltvUsed: number | null): { score: number; detail: string } {
  if (ltvUsed === null) return { score: 50, detail: 'LTV not computed' }
  if (ltvUsed > 80) return { score: 0, detail: `${ltvUsed.toFixed(0)}% LTV — exceeds 80% max` }
  if (ltvUsed > 75) return { score: 60, detail: `${ltvUsed.toFixed(0)}% LTV — at max leverage` }
  if (ltvUsed > 70) return { score: 80, detail: `${ltvUsed.toFixed(0)}% LTV — comfortable` }
  return { score: 100, detail: `${ltvUsed.toFixed(0)}% LTV — strong equity buffer` }
}

function scoreCapRate(capRate: number | null): { score: number; detail: string } {
  if (capRate === null) return { score: 0, detail: 'Cap rate not computed' }
  if (capRate < 4.0) return { score: 10, detail: `${capRate.toFixed(2)}% cap — compressed yield` }
  if (capRate < 5.0) return { score: 40, detail: `${capRate.toFixed(2)}% cap — below market` }
  if (capRate < 6.0) return { score: 65, detail: `${capRate.toFixed(2)}% cap — market rate` }
  if (capRate < 7.5) return { score: 85, detail: `${capRate.toFixed(2)}% cap — above market` }
  return { score: 100, detail: `${capRate.toFixed(2)}% cap — strong yield` }
}

function scoreValueAdd(description: string | null): { score: number; detail: string } {
  if (!description) return { score: 20, detail: 'No description provided' }
  const lower = description.toLowerCase()
  const matches = VALUE_ADD_KEYWORDS.filter(kw => lower.includes(kw))
  const unique = [...new Set(matches)]
  if (unique.length === 0) return { score: 20, detail: 'No value-add signals detected' }
  if (unique.length === 1) return { score: 50, detail: `1 signal: "${unique[0]}"` }
  if (unique.length === 2) return { score: 70, detail: `2 signals: ${unique.slice(0, 2).join(', ')}` }
  return { score: 95, detail: `${unique.length} signals: ${unique.slice(0, 3).join(', ')}${unique.length > 3 ? '…' : ''}` }
}

function scorePricePerUnit(ppu: number | null): { score: number; detail: string } {
  if (ppu === null) return { score: 50, detail: 'Price per unit not available' }
  const k = Math.round(ppu / 1000)
  if (ppu > 300000) return { score: 10, detail: `$${k}K/unit — very expensive market` }
  if (ppu > 200000) return { score: 30, detail: `$${k}K/unit — premium pricing` }
  if (ppu > 100000) return { score: 70, detail: `$${k}K/unit — moderate pricing` }
  if (ppu > 50000) return { score: 90, detail: `$${k}K/unit — attractive pricing` }
  return { score: 75, detail: `$${k}K/unit — low price (verify condition)` }
}

function scoreCompleteness(inputs: ScoringInputs): { score: number; detail: string } {
  const fields = [
    inputs.dscr !== null,          // rent data → UW computed
    inputs.capRate !== null,
    inputs.pricePerUnit !== null,
    inputs.occupancyRate !== null,
    inputs.hasSqFt,
    inputs.hasYearBuilt,
    inputs.hasRentData,
    inputs.description !== null && inputs.description.length > 20,
  ]
  const filled = fields.filter(Boolean).length
  const pct = filled / fields.length
  return {
    score: Math.round(pct * 100),
    detail: `${filled}/${fields.length} data fields present`,
  }
}

function scoreStressTest(inputs: ScoringInputs): { score: number; detail: string } {
  if (!inputs.uwInputs) return { score: 50, detail: 'Stress test not run (missing UW inputs)' }
  const { stressedDSCR, passes } = stressTest({ ...inputs.uwInputs, units: inputs.units })
  if (stressedDSCR >= 1.10) return { score: 100, detail: `Stressed DSCR ${stressedDSCR.toFixed(2)} — resilient (+200bps/-10% rent)` }
  if (passes) return { score: 60, detail: `Stressed DSCR ${stressedDSCR.toFixed(2)} — barely passes stress` }
  return { score: 0, detail: `Stressed DSCR ${stressedDSCR.toFixed(2)} — fails stress test` }
}

export function computeBankabilityScore(
  inputs: ScoringInputs,
  weights: typeof DEFAULT_WEIGHTS = DEFAULT_WEIGHTS,
): { score: number; breakdown: ScoreBreakdown } {
  const dscr = scoreDSCR(inputs.dscr)
  const ltv = scoreLTV(inputs.ltvUsed)
  const capRate = scoreCapRate(inputs.capRate)
  const valueAdd = scoreValueAdd(inputs.description)
  const ppu = scorePricePerUnit(inputs.pricePerUnit)
  const completeness = scoreCompleteness(inputs)
  const stress = scoreStressTest(inputs)

  const total = Math.round(
    dscr.score * weights.dscr +
    ltv.score * weights.ltv +
    capRate.score * weights.cap_rate +
    valueAdd.score * weights.value_add +
    ppu.score * weights.price_per_unit +
    completeness.score * weights.data_completeness +
    stress.score * weights.stress_test,
  )

  const breakdown: ScoreBreakdown = {
    dscrScore: dscr.score,
    ltvScore: ltv.score,
    capRateScore: capRate.score,
    valueAddScore: valueAdd.score,
    pricePerUnitScore: ppu.score,
    completenessScore: completeness.score,
    stressTestScore: stress.score,
    total,
    details: {
      dscr: dscr.detail,
      ltv: ltv.detail,
      cap_rate: capRate.detail,
      value_add: valueAdd.detail,
      price_per_unit: ppu.detail,
      data_completeness: completeness.detail,
      stress_test: stress.detail,
    },
    weights,
  }

  return { score: total, breakdown }
}
