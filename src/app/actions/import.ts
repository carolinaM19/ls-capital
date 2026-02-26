'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeUnderwriting } from '@/lib/underwriting'
import { computeBankabilityScore } from '@/lib/scoring'
import { buildDedupeHash } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import type { DealType, AssetType } from '@prisma/client'

export interface ImportRow {
  address: string
  city: string
  state: string
  zip?: string
  units: number
  yearBuilt?: number | null
  sqFt?: number | null
  assetType?: string
  dealType?: string
  description?: string
  askingPrice?: number | null
  grossMonthlyRent?: number | null
  currentMonthlyRent?: number | null
  occupancyRate?: number | null
  capRate?: number | null
  daysOnMarket?: number | null
  sourceUrl?: string
  brokerName?: string
  brokerEmail?: string
}

export interface ImportResult {
  jobId: string
  total: number
  created: number
  updated: number
  failed: number
  errors: string[]
}

async function getUWDefaults() {
  const configs = await prisma.underwritingConfig.findMany()
  const m = Object.fromEntries(configs.map(c => [c.key, c.value]))
  return {
    interestRate: parseFloat(m.interest_rate ?? '5.99'),
    maxLtv: parseFloat(m.max_ltv ?? '80'),
    termYears: parseInt(m.term_years ?? '30'),
    expenseRatio: parseFloat(m.expense_ratio ?? '40'),
    vacancyRate: parseFloat(m.vacancy_rate ?? '5'),
    rentGrowthRate: parseFloat(m.rent_growth_rate ?? '3'),
  }
}

function normalizeAssetType(raw?: string, units = 1): AssetType {
  if (!raw) {
    if (units === 1) return 'SFR'
    if (units <= 4) return 'MULTI_2_4'
    if (units <= 19) return 'MULTI_5_PLUS'
    if (units <= 30) return 'MULTI_20_30'
    return 'MULTI_50_PLUS'
  }
  const r = raw.toUpperCase().replace(/[\s-]/g, '_')
  if (r.includes('SFR') || r.includes('SINGLE')) return 'SFR'
  if (r.includes('2_4') || r.includes('DUPLEX') || r.includes('TRIPLEX') || r.includes('QUAD')) return 'MULTI_2_4'
  if (r.includes('20_30') || r.includes('20-30')) return 'MULTI_20_30'
  if (r.includes('50') || r.includes('LARGE')) return 'MULTI_50_PLUS'
  if (r.includes('MULTI') || r.includes('5')) return 'MULTI_5_PLUS'
  return normalizeAssetType(undefined, units)
}

function normalizeDealType(raw?: string): DealType {
  if (!raw) return 'ON_MARKET'
  const r = raw.toLowerCase()
  if (r.includes('off') || r.includes('pocket') || r.includes('direct')) return 'OFF_MARKET'
  if (r.includes('auction') || r.includes('bid') || r.includes('reo')) return 'AUCTION'
  if (r.includes('distress')) return 'DISTRESSED'
  return 'ON_MARKET'
}

