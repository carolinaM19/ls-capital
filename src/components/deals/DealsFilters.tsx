'use client'
import { useRouter, usePathname } from 'next/navigation'
import { US_STATES, ASSET_TYPES, DEAL_TYPES, DEAL_STATUSES } from '@/lib/utils'

interface Props {
  sources: { id: string; name: string }[]
  sp: Record<string, string | undefined>
}

export default function DealsFilters({ sources, sp }: Props) {
  const router = useRouter()
  const path = usePathname()

  function set(key: string, val: string) {
    const p = new URLSearchParams(sp as Record<string,string>)
    val ? p.set(key, val) : p.delete(key)
    p.delete('page')
    router.push(`${path}?${p.toString()}`)
  }

  const hasFilters = Object.values(sp).some(Boolean)

  const sel = (val: string, onChange: (v: string) => void, placeholder: string, options: {value:string;label:string}[]) => (
    <select
      value={val || ''}
      onChange={e => onChange(e.target.value)}
      className="h-7 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <div className="px-6 py-2.5 border-b border-white/[0.05] flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Search address, city…"
        defaultValue={sp.q ?? ''}
        onKeyDown={e => { if (e.key === 'Enter') set('q', (e.target as HTMLInputElement).value) }}
        onBlur={e => set('q', e.target.value)}
        className="h-7 px-2.5 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 w-44"
      />

      {sel(sp.state ?? '', v => set('state', v), 'All States', US_STATES.map(s => ({ value: s, label: s })))}
      {sel(sp.status ?? '', v => set('status', v), 'All Statuses', DEAL_STATUSES)}
      {sel(sp.assetType ?? '', v => set('assetType', v), 'All Assets', ASSET_TYPES)}
      {sel(sp.dealType ?? '', v => set('dealType', v), 'All Types', DEAL_TYPES)}
      {sel(sp.sourceId ?? '', v => set('sourceId', v), 'All Sources', sources.map(s => ({ value: s.id, label: s.name })))}

      {/* Units range */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          placeholder="Units ≥"
          defaultValue={sp.unitsMin ?? ''}
          onBlur={e => set('unitsMin', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') set('unitsMin', (e.target as HTMLInputElement).value) }}
          className="h-7 w-16 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        />
        <span className="text-slate-600 text-xs">–</span>
        <input
          type="number"
          placeholder="≤"
          defaultValue={sp.unitsMax ?? ''}
          onBlur={e => set('unitsMax', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') set('unitsMax', (e.target as HTMLInputElement).value) }}
          className="h-7 w-14 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        />
      </div>

      {/* Sort */}
      {sel(sp.sort ?? 'score', v => set('sort', v), 'Sort', [
        { value: 'score', label: 'Score ↓' },
        { value: 'cap_rate', label: 'Cap Rate ↓' },
        { value: 'dscr', label: 'DSCR ↓' },
        { value: 'price_per_unit', label: '$/Unit ↑' },
        { value: 'date', label: 'Date ↓' },
      ])}

      {hasFilters && (
        <button onClick={() => router.push(path)} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-300 border border-white/[0.06] rounded transition-colors">
          ✕ Clear
        </button>
      )}
    </div>
  )
}
