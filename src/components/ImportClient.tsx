'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { runCsvImport, type ImportResult } from '@/app/actions/import'

interface Props {
  sources: { id: string; name: string }[]
  recentJobs: Array<{
    id: string; status: string; recordsTotal: number; recordsCreated: number
    recordsUpdated: number; recordsFailed: number; createdAt: string
    user: { name?: string; email: string }
  }>
}

const FIELD_OPTIONS = [
  { value: '', label: '— Skip —' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'ZIP' },
  { value: 'units', label: 'Units' },
  { value: 'yearBuilt', label: 'Year Built' },
  { value: 'sqFt', label: 'Sq Ft' },
  { value: 'assetType', label: 'Asset Type' },
  { value: 'dealType', label: 'Deal Type' },
  { value: 'description', label: 'Description / Notes' },
  { value: 'askingPrice', label: 'Asking Price ($)' },
  { value: 'grossMonthlyRent', label: 'Gross Monthly Rent ($)' },
  { value: 'currentMonthlyRent', label: 'Current Rent ($)' },
  { value: 'occupancyRate', label: 'Occupancy (%)' },
  { value: 'capRate', label: 'Cap Rate (%)' },
  { value: 'daysOnMarket', label: 'Days on Market' },
  { value: 'sourceUrl', label: 'Listing URL' },
  { value: 'brokerName', label: 'Broker Name' },
  { value: 'brokerEmail', label: 'Broker Email' },
]

function autoDetect(header: string): string {
  const h = header.toLowerCase().replace(/[\s_\-\.]+/g, '')
  if (h === 'address' || h === 'street' || h === 'streetaddress' || h === 'propertyaddress') return 'address'
  if (h === 'city') return 'city'
  if (h === 'state' || h === 'st') return 'state'
  if (h.includes('zip') || h === 'postal' || h === 'postalcode') return 'zip'
  if (h === 'units' || h.includes('numunit') || h === 'totalunits' || h === 'numberofunits') return 'units'
  if (h.includes('yearbuilt') || h === 'builtyr' || h === 'yearofconstruction') return 'yearBuilt'
  if (h.includes('sqft') || h.includes('squarefeet') || h === 'gla' || h === 'size') return 'sqFt'
  if (h === 'type' || h.includes('assettype') || h.includes('propertytype')) return 'assetType'
  if (h.includes('dealtype') || h.includes('listingtype')) return 'dealType'
  if (h.includes('desc') || h.includes('note') || h.includes('comment') || h === 'remarks') return 'description'
  if (h.includes('price') && !h.includes('unit') && !h.includes('per')) return 'askingPrice'
  if (h.includes('listprice') || h.includes('askingprice')) return 'askingPrice'
  if (h.includes('grossrent') || h.includes('marketrent') || h.includes('grossmonthly')) return 'grossMonthlyRent'
  if (h.includes('currentrent') || h.includes('inplacerent')) return 'currentMonthlyRent'
  if (h.includes('occup')) return 'occupancyRate'
  if (h === 'cap' || h === 'caprate' || h.includes('caprate')) return 'capRate'
  if (h.includes('dom') || h.includes('daysonmarket')) return 'daysOnMarket'
  if (h.includes('url') || h.includes('link') || h.includes('listingurl')) return 'sourceUrl'
  if (h.includes('brokername') || h === 'broker' || h === 'agent') return 'brokerName'
  if (h.includes('brokeremail') || h === 'agentmail') return 'brokerEmail'
  return ''
}

type ParsedRow = Record<string, string>
type Step = 'upload' | 'map' | 'preview' | 'result'

