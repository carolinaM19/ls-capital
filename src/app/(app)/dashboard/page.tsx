import { prisma } from '@/lib/prisma'
import { STATUS_META } from '@/lib/utils'
import Link from 'next/link'

function fmtD(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function DashboardPage() {
  const [closedDeals, pipelineDeals] = await Promise.all([
    prisma.deal.findMany({ where: { status: 'CLOSED' }, orderBy: { createdAt: 'asc' } }),
    prisma.deal.findMany({ where: { status: { notIn: ['CLOSED', 'PASSED', 'DEAD'] } } }),
  ])

  const allDeals = [...closedDeals, ...pipelineDeals]
  const totalNOI = closedDeals.reduce((s, d) => s + (d.noi ? Number(d.noi) : 0), 0)
  const totalMonthlyRent = closedDeals.reduce((s, d) => s + (d.grossMonthlyRent ? Number(d.grossMonthlyRent) : 0), 0)
  const totalMonthlyDebt = closedDeals.reduce((s, d) => s + (d.monthlyPayment ? Number(d.monthlyPayment) : 0), 0)
  const avgCapRate = closedDeals.length ? closedDeals.reduce((s, d) => s + (d.capRate ? Number(d.capRate) : 0), 0) / closedDeals.length : 0

  const lucaLoanBalance = 417505.49
  const cashOnHand = 31135.53
  const annualNOI = totalNOI / 100
  const monthlyNOI = annualNOI / 12
  const monthlyRentDollars = totalMonthlyRent / 100
  const monthlyDebtDollars = totalMonthlyDebt / 100

  const partners = [
    { name: 'Luca', role: 'LP + Lender', capital: 87438.00, cashFlowPct: 0.50, equityPct: 0.50, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    { name: 'Scott', role: 'GP', capital: 12222.00, cashFlowPct: 0.20, equityPct: 0.225, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
    { name: 'Ben', role: 'GP', capital: 31385.60, cashFlowPct: 0.20, equityPct: 0.225, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', dot: 'bg-violet-400' },
    { name: 'Shalev', role: 'LP', capital: 14500.00, cashFlowPct: 0.10, equityPct: 0.05, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  ]

  const byStatus = (status: string) => allDeals.filter(d => d.status === status).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 font-display">NBR Capital</h1>
          <p className="text-sm text-slate-500 mt-0.5">North Bay Road Capital LLC · Portfolio Dashboard</p>
        </div>
        <span className="text-xs text-slate-600 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full">{closedDeals.length} properties · Macon, GA</span>
      </div>

      {/* KPI Cards */}
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

      {/* Properties */}
      <div className="card">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Our Properties</h2>
          <span className="text-xs text-slate-500">{closedDeals.length} properties · Macon, GA</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {closedDeals.map((p) => {
            const rent = p.grossMonthlyRent ? Number(p.grossMonthlyRent) / 100 : 0
            const isVacant = rent === 0
            return (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-200">{p.address}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.city}, {p.state}</div>
                </div>
                <div className="text-right">
                  {isVacant ? (
                    <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">Vacant</span>
                  ) : (
                    <div>
                      <span className="text-sm font-semibold text-emerald-400">{fmtD(rent)}</span>
                      <span className="text-xs text-slate-500">/mo</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-6 py-3 border-t border-white/[0.06] flex justify-between items-center">
          <span className="text-xs text-slate-500">Total monthly rent</span>
          <span className="text-sm font-bold text-emerald-400">{fmtD(monthlyRentDollars)}/mo</span>
        </div>
      </div>


    </div>

  )
}