'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  fmtDollars, fmtPPU, fmtPct, fmtNum, fmtDate,
  scoreGrade, STATUS_META, DEAL_TYPE_META, ASSET_TYPE_META,
  dscrColor, capRateColor, DEAL_STATUSES,
} from '@/lib/utils'
import {
  updateDealStatus, addNote, addAttachment, deleteAttachment, updateDeal,
} from '@/app/actions/deals'
import type { DealStatus } from '@prisma/client'
import type { YearProjection } from '@/lib/underwriting'
import type { ScoreBreakdown } from '@/lib/scoring'

type Tab = 'overview' | 'underwriting' | 'score' | 'notes' | 'documents' | 'history'

interface Deal {
  id: string; address: string; city: string; state: string; zip?: string; county?: string
  assetType: string; units: number; yearBuilt?: number; sqFt?: number; bedrooms?: number; bathrooms?: number
  dealType: string; status: string; description?: string; daysOnMarket?: number
  askingPrice?: number; pricePerUnit?: number; grossMonthlyRent?: number
  currentMonthlyRent?: number; occupancyRate?: number; vacancyRate?: number
  expenseRatio?: number; rentGrowthRate?: number
  loanAmount?: number; monthlyPayment?: number; annualDebtService?: number
  noi?: number; capRate?: number; dscr?: number; cashOnCash?: number; equityRequired?: number
  bankabilityScore: number; scoreBreakdown?: ScoreBreakdown
  projection?: YearProjection[]; sourceUrl?: string; listingDate?: string
  brokerName?: string; brokerEmail?: string; brokerPhone?: string
  source?: { name: string; type: string } | null
  assignedTo?: { id: string; name?: string; email: string } | null
  notes: Array<{ id: string; body: string; createdAt: string; user: { name?: string; email: string } }>
  attachments: Array<{ id: string; label: string; url: string; fileName?: string; createdAt: string }>
  auditLogs: Array<{ id: string; event: string; payload?: Record<string,unknown>; createdAt: string; user?: { name?: string; email: string } | null }>
  createdAt: string; updatedAt: string
}

interface Props {
  deal: Deal
  users: { id: string; name?: string; email: string }[]
  sources: { id: string; name: string }[]
}

const ATTACHMENT_LABELS = ['OM', 'Rent Roll', 'T12', 'Appraisal', 'Inspection', 'Pro Forma', 'Other']

