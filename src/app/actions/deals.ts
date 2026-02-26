'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeUnderwriting } from '@/lib/underwriting'
import { computeBankabilityScore } from '@/lib/scoring'
import { buildDedupeHash } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { DealStatus, DealType, AssetType } from '@prisma/client'

// ── UW CONFIG HELPER ──────────────────────────────────────────────────────────
async function getUWConfig() {
  const configs = await prisma.underwritingConfig.findMany()
  const map = Object.fromEntries(configs.map(c => [c.key, c.value]))
  return {
    interestRate: parseFloat(map.interest_rate ?? '5.99'),
    maxLtv: parseFloat(map.max_ltv ?? '80'),
    termYears: parseInt(map.term_years ?? '30'),
    expenseRatio: parseFloat(map.expense_ratio ?? '40'),
    vacancyRate: parseFloat(map.vacancy_rate ?? '5'),
    rentGrowthRate: parseFloat(map.rent_growth_rate ?? '3'),
  }
}

// ── COMPUTE + STORE UW ────────────────────────────────────────────────────────
function runUW(data: {
  askingPrice?: number | null
  grossMonthlyRent?: number | null
  units: number
  expenseRatio?: number | null
  vacancyRate?: number | null
  rentGrowthRate?: number | null
  description?: string | null
  pricePerUnit?: number | null
  occupancyRate?: number | null
  yearBuilt?: number | null
  sqFt?: number | null
}, cfg: Awaited<ReturnType<typeof getUWConfig>>) {
  if (!data.askingPrice || !data.grossMonthlyRent) {
    return {
      loanAmount: null, monthlyPayment: null, annualDebtService: null,
      noi: null, capRate: null, dscr: null, cashOnCash: null,
      equityRequired: null, pricePerUnit: data.askingPrice && data.units
        ? BigInt(Math.round((data.askingPrice / data.units) * 100)) : null,
      projection: null,
      bankabilityScore: 0,
      scoreBreakdown: null,
    }
  }

  const uw = computeUnderwriting({
    purchasePrice: data.askingPrice,
    grossMonthlyRent: data.grossMonthlyRent,
    units: data.units,
    interestRate: cfg.interestRate,
    maxLtv: cfg.maxLtv,
    termYears: cfg.termYears,
    expenseRatio: data.expenseRatio ? Number(data.expenseRatio) : cfg.expenseRatio,
    vacancyRate: data.vacancyRate ? Number(data.vacancyRate) : cfg.vacancyRate,
    rentGrowthRate: data.rentGrowthRate ? Number(data.rentGrowthRate) : cfg.rentGrowthRate,
  })

  const { score, breakdown } = computeBankabilityScore({
    dscr: uw.dscr,
    ltvUsed: uw.ltv,
    capRate: uw.capRate,
    description: data.description ?? null,
    pricePerUnit: uw.pricePerUnit,
    units: data.units,
    occupancyRate: data.occupancyRate ? Number(data.occupancyRate) : null,
    hasRentData: true,
    hasSqFt: !!data.sqFt,
    hasYearBuilt: !!data.yearBuilt,
    uwInputs: {
      purchasePrice: data.askingPrice,
      grossMonthlyRent: data.grossMonthlyRent,
      interestRate: cfg.interestRate,
      maxLtv: cfg.maxLtv,
      termYears: cfg.termYears,
      expenseRatio: data.expenseRatio ? Number(data.expenseRatio) : cfg.expenseRatio,
      vacancyRate: data.vacancyRate ? Number(data.vacancyRate) : cfg.vacancyRate,
      rentGrowthRate: data.rentGrowthRate ? Number(data.rentGrowthRate) : cfg.rentGrowthRate,
    },
  })

  return {
    loanAmount: uw._cents.loanAmount ? BigInt(uw._cents.loanAmount) : null,
    monthlyPayment: uw._cents.monthlyPayment ? BigInt(uw._cents.monthlyPayment) : null,
    annualDebtService: uw._cents.annualDebtService ? BigInt(uw._cents.annualDebtService) : null,
    noi: uw._cents.noi ? BigInt(uw._cents.noi) : null,
    capRate: uw.capRate,
    dscr: uw.dscr,
    cashOnCash: uw.cashOnCash,
    equityRequired: uw._cents.equityRequired ? BigInt(uw._cents.equityRequired) : null,
    pricePerUnit: uw._cents.pricePerUnit ? BigInt(uw._cents.pricePerUnit) : null,
    projection: uw.projection,
    bankabilityScore: score,
    scoreBreakdown: breakdown,
  }
}

