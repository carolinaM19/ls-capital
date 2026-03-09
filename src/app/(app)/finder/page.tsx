'use client'

import { useState } from 'react'

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

const STATES: Record<string, string[]> = {
  AL: ['Birmingham','Montgomery','Huntsville','Mobile','Tuscaloosa'],
  AK: ['Anchorage','Fairbanks','Juneau'],
  AZ: ['Phoenix','Tucson','Mesa','Chandler','Scottsdale','Tempe','Gilbert'],
  AR: ['Little Rock','Fort Smith','Fayetteville','Springdale','Jonesboro'],
  CA: ['Los Angeles','San Diego','San Jose','San Francisco','Fresno','Sacramento','Oakland'],
  CO: ['Denver','Colorado Springs','Aurora','Fort Collins','Lakewood','Boulder'],
  CT: ['Bridgeport','New Haven','Hartford','Stamford','Waterbury'],
  DE: ['Wilmington','Dover','Newark'],
  FL: ['Jacksonville','Miami','Tampa','Orlando','St. Petersburg','Hialeah','Tallahassee','Fort Lauderdale'],
  GA: ['Atlanta','Augusta','Columbus','Macon','Savannah','Athens','Sandy Springs','Roswell'],
  HI: ['Honolulu','Pearl City','Hilo','Kailua'],
  ID: ['Boise','Meridian','Nampa','Idaho Falls'],
  IL: ['Chicago','Aurora','Rockford','Joliet','Naperville','Springfield','Peoria'],
  IN: ['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel'],
  IA: ['Des Moines','Cedar Rapids','Davenport','Sioux City'],
  KS: ['Wichita','Overland Park','Kansas City','Topeka'],
  KY: ['Louisville','Lexington','Bowling Green','Owensboro'],
  LA: ['New Orleans','Baton Rouge','Shreveport','Lafayette','Lake Charles'],
  ME: ['Portland','Lewiston','Bangor'],
  MD: ['Baltimore','Frederick','Rockville','Gaithersburg','Annapolis'],
  MA: ['Boston','Worcester','Springfield','Cambridge','Lowell'],
  MI: ['Detroit','Grand Rapids','Warren','Sterling Heights','Lansing','Ann Arbor'],
  MN: ['Minneapolis','Saint Paul','Rochester','Duluth','Bloomington'],
  MS: ['Jackson','Gulfport','Southaven','Hattiesburg','Biloxi'],
  MO: ['Kansas City','St. Louis','Springfield','Columbia','Independence'],
  MT: ['Billings','Missoula','Great Falls','Bozeman'],
  NE: ['Omaha','Lincoln','Bellevue','Grand Island'],
  NV: ['Las Vegas','Henderson','Reno','North Las Vegas','Sparks'],
  NH: ['Manchester','Nashua','Concord'],
  NJ: ['Newark','Jersey City','Paterson','Elizabeth','Trenton'],
  NM: ['Albuquerque','Las Cruces','Rio Rancho','Santa Fe'],
  NY: ['New York','Buffalo','Rochester','Yonkers','Syracuse','Albany'],
  NC: ['Charlotte','Raleigh','Greensboro','Durham','Winston-Salem','Fayetteville','Cary'],
  ND: ['Fargo','Bismarck','Grand Forks','Minot'],
  OH: ['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton'],
  OK: ['Oklahoma City','Tulsa','Norman','Broken Arrow','Lawton'],
  OR: ['Portland','Salem','Eugene','Gresham','Hillsboro'],
  PA: ['Philadelphia','Pittsburgh','Allentown','Erie','Reading'],
  RI: ['Providence','Cranston','Warwick','Pawtucket'],
  SC: ['Columbia','Charleston','North Charleston','Mount Pleasant','Rock Hill','Greenville'],
  SD: ['Sioux Falls','Rapid City','Aberdeen'],
  TN: ['Nashville','Memphis','Knoxville','Chattanooga','Clarksville','Murfreesboro'],
  TX: ['Houston','San Antonio','Dallas','Austin','Fort Worth','El Paso','Arlington','Corpus Christi','Plano','Laredo'],
  UT: ['Salt Lake City','West Valley City','Provo','West Jordan','Orem'],
  VT: ['Burlington','South Burlington','Rutland'],
  VA: ['Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Alexandria'],
  WA: ['Seattle','Spokane','Tacoma','Vancouver','Bellevue','Kirkland'],
  WV: ['Charleston','Huntington','Morgantown','Parkersburg'],
  WI: ['Milwaukee','Madison','Green Bay','Kenosha','Racine'],
  WY: ['Cheyenne','Casper','Laramie'],
}

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

