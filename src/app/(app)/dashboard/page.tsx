import { prisma } from '@/lib/prisma'
import { fmtDollars, fmtPct, fmtNum, scoreGrade, STATUS_META } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const [closedDeals, pipelineDeals, recentDeals] = await Promise.all([
    prisma.deal.findMany({ where: { status: 'CLOSED' } }),
    prisma.deal.findMany({ where: { status: { notIn: ['CLOSED', 'PASSED', 'DEAD'] } } }),
    prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { source: { select: { name: true } } },
    }),
  ])

  // Real portfolio metrics from closed deals
  const totalInvested = closedDeals.reduce((s, d) => s + (d.askingPrice ? Number(d.askingPrice) / 100 : 0), 0)
  const totalNOI = closedDeals.reduce((s, d) => s + (d.noi ? Number(d.noi) / 100 : 0), 0)
  const totalMonthlyRent = closedDeals.reduce((s, d) => s + (d.grossMonthlyRent ? Number(d.grossMonthlyRent) / 100 : 0), 0)
  const avgCapRate = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.capRate ? Number(d.capRate) : 0), 0) / closedDeals.length : 0
  const avgCashOnCash = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.cashOnCash ? Number(d.cashOnCash) : 0), 0) / closedDeals.length : 0
  const totalMonthlyPayments = closedDeals.reduce((s, d) => s + (d.monthlyPayment ? Number(d.monthlyPayment) / 100 : 0), 0)

  // Pipeline stats
  const allDeals = [...closedDeals, ...pipelineDeals]
  const byStatus = (status: string) => allDeals.filter(d => d.status === status).length
  const avgScore = allDeals.length ? Math.round(allDeals.reduce((s, d) => s + d.bankabilityScore, 0) / allDeals.length) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Portfolio Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">NBR Capital · Macon, GA Portfolio</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card glow-blue">
          <div className="metric-label">Total Invested</div>
          <div className="metric-value text-slate-100">${(totalInvested / 1000).toFixed(0)}K</div>
          <div className="text-xs text-slate-500 mt-1">{closedDeals.length} properties</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Annual NOI</div>
          <div className="metric-value text-emerald-400">${totalNOI.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-500 mt-1">net operating income</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Cap Rate</div>
          <div className="metric-value text-blue-400">{avgCapRate.toFixed(2)}%</div>
          <div className="text-xs text-slate-500 mt-1">portfolio average</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Cash-on-Cash</div>
          <div className="metric-value text-amber-400">{avgCashOnCash.toFixed(2)}%</div>
          <div className="text-xs text-slate-500 mt-1">portfolio average</div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="metric-label">Monthly Rent</div>
          <div className="metric-value text-slate-100">${totalMonthlyRent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-500 mt-1">gross collected</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Monthly Debt</div>
          <div className="metric-value text-slate-100">${totalMonthlyPayments.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-slate-500 mt-1">total payments</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pipeline Deals</div>
          <div className="metric-value text-blue-400">{pipelineDeals.length}</div>
          <div className="text-xs text-slate-500 mt-1">active opportunities</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Bankability</div>
          <div className={`metric-value ${scoreGrade(avgScore).color}`}>{avgScore}</div>
          <div className="text-xs text-slate-500 mt-1">pipeline average</div>
        </div>
      </div>

      {/* Pipeline Funnel + Recent Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Pipeline Funnel</h2>
          <div className="space-y-2.5">
            {[
              { status: 'NEW' },
              { status: 'REVIEWING' },
              { status: 'UNDERWRITING' },
              { status: 'LOI' },
              { status: 'UNDER_CONTRACT' },
              { status: 'CLOSED' },
            ].map(({ status }) => {
              const count = byStatus(status)
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className={`badge ${STATUS_META[status]?.color}`}>{STATUS_META[status]?.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${Math.min(count / Math.max(byStatus('CLOSED'), 1) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm fin-num text-slate-300 w-5 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Portfolio Properties</h2>
            <Link href="/deals" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentDeals.map(deal => {
              const grade = scoreGrade(deal.bankabilityScore)
              return (
                <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-9 h-9 rounded flex items-center justify-center text-sm font-bold fin-num flex-shrink-0 ${grade.bg}`}>
                    {deal.bankabilityScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{deal.address}</div>
                    <div className="text-xs text-slate-500">{deal.city}, {deal.state} · {deal.units}u</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm fin-num text-slate-300">{fmtDollars(deal.askingPrice)}</div>
                    <div className="text-xs text-emerald-400 fin-num">{deal.capRate ? `${Number(deal.capRate).toFixed(2)}% cap` : '—'}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
