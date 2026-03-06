import { prisma } from '@/lib/prisma'
import { STATUS_META } from '@/lib/utils'
import Link from 'next/link'

function fmtK(cents: number) {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`
  return `$${dollars.toFixed(0)}`
}

function fmtD(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default async function DashboardPage() {
  const [closedDeals, pipelineDeals] = await Promise.all([
    prisma.deal.findMany({ where: { status: 'CLOSED' } }),
    prisma.deal.findMany({ where: { status: { notIn: ['CLOSED', 'PASSED', 'DEAD'] } } }),
  ])

  const allDeals = [...closedDeals, ...pipelineDeals]

  const totalNOI = closedDeals.reduce((s, d) => s + (d.noi ? Number(d.noi) : 0), 0)
  const totalMonthlyRent = closedDeals.reduce((s, d) => s + (d.grossMonthlyRent ? Number(d.grossMonthlyRent) : 0), 0)
  const totalMonthlyDebt = closedDeals.reduce((s, d) => s + (d.monthlyPayment ? Number(d.monthlyPayment) : 0), 0)
  const avgCapRate = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.capRate ? Number(d.capRate) : 0), 0) / closedDeals.length : 0
  const avgCashOnCash = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.cashOnCash ? Number(d.cashOnCash) : 0), 0) / closedDeals.length : 0

  // Real numbers from balance sheet (Jan 15, 2026)
  const lucaLoanBalance = 417505.49
  const cashOnHand = 31135.53
  const annualInterestIncome = lucaLoanBalance * 0.0599
  const monthlyInterestIncome = annualInterestIncome / 12
  const annualNOI = totalNOI / 100
  const monthlyNOI = annualNOI / 12

  const partners = [
    { name: 'Luca', role: 'LP + Lender', capital: 87438.00, cashFlowPct: 0.50, equityPct: 0.50, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    { name: 'Scott', role: 'GP', capital: 12222.00, cashFlowPct: 0.20, equityPct: 0.225, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
    { name: 'Ben', role: 'GP', capital: 31385.60, cashFlowPct: 0.20, equityPct: 0.225, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', dot: 'bg-violet-400' },
    { name: 'Shalev', role: 'LP', capital: 14500.00, cashFlowPct: 0.10, equityPct: 0.05, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  ]

  const byStatus = (status: string) => allDeals.filter(d => d.status === status).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 font-display">NBR Capital</h1>
          <p className="text-sm text-slate-500 mt-0.5">North Bay Road Capital LLC · Portfolio Dashboard</p>
        </div>
        <span className="text-xs text-slate-600 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full">{closedDeals.length} properties · Macon, GA</span>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Loan Balance (LS Finance)', value: fmtD(lucaLoanBalance), sub: 'owed to Luca', color: 'text-blue-400' },
          { label: 'Annual NOI', value: fmtD(annualNOI), sub: 'net operating income', color: 'text-emerald-400' },
          { label: 'Avg Cap Rate', value: `${avgCapRate.toFixed(2)}%`, sub: 'portfolio average', color: 'text-slate-100' },
          { label: 'Cash on Hand', value: fmtD(cashOnHand), sub: 'across all accounts', color: 'text-amber-400' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className={`metric-value ${m.color}`}>{m.value}</div>
            <div className="text-xs text-slate-500 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Partner Breakdown */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Partner Overview</h2>
          <span className="text-xs text-slate-500">From balance sheet · Jan 15, 2026</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {partners.map(p => {
            const annualCashFlow = annualNOI * p.cashFlowPct
            const quarterlyCashFlow = annualCashFlow / 4
            return (
              <div key={p.name} className={`rounded-lg border p-4 ${p.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className={`text-sm font-semibold ${p.color}`}>{p.name}</div>
                    <div className="text-xs text-slate-500">{p.role}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${p.dot}`} />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capital Contributed</span>
                    <span className="text-slate-300 fin-num">{fmtD(p.capital)}</span>
                  </div>
                  {p.name === 'Luca' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loan Balance</span>
                      <span className="text-slate-300 fin-num">{fmtD(lucaLoanBalance)}</span>
                    </div>
                  )}
                  {p.name === 'Luca' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Interest Income</span>
                      <span className="text-blue-400 fin-num">{fmtD(monthlyInterestIncome)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Flow %</span>
                    <span className="text-slate-300 fin-num">{(p.cashFlowPct * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Annual Cash Flow</span>
                    <span className={`fin-num font-medium ${p.color}`}>{fmtD(annualCashFlow)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quarterly Dist.</span>
                    <span className="text-slate-300 fin-num">{fmtD(quarterlyCashFlow)}</span>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2 flex justify-between">
                    <span className="text-slate-500">Equity %</span>
                    <span className="text-slate-300 fin-num">{(p.equityPct * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Cash Flow Summary */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Cash Flow Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Gross Monthly Rent', value: fmtK(totalMonthlyRent), color: 'text-emerald-400' },
              { label: 'Monthly Debt Service', value: `- ${fmtK(totalMonthlyDebt)}`, color: 'text-red-400' },
              { label: 'Monthly NOI', value: fmtD(monthlyNOI), color: 'text-slate-100', bold: true },
              { label: 'Annual NOI', value: fmtD(annualNOI), color: 'text-slate-100', bold: true },
            ].map(item => (
              <div key={item.label} className={`flex justify-between items-center ${item.bold ? 'border-t border-white/[0.06] pt-3' : ''}`}>
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className={`text-sm fin-num font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Luca's Total Returns</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Interest Income (5.99%)</span>
                <span className="text-xs text-blue-400 fin-num">{fmtD(monthlyInterestIncome)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Cash Flow Share (50%)</span>
                <span className="text-xs text-blue-400 fin-num">{fmtD(monthlyNOI * 0.5)}/mo</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-2">
                <span className="text-xs text-slate-400 font-medium">Total Monthly</span>
                <span className="text-xs text-blue-300 fin-num font-medium">{fmtD(monthlyInterestIncome + monthlyNOI * 0.5)}/mo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Deal Pipeline</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['NEW','REVIEWING','UNDERWRITING','LOI','UNDER_CONTRACT','CLOSED'].map(status => {
                const count = byStatus(status)
                return (
                  <div key={status} className="text-center">
                    <div className={`text-lg fin-num font-semibold ${count > 0 ? 'text-slate-100' : 'text-slate-700'}`}>{count}</div>
                    <div className={`text-[10px] mt-0.5 badge ${STATUS_META[status]?.color}`}>{STATUS_META[status]?.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Portfolio Properties</h2>
              <Link href="/deals" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {closedDeals.map(deal => (
                <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{deal.address}</div>
                    <div className="text-xs text-slate-500">{deal.city}, {deal.state}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm fin-num text-slate-300">{deal.askingPrice ? fmtK(Number(deal.askingPrice)) : '—'}</div>
                    <div className="text-xs text-emerald-400 fin-num">{deal.capRate ? `${Number(deal.capRate).toFixed(2)}% cap` : '—'}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {pipelineDeals.length > 0 && (
        <div className="card">
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Pipeline Opportunities</h2>
            <Link href="/deals" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {pipelineDeals.map(deal => (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200">{deal.address}</div>
                  <div className="text-xs text-slate-500">{deal.city}, {deal.state} · {deal.units} units</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm fin-num text-slate-300">{deal.askingPrice ? fmtK(Number(deal.askingPrice)) : '—'}</div>
                  <div className="text-xs text-blue-400 fin-num">{deal.capRate ? `${Number(deal.capRate).toFixed(2)}% cap` : '—'}</div>
                </div>
                <span className={`badge text-[10px] ${STATUS_META[deal.status]?.color} flex-shrink-0`}>{STATUS_META[deal.status]?.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
