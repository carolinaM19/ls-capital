import { prisma } from '@/lib/prisma'
import { fmtDollars, fmtPct, fmtNum, scoreGrade, STATUS_META, DEAL_TYPE_META } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const [loans, deals, recentDeals] = await Promise.all([
    prisma.loan.findMany({ where: { status: 'ACTIVE' } }),
    prisma.deal.findMany({ where: { status: { notIn: ['PASSED', 'DEAD'] } } }),
    prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { source: { select: { name: true } } },
    }),
  ])

  // Capital metrics
  const totalDeployed = loans.reduce((s, l) => s + Number(l.loanAmount), 0) / 100
  const portfolioCap = 10_000_000
  const remaining = portfolioCap - totalDeployed
  const utilization = (totalDeployed / portfolioCap) * 100

  // Pending deals that might close
  const pendingDeals = deals.filter(d => ['LOI', 'UNDER_CONTRACT'].includes(d.status))
  const pendingCapital = pendingDeals.reduce((s, d) => s + (d.loanAmount ? Number(d.loanAmount) : 0), 0) / 100

  // Portfolio averages (active loans)
  const avgDSCR = loans.length ? loans.reduce((s, l) => s + Number(l.dscr ?? 0), 0) / loans.length : 0

  // Pipeline stats
  const byStatus = (status: string) => deals.filter(d => d.status === status).length
  const avgScore = deals.length ? Math.round(deals.reduce((s, d) => s + d.bankabilityScore, 0) / deals.length) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Capital Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">LS Finance LLC · Portfolio Overview</p>
      </div>

      {/* Capital Bar */}
      <div className="card p-5 mb-6 glow-blue">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="metric-label">Portfolio Deployment</div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-semibold fin-num text-slate-100">${(totalDeployed / 1e6).toFixed(2)}M</span>
              <span className="text-sm text-slate-500">of ${(portfolioCap / 1e6).toFixed(0)}M cap</span>
            </div>
          </div>
          <div className="text-right">
            <div className="metric-label">Available Capacity</div>
            <div className="text-2xl font-semibold fin-num text-emerald-400 mt-1">${(remaining / 1e6).toFixed(2)}M</div>
          </div>
        </div>
        <div className="score-bar h-2.5">
          <div className="capital-bar h-full rounded-full transition-all" style={{ width: `${utilization.toFixed(1)}%` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-500">{utilization.toFixed(1)}% utilized</span>
          {pendingCapital > 0 && (
            <span className="text-xs text-amber-400">{`~$${(pendingCapital / 1e6).toFixed(2)}M pending (LOI / Under Contract)`}</span>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="metric-label">Active Loans</div>
          <div className="metric-value text-slate-100">{loans.length}</div>
          <div className="text-xs text-slate-500 mt-1">in portfolio</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg DSCR</div>
          <div className={`metric-value ${avgDSCR >= 1.3 ? 'text-emerald-400' : 'text-amber-400'}`}>{fmtNum(avgDSCR)}</div>
          <div className="text-xs text-slate-500 mt-1">portfolio weighted</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pipeline Deals</div>
          <div className="metric-value text-blue-400">{deals.length}</div>
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
        {/* Pipeline Funnel */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Pipeline Funnel</h2>
          <div className="space-y-2.5">
            {[
              { status: 'NEW', count: byStatus('NEW') },
              { status: 'REVIEWING', count: byStatus('REVIEWING') },
              { status: 'UNDERWRITING', count: byStatus('UNDERWRITING') },
              { status: 'LOI', count: byStatus('LOI') },
              { status: 'UNDER_CONTRACT', count: byStatus('UNDER_CONTRACT') },
              { status: 'CLOSED', count: byStatus('CLOSED') },
            ].map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`badge ${STATUS_META[status]?.color}`}>{STATUS_META[status]?.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full"
                      style={{ width: `${Math.min(count / Math.max(byStatus('NEW'), 1) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm fin-num text-slate-300 w-5 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Deals */}
        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Recent Deals</h2>
            <Link href="/deals" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentDeals.map(deal => {
              const grade = scoreGrade(deal.bankabilityScore)
              return (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-9 h-9 rounded flex items-center justify-center text-sm font-bold fin-num flex-shrink-0 ${grade.bg}`}>
                    {deal.bankabilityScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{deal.address}</div>
                    <div className="text-xs text-slate-500">{deal.city}, {deal.state} · {deal.units}u</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm fin-num text-slate-300">{fmtDollars(deal.askingPrice)}</div>
                    <span className={`badge text-[10px] ${STATUS_META[deal.status]?.color}`}>
                      {STATUS_META[deal.status]?.label}
                    </span>
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
