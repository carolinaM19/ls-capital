import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDollarsFull(dollars: bigint | number | null | undefined): string {
  if (dollars === null || dollars === undefined) return '—'
  const d = Number(dollars)
  return d.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtDollarsFromCents(cents: bigint | number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  const d = Number(cents) / 100
  return d.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtPct(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '—'
  return `${val.toFixed(decimals)}%`
}

export function fmtNum(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '—'
  return val.toFixed(decimals)
}

export function scoreGrade(score: number): { grade: string; color: string } {
  if (score >= 75) return { grade: 'A', color: 'text-emerald-400' }
  if (score >= 60) return { grade: 'B', color: 'text-blue-400' }
  if (score >= 45) return { grade: 'C', color: 'text-yellow-400' }
  if (score >= 30) return { grade: 'D', color: 'text-orange-400' }
  return { grade: 'F', color: 'text-red-400' }
}

export function dscrColor(dscr: number | null | undefined): string {
  if (!dscr) return 'text-slate-400'
  if (dscr >= 1.25) return 'text-emerald-400'
  if (dscr >= 1.2) return 'text-yellow-400'
  return 'text-red-400'
}

export function capRateColor(cap: number | null | undefined): string {
  if (!cap) return 'text-slate-400'
  if (cap >= 7) return 'text-emerald-400'
  if (cap >= 5) return 'text-yellow-400'
  return 'text-red-400'
}