export default function ImportClient({ sources, recentJobs }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [sourceId, setSourceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)

  function processFile(file: File) {
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a .csv file'); return }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: res => {
        const hdrs = res.meta.fields ?? []
        setHeaders(hdrs)
        setRawRows(res.data as ParsedRow[])
        const auto: Record<string, string> = {}
        hdrs.forEach(h => { auto[h] = autoDetect(h) })
        setMapping(auto)
        setStep('map')
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  function getMappedRows() {
    return rawRows.map(row => {
      const out: Record<string, unknown> = {}
      Object.entries(mapping).forEach(([col, field]) => {
        if (!field) return
        const raw = row[col]?.trim()
        if (!raw) return
        if (['units', 'yearBuilt', 'sqFt', 'daysOnMarket'].includes(field)) {
          const n = parseInt(raw.replace(/[^0-9]/g, ''))
          if (!isNaN(n)) out[field] = n
        } else if (['askingPrice', 'grossMonthlyRent', 'currentMonthlyRent', 'occupancyRate', 'capRate'].includes(field)) {
          const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
          if (!isNaN(n)) out[field] = n
        } else {
          out[field] = raw
        }
      })
      return out
    })
  }

  const hasRequired = Object.values(mapping).includes('address') &&
    Object.values(mapping).includes('city') &&
    Object.values(mapping).includes('state') &&
    Object.values(mapping).includes('units')

  async function handleRun() {
    setLoading(true)
    try {
      const mappedRows = getMappedRows()
      const res = await runCsvImport(
        mappedRows as Parameters<typeof runCsvImport>[0],
        sourceId || undefined
      )
      setResult(res)
      setStep('result')
    } catch (e) {
      toast.error('Import failed: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  const previewRows = getMappedRows().slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div
            onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-xl p-14 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-500 bg-blue-500/5' : 'border-white/[0.08] hover:border-white/[0.14]'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-white/[0.04] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div>
                <p className="text-slate-300 font-medium">Drop your CSV here</p>
                <p className="text-sm text-slate-600 mt-1">or click to browse</p>
              </div>
              <label className="cursor-pointer px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-slate-300 rounded-md transition-colors">
                Choose File
                <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
              </label>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Accepted Column Names</h3>
            <p className="text-xs text-slate-500 mb-3">We auto-map common column names. Required columns: address, city, state, units.</p>
            <div className="font-mono text-xs bg-[#1c1f2a] rounded p-3 text-slate-400 overflow-x-auto whitespace-nowrap">
              address, city, state, zip, units, asking_price, gross_monthly_rent, occupancy, cap_rate, deal_type, year_built, sqft, description, listing_url
            </div>
          </div>

          {/* Recent jobs */}
          {recentJobs.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <h3 className="text-sm font-semibold text-slate-300">Recent Imports</h3>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recentJobs.map(job => (
                  <div key={job.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className={`badge text-[10px] mr-2 ${
                        job.status === 'COMPLETE' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' :
                        job.status === 'FAILED' ? 'bg-red-500/10 text-red-400 ring-red-500/20' :
                        'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                      }`}>{job.status}</span>
                      <span className="text-xs text-slate-500">{job.user.name ?? job.user.email}</span>
                    </div>
                    <div className="text-xs fin-num text-slate-500">
                      {job.recordsCreated} new · {job.recordsUpdated} updated · {job.recordsFailed} failed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: Map */}
      {step === 'map' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Map Columns</h2>
              <p className="text-sm text-slate-500">{rawRows.length} rows detected · Auto-mapped where recognized</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">Assign to source:</label>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="h-7 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none"
              >
                <option value="">— None —</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
              {headers.map(h => (
                <div key={h} className="bg-[#111318] px-4 py-3 flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 flex-1 truncate" title={h}>{h}</span>
                  <svg className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  <select
                    value={mapping[h] ?? ''}
                    onChange={e => setMapping(p => ({ ...p, [h]: e.target.value }))}
                    className={`h-7 px-2 text-xs border rounded focus:outline-none text-slate-300 ${
                      mapping[h] ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#1c1f2a] border-white/[0.08]'
                    }`}
                  >
                    {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {!hasRequired && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
              ⚠ Required fields not yet mapped: address, city, state, units
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-slate-400 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors">← Back</button>
            <button
              onClick={() => setStep('preview')}
              disabled={!hasRequired}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-40"
            >
              Preview ({rawRows.length} rows) →
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Preview (first 5 rows)</h2>
            <p className="text-sm text-slate-500">Verify the data looks correct before importing</p>
          </div>

          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.values(mapping).filter(Boolean).map(f => (
                    <th key={f}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="cursor-default">
                    {Object.values(mapping).filter(Boolean).map(field => (
                      <td key={field} className="text-xs text-slate-400 max-w-32 truncate">
                        {String(row[field] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-4 text-sm text-slate-400">
            <p>
              <span className="text-slate-200 font-medium">{rawRows.length} rows</span> will be imported.
              Dedupe: rows matching an existing deal by address+units or by listing URL will <span className="text-amber-400">update</span> the existing deal instead of creating a duplicate.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('map')} className="px-4 py-2 text-sm text-slate-400 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors">← Back</button>
            <button
              onClick={handleRun}
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Importing…</>
              ) : `Import ${rawRows.length} Deals`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && result && (
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-200 mb-5">Import Complete</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Rows', value: result.total, color: 'text-slate-100' },
                { label: 'Created', value: result.created, color: 'text-emerald-400' },
                { label: 'Updated', value: result.updated, color: 'text-blue-400' },
                { label: 'Failed', value: result.failed, color: result.failed > 0 ? 'text-red-400' : 'text-slate-500' },
              ].map(m => (
                <div key={m.label} className="text-center bg-white/[0.03] rounded p-4">
                  <div className={`text-3xl font-bold fin-num ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded p-4">
                <p className="text-xs font-medium text-red-400 mb-2">{result.errors.length} errors:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400/80 font-mono">{e}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setResult(null); setHeaders([]); setRawRows([]) }}
              className="px-4 py-2 text-sm text-slate-400 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors"
            >
              Import Another
            </button>
            <button
              onClick={() => router.push('/deals')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
            >
              View Deal Inbox →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
