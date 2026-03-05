import { prisma } from '@/lib/prisma'
import { fmtDollarsFull, fmtPct, fmtNum, fmtDate, STATUS_META } from '@/lib/utils'
import Link from 'next/link'

export default async function CapitalPage() {
  const [loans, pendingDeals] = await Promise.all([
    prisma.loan.findMany({ orderBy: { originationDate: 'desc' } }),
    prisma.deal.findMany({
      where: { status: { in: ['LOI', 'UNDER_CONTRACT'] } },
      include: { source: { select: { name: true } } },
    }),
  ])

  const activeLoans = loans.filter(l => l.status === 'ACTIVE')
  const PORTFOLIO_CAP = 10_000_000 * 100 // cents

  const totalDeployed = activeLoans.reduce((s, l) => s + Number(l.loanAmount), 0)
  const pendingCapital = pendingDeals.reduce((s, d) => s + (d.loanAmount ? Number(d.loanAmount) : 0), 0)
  const remaining = PORTFOLIO_CAP - totalDeployed
  const utilization = (totalDeployed / PORTFOLIO_CAP) * 100

  const avgDSCR = activeLoans.length ? activeLoans.reduce((s, l) => s + Number(l.dscr ?? 0), 0) / activeLoans.length : 0
  const avgLTV = activeLoans.length ? activeLoans.reduce((s, l) => s + Number(l.ltv ?? 0), 0) / activeLoans.length : 0
  const avgRate = activeLoans.length ? activeLoans.reduce((s, l) => s + Number(l.interestRate), 0) / activeLoans.length : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Capital Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">LS Finance LLC · Portfolio Cap: $10,000,000</p>
      </div>

      {/* Capacity Bar */}
      <div className="card p-6 mb-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Deployed Capital</div>
            <div className="text-3xl font-bold fin-num text-slate-100">{fmtDollarsFull(BigInt(totalDeployed))}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Available</div>
            <div className="text-3xl font-bold fin-num text-emerald-400">{fmtDollarsFull(BigInt(remaining))}</div>
          </div>
        </div>
        {/* Main bar */}
        <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden mb-1 relative">
          <div className="capital-bar h-full rounded-full transition-all" style={{ width: `${utilization}%` }} />
          {pendingCapital > 0 && remaining > 0 && (
            <div className="absolute top-0 h-full bg-amber-400/30 rounded-r-full"
              style={{ left: `${utilization}%`, width: `${Math.min(pendingCapital / PORTFOLIO_CAP * 100, 100 - utilization)}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
          <span>{utilization.toFixed(1)}% deployed across {activeLoans.length} active loans</span>
          {pendingCapital > 0 && <span className="text-amber-400/70">{fmtDollarsFull(BigInt(pendingCapital))} pending (LOI/Under Contract)</span>}
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Loans', value: String(activeLoans.length), sub: 'in portfolio' },
          { label: 'Avg DSCR', value: fmtNum(avgDSCR), sub: 'portfolio avg' },
          { label: 'Avg LTV', value: fmtPct(avgLTV), sub: 'at origination' },
          { label: 'Avg Rate', value: fmtPct(avgRate), sub: 'weighted' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value text-slate-100 text-xl">{m.value}</div>
            <div className="text-xs text-slate-600 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Loans */}
        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-sm font-semibold text-slate-300">Active Loan Portfolio</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan #</th><th>Property</th><th>Amount</th><th>Rate</th><th>LTV</th><th>DSCR</th><th>Maturity</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map(loan => (
                  <tr key={loan.id} className="cursor-default">
                    <td className="text-xs fin-num text-slate-500">{loan.loanNumber}</td>
                    <td>
                      <div className="text-xs text-slate-200 truncate max-w-32">{loan.propertyAddress.split(',')[0]}</div>
                      <div className="text-xs text-slate-600">{loan.borrowerEntity}</div>
                    </td>
                    <td className="fin-num text-xs text-slate-300">{fmtDollarsFull(loan.loanAmount)}</td>
                    <td className="fin-num text-xs text-slate-400">{fmtPct(loan.interestRate?.toNumber())}</td>
                    <td className="fin-num text-xs text-slate-400">{fmtPct(loan.ltv?.toNumber())}</td>
                    <td className="fin-num text-xs text-emerald-400">{fmtNum(loan.dscr)}</td>
                    <td className="text-xs text-slate-600">{fmtDate(loan.maturityDate)}</td>
                  </tr>
                ))}
                {activeLoans.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-600">No active loans</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending pipeline */}
        <div className="card">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-sm font-semibold text-slate-300">Pending Capital</h2>
            <p className="text-xs text-slate-600 mt-0.5">LOI & Under Contract</p>
          </div>
          {pendingDeals.length === 0 ? (
            <div className="px-5 py-8 text-slate-600 text-sm">No pending deals</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {pendingDeals.map(d => (
                <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-200 truncate">{d.address}</div>
                    <div className="text-xs text-slate-600">{d.city}, {d.state}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs fin-num text-slate-300">{fmtDollarsFull(d.loanAmount ?? null)}</div>
                    <span className={`badge text-[10px] ${STATUS_META[d.status]?.color}`}>{STATUS_META[d.status]?.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
