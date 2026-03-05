import { prisma } from '@/lib/prisma'
import ImportClient from '@/components/ImportClient'

export default async function ImportPage() {
  const [sources, recentJobs] = await Promise.all([
    prisma.dealSource.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      
    }),
  ])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">CSV Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload exports from LoopNet, Crexi, broker spreadsheets, or any CSV with deal data.
          Underwriting computes automatically on import.
        </p>
      </div>
      <ImportClient sources={sources} recentJobs={JSON.parse(JSON.stringify(recentJobs))} />
    </div>
  )
}
