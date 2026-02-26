import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DealForm from '@/components/deals/DealForm'

export default async function EditDealPage({ params }: { params: { id: string } }) {
  const [deal, sources] = await Promise.all([
    prisma.deal.findUnique({ where: { id: params.id } }),
    prisma.dealSource.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ])

  if (!deal) notFound()

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Edit Deal</h1>
        <p className="text-sm text-slate-500 mt-1">{deal.address} · {deal.city}, {deal.state}</p>
      </div>
      <DealForm sources={sources} initialData={JSON.parse(JSON.stringify(deal))} dealId={deal.id} />
    </div>
  )
}
