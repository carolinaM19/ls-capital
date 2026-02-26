import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DealsTable from '@/components/deals/DealsTable'
import DealsFilters from '@/components/deals/DealsFilters'
import Link from 'next/link'
import { DealStatus, DealType, AssetType } from '@prisma/client'

interface SP {
  state?: string
  city?: string
  assetType?: string
  dealType?: string
  status?: string
  sourceId?: string
  unitsMin?: string
  unitsMax?: string
  priceMin?: string
  priceMax?: string
  sort?: string
  page?: string
  q?: string
}

const PER_PAGE = 25

export default async function DealsPage({ searchParams }: { searchParams: SP }) {
  await getServerSession(authOptions)

  const page = Number(searchParams.page ?? 1)

  const where: Record<string, unknown> = {}
  if (searchParams.state) where.state = searchParams.state
  if (searchParams.city) where.city = { contains: searchParams.city, mode: 'insensitive' }
  if (searchParams.dealType && Object.values(DealType).includes(searchParams.dealType as DealType))
    where.dealType = searchParams.dealType
  if (searchParams.assetType && Object.values(AssetType).includes(searchParams.assetType as AssetType))
    where.assetType = searchParams.assetType
  if (searchParams.status && Object.values(DealStatus).includes(searchParams.status as DealStatus))
    where.status = searchParams.status
  if (searchParams.sourceId) where.sourceId = searchParams.sourceId
  if (searchParams.q) {
    where.OR = [
      { address: { contains: searchParams.q, mode: 'insensitive' } },
      { city: { contains: searchParams.q, mode: 'insensitive' } },
      { description: { contains: searchParams.q, mode: 'insensitive' } },
    ]
  }

  const unitsMin = searchParams.unitsMin ? parseInt(searchParams.unitsMin) : undefined
  const unitsMax = searchParams.unitsMax ? parseInt(searchParams.unitsMax) : undefined
  if (unitsMin || unitsMax) {
    where.units = {}
    if (unitsMin) (where.units as Record<string,number>).gte = unitsMin
    if (unitsMax) (where.units as Record<string,number>).lte = unitsMax
  }

  if (searchParams.priceMin || searchParams.priceMax) {
    where.askingPrice = {}
    if (searchParams.priceMin) (where.askingPrice as Record<string,bigint>).gte = BigInt(Math.round(Number(searchParams.priceMin) * 100))
    if (searchParams.priceMax) (where.askingPrice as Record<string,bigint>).lte = BigInt(Math.round(Number(searchParams.priceMax) * 100))
  }

  const sortMap: Record<string, object> = {
    score: [{ bankabilityScore: 'desc' }, { createdAt: 'desc' }],
    cap_rate: [{ capRate: 'desc' }],
    dscr: [{ dscr: 'desc' }],
    price_per_unit: [{ pricePerUnit: 'asc' }],
    date: [{ createdAt: 'desc' }],
  }
  const orderBy = sortMap[searchParams.sort ?? 'score'] ?? sortMap.score

  const [deals, total, sources, users] = await Promise.all([
    prisma.deal.findMany({
      where, orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        source: { select: { name: true, type: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    }),
    prisma.deal.count({ where }),
    prisma.dealSource.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 font-display">Deal Inbox</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total.toLocaleString()} opportunities tracked</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Import CSV
          </Link>
          <Link href="/ai-extract" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            AI Extract
          </Link>
          <Link href="/deals/new" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Deal
          </Link>
        </div>
      </div>

      <DealsFilters sources={sources} sp={searchParams} />

      <DealsTable
        deals={deals}
        users={users}
        page={page}
        totalPages={Math.ceil(total / PER_PAGE)}
        total={total}
        sp={searchParams}
      />
    </div>
  )
}