export async function runCsvImport(rows: ImportRow[], sourceId?: string): Promise<ImportResult> {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const job = await prisma.importJob.create({
    data: {
      userId: session.user.id,
      sourceId: sourceId || null,
      status: 'RUNNING',
      recordsTotal: rows.length,
      fileName: 'upload.csv',
    },
  })

  const cfg = await getUWDefaults()
  const errors: string[] = []
  let created = 0, updated = 0, failed = 0

  for (const [i, row] of rows.entries()) {
    try {
      if (!row.address?.trim() || !row.city?.trim() || !row.state?.trim()) {
        errors.push(`Row ${i + 1}: Missing address, city, or state`)
        failed++
        continue
      }
      if (!row.units || row.units < 1) {
        errors.push(`Row ${i + 1}: Invalid units (${row.address})`)
        failed++
        continue
      }

      const dealType = normalizeDealType(row.dealType)
      const assetType = normalizeAssetType(row.assetType, row.units)
      const dedupeHash = buildDedupeHash(row.address, row.city, row.state, row.units)

      // Underwriting
      const uw = (row.askingPrice && row.grossMonthlyRent)
        ? computeUnderwriting({
            purchasePrice: row.askingPrice,
            grossMonthlyRent: row.grossMonthlyRent,
            units: row.units,
            interestRate: cfg.interestRate,
            maxLtv: cfg.maxLtv,
            termYears: cfg.termYears,
            expenseRatio: cfg.expenseRatio,
            vacancyRate: cfg.vacancyRate,
            rentGrowthRate: cfg.rentGrowthRate,
          })
        : null

      const { score, breakdown } = computeBankabilityScore({
        dscr: uw?.dscr ?? null,
        ltvUsed: uw?.ltv ?? null,
        capRate: uw?.capRate ?? null,
        description: row.description ?? null,
        pricePerUnit: uw?.pricePerUnit ?? null,
        units: row.units,
        occupancyRate: row.occupancyRate ?? null,
        hasRentData: !!row.grossMonthlyRent,
        hasSqFt: !!row.sqFt,
        hasYearBuilt: !!row.yearBuilt,
      })

      const dealData = {
        address: row.address.trim(),
        city: row.city.trim(),
        state: row.state.trim().toUpperCase().slice(0, 2),
        zip: row.zip || null,
        units: row.units,
        yearBuilt: row.yearBuilt || null,
        sqFt: row.sqFt || null,
        assetType,
        dealType,
        description: row.description || null,
        askingPrice: row.askingPrice ? BigInt(Math.round(row.askingPrice * 100)) : null,
        grossMonthlyRent: row.grossMonthlyRent ? BigInt(Math.round(row.grossMonthlyRent * 100)) : null,
        currentMonthlyRent: row.currentMonthlyRent ? BigInt(Math.round(row.currentMonthlyRent * 100)) : null,
        occupancyRate: row.occupancyRate || null,
        vacancyRate: cfg.vacancyRate,
        expenseRatio: cfg.expenseRatio,
        rentGrowthRate: cfg.rentGrowthRate,
        daysOnMarket: row.daysOnMarket || null,
        sourceId: sourceId || null,
        sourceUrl: row.sourceUrl || null,
        brokerName: row.brokerName || null,
        brokerEmail: row.brokerEmail || null,
        loanAmount: uw?._cents.loanAmount ? BigInt(uw._cents.loanAmount) : null,
        monthlyPayment: uw?._cents.monthlyPayment ? BigInt(uw._cents.monthlyPayment) : null,
        annualDebtService: uw?._cents.annualDebtService ? BigInt(uw._cents.annualDebtService) : null,
        noi: uw?._cents.noi ? BigInt(uw._cents.noi) : null,
        capRate: uw?.capRate || row.capRate || null,
        dscr: uw?.dscr || null,
        cashOnCash: uw?.cashOnCash || null,
        equityRequired: uw?._cents.equityRequired ? BigInt(uw._cents.equityRequired) : null,
        pricePerUnit: uw?._cents.pricePerUnit ? BigInt(uw._cents.pricePerUnit) : null,
        projection: uw?.projection || null,
        bankabilityScore: score,
        scoreBreakdown: breakdown,
        dedupeHash,
      }

      // Dedupe: check by hash OR by sourceUrl
      const existing = await prisma.deal.findFirst({
        where: {
          OR: [
            { dedupeHash },
            ...(row.sourceUrl ? [{ sourceUrl: row.sourceUrl }] : []),
          ],
        },
      })

      if (existing) {
        await prisma.deal.update({ where: { id: existing.id }, data: { ...dealData, updatedAt: new Date() } })
        await prisma.dealAuditLog.create({
          data: { dealId: existing.id, userId: session.user.id, event: 'IMPORTED', payload: { action: 'updated', source: 'csv' } },
        })
        updated++
      } else {
        const deal = await prisma.deal.create({ data: dealData })
        await prisma.dealAuditLog.create({
          data: { dealId: deal.id, userId: session.user.id, event: 'IMPORTED', payload: { action: 'created', source: 'csv' } },
        })
        created++
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${String(err).slice(0, 100)}`)
      failed++
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: failed === rows.length ? 'FAILED' : 'COMPLETE',
      recordsCreated: created,
      recordsUpdated: updated,
      recordsFailed: failed,
      errorLog: errors.length ? { errors } : {},
      completedAt: new Date(),
    },
  })

  revalidatePath('/deals')
  revalidatePath('/import')
  return { jobId: job.id, total: rows.length, created, updated, failed, errors }
}
