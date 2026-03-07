'use client'

import { useState } from 'react'

function fmtK(n: number) {
  if (!n) return '\u2014'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtPct(n: number) {
  if (!n) return '\u2014'
  return `${n.toFixed(1)}%`
}

const ASSET_OPTIONS = [
  { value: 'SFR', label: 'Single Family' },
  { value: 'MULTI_2_4', label: '2-4 Units' },
  { value: 'MULTI_5_PLUS', label: '5-19 Units' },
  { value: 'MULTI_20_30', label: '20-50 Units' },
  { value: 'MULTI_50_PLUS', label: '50+ Units' },
]

export default function FinderPage() {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minUnits, setMinUnits] = useState('')
  const [maxUnits, setMaxUnits] = useState('')
  const [minCapRate, setMinCapRate] = useState('')
  const [assetTypes, setAssetTypes] = useState<string[]>(['MULTI_50_PLUS'])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const toggleAsset = (val: string) => {
    setAssetTypes(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const handleSearch = async () => {
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (city) params.set('city', city)
      if (state) params.set('state', state)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      if (minUnits) params.set('minUnits', minUnits)
      if (maxUnits) params.set('maxUnits', maxUnits)
      if (minCapRate) params.set('minCapRate', minCapRate)
      if (assetTypes.length) params.set('assetTypes', assetTypes.join(','))
      const res = await fetch(`/api/finder/search?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.results || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (result: any) => {
    setAddingId(result.id)
    try {
      const res = await fetch('/api/finder/add-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      const data = await res.json()
      if (data.id) setAddedIds(prev => new Set([...prev, result.id]))
    } catch (e) {
      console.error(e)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Deal Finder</h1>
        <p className="text-xs text-slate-500 mt-0.5">Search Crexi for deals matching NBRC criteria</p>
      </div>
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'City', val: city, set: setCity, ph: 'e.g. Cleveland' },
            { label: 'State', val: state, set: setState, ph: 'e.g. OH' },
            { label: 'Min Price', val: minPrice, set: setMinPrice, ph: 'e.g. 500000' },
            { label: 'Max Price', val: maxPrice, set: setMaxPrice, ph: 'e.g. 5000000' },
            { label: 'Min Units', val: minUnits, set: setMinUnits, ph: 'e.g. 20' },
            { label: 'Max Units', val: maxUnits, set: setMaxUnits, ph: 'e.g. 200' },
            { label: 'Min Cap Rate %', val: minCapRate, set: setMinCapRate, ph: 'e.g. 8' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50" />
            </div>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 block">Asset Types</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggleAsset(opt.value)}
                className={`px-3 py-1 rounded text-xs transition-colors ${assetTypes.includes(opt.value) ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSearch} disabled={loading} className="btn-primary px-6 py-2 text-sm">
          {loading ? 'Searching Crexi...' : 'Search Deals'}
        </button>
      </div>
      {error && <div className="card p-4 mb-4 text-red-400 text-sm">{error}</div>}
      {searched && !loading && results.length === 0 && !error && (
        <div className="card p-8 text-center text-slate-500 text-sm">No deals found.</div>
      )}
      {results.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-3">{results.length} deals found</div>
          <div className="space-y-3">
            {results.map((r: any) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-4">
                  {r.image && <img src={r.image} alt="" className="w-24 h-16 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-medium text-slate-200">{r.address}</div>
                        <div className="text-xs text-slate-500">{r.city}, {r.state} · {r.units} units</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-100 fin-num">{fmtK(r.price)}</div>
                        <div className="text-xs text-slate-500 fin-num">{fmtK(r.pricePerUnit)}/unit</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div><div className="text-xs text-slate-500">Cap Rate</div><div className="text-sm fin-num text-emerald-400">{fmtPct(r.capRate)}</div></div>
                      <div><div className="text-xs text-slate-500">CoC</div><div className="text-sm fin-num text-blue-400">{fmtPct(r.cashOnCash)}</div></div>
                      <div><div className="text-xs text-slate-500">DSCR</div><div className="text-sm fin-num text-slate-300">{r.dscr ? r.dscr.toFixed(2) : '\u2014'}</div></div>
                      <div><div className="text-xs text-slate-500">Down</div><div className="text-sm fin-num text-slate-300">{fmtK(r.downPayment)}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Score: {r.score}</span>
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-200 underline">View on Crexi</a>}
                      <div className="flex-1" />
                      {addedIds.has(r.id) ? (
                        <span className="text-xs text-emerald-400">Added!</span>
                      ) : (
                        <button onClick={() => handleAdd(r)} disabled={addingId === r.id} className="btn-primary text-xs py-1.5 px-4">
                          {addingId === r.id ? 'Adding...' : '+ Add to Pipeline'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
