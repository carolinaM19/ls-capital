import { prisma } from '@/lib/prisma'

function fmtD(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function DashboardPage() {
  const properties = await prisma.deal.findMany({ where: { status: 'CLOSED' }, orderBy: { createdAt: 'asc' } })

  const totalMonthlyRent = properties.reduce((s, d) => s + (d.grossMonthlyRent ? Number(d.grossMonthlyRent) / 100 : 0), 0)
  const vacantCount = properties.filter(d => !d.grossMonthlyRent || Number(d.grossMonthlyRent) === 0).length

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">NBR Capital</h1>
        <p className="text-sm text-slate-500 mt-1">North Bay Road Capital LLC · Macon, GA</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="metric-label">Monthly Rent</div>
          <div className="metric-value text-emerald-400">{fmtD(totalMonthlyRent)}</div>
          <div className="text-xs text-slate-500 mt-1">collected per month</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Properties</div>
          <div className="metric-value text-slate-100">{properties.length}</div>
          <div className="text-xs text-slate-500 mt-1">in portfolio</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Vacant</div>
          <div className="metric-value text-amber-400">{vacantCount}</div>
          <div className="text-xs text-slate-500 mt-1">{vacantCount === 0 ? 'all occupied' : 'need tenant'}</div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-slate-200">Your Properties</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {properties.map((p) => {
            const rent = p.grossMonthlyRent ? Number(p.grossMonthlyRent) / 100 : 0
            const isVacant = rent === 0
            return (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-200">{p.address}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.city}, {p.state}</div>
                </div>
                <div>
                  {isVacant
                    ? <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">Vacant</span>
                    : <span className="text-sm font-semibold text-emerald-400">{fmtD(rent)}<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                  }
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-6 py-3 border-t border-white/[0.06] flex justify-between">
          <span className="text-xs text-slate-500">Total monthly rent</span>
          <span className="text-sm font-bold text-emerald-400">{fmtD(totalMonthlyRent)}/mo</span>
        </div>
      </div>
    </div>
  )
}
