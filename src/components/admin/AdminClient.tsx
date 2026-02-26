'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { updateUWConfig, updateScoringWeight, upsertSource, deleteSource } from '@/app/actions/admin'

interface Config { key: string; label: string; value: string; description?: string | null }
interface Weight { factorKey: string; label: string; weight: number }
interface Source { id: string; name: string; type: string; url?: string | null; notes?: string | null; isActive: boolean }
interface User { id: string; name?: string | null; email: string; role: string; createdAt: string }

interface Props {
  configs: Config[]
  weights: Weight[]
  sources: Source[]
  users: User[]
}

type Tab = 'underwriting' | 'scoring' | 'sources' | 'users'

const SOURCE_TYPES = ['ON_MARKET', 'OFF_MARKET', 'AUCTION', 'BROKER_EMAIL', 'DIRECT_MAIL', 'OTHER']

export default function AdminClient({ configs, weights, sources, users }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('underwriting')
  const [isPending, startTransition] = useTransition()

  // UW Config
  const [configVals, setConfigVals] = useState<Record<string, string>>(
    Object.fromEntries(configs.map(c => [c.key, c.value]))
  )

  function saveConfig(key: string) {
    startTransition(async () => {
      try {
        await updateUWConfig(key, configVals[key])
        toast.success('Saved')
        router.refresh()
      } catch (e) {
        toast.error(String(e))
      }
    })
  }

  // Scoring Weights
  const [weightVals, setWeightVals] = useState<Record<string, number>>(
    Object.fromEntries(weights.map(w => [w.factorKey, w.weight]))
  )
  const totalWeight = Object.values(weightVals).reduce((a, b) => a + b, 0)

  function saveWeight(factorKey: string) {
    startTransition(async () => {
      try {
        await updateScoringWeight(factorKey, weightVals[factorKey])
        toast.success('Weight saved')
        router.refresh()
      } catch (e) {
        toast.error(String(e))
      }
    })
  }

  // Sources
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', type: 'ON_MARKET', url: '', notes: '', isActive: true })

  function handleAddSource(e: React.FormEvent) {
    e.preventDefault()
    if (!newSource.name.trim()) { toast.error('Name required'); return }
    startTransition(async () => {
      try {
        await upsertSource(newSource)
        toast.success('Source added')
        setShowAddSource(false)
        setNewSource({ name: '', type: 'ON_MARKET', url: '', notes: '', isActive: true })
        router.refresh()
      } catch (e) {
        toast.error(String(e))
      }
    })
  }

  function handleDeleteSource(id: string, name: string) {
    if (!confirm(`Delete source "${name}"? This won't delete linked deals.`)) return
    startTransition(async () => {
      try {
        await deleteSource(id)
        toast.success('Deleted')
        router.refresh()
      } catch (e) {
        toast.error(String(e))
      }
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'underwriting', label: 'Underwriting Defaults' },
    { key: 'scoring', label: 'Scoring Weights' },
    { key: 'sources', label: 'Deal Sources' },
    { key: 'users', label: 'Users' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-white/[0.05] mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
              tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Underwriting Defaults */}
      {tab === 'underwriting' && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-xs text-slate-600">
            These are the default assumptions used when underwriting imported deals or deals without overrides.
            Changes apply to new calculations — existing stored UW data is not retroactively updated.
          </p>
          {configs.map(cfg => (
            <div key={cfg.key} className="card p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200">{cfg.label}</div>
                {cfg.description && <div className="text-xs text-slate-500 mt-0.5">{cfg.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={configVals[cfg.key] ?? ''}
                  onChange={e => setConfigVals(p => ({ ...p, [cfg.key]: e.target.value }))}
                  className="w-24 h-8 px-2 text-sm bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-100 fin-num focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-right"
                  step="0.01"
                />
                <button
                  onClick={() => saveConfig(cfg.key)}
                  disabled={isPending}
                  className="px-3 h-8 text-xs bg-blue-600/80 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scoring Weights */}
      {tab === 'scoring' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">Weights must sum to 1.0 (100%). Adjust to reflect your underwriting priorities.</p>
            <span className={`text-sm fin-num font-medium ${Math.abs(totalWeight - 1) < 0.001 ? 'text-emerald-400' : 'text-red-400'}`}>
              Total: {totalWeight.toFixed(3)}
            </span>
          </div>
          {weights.map(w => (
            <div key={w.factorKey} className="card p-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200">{w.label}</div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">{w.factorKey}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0" max="1" step="0.01"
                    value={weightVals[w.factorKey] ?? w.weight}
                    onChange={e => setWeightVals(p => ({ ...p, [w.factorKey]: parseFloat(e.target.value) || 0 }))}
                    className="w-20 h-8 px-2 text-sm bg-[#1c1f2a] border border-white/[0.08] rounded text-slate-100 fin-num focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-right"
                  />
                  <span className="text-xs text-slate-600 w-10">
                    {((weightVals[w.factorKey] ?? w.weight) * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => saveWeight(w.factorKey)}
                    disabled={isPending}
                    className="px-3 h-8 text-xs bg-blue-600/80 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="score-bar">
                <div className="score-bar-fill bg-blue-500/50" style={{ width: `${(weightVals[w.factorKey] ?? w.weight) * 100}%` }} />
              </div>
            </div>
          ))}

          {Math.abs(totalWeight - 1) >= 0.001 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              ⚠ Weights sum to {totalWeight.toFixed(3)}, not 1.000. Scores will be proportionally off until corrected.
            </div>
          )}
        </div>
      )}

      {/* Deal Sources */}
      {tab === 'sources' && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-600">{sources.length} sources configured</p>
            <button
              onClick={() => setShowAddSource(true)}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Source
            </button>
          </div>

          {showAddSource && (
            <form onSubmit={handleAddSource} className="card p-5 space-y-3 border-blue-500/20">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">New Source</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Name *</label>
                  <input value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))}
                    placeholder="LoopNet Export" className="input mt-1 text-xs h-8" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Type</label>
                  <select value={newSource.type} onChange={e => setNewSource(p => ({ ...p, type: e.target.value }))}
                    className="input mt-1 text-xs h-8">
                    {SOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">URL (optional)</label>
                  <input value={newSource.url} onChange={e => setNewSource(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://loopnet.com" className="input mt-1 text-xs h-8" />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={newSource.isActive} onChange={e => setNewSource(p => ({ ...p, isActive: e.target.checked }))}
                      className="rounded bg-white/[0.06] border-white/20 text-blue-500" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors disabled:opacity-40">
                  Add
                </button>
                <button type="button" onClick={() => setShowAddSource(false)}
                  className="px-4 py-1.5 text-slate-500 border border-white/[0.06] text-xs rounded hover:bg-white/[0.04] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Type</th><th>URL</th><th>Status</th><th className="w-16"></th></tr>
              </thead>
              <tbody>
                {sources.map(src => (
                  <tr key={src.id} className="cursor-default">
                    <td className="text-sm text-slate-200">{src.name}</td>
                    <td className="text-xs text-slate-500">{src.type.replace(/_/g, ' ')}</td>
                    <td className="text-xs">
                      {src.url ? <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block max-w-40">{src.url}</a> : <span className="text-slate-700">—</span>}
                    </td>
                    <td>
                      <span className={`badge text-[10px] ${src.isActive ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-slate-500/10 text-slate-500 ring-slate-500/20'}`}>
                        {src.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleDeleteSource(src.id, src.name)} disabled={isPending}
                        className="text-slate-700 hover:text-red-400 transition-colors text-xs">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-4 max-w-3xl">
          <p className="text-xs text-slate-600">Users who have signed in. Roles: ADMIN (full access), ANALYST (read/write), VIEWER (read-only).</p>
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="cursor-default">
                    <td>
                      <div className="text-sm text-slate-200">{u.name ?? '—'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td>
                      <span className={`badge text-[10px] ${
                        u.role === 'ADMIN' ? 'bg-violet-500/10 text-violet-400 ring-violet-500/20' :
                        u.role === 'ANALYST' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20' :
                        'bg-slate-500/10 text-slate-500 ring-slate-500/20'
                      }`}>{u.role}</span>
                    </td>
                    <td className="text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600">To change a user's role, update directly in the database or use Prisma Studio (<code className="text-slate-400">npm run db:studio</code>).</p>
        </div>
      )}
    </div>
  )
}