const ASSET_OPTIONS = [
  { value: 'SFR', label: 'Single Family' },
  { value: 'MULTI_2_4', label: '2-4 Units' },
  { value: 'MULTI_5_PLUS', label: '5-19 Units' },
  { value: 'MULTI_20_30', label: '20-50 Units' },
  { value: 'MULTI_50_PLUS', label: '50+ Units' },
]

export default function FinderPage() {
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
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

  const cities = selectedState ? STATES[selectedState] || [] : []

  const toggleAsset = (val: string) => {
    setAssetTypes(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const handleStateChange = (s: string) => {
    setSelectedState(s)
    setSelectedCity('')
  }

  const handleSearch = async () => {
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (selectedCity) params.set('city', selectedCity)
      if (selectedState) params.set('state', selectedState)
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

  const inputClass = "w-full bg-white/[0.05] border border-white/[0.08] rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
  const selectClass = "w-full bg-[#1a1f2e] border border-white/[0.08] rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Deal Finder</h1>
        <p className="text-xs text-slate-500 mt-0.5">Search Crexi for deals matching NBRC criteria</p>
      </div>

      <div className="card p-5 mb-6">
        {/* Location Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">State</label>
            <select value={selectedState} onChange={e => handleStateChange(e.target.value)} className={selectClass}>
              <option value="">All States</option>
              {Object.entries(STATE_NAMES).sort((a,b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">City</label>
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className={selectClass} disabled={!selectedState}>
              <option value="">All Cities</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">Min Price</label>
            <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="e.g. 500000" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">Max Price</label>
            <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g. 5000000" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">Min Units</label>
            <input value={minUnits} onChange={e => setMinUnits(e.target.value)} placeholder="e.g. 20" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-widest mb-1 block">Min Cap Rate %</label>
            <input value={minCapRate} onChange={e => setMinCapRate(e.target.value)} placeholder="e.g. 8" className={inputClass} />
          </div>
        </div>

        {/* Asset Types */}
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
        <div className="card p-8 text-center text-slate-500 text-sm">No deals found matching your criteria.</div>
      )}

      {results.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-3">{results.length} deals found, sorted by score</div>
          <div className="space-y-3">
            {results.map((r: any) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-4">
                  {r.image && <img src={r.image} alt="" className="w-24 h-16 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-medium text-slate-200">{r.address}</div>
                        <div className="text-xs text-slate-500">{r.city}, {r.state} · {r.units} units · {r.assetType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-100 fin-num">{fmtK(r.price)}</div>
                        <div className="text-xs text-slate-500 fin-num">{fmtK(r.pricePerUnit)}/unit</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div><div className="text-xs text-slate-500">Cap Rate</div><div className="text-sm fin-num text-emerald-400">{fmtPct(r.capRate)}</div></div>
                      <div><div className="text-xs text-slate-500">CoC</div><div className="text-sm fin-num text-blue-400">{fmtPct(r.cashOnCash)}</div></div>
                      <div><div className="text-xs text-slate-500">DSCR</div><div className="text-sm fin-num text-slate-300">{r.dscr ? r.dscr.toFixed(2) : '—'}</div></div>
                      <div><div className="text-xs text-slate-500">Down</div><div className="text-sm fin-num text-slate-300">{fmtK(r.downPayment)}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Score: {r.score}</span>
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-200 underline">View on Crexi</a>}
                      {r.broker && <span className="text-xs text-slate-600">{r.broker}</span>}
                      <div className="flex-1" />
                      {addedIds.has(r.id) ? (
                        <span className="text-xs text-emerald-400">Added to Pipeline</span>
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
