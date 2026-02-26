'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createDeal, updateDeal } from '@/app/actions/deals'
import { US_STATES, ASSET_TYPES, DEAL_TYPES } from '@/lib/utils'

interface Props {
  sources: { id: string; name: string }[]
  initialData?: Record<string, unknown>
  dealId?: string
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

function inp(err?: string) {
  return `w-full h-8 px-2.5 text-sm bg-[#1c1f2a] border rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors ${
    err ? 'border-red-500/40 focus:ring-red-500/20' : 'border-white/[0.08] focus:ring-blue-500/30 focus:border-blue-500/30'
  }`
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest pb-3 border-b border-white/[0.05] mb-4">{children}</h3>
}

export default function DealForm({ sources, initialData, dealId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const d = initialData ?? {}
  const [f, setF] = useState({
    address: String(d.address ?? ''),
    city: String(d.city ?? ''),
    state: String(d.state ?? ''),
    zip: String(d.zip ?? ''),
    county: String(d.county ?? ''),
    assetType: String(d.assetType ?? 'MULTI_20_30'),
    units: String(d.units ?? ''),
    yearBuilt: String(d.yearBuilt ?? ''),
    sqFt: String(d.sqFt ?? ''),
    bedrooms: String(d.bedrooms ?? ''),
    bathrooms: String(d.bathrooms ?? ''),
    dealType: String(d.dealType ?? 'ON_MARKET'),
    description: String(d.description ?? ''),
    askingPrice: d.askingPrice ? String(Number(d.askingPrice) / 100) : '',
    grossMonthlyRent: d.grossMonthlyRent ? String(Number(d.grossMonthlyRent) / 100) : '',
    currentMonthlyRent: d.currentMonthlyRent ? String(Number(d.currentMonthlyRent) / 100) : '',
    occupancyRate: String(d.occupancyRate ?? ''),
    vacancyRate: String(d.vacancyRate ?? ''),
    expenseRatio: String(d.expenseRatio ?? ''),
    rentGrowthRate: String(d.rentGrowthRate ?? ''),
    daysOnMarket: String(d.daysOnMarket ?? ''),
    sourceId: String(d.sourceId ?? ''),
    sourceUrl: String(d.sourceUrl ?? ''),
    listingDate: d.listingDate ? new Date(d.listingDate as string).toISOString().split('T')[0] : '',
    brokerName: String(d.brokerName ?? ''),
    brokerEmail: String(d.brokerEmail ?? ''),
    brokerPhone: String(d.brokerPhone ?? ''),
  })

  const set = (k: string, v: string) => {
    setF(prev => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!f.address.trim()) e.address = 'Required'
    if (!f.city.trim()) e.city = 'Required'
    if (!f.state) e.state = 'Required'
    const u = parseInt(f.units)
    if (!f.units || isNaN(u) || u < 1) e.units = 'Required, must be ≥ 1'
    setErrors(e)
    return !Object.keys(e).length
  }

  const pricePerUnit = f.askingPrice && f.units
    ? `$${Math.round(parseFloat(f.askingPrice) / parseInt(f.units) / 1000)}K`
    : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    startTransition(async () => {
      const payload = {
        address: f.address.trim(),
        city: f.city.trim(),
        state: f.state,
        zip: f.zip || undefined,
        county: f.county || undefined,
        assetType: f.assetType,
        units: parseInt(f.units),
        yearBuilt: f.yearBuilt ? parseInt(f.yearBuilt) : null,
        sqFt: f.sqFt ? parseInt(f.sqFt) : null,
        bedrooms: f.bedrooms ? parseInt(f.bedrooms) : null,
        bathrooms: f.bathrooms ? parseFloat(f.bathrooms) : null,
        dealType: f.dealType,
        description: f.description || null,
        askingPrice: f.askingPrice ? parseFloat(f.askingPrice) : null,
        grossMonthlyRent: f.grossMonthlyRent ? parseFloat(f.grossMonthlyRent) : null,
        currentMonthlyRent: f.currentMonthlyRent ? parseFloat(f.currentMonthlyRent) : null,
        occupancyRate: f.occupancyRate ? parseFloat(f.occupancyRate) : null,
        vacancyRate: f.vacancyRate ? parseFloat(f.vacancyRate) : null,
        expenseRatio: f.expenseRatio ? parseFloat(f.expenseRatio) : null,
        rentGrowthRate: f.rentGrowthRate ? parseFloat(f.rentGrowthRate) : null,
        daysOnMarket: f.daysOnMarket ? parseInt(f.daysOnMarket) : null,
        sourceId: f.sourceId || null,
        sourceUrl: f.sourceUrl || null,
        listingDate: f.listingDate || null,
        brokerName: f.brokerName || null,
        brokerEmail: f.brokerEmail || null,
        brokerPhone: f.brokerPhone || null,
      }

      const result = dealId
        ? await updateDeal(dealId, payload)
        : await createDeal(payload)

      if (result.success) {
        toast.success(dealId ? 'Deal updated' : 'Deal created')
        if (!dealId && (result as {dealId?: string}).dealId) {
          router.push(`/deals/${(result as {dealId?: string}).dealId}`)
        }
      } else {
        toast.error((result as {error?: string}).error ?? 'Error')
      }
    })
  }

  const Input = ({ field, type = 'text', placeholder = '' }: { field: string; type?: string; placeholder?: string }) => (
    <input
      type={type}
      value={f[field as keyof typeof f]}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
      className={inp(errors[field])}
    />
  )

  const Select = ({ field, options }: { field: string; options: {value:string;label:string}[] }) => (
    <select value={f[field as keyof typeof f]} onChange={e => set(field, e.target.value)} className={inp(errors[field])}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Location */}
      <section className="card p-5">
        <SectionTitle>Location</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Street Address *" error={errors.address}><Input field="address" placeholder="123 Main St" /></Field>
          </div>
          <Field label="City *" error={errors.city}><Input field="city" placeholder="Atlanta" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State *" error={errors.state}>
              <select value={f.state} onChange={e => set('state', e.target.value)} className={inp(errors.state)}>
                <option value="">—</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="ZIP"><Input field="zip" placeholder="30308" /></Field>
          </div>
          <Field label="County"><Input field="county" placeholder="Fulton" /></Field>
        </div>
      </section>

      {/* Property */}
      <section className="card p-5">
        <SectionTitle>Property</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Asset Type">
            <Select field="assetType" options={ASSET_TYPES} />
          </Field>
          <Field label="Deal Type">
            <Select field="dealType" options={DEAL_TYPES} />
          </Field>
          <Field label="Units *" error={errors.units}><Input field="units" type="number" placeholder="24" /></Field>
          <Field label="Year Built"><Input field="yearBuilt" type="number" placeholder="1978" /></Field>
          <Field label="Sq Ft"><Input field="sqFt" type="number" placeholder="22000" /></Field>
          <Field label="Bedrooms (SFR)"><Input field="bedrooms" type="number" placeholder="3" /></Field>
          <div className="sm:col-span-3">
            <Field label="Description / Value-Add Notes">
              <textarea
                value={f.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Under-market rents, value-add opportunity, deferred maintenance, renovation upside…"
                className="w-full bg-[#1c1f2a] border border-white/[0.08] rounded text-sm text-slate-100 placeholder-slate-600 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/30 min-h-20 resize-y"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Financials */}
      <section className="card p-5">
        <SectionTitle>Financials</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Asking Price ($)"><Input field="askingPrice" type="number" placeholder="3200000" /></Field>
          <Field label="Price / Unit (auto)">
            <div className="h-8 px-2.5 flex items-center bg-white/[0.03] border border-white/[0.04] rounded text-sm fin-num text-slate-400">
              {pricePerUnit ?? '—'}
            </div>
          </Field>
          <Field label="Gross Monthly Rent ($)"><Input field="grossMonthlyRent" type="number" placeholder="32400" /></Field>
          <Field label="Current In-Place Rent ($)"><Input field="currentMonthlyRent" type="number" placeholder="26000" /></Field>
          <Field label="Occupancy (%)"><Input field="occupancyRate" type="number" placeholder="91" /></Field>
          <Field label="Days on Market"><Input field="daysOnMarket" type="number" placeholder="45" /></Field>
        </div>

        {/* UW Overrides */}
        <div className="mt-5 pt-4 border-t border-white/[0.05]">
          <p className="text-xs text-slate-600 mb-3">Underwriting overrides (leave blank to use portfolio defaults)</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Expense Ratio % override"><Input field="expenseRatio" type="number" placeholder="40" /></Field>
            <Field label="Vacancy % override"><Input field="vacancyRate" type="number" placeholder="5" /></Field>
            <Field label="Rent Growth % override"><Input field="rentGrowthRate" type="number" placeholder="3" /></Field>
          </div>
        </div>
      </section>

      {/* Source */}
      <section className="card p-5">
        <SectionTitle>Source & Broker</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Source">
            <select value={f.sourceId} onChange={e => set('sourceId', e.target.value)} className={inp()}>
              <option value="">— None —</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Listing Date"><Input field="listingDate" type="date" /></Field>
          <div className="col-span-2 sm:col-span-3">
            <Field label="Listing URL"><Input field="sourceUrl" type="url" placeholder="https://loopnet.com/listing/…" /></Field>
          </div>
          <Field label="Broker Name"><Input field="brokerName" placeholder="Jane Smith" /></Field>
          <Field label="Broker Email"><Input field="brokerEmail" type="email" placeholder="jane@brokerage.com" /></Field>
          <Field label="Broker Phone"><Input field="brokerPhone" placeholder="(404) 555-1234" /></Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-40">
          {isPending ? 'Saving…' : dealId ? 'Save Changes' : 'Create Deal'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 border border-white/[0.06] rounded-md transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
