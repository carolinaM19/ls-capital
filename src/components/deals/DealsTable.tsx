'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { fmtDollars, fmtPPU, fmtPct, fmtNum, scoreGrade, STATUS_META, DEAL_TYPE_META, ASSET_TYPE_META, dscrColor, capRateColor, DEAL_STATUSES } from '@/lib/utils'
import { bulkUpdateDeals } from '@/app/actions/deals'
import type { DealStatus } from '@prisma/client'

interface Deal {
  id: string; address: string; city: string; state: string
  assetType: string; units: number; dealType: string; status: string
  bankabilityScore: number; askingPrice: bigint | null; pricePerUnit: bigint | null
  capRate: unknown; dscr: unknown; cashOnCash: unknown
  loanAmount: bigint | null; noi: bigint | null
  source: { name: string } | null
  assignedTo: { name: string | null; email: string } | null
  createdAt: Date
}
interface Props {
  deals: Deal[]
  users: { id: string; name: string | null; email: string }[]
  page: number; totalPages: number; total: number
  sp: Record<string, string | undefined>
}

export default function DealsTable({ deals, users, page, totalPages, total, sp }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const toggleAll = () => setSelected(selected.size === deals.length ? new Set() : new Set(deals.map(d => d.id)))
  const toggle = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const bulkStatus = (status: string) => {
    if (!selected.size) return
    startTransition(async () => {
      const r = await bulkUpdateDeals({ ids: [...selected], status: status as DealStatus })
      if (r.success) { toast.success(`Updated ${selected.size}`); setSelected(new Set()); router.refresh() }
      else toast.error('Failed')
    })
  }

  const bulkAssign = (userId: string) => {
    if (!selected.size) return
    startTransition(async () => {
      const r = await bulkUpdateDeals({ ids: [...selected], assignedToId: userId || null })
      if (r.success) { toast.success('Assigned'); setSelected(new Set()); router.refresh() }
    })
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams(sp as Record<string,string>)
    params.set('page', String(p))
    return `/deals?${params.toString()}`
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {selected.size > 0 && (
        <div className="px-6 py-2 bg-blue-500/5 border-b border-blue-500/15 flex items-center gap-3">
          <span className="text-xs text-blue-400 font-medium">{selected.size} selected</span>
          <select onChange={e => { if (e.target.value) bulkStatus(e.target.value) }} defaultValue="" disabled={isPending}
            className="h-6 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none">
            <option value="" disabled>Change status…</option>
            {DEAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select onChange={e => bulkAssign(e.target.value)} defaultValue="" disabled={isPending}
            className="h-6 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none">
            <option value="" disabled>Assign to…</option>
            <option value="">Unassign</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
          </select>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-300 ml-1">Cancel</button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8 px-4">
                <input type="checkbox" checked={selected.size === deals.length && deals.length > 0} onChange={toggleAll}
                  className="rounded border-white/20 bg-white/[0.06] text-blue-500 focus:ring-blue-500/30" />
              </th>
              <th>Score</th>
              <th>Property</th>
              <th>Asset</th>
              <th>Type</th>
              <th>Price</th>
              <th>$/Unit</th>
              <th>Cap</th>
              <th>DSCR</th>
              <th>Loan</th>
              <th>Status</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 && (
              <tr><td colSpan={12} className="text-center py-16 text-slate-600">
                No deals found.{' '}
                <Link href="/deals/new" className="text-blue-400 hover:underline">Add one</Link> or adjust filters.
              </td></tr>
            )}
            {deals.map(deal => {
              const grade = scoreGrade(deal.bankabilityScore)
              return (
                <tr
                  key={deal.id}
                  onClick={() => router.push(`/deals/${deal.id}`)}
                >
                  <td onClick={e => { e.stopPropagation(); toggle(deal.id) }}>
                    <input type="checkbox" checked={selected.has(deal.id)} onChange={() => toggle(deal.id)}
                      className="rounded border-white/20 bg-white/[0.06] text-blue-500 focus:ring-blue-500/30" />
                  </td>
                  {/* Score badge */}
                  <td>
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded text-sm font-bold fin-num ${grade.bg}`}>
                      {deal.bankabilityScore}
                    </div>
                  </td>
                  <td>
                    <div className="text-slate-200 font-medium text-xs leading-tight group-hover:text-blue-300">{deal.address}</div>
                    <div className="text-slate-600 text-xs">{deal.city}, {deal.state}</div>
                  </td>
                  <td>
                    <div className="text-xs text-slate-400">{ASSET_TYPE_META[deal.assetType]?.label ?? deal.assetType}</div>
                    <div className="text-xs text-slate-600">{deal.units}u</div>
                  </td>
                  <td><span className={`badge text-[10px] ${DEAL_TYPE_META[deal.dealType]?.color ?? ''}`}>{DEAL_TYPE_META[deal.dealType]?.label ?? deal.dealType}</span></td>
                  <td className="fin-num text-xs text-slate-300">{fmtDollars(deal.askingPrice)}</td>
                  <td className="fin-num text-xs text-slate-400">{fmtPPU(deal.pricePerUnit)}</td>
                  <td className={`fin-num text-xs ${capRateColor(deal.capRate as number)}`}>{fmtPct(deal.capRate as number)}</td>
                  <td className={`fin-num text-xs ${dscrColor(deal.dscr as number)}`}>{fmtNum(deal.dscr as number)}</td>
                  <td className="fin-num text-xs text-slate-400">{fmtDollars(deal.loanAmount)}</td>
                  <td><span className={`badge text-[10px] ${STATUS_META[deal.status]?.color ?? ''}`}>{STATUS_META[deal.status]?.label ?? deal.status}</span></td>
                  <td className="text-xs text-slate-600">{deal.source?.name ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {((page-1)*25)+1}–{Math.min(page*25, total)} of {total}
          </span>
          <div className="flex gap-1">
            {page > 1 && <Link href={pageUrl(page-1)} className="h-7 px-3 text-xs text-slate-400 hover:text-slate-200 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors flex items-center">← Prev</Link>}
            {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
              const p = i + 1
              return <Link key={p} href={pageUrl(p)} className={`h-7 px-3 text-xs rounded border flex items-center transition-colors ${p === page ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}`}>{p}</Link>
            })}
            {page < totalPages && <Link href={pageUrl(page+1)} className="h-7 px-3 text-xs text-slate-400 hover:text-slate-200 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors flex items-center">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