export default function DealDetailClient({ deal, users, sources }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('overview')
  const [noteText, setNoteText] = useState('')
  const [attLabel, setAttLabel] = useState('OM')
  const [attUrl, setAttUrl] = useState('')
  const [attName, setAttName] = useState('')

  const grade = scoreGrade(deal.bankabilityScore)
  const bd = deal.scoreBreakdown

  function statusChange(s: string) {
    startTransition(async () => {
      const r = await updateDealStatus(deal.id, s as DealStatus)
      if (r.success) { toast.success(`→ ${STATUS_META[s]?.label}`); router.refresh() }
      else toast.error('Failed')
    })
  }

  function handleNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    startTransition(async () => {
      const r = await addNote(deal.id, noteText)
      if (r.success) { toast.success('Note added'); setNoteText(''); router.refresh() }
    })
  }

  function handleAtt(e: React.FormEvent) {
    e.preventDefault()
    if (!attUrl.trim()) return
    startTransition(async () => {
      const r = await addAttachment(deal.id, attLabel, attUrl, attName || undefined)
      if (r.success) { toast.success('Added'); setAttUrl(''); setAttName(''); router.refresh() }
    })
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'underwriting', label: 'Underwriting' },
    { key: 'score', label: 'Score' },
    { key: 'notes', label: 'Notes', count: deal.notes.length },
    { key: 'documents', label: 'Documents', count: deal.attachments.length },
    { key: 'history', label: 'History' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.05]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link href="/deals" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">← Deal Inbox</Link>
              <span className="text-slate-700">·</span>
              <span className={`badge ${DEAL_TYPE_META[deal.dealType]?.color ?? ''} text-[10px]`}>{DEAL_TYPE_META[deal.dealType]?.label}</span>
              <span className={`badge ${STATUS_META[deal.status]?.color ?? ''} text-[10px]`}>{STATUS_META[deal.status]?.label}</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-100 font-display">{deal.address}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{deal.city}, {deal.state} {deal.zip ?? ''} · {deal.units} units · {ASSET_TYPE_META[deal.assetType]?.label}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Score badge */}
            <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center ${grade.bg} flex-shrink-0`}>
              <span className="text-xl font-bold fin-num leading-none">{deal.bankabilityScore}</span>
              <span className="text-[9px] uppercase tracking-widest mt-0.5 opacity-70">Score</span>
            </div>
            {/* Status changer */}
            <select
              value={deal.status}
              onChange={e => statusChange(e.target.value)}
              disabled={isPending}
              className="h-8 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none"
            >
              {DEAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Link href={`/deals/${deal.id}/edit`} className="h-8 px-3 text-xs text-slate-400 hover:text-slate-200 border border-white/[0.06] rounded hover:bg-white/[0.04] transition-colors flex items-center gap-1">
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.05] px-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="bg-white/[0.08] text-slate-400 rounded px-1 text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="max-w-4xl space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Asking Price', value: fmtDollars(deal.askingPrice ? BigInt(deal.askingPrice) : null), note: '' },
                { label: 'Price / Unit', value: fmtPPU(deal.pricePerUnit ? BigInt(deal.pricePerUnit) : null), note: '' },
                { label: 'Cap Rate', value: fmtPct(deal.capRate), note: '' },
                { label: 'DSCR', value: fmtNum(deal.dscr), note: deal.dscr && deal.dscr >= 1.2 ? '✓ Passes min' : deal.dscr ? '⚠ Below 1.20' : '' },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-label">{m.label}</div>
                  <div className={`metric-value ${m.label === 'DSCR' ? dscrColor(deal.dscr ?? null) : m.label === 'Cap Rate' ? capRateColor(deal.capRate ?? null) : 'text-slate-100'}`}>{m.value}</div>
                  {m.note && <div className="text-xs text-slate-500 mt-1">{m.note}</div>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Loan Amount (80%)', value: fmtDollars(deal.loanAmount ? BigInt(deal.loanAmount) : null) },
                { label: 'Equity Required', value: fmtDollars(deal.equityRequired ? BigInt(deal.equityRequired) : null) },
                { label: 'Monthly Payment', value: fmtDollars(deal.monthlyPayment ? BigInt(deal.monthlyPayment) : null) },
                { label: 'Cash-on-Cash', value: fmtPct(deal.cashOnCash) },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value text-slate-100">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Property Details</h3>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                {[
                  { label: 'Units', value: String(deal.units) },
                  { label: 'Year Built', value: deal.yearBuilt ? String(deal.yearBuilt) : '—' },
                  { label: 'Sq Ft', value: deal.sqFt ? deal.sqFt.toLocaleString() : '—' },
                  { label: 'Occupancy', value: fmtPct(deal.occupancyRate) },
                  { label: 'Gross Monthly Rent', value: fmtDollars(deal.grossMonthlyRent ? BigInt(deal.grossMonthlyRent) : null) },
                  { label: 'NOI (annual)', value: fmtDollars(deal.noi ? BigInt(deal.noi) : null) },
                  { label: 'Days on Market', value: deal.daysOnMarket !== null && deal.daysOnMarket !== undefined ? String(deal.daysOnMarket) : '—' },
                  { label: 'Listing Date', value: fmtDate(deal.listingDate) },
                ].map(item => (
                  <div key={item.label}>
                    <dt className="text-xs text-slate-600">{item.label}</dt>
                    <dd className="text-sm text-slate-200 fin-num mt-0.5">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {deal.description && (
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Description</h3>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}

            {/* Broker / Source */}
            {(deal.brokerName || deal.sourceUrl || deal.source) && (
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Source</h3>
                <div className="grid grid-cols-2 gap-3">
                  {deal.source && <div><dt className="text-xs text-slate-600">Source</dt><dd className="text-sm text-slate-200">{deal.source.name}</dd></div>}
                  {deal.brokerName && <div><dt className="text-xs text-slate-600">Broker</dt><dd className="text-sm text-slate-200">{deal.brokerName}</dd></div>}
                  {deal.brokerEmail && <div><dt className="text-xs text-slate-600">Email</dt><dd className="text-sm text-slate-200">{deal.brokerEmail}</dd></div>}
                  {deal.sourceUrl && (
                    <div><dt className="text-xs text-slate-600">Listing</dt>
                      <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">View ↗</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UNDERWRITING */}
        {tab === 'underwriting' && (
          <div className="max-w-4xl space-y-5">
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Loan Structure (80% LTV @ 5.99%)</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Purchase Price', value: fmtDollars(deal.askingPrice ? BigInt(deal.askingPrice) : null) },
                  { label: 'Loan (80% LTV)', value: fmtDollars(deal.loanAmount ? BigInt(deal.loanAmount) : null) },
                  { label: 'Equity Required', value: fmtDollars(deal.equityRequired ? BigInt(deal.equityRequired) : null) },
                  { label: 'Monthly Payment', value: fmtDollars(deal.monthlyPayment ? BigInt(deal.monthlyPayment) : null) },
                  { label: 'Annual Debt Service', value: fmtDollars(deal.annualDebtService ? BigInt(deal.annualDebtService) : null) },
                  { label: 'NOI', value: fmtDollars(deal.noi ? BigInt(deal.noi) : null) },
                  { label: 'Cap Rate', value: fmtPct(deal.capRate) },
                  { label: 'DSCR', value: fmtNum(deal.dscr) },
                  { label: 'Cash-on-Cash', value: fmtPct(deal.cashOnCash) },
                ].map(m => (
                  <div key={m.label} className="bg-white/[0.02] rounded p-3">
                    <div className="text-xs text-slate-600 mb-1">{m.label}</div>
                    <div className="text-base fin-num font-medium text-slate-200">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6-Year Projection */}
            {deal.projection && deal.projection.length > 0 && (
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">6-Year Cash Flow Projection</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs fin-num">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Year', 'Gross Rent', 'EGI', 'NOI', 'Debt Service', 'Cash Flow', 'DSCR', 'Cumulative CF'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(deal.projection as YearProjection[]).map(yr => (
                        <tr key={yr.year} className="border-b border-white/[0.03]">
                          <td className="px-3 py-2 text-slate-300">Yr {yr.year}</td>
                          <td className="px-3 py-2 text-slate-400">{fmtDollars(BigInt(yr.grossRent * 100))}</td>
                          <td className="px-3 py-2 text-slate-400">{fmtDollars(BigInt(yr.egi * 100))}</td>
                          <td className="px-3 py-2 text-slate-300">{fmtDollars(BigInt(yr.noi * 100))}</td>
                          <td className="px-3 py-2 text-slate-500">{fmtDollars(BigInt(yr.debtService * 100))}</td>
                          <td className={`px-3 py-2 font-medium ${yr.cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmtDollars(BigInt(yr.cashFlow * 100))}
                          </td>
                          <td className={`px-3 py-2 ${dscrColor(yr.dscr)}`}>{yr.dscr.toFixed(2)}</td>
                          <td className={`px-3 py-2 ${yr.cumulativeCashFlow >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
                            {fmtDollars(BigInt(yr.cumulativeCashFlow * 100))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Underwriting Assumptions</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Expense Ratio', value: fmtPct(deal.expenseRatio) },
                  { label: 'Vacancy', value: fmtPct(deal.vacancyRate) },
                  { label: 'Rent Growth', value: fmtPct(deal.rentGrowthRate) + '/yr' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-slate-600">{m.label}</div>
                    <div className="text-slate-300 fin-num mt-0.5">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCORE */}
        {tab === 'score' && bd && (
          <div className="max-w-xl space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Bankability Score</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Weighted across 7 factors</p>
                </div>
                <div className={`text-4xl font-bold fin-num ${grade.color}`}>{deal.bankabilityScore}</div>
              </div>

              {[
                { key: 'dscrScore', label: 'DSCR Strength', weight: '25%', detail: bd.details?.dscr },
                { key: 'ltvScore', label: 'LTV Feasibility', weight: '20%', detail: bd.details?.ltv },
                { key: 'capRateScore', label: 'Cap Rate Band', weight: '15%', detail: bd.details?.cap_rate },
                { key: 'valueAddScore', label: 'Value-Add Signals', weight: '15%', detail: bd.details?.value_add },
                { key: 'pricePerUnitScore', label: 'Price Per Unit', weight: '10%', detail: bd.details?.price_per_unit },
                { key: 'completenessScore', label: 'Data Completeness', weight: '10%', detail: bd.details?.data_completeness },
                { key: 'stressTestScore', label: 'Stress Test (+200bps/-10% rent)', weight: '5%', detail: bd.details?.stress_test },
              ].map(f => {
                const score = (bd[f.key as keyof typeof bd] as number) ?? 0
                const g = scoreGrade(score)
                return (
                  <div key={f.key} className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">{f.label} <span className="text-slate-700">({f.weight})</span></span>
                      <span className={`text-xs fin-num font-medium ${g.color}`}>{score}/100</span>
                    </div>
                    <div className="score-bar">
                      <div className="score-bar-fill" style={{ width: `${score}%`, background: score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : score >= 25 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    {f.detail && <p className="text-xs text-slate-600 mt-0.5">{f.detail}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* NOTES */}
        {tab === 'notes' && (
          <div className="max-w-2xl space-y-5">
            <form onSubmit={handleNote} className="flex gap-2">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add underwriting notes, call summary, broker feedback…"
                className="flex-1 bg-[#1c1f2a] border border-white/[0.08] rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none min-h-16"
              />
              <button type="submit" disabled={isPending || !noteText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-40 self-start mt-0">
                Add
              </button>
            </form>
            {deal.notes.length === 0 && <p className="text-slate-600 text-sm">No notes yet.</p>}
            {deal.notes.map(n => (
              <div key={n.id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-300 font-medium">{n.user.name ?? n.user.email}</span>
                  <span className="text-xs text-slate-600">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">{n.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'documents' && (
          <div className="max-w-xl space-y-5">
            <form onSubmit={handleAtt} className="card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Add Document Link</h3>
              <div className="flex gap-2">
                <select value={attLabel} onChange={e => setAttLabel(e.target.value)}
                  className="h-8 px-2 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 focus:outline-none">
                  {ATTACHMENT_LABELS.map(l => <option key={l}>{l}</option>)}
                </select>
                <input value={attUrl} onChange={e => setAttUrl(e.target.value)} type="url" placeholder="https://…"
                  className="flex-1 h-8 px-2.5 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30" />
                <button type="submit" disabled={isPending || !attUrl.trim()}
                  className="px-3 h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors disabled:opacity-40">Add</button>
              </div>
              <input value={attName} onChange={e => setAttName(e.target.value)} placeholder="File name (optional)"
                className="w-full h-8 px-2.5 text-xs bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-300 placeholder-slate-600 focus:outline-none" />
            </form>
            {deal.attachments.length === 0 && <p className="text-slate-600 text-sm">No attachments yet.</p>}
            {deal.attachments.map(att => (
              <div key={att.id} className="card p-3 flex items-center gap-3 group">
                <span className="text-xs text-slate-500 bg-white/[0.04] px-2 py-1 rounded w-20 text-center flex-shrink-0">{att.label}</span>
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-400 hover:underline truncate">{att.fileName || att.url}</a>
                <button onClick={() => { deleteAttachment(att.id); router.refresh() }}
                  className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="max-w-xl">
            {deal.auditLogs.length === 0 && <p className="text-slate-600 text-sm">No history.</p>}
            <div className="space-y-1">
              {deal.auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 text-sm text-slate-400">{formatEvent(log)}</div>
                  <div className="text-xs text-slate-700 flex-shrink-0 text-right">
                    <div>{log.user ? (log.user.name ?? log.user.email) : 'System'}</div>
                    <div>{fmtDate(log.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatEvent(log: { event: string; payload?: Record<string,unknown> }): string {
  const p = log.payload as Record<string, unknown>
  switch (log.event) {
    case 'CREATED': return 'Deal created'
    case 'STATUS_CHANGED': return `Status: ${STATUS_META[p?.from as string]?.label ?? p?.from} → ${STATUS_META[p?.to as string]?.label ?? p?.to}`
    case 'FIELD_UPDATED': return `Updated: ${(p?.fields as string[])?.join(', ')}`
    case 'NOTE_ADDED': return 'Note added'
    case 'ATTACHMENT_ADDED': return `Document added: ${p?.label}`
    case 'IMPORTED': return `Imported via ${p?.source ?? 'CSV'}`
    case 'AI_EXTRACTED': return 'AI extraction used'
    case 'UW_COMPUTED': return 'Underwriting recomputed'
    default: return log.event
  }
}
