'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { extractDealFromText, type ExtractedDeal } from '@/app/actions/ai-extract'
import { createDeal } from '@/app/actions/deals'
import { fmtDollarsFull, fmtPct, ASSET_TYPES, DEAL_TYPES, US_STATES } from '@/lib/utils'

const EXAMPLES = [
  `24-unit brick courtyard building in Chicago's Edgewater neighborhood. 
4821 N Sheridan Rd, Chicago, IL 60640. Built 1968, 22,000 sq ft.
Asking $3,200,000. Current rents average $1,083/mo (91% occupied, 22 of 24 units).
Market rents $1,350/mo per unit. Significant under-market upside — 18% rent gap.
Long-term tenants, deferred cosmetic maintenance.
LoopNet listing. Broker: Mike Callahan, mike@chicagobrokers.com, (312) 555-0182`,

  `Off-market opportunity — Atlanta Midtown, 28-unit multifamily.
890 Peachtree St NE, Atlanta, GA 30308. 1972 construction.
Owner asking $3.6M. Currently 22 of 28 units occupied (78%). 
Market rent: $1,200/unit/month. In-place: $900/unit avg.
Property has deferred maintenance — needs roof and HVAC work.
Significant value-add: bring occupancy to 95%, rents to market = major upside.
Motivated seller. No broker — direct deal.`
]

