'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function fmtK(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtPct(n: number) {
  if (!n) return '—'
  return `${n.toFixed(1)}%`
}

const ASSET_OPTIONS = [
  { value: 'SFR', label: 'Single Family' },
  { value: 'MULTI_2_4', label: '2–4 Units' },
  { value: 'MULTI_5_PLUS', label: '5–19 Units' },
  { value: 'MULTI_20_30', labe
cat > ~/Downloads/ls-capital/src/app/\(app\)/finder/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function fmtK(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtPct(n: number) {
  if (!n) return '—'
  return `${n.toFixed(1)}%`
}

const ASSET_OPTIONS = [
  { value: 'SFR', label: 'Single Family' },
  { value: 'MULTI_2_4', label: '2–4 Units' },
  { value: 'MULTI_5_PLUS', label: '5–19 Units' },
  { value: 'MULTI_20_30', label: '20–50 Units' },
  { value: 'MULTI_50_PLUS', label: '50+ Units' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
]

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function DealFinderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  const [city, setCity] = useState('Macon')
  const [state, setState] = useState('GA')
  const [assetTypes, setAssetTypes] = useState<string[]>(['MULTI_5_PLUS', 'MULTI_20_30', 'MULTI_50_PLUS'])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('2000000')
  const [minUnits, setMinUnits] = useState('5')
  const [maxUnits, setMaxUnits] = useState('')
  const [minCapRate, setMinCapRate] = useState('6')

  const toggleAsset = (val: string) => {
    setAssetTypes(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const handleSearch = async () => {
    if (!city) return
    setLoading(true)
    setError('')
    setResults([])
    setSearched(true)
    try {
      const res = await fetch('/api/finder/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, assetTypes, minPrice, maxPrice, minUnits, maxUnits, minCapRate }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResults(data.results || [])
    } catch (err: any) {
      setError(err.message)
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
      if (data.id) router.push(`/deals/${data.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setAddingId(null)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    if (score >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    return 'text-red-400 bg-red-400/10 border-red-400/20'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 font-display">Deal Finder</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search Crexi for opportunities that match your investment criteria</p>
      </div>

      <div className="card p-5 space-y-5">
        <h2 className="text-sm font-semibold text-slate-300">Search Criteria</h2>

        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Location</div>
          <div className="flex gap-3">
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="input flex-1" />
            <select value={state} onChange={e => setState(e.target.value)} className="input w-24">
              <option value="">All</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Asset Type</div>
          <div className="flex flex-wrap gap-2">
            {ASSET_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggleAsset(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  assetTypes.includes(opt.value)
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Min Price', val: minPrice, set: setMinPrice, ph: '$0' },
            { label: 'Max Price', val: maxPrice, set: setMaxPrice, ph: '$2M' },
            { label: 'Min Units', val: minUnits, set: setMinUnits, ph: '1' },
            { label: 'Max Units', val: maxUnits, set: setMaxUnits, ph: 'Any' },
            { label: 'Min Cap Rate %', val: minCapRate, set: setMinCapRate, ph: '6%' },
          ].map(f => (
            <div key={f.label}>
              <div className="text-xs text-slate-500 mb-1.5">{f.label}</div>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="input w-full" />
            </div>
          ))}
        </div>

        <button onClick={handleSearch} disabled={loading || !city} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Searching Crexi... (this takes ~30 seconds)
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Search Deals
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="card p-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Error: {error}</p>
        </div>
      )}

      {searched && !loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">
              {results.length > 0 ? `${results.length} opportunities found` : 'No results found'}
            </h2>
            {results.length > 0 && <span className="text-xs text-slate-500">Sorted by NBRC fit score</span>}
          </div>

          {results.length === 0 && !error && (
            <div className="card p-8 text-center">
              <p className="text-slate-500 text-sm">No deals found matching your criteria. Try expanding your search.</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((result: any) => (
              <div key={result.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center text-lg font-bold fin-num ${scoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">{result.address}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {result.city}, {result.state} · {result.units} units · {result.assetType}
                          {result.daysOnMarket ? ` · ${result.daysOnMarket} days on market` : ''}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-semibold fin-num text-slate-100">{fmtK(result.price)}</div>
                        <div className="text-xs text-slate-500 fin-num">{fmtK(result.pricePerUnit)}/unit</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3">
                      {[
                        { label: 'Cap Rate', value: fmtPct(result.capRate), color: result.capRate >= 7 ? 'text-emerald-400' : result.capRate >= 5 ? 'text-amber-400' : 'text-red-400' },
                        { label: 'Annual NOI', value: fmtK(result.noi), color: 'text-slate-300' },
                        { label: 'Cash-on-Cash', value: fmtPct(result.cashOnCash), color: result.cashOnCash >= 10 ? 'text-emerald-400' : result.cashOnCash >= 5 ? 'text-amber-400' : 'text-red-400' },
                        { label: 'DSCR', value: result.dscr > 0 ? result.dscr.toFixed(2) : '—', color: result.dscr >= 1.25 ? 'text-emerald-400' : result.dscr >= 1.0 ? 'text-amber-400' : 'text-red-400' },
                        { label: 'Down Payment', value: fmtK(result.downPayment), color: 'text-blue-400' },
                        { label: 'Monthly Pmt', value: fmtK(result.monthlyPayment), color: 'text-slate-400' },
                      ].map(m => (
                        <div key={m.label}>
                          <div className="text-[10px] text-slate-600 uppercase tracking-wider">{m.label}</div>
                          <div className={`text-sm fin-num font-medium mt-0.5 ${m.color}`}>{m.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.05]">
                      {result.url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                          </svg>
                          View on Crexi
                        </a>
                      )}
                      {result.broker && <span className="text-xs text-slate-600">· {result.broker}</span>}
                      <div className="flex-1" />
                      <button onClick={() => handleAdd(result)} disabled={addingId === result.id}
                        className="btn-primary text-xs py-1.5 px-4">
                        {addingId === result.id ? 'Adding...' : '+ Add to Pipeline'}
                      </button>
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
