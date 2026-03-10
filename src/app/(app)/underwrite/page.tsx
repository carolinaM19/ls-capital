'use client'
import { useState } from 'react'
import { computeUnderwriting, stressTest } from '@/lib/underwriting'
import { computeBankabilityScore } from '@/lib/scoring'
import { fmtDollarsFull, fmtPct, fmtNum, scoreGrade, dscrColor, capRateColor } from '@/lib/utils'
import type { YearProjection } from '@/lib/underwriting'

export default function UnderwritePage() {
  const [inputs, setInputs] = useState({
    address: '',
    brokerEmail: '',
    purchasePrice: '',
    grossMonthlyRent: '',
    units: '',
    interestRate: '5.99',
    maxLtv: '80',
    termYears: '30',
    expenseRatio: '40',
    vacancyRate: '5',
    rentGrowthRate: '3',
  })
  const [loi, setLoi] = useState<string | null>(null)
  const [loiPrice, setLoiPrice] = useState<number | null>(null)
  const [loiLoading, setLoiLoading] = useState(false)
  const [loiSent, setLoiSent] = useState(false)
  const [loiError, setLoiError] = useState<string | null>(null)
  const [showLoi, setShowLoi] = useState(false)

  const set = (k: string, v: string) => setInputs(p => ({ ...p, [k]: v }))

  const hasInputs = inputs.purchasePrice && inputs.grossMonthlyRent && inputs.units

  const uw = hasInputs ? computeUnderwriting({
    purchasePrice: parseFloat(inputs.purchasePrice),
    grossMonthlyRent: parseFloat(inputs.grossMonthlyRent),
    units: parseInt(inputs.units),
    interestRate: parseFloat(inputs.interestRate),
    maxLtv: parseFloat(inputs.maxLtv),
    termYears: parseInt(inputs.termYears),
    expenseRatio: parseFloat(inputs.expenseRatio),
    vacancyRate: parseFloat(inputs.vacancyRate),
    rentGrowthRate: parseFloat(inputs.rentGrowthRate),
  }) : null

  const stress = hasInputs ? stressTest({
    purchasePrice: parseFloat(inputs.purchasePrice),
    grossMonthlyRent: parseFloat(inputs.grossMonthlyRent),
    units: parseInt(inputs.units),
    interestRate: parseFloat(inputs.interestRate),
    maxLtv: parseFloat(inputs.maxLtv),
    termYears: parseInt(inputs.termYears),
    expenseRatio: parseFloat(inputs.expenseRatio),
    vacancyRate: parseFloat(inputs.vacancyRate),
    rentGrowthRate: parseFloat(inputs.rentGrowthRate),
  }) : null

  const scoreResult = uw ? computeBankabilityScore({
    dscr: uw.dscr,
    ltvUsed: uw.ltv,
    capRate: uw.capRate,
    description: null,
    pricePerUnit: uw.pricePerUnit,
    units: parseInt(inputs.units) || 1,
    occupancyRate: null,
    hasRentData: true,
    hasSqFt: false,
    hasYearBuilt: false,
  }) : null

  const dealPasses = uw && (uw.dscr ?? 0) >= 1.2

  async function generateLOI(send: boolean) {
    if (!inputs.address || !inputs.purchasePrice) return
    setLoiLoading(true)
    setLoiError(null)
    try {
      const res = await fetch('/api/loi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal: {
            address: inputs.address,
            city: '', state: '',
            price: parseFloat(inputs.purchasePrice),
            units: parseInt(inputs.units) || 0,
            assetType: 'Multifamily',
          },
          sendEmail: send,
          brokerEmail: inputs.brokerEmail,
        }),
      })
      const data = await res.json()
      setLoi(data.loi)
      setLoiPrice(data.offerPrice)
      setLoiSent(data.sent)
      setShowLoi(true)
    } catch (e: any) {
      setLoiError(e.message)
    } finally {
      setLoiLoading(false)
    }
  }

  const inp = (k: string, label: string, placeholder: string, type = 'number') => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={inputs[k as keyof typeof inputs]}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 px-2.5 text-sm bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 fin-num"
      />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Deal Underwriter</h1>
        <p className="text-sm text-slate-500 mt-1">Run the numbers → send LOI in one flow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panels */}
        <div className="space-y-4">

          {/* Deal identity */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Property</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Property Address</label>
                <input
                  type="text"
                  value={inputs.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="1368 West Blvd, Cleveland, OH"
                  className="w-full h-8 px-2.5 text-sm bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Broker Email (for LOI)</label>
                <input
                  type="email"
                  value={inputs.brokerEmail}
                  onChange={e => set('brokerEmail', e.target.value)}
                  placeholder="broker@example.com"
                  className="w-full h-8 px-2.5 text-sm bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Deal Inputs</h3>
            <div className="space-y-3">
              {inp('purchasePrice', 'Purchase Price ($)', '3200000')}
              {inp('grossMonthlyRent', 'Gross Monthly Rent ($)', '32400')}
              {inp('units', 'Number of Units', '24')}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">LS Finance Structure</h3>
            <div className="space-y-3">
              {inp('interestRate', 'Interest Rate (%)', '5.99')}
              {inp('maxLtv', 'Max LTV (%)', '80')}
              {inp('termYears', 'Term / Amort (years)', '30')}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Operating Assumptions</h3>
            <div className="space-y-3">
              {inp('expenseRatio', 'Expense Ratio (% of EGI)', '40')}
              {inp('vacancyRate', 'Vacancy (%)', '5')}
              {inp('rentGrowthRate', 'Rent Growth (%/yr)', '3')}
            </div>
          </div>
        </div>

        {/* Results column */}
        <div className="lg:col-span-2 space-y-5">
          {!uw ? (
            <div className="card p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Enter purchase price, monthly rent, and unit count to compute</p>
            </div>
          ) : (
            <>
              {/* Score bar */}
              {scoreResult && (
                <div className="card p-5 flex items-center justify-between gap-6">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Bankability Score</div>
                    <div className={`text-5xl font-bold fin-num ${scoreGrade(scoreResult.score).color}`}>
                      {scoreResult.score}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">out of 100</div>
                  </div>
                  <div className="flex-1">
                    <div className="score-bar h-2 mb-3">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${scoreResult.score}%`,
                          background: scoreResult.score >= 75 ? '#10b981' : scoreResult.score >= 50 ? '#3b82f6' : scoreResult.score >= 30 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className={`text-lg font-bold fin-num ${dscrColor(uw.dscr)}`}>{fmtNum(uw.dscr)}</div>
                        <div className="text-[10px] text-slate-600 uppercase tracking-widest">DSCR</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold fin-num ${capRateColor(uw.capRate)}`}>{fmtPct(uw.capRate)}</div>
                        <div className="text-[10px] text-slate-600 uppercase tracking-widest">Cap Rate</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold fin-num text-slate-200">{fmtPct(uw.cashOnCash)}</div>
                        <div className="text-[10px] text-slate-600 uppercase tracking-widest">CoC</div>
                      </div>
                    </div>
                  </div>
                  {stress && (
                    <div className="text-right border-l border-white/[0.06] pl-6">
                      <div className="text-xs text-slate-500 mb-1">Stress Test</div>
                      <div className="text-xs text-slate-600 mb-1">+200bps / −10% rent</div>
                      <div className={`text-xl font-bold fin-num ${stress.passes ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stress.stressedDSCR.toFixed(2)}
                      </div>
                      <div className={`text-xs mt-0.5 ${stress.passes ? 'text-emerald-500' : 'text-red-500'}`}>
                        {stress.passes ? '✓ Passes' : '✗ Fails'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Full breakdown */}
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Full Underwriting Analysis</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                  <div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Loan Structure</div>
                    {[
                      { l: 'Loan Amount (80% LTV)', v: fmtDollarsFull(uw.loanAmount ?? 0) },
                      { l: 'Monthly Payment', v: fmtDollarsFull(uw.monthlyPayment ?? 0) },
                      { l: 'Annual Debt Service', v: fmtDollarsFull(uw.annualDebtService ?? 0) },
                      { l: 'Equity Required (20%)', v: fmtDollarsFull(uw.equityRequired ?? 0) },
                      { l: 'Price Per Unit', v: fmtDollarsFull(uw.pricePerUnit ?? 0) },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-xs text-slate-500">{r.l}</span>
                        <span className="text-xs fin-num text-slate-200">{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Income & Returns</div>
                    {[
                      { l: 'Gross Annual Rent', v: fmtDollarsFull((uw.effectiveGrossIncome ?? 0) / (1 - parseFloat(inputs.vacancyRate) / 100)) },
                      { l: 'Effective Gross Income', v: fmtDollarsFull(uw.effectiveGrossIncome ?? 0) },
                      { l: 'Operating Expenses', v: fmtDollarsFull(uw.operatingExpenses ?? 0) },
                      { l: 'Net Operating Income', v: fmtDollarsFull(uw.noi ?? 0) },
                      { l: 'Annual Cash Flow', v: fmtDollarsFull((uw.noi ?? 0) - (uw.annualDebtService ?? 0)) },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-xs text-slate-500">{r.l}</span>
                        <span className="text-xs fin-num text-slate-200">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`mt-4 p-3 rounded border text-xs ${
                  dealPasses
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/5 border-red-500/20 text-red-400'
                }`}>
                  {dealPasses
                    ? `✓ DSCR ${fmtNum(uw.dscr)} — meets LS Finance minimum (1.20)`
                    : `✗ DSCR ${fmtNum(uw.dscr)} — below LS Finance minimum of 1.20`}
                </div>
              </div>

              {/* 6-Year Projection */}
              {uw.projection.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">6-Year Cash Flow Projection</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs fin-num">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Year', 'Gross Rent', 'EGI', 'NOI', 'Debt Service', 'Cash Flow', 'DSCR'].map(h => (
                            <th key={h} className="px-2 py-2 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(uw.projection as YearProjection[]).map(yr => (
                          <tr key={yr.year} className="border-b border-white/[0.03]">
                            <td className="px-2 py-2 text-slate-400">Yr {yr.year}</td>
                            <td className="px-2 py-2 text-slate-400">{fmtDollarsFull(yr.grossRent)}</td>
                            <td className="px-2 py-2 text-slate-400">{fmtDollarsFull(yr.egi)}</td>
                            <td className="px-2 py-2 text-slate-300">{fmtDollarsFull(yr.noi)}</td>
                            <td className="px-2 py-2 text-slate-500">{fmtDollarsFull(yr.debtService)}</td>
                            <td className={`px-2 py-2 font-medium ${yr.cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {fmtDollarsFull(yr.cashFlow)}
                            </td>
                            <td className={`px-2 py-2 ${dscrColor(yr.dscr)}`}>{yr.dscr.toFixed(2)}x</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LOI Section */}
              <div className={`card p-5 border ${dealPasses ? 'border-emerald-500/20' : 'border-white/[0.06]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Letter of Intent</h3>
                    {dealPasses
                      ? <p className="text-xs text-slate-500 mt-0.5">Deal pencils — offer at 10% below asking: <span className="text-emerald-400 fin-num font-semibold">${Math.round(parseFloat(inputs.purchasePrice) * 0.9).toLocaleString()}</span></p>
                      : <p className="text-xs text-slate-500 mt-0.5">Deal does not meet DSCR minimum — LOI not recommended</p>
                    }
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateLOI(false)}
                      disabled={!inputs.address || loiLoading}
                      className="px-3 py-1.5 text-xs rounded border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Preview LOI
                    </button>
                    {dealPasses && (
                      <button
                        onClick={() => generateLOI(true)}
                        disabled={!inputs.address || !inputs.brokerEmail || loiLoading}
                        className="px-3 py-1.5 text-xs rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {loiLoading ? 'Sending...' : 'Send LOI to Broker'}
                      </button>
                    )}
                  </div>
                </div>
                {!inputs.address && (
                  <p className="text-xs text-amber-500/70 mt-3">↑ Add property address above to enable LOI</p>
                )}
                {loiError && <p className="text-xs text-red-400 mt-2">{loiError}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* LOI Modal */}
      {showLoi && loi && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#111318] border border-white/[0.08] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Letter of Intent</h2>
                {loiPrice && <p className="text-xs text-slate-500 mt-0.5">Offer price: <span className="text-emerald-400 fin-num">${loiPrice.toLocaleString()}</span></p>}
              </div>
              <div className="flex items-center gap-3">
                {loiSent && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">✓ Sent to broker</span>}
                <button onClick={() => setShowLoi(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{loi}</pre>
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-between">
              <button
                onClick={() => navigator.clipboard.writeText(loi)}
                className="px-3 py-1.5 text-xs rounded border border-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
              >
                Copy to Clipboard
              </button>
              {!loiSent && inputs.brokerEmail && (
                <button
                  onClick={() => generateLOI(true)}
                  disabled={loiLoading}
                  className="px-4 py-1.5 text-xs rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
                >
                  {loiLoading ? 'Sending...' : `Send to ${inputs.brokerEmail}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