export default function AIExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [extracted, setExtracted] = useState<ExtractedDeal | null>(null)
  const [edited, setEdited] = useState<ExtractedDeal | null>(null)
  const [isExtracting, startExtract] = useTransition()
  const [isSaving, startSave] = useTransition()

  function handleExtract() {
    if (!text.trim()) { toast.error('Paste some listing text first'); return }
    startExtract(async () => {
      const result = await extractDealFromText(text)
      if (result.success && result.data) {
        setExtracted(result.data)
        setEdited({ ...result.data })
        toast.success('Extraction complete')
      } else {
        toast.error(result.error ?? 'Extraction failed')
      }
    })
  }

  function handleSave() {
    if (!edited) return
    startSave(async () => {
      const result = await createDeal({
        address: edited.address ?? '',
        city: edited.city ?? '',
        state: edited.state ?? '',
        zip: edited.zip,
        units: edited.units ?? 1,
        yearBuilt: edited.yearBuilt ?? null,
        sqFt: edited.sqFt ?? null,
        assetType: edited.assetType ?? 'MULTI_20_30',
        dealType: edited.dealType ?? 'ON_MARKET',
        description: edited.description ?? null,
        askingPrice: edited.askingPrice ?? null,
        grossMonthlyRent: edited.grossMonthlyRent ?? null,
        currentMonthlyRent: edited.currentMonthlyRent ?? null,
        occupancyRate: edited.occupancyRate ?? null,
        daysOnMarket: edited.daysOnMarket ?? null,
        sourceUrl: edited.sourceUrl ?? null,
        brokerName: edited.brokerName ?? null,
        brokerEmail: edited.brokerEmail ?? null,
        brokerPhone: edited.brokerPhone ?? null,
      })
      if (result.success) {
        toast.success('Deal saved to pipeline!')
        if ((result as { dealId?: string }).dealId) {
          router.push(`/deals/${(result as { dealId?: string }).dealId}`)
        }
      } else {
        toast.error((result as { error?: string }).error ?? 'Save failed')
      }
    })
  }

  function setField(key: keyof ExtractedDeal, val: unknown) {
    setEdited(prev => prev ? { ...prev, [key]: val } : null)
  }

  const confidenceColor = (level?: string) => {
    if (level === 'high') return 'text-emerald-400'
    if (level === 'medium') return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">AI Deal Extractor</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste any listing text, broker email, or property description. Claude extracts all structured fields automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Listing Text</h3>
              <div className="flex gap-1">
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => setText(ex)}
                    className="text-[10px] px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 border border-white/[0.06] rounded transition-colors">
                    Example {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Paste listing copy, broker email, or any property description here…

Example:
24-unit Chicago brick courtyard, 4821 N Sheridan Rd, 60640.
Asking $3.2M. Built 1968. 91% occupied. Gross rent $32,400/mo.
Under-market rents — 18% upside available. Value-add play.`}
              className="w-full bg-[#1c1f2a] border border-white/[0.08] rounded px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none min-h-64 font-mono text-xs leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-600">{text.length}/8000 chars</span>
              <button
                onClick={handleExtract}
                disabled={isExtracting || !text.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {isExtracting ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Extracting…</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> Extract with AI</>
                )}
              </button>
            </div>
          </div>

          {/* How it works */}
          {!extracted && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">How It Works</h3>
              <div className="space-y-3">
                {[
                  { n: '1', t: 'Paste any text', d: 'Listing copy, broker email, LoopNet/Crexi export, any format' },
                  { n: '2', t: 'AI extracts fields', d: 'Claude identifies address, units, price, rents, occupancy, and value-add signals' },
                  { n: '3', t: 'Review & edit', d: 'Verify extracted data, fix anything incorrect' },
                  { n: '4', t: 'Save to pipeline', d: 'One click adds to Deal Inbox with full underwriting computed' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                    <div>
                      <div className="text-xs font-medium text-slate-300">{s.t}</div>
                      <div className="text-xs text-slate-600">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Extracted / Edit panel */}
        <div>
          {!extracted && !isExtracting && (
            <div className="card p-10 h-full flex items-center justify-center text-center">
              <div>
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">Extracted data will appear here</p>
              </div>
            </div>
          )}

          {isExtracting && (
            <div className="card p-10 h-full flex items-center justify-center text-center">
              <div>
                <svg className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <p className="text-slate-400 text-sm">Extracting deal data…</p>
                <p className="text-slate-600 text-xs mt-1">Analyzing with Claude</p>
              </div>
            </div>
          )}

          {edited && !isExtracting && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between bg-emerald-500/5">
                <div>
                  <span className="text-xs font-medium text-emerald-400">✓ Extraction complete</span>
                  <span className="text-xs text-slate-600 ml-2">Edit any field before saving</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {Object.entries(edited.confidence ?? {}).map(([k, v]) => (
                    <span key={k} className={`${confidenceColor(v as string)}`}>{k}: {v}</span>
                  )).slice(0, 3).join(' · ')}
                </div>
              </div>

              <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto">
                {/* Address block */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Address</label>
                    <input value={edited.address ?? ''} onChange={e => setField('address', e.target.value)}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">City</label>
                    <input value={edited.city ?? ''} onChange={e => setField('city', e.target.value)}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">State</label>
                      <select value={edited.state ?? ''} onChange={e => setField('state', e.target.value)}
                        className="input mt-1 text-xs h-8">
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">ZIP</label>
                      <input value={edited.zip ?? ''} onChange={e => setField('zip', e.target.value)}
                        className="input mt-1 text-xs h-8" />
                    </div>
                  </div>
                </div>

                {/* Property */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Units</label>
                    <input type="number" value={edited.units ?? ''} onChange={e => setField('units', parseInt(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Year Built</label>
                    <input type="number" value={edited.yearBuilt ?? ''} onChange={e => setField('yearBuilt', parseInt(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Sq Ft</label>
                    <input type="number" value={edited.sqFt ?? ''} onChange={e => setField('sqFt', parseInt(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Asset Type</label>
                    <select value={edited.assetType ?? ''} onChange={e => setField('assetType', e.target.value)}
                      className="input mt-1 text-xs h-8">
                      {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Deal Type</label>
                    <select value={edited.dealType ?? ''} onChange={e => setField('dealType', e.target.value)}
                      className="input mt-1 text-xs h-8">
                      {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Occupancy %</label>
                    <input type="number" value={edited.occupancyRate ?? ''} onChange={e => setField('occupancyRate', parseFloat(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Asking Price</label>
                    <input type="number" value={edited.askingPrice ?? ''} onChange={e => setField('askingPrice', parseFloat(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Gross Mo. Rent</label>
                    <input type="number" value={edited.grossMonthlyRent ?? ''} onChange={e => setField('grossMonthlyRent', parseFloat(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">In-Place Rent</label>
                    <input type="number" value={edited.currentMonthlyRent ?? ''} onChange={e => setField('currentMonthlyRent', parseFloat(e.target.value))}
                      className="input mt-1 text-xs h-8" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">AI Summary / Notes</label>
                  <textarea value={edited.description ?? ''} onChange={e => setField('description', e.target.value)}
                    className="input mt-1 text-xs min-h-16 resize-none" />
                </div>

                {/* Broker */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Broker Name</label>
                    <input value={edited.brokerName ?? ''} onChange={e => setField('brokerName', e.target.value)}
                      className="input mt-1 text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Broker Email</label>
                    <input value={edited.brokerEmail ?? ''} onChange={e => setField('brokerEmail', e.target.value)}
                      className="input mt-1 text-xs h-8" />
                  </div>
                </div>

                {edited.rawNotes && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded p-3">
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">AI Notes</p>
                    <p className="text-xs text-slate-400">{edited.rawNotes}</p>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !edited.address || !edited.city || !edited.state}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40"
                  >
                    {isSaving ? 'Saving…' : 'Save to Pipeline →'}
                  </button>
                  <button onClick={() => { setExtracted(null); setEdited(null) }}
                    className="px-4 py-2 text-sm text-slate-500 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors">
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
