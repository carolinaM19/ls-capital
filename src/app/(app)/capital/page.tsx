import { prisma } from '@/lib/prisma'
import { STATUS_META } from '@/lib/utils'
import Link from 'next/link'

function fmtD(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtK(cents: number) {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`
  return `$${dollars.toFixed(0)}`
}

export default async function CapitalPage() {
  const [closedDeals, pendingDeals] = await Promise.all([
    prisma.deal.findMany({ where: { status: 'CLOSED' } }),
    prisma.deal.findMany({ where: { status: { in: ['LOI', 'UNDER_CONTRACT'] } } }),
  ])

  // Real numbers from balance sheet (Jan 15, 2026)
  const loanBalance = 417505.49
  const interestRate = 0.0599
  const monthlyInterest = (loanBalance * interestRate) / 12
  const annualInterest = loanBalance * interestRate

  const totalMonthlyDebt = closedDeals.reduce((s, d) => s + (d.monthlyPayment ? Number(d.monthlyPayment) : 0), 0)
  const totalNOI = closedDeals.reduce((s, d) => s + (d.noi ? Number(d.noi) : 0), 0)
  const annualNOI = totalNOI / 100
  const dscr = totalMonthlyDebt > 0 ? (totalNOI / 12 / 100) / (totalMonthlyDebt / 100) : 0

  const pendingCapital = pendingDeals.reduce((s, d) => s + (d.loanAmount ? Number(d.loanAmount) / 100 : 0), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-xl font-semibold text-slate-100 font-display">Capital Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">LS Finance LLC · Lender to North Bay Road Capital LLC</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Loan Balance', value: fmtD(loanBalance), sub: 'outstanding to NBRC', color: 'text-blue-400' },
          { label: 'Annual Interest Income', value: fmtD(annualInterest), sub: 'at 5.99% fixed', color: 'text-emerald-400' },
          { label: 'Monthly Interest', value: fmtD(monthlyInterest), sub: 'paid by NBRC', color: 'text-slate-100' },
          { label: 'Portfolio DSCR', value: dscr.toFixed(2), sub: 'NOI ÷ debt service', color: dscr >= 1.2 ? 'text-emerald-400' : 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className={`metric-value ${m.color}`}>{m.value}</div>
            <div className="text-xs text-slate-500 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Loan detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-300">LS Finance → NBRC Loan</h2>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Lender', value: 'Luca Schnetzler (LS Finance LLC)' },
              { label: 'Borrower', value: 'North Bay Road Capital LLC' },
              { label: 'Interest Rate', value: '5.99% fixed' },
              { label: 'Loan Term', value: '30 years' },
              { label: 'LTV', value: '80% per property' },
              { label: 'Prepayment', value: 'No penalty' },
              { label: 'Collateral', value: '7 properties in Macon, GA' },
              { label: 'Governing Law', value: 'Florida' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="text-sm text-slate-200 mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Collateralized Properties</h3>
            <div className="divide-y divide-white/[0.04]">
              {closedDeals.map(deal => (
                <Link key={deal.id} href={`/deals/${deal.id}`}
                  className="flex items-center gap-4 py-2.5 hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{deal.address}</div>
                    <div className="text-xs text-slate-500">{deal.city}, {deal.state}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm fin-num text-slate-300">{deal.loanAmount ? fmtK(Number(deal.loanAmount)) : '—'}</div>
                    <div className="text-xs text-slate-500 fin-num">loan</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">

          {/* Interest schedule */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Income Schedule</h3>
            <div className="space-y-3">
              {[
                { label: 'Monthly Interest', value: fmtD(monthlyInterest), color: 'text-emerald-400' },
                { label: 'Quarterly Interest', value: fmtD(monthlyInterest * 3), color: 'text-slate-300' },
                { label: 'Annual Interest', value: fmtD(annualInterest), color: 'text-slate-300' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={`text-sm fin-num font-medium ${item.color}`}>{item.value}</span>
                </div>
              ))}
              <div className="border-t border-white/[0.06] pt-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Cash Flow Share (50%)</span>
                  <span className="text-sm fin-num text-blue-400">{fmtD(annualNOI * 0.5)}/yr</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-400 font-medium">Total Annual Return</span>
                  <span className="text-sm fin-num text-blue-300 font-medium">{fmtD(annualInterest + annualNOI * 0.5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Pending Capital</h3>
            <p className="text-xs text-slate-600 mb-3">LOI & Under Contract</p>
            {pendingDeals.length === 0 ? (
              <div className="text-sm text-slate-600">No pending deals</div>
            ) : (
              <div className="space-y-2">
                {pendingDeals.map(d => (
                  <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center gap-3 hover:bg-white/[0.02] transition-colors rounded p-1 -mx-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-200 truncate">{d.address}</div>
                      <div className="text-xs text-slate-600">{d.city}, {d.state}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs fin-num text-slate-300">{d.loanAmount ? fmtK(Number(d.loanAmount)) : '—'}</div>
                      <span className={`badge text-[10px] ${STATUS_META[d.status]?.color}`}>{STATUS_META[d.status]?.label}</span>
                    </div>
                  </Link>
                ))}
                <div className="border-t border-white/[0.06] pt-2 flex justify-between">
                  <span className="text-xs text-slate-500">Total Pending</span>
                  <span className="text-xs fin-num text-amber-400">{fmtD(pendingCapital)}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
