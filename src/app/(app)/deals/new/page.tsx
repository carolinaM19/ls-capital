import { prisma } from '@/lib/prisma'
import DealForm from '@/components/deals/DealForm'

export default async function NewDealPage() {
  const sources = await prisma.dealSource.findMany({ where: { isActive: true }, select: { id: true, name: true } })
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Add Deal</h1>
        <p className="text-sm text-slate-500 mt-1">Manually enter a new opportunity. Underwriting computes automatically.</p>
      </div>
      <DealForm sources={sources} />
    </div>
  )
}
