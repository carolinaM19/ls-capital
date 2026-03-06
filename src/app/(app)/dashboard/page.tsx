import { prisma } from '@/lib/prisma'
import { fmtPct, STATUS_META } from '@/lib/utils'
import Link from 'next/link'

function fmtK(cents: number) {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`
  return `$${dollars.toFixed(0)}`
}

function fmtDollars(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export default async function DashboardPage() {
  const [closedDeals, pipelineDeals] = await Promise.all([
    prisma.deal.findMany({ where: { status: 'CLOSED' } }),
    prisma.deal.findMany({ where: { status: { notIn: ['CLOSED', 'PASSED', 'DEAD'] } } }),
  ])

  const allDeals = [...closedDeals, ...pipelineDeals]

  const totalInvested = closedDeals.reduce((s, d) => s + (d.askingPrice ? Number(d.askingPrice) : 0), 0)
  const totalNOI = closedDeals.reduce((s, d) => s + (d.noi ? Number(d.noi) : 0), 0)
  const totalMonthlyRent = closedDeals.reduce((s, d) => s + (d.grossMonthlyRent ? Number(d.grossMonthlyRent) : 0), 0)
  const totalMonthlyDebt = closedDeals.reduce((s, d) => s + (d.monthlyPayment ? Number(d.monthlyPayment) : 0), 0)
  const totalLoanDeployed = closedDeals.reduce((s, d) => s + (d.loanAmount ? Number(d.loanAmount) : 0), 0)
  const avgCapRate = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.capRate ? Number(d.capRate) : 0), 0) / closedDeals.length : 0
  const avgCashOnCash = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.cashOnCash ? Number(d.cashOnCash) : 0), 0) / closedDeals.length : 0

  const downPayment = 16973270
  const annualNOIDollars = totalNOI / 100

  const partners = [
    { name: 'Luca', role: 'LP + Lender', dpPct: 0.60, cashFlowPct: 0.50, equityPct: 0.50, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    { name: 'Scott', role: 'GP', dpPct: 0.15, cashFlowPct: 0.20, equityPct: 0.225, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
    { name: 'Ben', role: 'GP', dpPct: 0.15, cashFlowPct: 0.20, equityPct: 0.225, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', dot: 'bg-violet-400' },
    { name: 'Shalev', role: 'LP', dpPct: 0.10, cashFlowPct: 0.10, equityPct: 0.05, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invested', value: fmtK(totalInvested), sub: `${closedDeals.length} properties closed`, color: 'text-slate-100' },
          { label: 'Annual NOI', value: fmtDollars(totalNOI), sub: 'net operating income', color: 'text-emerald-400' },
          { label: 'Avg Cap Rate', value: `${avgCapRate.toFixed(2)}%`, sub: 'portfolio average', color: 'text-blue-400' },
          { label: 'Avg Cash-on-Cash', value: `${avgCashOnCash.toFixed(2)}%`, sub: 'portfolio average', color: 'text-amber-400' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className={`metric-value ${m.color}`}>{m.value}</div>
            <div className="text-xs text-slate-500 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Partner Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {partners.map(p => {
            const dpContrib = (downPayment / 100) * p.dpPct
            const annualCashFlow = annualNOIDollars * p.cashFlowPct
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
                    <span className="text-slate-500">Down Payment</span>
                    <span className="text-slate-300 fin-num">${dpContrib.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                  {p.name === 'Luca' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loan Deployed</span>
                      <span className="text-slate-300 fin-num">{fmtK(totalLoanDeployed)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash Flow %</span>
                    <span className="text-slate-300 fin-num">{(p.cashFlowPct * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Annual Cash Flow</span>
                    <span className={`fin-num font-medium ${p.color}`}>${annualCashFlow.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quarterly Dist.</span>
                    <span className="text-slate-300 fin-num">${quarterlyCashFlow.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Cash Flow Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Gross Monthly Rent', value: fmtDollars(totalMonthlyRent), color: 'text-emerald-400' },
              { label: 'Monthly Debt Service', value: `- ${fmtDollars(totalMonthlyDebt)}`, color: 'text-red-400' },
              { label: 'Monthly NOI', value: fmtDollars(totalNOI / 12), color: 'text-slate-100', bold: true },
              { label: 'Annual NOI', value: fmtDollars(totalNOI), color: 'text-slate-100', bold: true },
            ].map(item => (
              <div key={item.label} className={`flex justify-between items-center ${item.bold ? 'border-t border-white/[0.06] pt-3' : ''}`}>
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className={`text-sm fin-num font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Luca's Returns</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Interest Income (5.99%)</span>
                <span className="text-xs text-blue-400 fin-num">{fmtDollars(totalLoanDeployed * 0.0599 / 12)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Cash Flow Share (50%)</span>
                <span className="text-xs text-blue-400 fin-num">{fmtDollars(totalNOI / 12 * 0.5)}/mo</span>
              </div>
            </div>
          </div>
        </div>

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