// ── CREATE DEAL ───────────────────────────────────────────────────────────────
const dealSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().optional(),
  county: z.string().optional(),
  assetType: z.string(),
  units: z.number().int().min(1),
  yearBuilt: z.number().int().optional().nullable(),
  sqFt: z.number().int().optional().nullable(),
  bedrooms: z.number().int().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  dealType: z.string(),
  description: z.string().optional().nullable(),
  askingPrice: z.number().optional().nullable(),
  grossMonthlyRent: z.number().optional().nullable(),
  currentMonthlyRent: z.number().optional().nullable(),
  occupancyRate: z.number().optional().nullable(),
  vacancyRate: z.number().optional().nullable(),
  expenseRatio: z.number().optional().nullable(),
  rentGrowthRate: z.number().optional().nullable(),
  daysOnMarket: z.number().int().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  listingDate: z.string().optional().nullable(),
  brokerName: z.string().optional().nullable(),
  brokerEmail: z.string().optional().nullable(),
  brokerPhone: z.string().optional().nullable(),
})

type DealInput = z.infer<typeof dealSchema>

export async function createDeal(raw: DealInput) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const data = parsed.data
  const cfg = await getUWConfig()
  const uw = runUW({
    askingPrice: data.askingPrice,
    grossMonthlyRent: data.grossMonthlyRent,
    units: data.units,
    expenseRatio: data.expenseRatio,
    vacancyRate: data.vacancyRate,
    rentGrowthRate: data.rentGrowthRate,
    description: data.description,
    occupancyRate: data.occupancyRate,
    yearBuilt: data.yearBuilt,
    sqFt: data.sqFt,
  }, cfg)

  const dedupeHash = buildDedupeHash(data.address, data.city, data.state, data.units)

  try {
    const deal = await prisma.deal.create({
      data: {
        address: data.address,
        city: data.city,
        state: data.state.toUpperCase(),
        zip: data.zip,
        county: data.county,
        assetType: data.assetType as AssetType,
        units: data.units,
        yearBuilt: data.yearBuilt,
        sqFt: data.sqFt,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        dealType: data.dealType as DealType,
        description: data.description,
        askingPrice: data.askingPrice ? BigInt(Math.round(data.askingPrice * 100)) : null,
        grossMonthlyRent: data.grossMonthlyRent ? BigInt(Math.round(data.grossMonthlyRent * 100)) : null,
        currentMonthlyRent: data.currentMonthlyRent ? BigInt(Math.round(data.currentMonthlyRent * 100)) : null,
        occupancyRate: data.occupancyRate,
        vacancyRate: data.vacancyRate ?? cfg.vacancyRate,
        expenseRatio: data.expenseRatio ?? cfg.expenseRatio,
        rentGrowthRate: data.rentGrowthRate ?? cfg.rentGrowthRate,
        daysOnMarket: data.daysOnMarket,
        sourceId: data.sourceId || null,
        sourceUrl: data.sourceUrl || null,
        listingDate: data.listingDate ? new Date(data.listingDate) : null,
        brokerName: data.brokerName,
        brokerEmail: data.brokerEmail,
        brokerPhone: data.brokerPhone,
        ...uw,
        dedupeHash,
      },
    })

    await prisma.dealAuditLog.create({
      data: { dealId: deal.id, userId: session.user.id, event: 'CREATED', payload: { method: 'manual' } },
    })

    revalidatePath('/deals')
    return { success: true, dealId: deal.id }
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return { success: false, error: 'A deal with this address and unit count already exists.' }
    }
    return { success: false, error: 'Failed to create deal' }
  }
}

