'use client'

export default function DealsPage() {
  const equity = { Luca: 0.50, Scott: 0.225, Ben: 0.225, Shalev: 0.05 }

  const properties = [
    { address: '4255 Vinson Ave', city: 'Macon, GA', price: 80000, rent: 1150, mortgage: 384, beds: 4, baths: 1, occupied: true, section8: true },
    { address: '1514 Dexter Ave', city: 'Macon, GA', price: 67000, rent: 825, mortgage: 321, beds: 2, baths: 1, occupied: true, section8: true },
    { address: '129 E Virginia', city: 'Macon, GA', price: 75000, rent: 1100, mortgage: 360, beds: 3, baths: 2, occupied: true, section8: false },
    { address: '5161 Pinefield Dr', city: 'Macon, GA', price: 84000, rent: 1052, mortgage: 403, beds: 3, baths: 1, occupied: true, section8: true },
    { address: '1723 Cedar St', city: 'Macon, GA', price: 80000, rent: 1050, mortgage: 384, beds: 2, baths: 1, occupied: true, section8: false },
    { address: '1527 Hurley Cir', city: 'Macon, GA', price: 58500, rent: 750, mortgage: 281, beds: 3, baths: 1, occupied: true, section8: false },
    { address: '3771 Walker Ave', city: 'Macon, GA', price: 80000, rent: 1200, mortgage: 384, beds: 3, baths: 2, occupied: true, section8: false },
  ]

  const totalRent = properties.reduce((s, p) => s + p.rent, 0)
  const totalValue = properties.reduce((s, p) => s + p.price, 0)
  const totalMortgage = properties.reduce((s, p) => s + p.mortgage, 0)
  const totalCashFlow = totalRent - totalMortgage
  const quarterlyDist = totalCashFlow * 3

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Portfolio</h1>
        <p className="text-sm text-slate-500 mt-1">NBR Capital LLC · Macon, GA · {properties.length} properties</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Monthly Rent</div>
          <div className="text-2xl font-bold text-emerald-400">${totalRent.toLocaleString()}/mo</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Mortgage to Luca</div>
          <div className="text-2xl font-bold text-slate-300">${totalMortgage.toLocaleString()}/mo</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Net Cash Flow</div>
          <div className="text-2xl font-bold text-emerald-400">${totalCashFlow.toLocaleString()}/mo</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Portfolio Value</div>
          <div className="text-2xl font-bold text-slate-200">${totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Quarterly distributions */}
      <div className="card p-5 mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quarterly Partner Distributions</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(equity).map(([name, pct]) => (
            <div key={name} className="bg-white/[0.03] rounded p-3 border border-white/[0.06]">
              <div className="text-xs text-slate-500 mb-1">{name} ({(pct * 100).toFixed(1)}%)</div>
              <div className="text-xl font-bold text-slate-200">${Math.round(quarterlyDist * pct).toLocaleString()}</div>
              <div className="text-xs text-slate-600 mt-0.5">per quarter</div>
            </div>
          ))}
        </div>
      </div>

      {/* Properties table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Address', 'Purchase Price', 'Monthly Rent', 'Mortgage to Luca', 'Cash Flow', 'Beds/Bath', 'Section 8', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-widest font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {properties.map((p, i) => {
              const cashFlow = p.rent - p.mortgage
              return (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-slate-200 font-medium">{p.address}</div>
                    <div className="text-xs text-slate-500">{p.city}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">${p.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">${p.rent.toLocaleString()}/mo</td>
                  <td className="px-4 py-3 text-slate-400">${p.mortgage.toLocaleString()}/mo</td>
                  <td className="px-4 py-3 font-medium" style={{color: cashFlow >= 0 ? '#34d399' : '#f87171'}}>${cashFlow.toLocaleString()}/mo</td>
                  <td className="px-4 py-3 text-slate-400">{p.beds}bd / {p.baths}ba</td>
                  <td className="px-4 py-3">
                    {p.section8
                      ? <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">Yes</span>
                      : <span className="text-xs px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-500">No</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {p.occupied
                      ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Occupied</span>
                      : <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">Vacant</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
