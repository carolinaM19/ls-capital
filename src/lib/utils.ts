import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── FORMATTING ──────────────────────────────────────────────────────────────

export function fmtDollars(cents: bigint | number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  const d = Number(cents) / 100
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(2)}M`
  if (d >= 1_000) return `$${Math.round(d / 1000)}K`
  return `$${d.toLocaleString()}`
}

export function fmtDollarsFull(cents: bigint | number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  const d = Number(cents) / 100
  return d.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtPPU(cents: bigint | number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  const d = Number(cents) / 100
  return `$${Math.round(d / 1000)}K`
}

export function fmtPct(val: number | string | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '—'
  return `${Number(val).toFixed(decimals)}%`
}

export function fmtNum(val: number | string | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '—'
  return Number(val).toFixed(decimals)
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── COLORS ──────────────────────────────────────────────────────────────────

export function scoreGrade(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'A', color: 'text-emerald-300', bg: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' }
  if (score >= 60) return { label: 'B', color: 'text-sky-300', bg: 'bg-sky-400/10 text-sky-300 ring-sky-400/20' }
  if (score >= 45) return { label: 'C', color: 'text-amber-300', bg: 'bg-amber-400/10 text-amber-300 ring-amber-400/20' }
  if (score >= 30) return { label: 'D', color: 'text-orange-300', bg: 'bg-orange-400/10 text-orange-300 ring-orange-400/20' }
  return { label: 'F', color: 'text-red-400', bg: 'bg-red-400/10 text-red-400 ring-red-400/20' }
}

export function dscrColor(dscr: number | null): string {
  if (!dscr) return 'text-slate-500'
  if (dscr >= 1.4) return 'text-emerald-300'
  if (dscr >= 1.25) return 'text-sky-300'
  if (dscr >= 1.2) return 'text-amber-300'
  return 'text-red-400'
}

export function capRateColor(cap: number | null): string {
  if (!cap) return 'text-slate-500'
  if (cap >= 7) return 'text-emerald-300'
  if (cap >= 5.5) return 'text-sky-300'
  if (cap >= 4.5) return 'text-amber-300'
  return 'text-red-400'
}

// ── STATUS COLORS ────────────────────────────────────────────────────────────

export const STATUS_META: Record<string, { label: string; color: string }> = {
  NEW:            { label: 'New',            color: 'bg-slate-700/50 text-slate-300 ring-slate-600/30' },
  REVIEWING:      { label: 'Reviewing',      color: 'bg-blue-400/10 text-blue-300 ring-blue-400/20' },
  UNDERWRITING:   { label: 'Underwriting',   color: 'bg-violet-400/10 text-violet-300 ring-violet-400/20' },
  PASSED:         { label: 'Passed',         color: 'bg-slate-500/10 text-slate-400 ring-slate-500/20' },
  LOI:            { label: 'LOI',            color: 'bg-amber-400/10 text-amber-300 ring-amber-400/20' },
  UNDER_CONTRACT: { label: 'Under Contract', color: 'bg-orange-400/10 text-orange-300 ring-orange-400/20' },
  CLOSED:         { label: 'Closed',         color: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' },
  DEAD:           { label: 'Dead',           color: 'bg-red-400/10 text-red-400 ring-red-400/20' },
}

export const DEAL_TYPE_META: Record<string, { label: string; color: string }> = {
  ON_MARKET:  { label: 'On-Market',   color: 'bg-sky-400/10 text-sky-300 ring-sky-400/20' },
  OFF_MARKET: { label: 'Off-Market',  color: 'bg-violet-400/10 text-violet-300 ring-violet-400/20' },
  AUCTION:    { label: 'Auction',     color: 'bg-rose-400/10 text-rose-300 ring-rose-400/20' },
  DISTRESSED: { label: 'Distressed',  color: 'bg-orange-400/10 text-orange-300 ring-orange-400/20' },
  POCKET:     { label: 'Pocket',      color: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' },
}

export const ASSET_TYPE_META: Record<string, { label: string }> = {
  SFR:          { label: 'SFR' },
  MULTI_2_4:    { label: '2–4 Units' },
  MULTI_5_PLUS: { label: '5+ Units' },
  MULTI_20_30:  { label: '20–30 Units' },
  MULTI_50_PLUS:{ label: '50+ Units' },
  MIXED_USE:    { label: 'Mixed Use' },
  OTHER:        { label: 'Other' },
}

// ── DEDUPE ───────────────────────────────────────────────────────────────────

export function buildDedupeHash(address: string, city: string, state: string, units: number): string {
  const a = address.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
  const c = city.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
  const s = state.toLowerCase().trim()
  return `${a}__${c}__${s}__${units}`
}

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export const ASSET_TYPES = [
  { value: 'SFR', label: 'SFR (Single Family)' },
  { value: 'MULTI_2_4', label: '2–4 Units' },
  { value: 'MULTI_5_PLUS', label: '5–19 Units' },
  { value: 'MULTI_20_30', label: '20–30 Units' },
  { value: 'MULTI_50_PLUS', label: '50+ Units' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
  { value: 'OTHER', label: 'Other' },
]

export const DEAL_TYPES = [
  { value: 'ON_MARKET', label: 'On-Market' },
  { value: 'OFF_MARKET', label: 'Off-Market' },
  { value: 'AUCTION', label: 'Auction' },
  { value: 'DISTRESSED', label: 'Distressed' },
  { value: 'POCKET', label: 'Pocket Listing' },
]

export const DEAL_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWING', label: 'Reviewing' },
  { value: 'UNDERWRITING', label: 'Underwriting' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'LOI', label: 'LOI' },
  { value: 'UNDER_CONTRACT', label: 'Under Contract' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'DEAD', label: 'Dead' },
]

export const PORTFOLIO_CAP = 10_000_000 // dollars