// ── UPDATE DEAL ───────────────────────────────────────────────────────────────
export async function updateDeal(dealId: string, raw: Partial<DealInput>) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'Unauthorized' }

  const existing = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!existing) return { success: false, error: 'Not found' }

  const cfg = await getUWConfig()

  // Merge with existing for UW computation
  const merged = {
    askingPrice: raw.askingPrice !== undefined ? raw.askingPrice : (existing.askingPrice ? Number(existing.askingPrice) / 100 : null),
    grossMonthlyRent: raw.grossMonthlyRent !== undefined ? raw.grossMonthlyRent : (existing.grossMonthlyRent ? Number(existing.grossMonthlyRent) / 100 : null),
    units: raw.units ?? existing.units,
    expenseRatio: raw.expenseRatio !== undefined ? raw.expenseRatio : (existing.expenseRatio ? Number(existing.expenseRatio) : null),
    vacancyRate: raw.vacancyRate !== undefined ? raw.vacancyRate : (existing.vacancyRate ? Number(existing.vacancyRate) : null),
    rentGrowthRate: raw.rentGrowthRate !== undefined ? raw.rentGrowthRate : (existing.rentGrowthRate ? Number(existing.rentGrowthRate) : null),
    description: raw.description !== undefined ? raw.description : existing.description,
    occupancyRate: raw.occupancyRate !== undefined ? raw.occupancyRate : (existing.occupancyRate ? Number(existing.occupancyRate) : null),
    yearBuilt: raw.yearBuilt !== undefined ? raw.yearBuilt : existing.yearBuilt,
    sqFt: raw.sqFt !== undefined ? raw.sqFt : existing.sqFt,
  }

  const uw = runUW(merged, cfg)

  const updatePayload: Record<string, unknown> = { ...uw, updatedAt: new Date() }
  const fields = [
    'address','city','state','zip','county','assetType','units','yearBuilt','sqFt',
    'bedrooms','bathrooms','dealType','description','daysOnMarket','sourceId','sourceUrl',
    'listingDate','brokerName','brokerEmail','brokerPhone','occupancyRate','vacancyRate',
    'expenseRatio','rentGrowthRate',
  ]
  for (const f of fields) {
    if (raw[f as keyof typeof raw] !== undefined) {
      updatePayload[f] = raw[f as keyof typeof raw]
    }
  }
  if (raw.askingPrice !== undefined) updatePayload.askingPrice = raw.askingPrice ? BigInt(Math.round(raw.askingPrice * 100)) : null
  if (raw.grossMonthlyRent !== undefined) updatePayload.grossMonthlyRent = raw.grossMonthlyRent ? BigInt(Math.round(raw.grossMonthlyRent * 100)) : null
  if (raw.currentMonthlyRent !== undefined) updatePayload.currentMonthlyRent = raw.currentMonthlyRent ? BigInt(Math.round(raw.currentMonthlyRent * 100)) : null
  if (raw.state) updatePayload.state = (raw.state as string).toUpperCase()
  if (raw.listingDate) updatePayload.listingDate = new Date(raw.listingDate)

  await prisma.deal.update({ where: { id: dealId }, data: updatePayload })
  await prisma.dealAuditLog.create({
    data: { dealId, userId: session.user.id, event: 'FIELD_UPDATED', payload: { fields: Object.keys(raw) } },
  })

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/deals')
  return { success: true }
}

// ── UPDATE STATUS ─────────────────────────────────────────────────────────────
export async function updateDealStatus(dealId: string, newStatus: DealStatus) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }

  const existing = await prisma.deal.findUnique({ where: { id: dealId }, select: { status: true } })
  if (!existing) return { success: false }

  await prisma.deal.update({ where: { id: dealId }, data: { status: newStatus } })
  await prisma.dealAuditLog.create({
    data: { dealId, userId: session.user.id, event: 'STATUS_CHANGED', payload: { from: existing.status, to: newStatus } },
  })

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/deals')
  return { success: true }
}

// ── BULK UPDATE ───────────────────────────────────────────────────────────────
export async function bulkUpdateDeals({ ids, status, assignedToId }: {
  ids: string[]
  status?: DealStatus
  assignedToId?: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }

  const data: Record<string, unknown> = {}
  if (status) data.status = status
  if (assignedToId !== undefined) data.assignedToId = assignedToId

  await prisma.deal.updateMany({ where: { id: { in: ids } }, data })

  if (status) {
    await prisma.dealAuditLog.createMany({
      data: ids.map(dealId => ({
        dealId, userId: session.user.id, event: 'STATUS_CHANGED' as const, payload: { to: status, bulk: true },
      })),
    })
  }

  revalidatePath('/deals')
  return { success: true }
}

// ── ADD NOTE ──────────────────────────────────────────────────────────────────
export async function addNote(dealId: string, body: string) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }
  if (!body.trim()) return { success: false, error: 'Empty note' }

  await prisma.dealNote.create({ data: { dealId, userId: session.user.id, body: body.trim() } })
  await prisma.dealAuditLog.create({ data: { dealId, userId: session.user.id, event: 'NOTE_ADDED' } })

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

// ── ADD ATTACHMENT ────────────────────────────────────────────────────────────
export async function addAttachment(dealId: string, label: string, url: string, fileName?: string) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }

  await prisma.dealAttachment.create({ data: { dealId, label, url, fileName: fileName || null } })
  await prisma.dealAuditLog.create({ data: { dealId, userId: session.user.id, event: 'ATTACHMENT_ADDED', payload: { label } } })

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

export async function deleteAttachment(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false }
  await prisma.dealAttachment.delete({ where: { id } })
  return { success: true }
}
