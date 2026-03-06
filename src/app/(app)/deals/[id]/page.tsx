import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DealDetailClient from '@/components/deals/DealDetailClient'

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  const [deal, users, sources] = await Promise.all([
    prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        source: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        notes: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
        auditLogs: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
    prisma.dealSource.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ])

  if (!deal) notFound()

  return (
    <DealDetailClient
      deal={JSON.parse(JSON.stringify(deal, (_, v) => typeof v === 'bigint' ? v.toString() : v))}
      users={users}
      sources={sources}
    />
  )
}
