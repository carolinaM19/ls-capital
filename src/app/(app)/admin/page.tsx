import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/admin/AdminClient'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Admin access required.</p>
      </div>
    )
  }

  const [configs, weights, sources, users] = await Promise.all([
    prisma.underwritingConfig.findMany({ orderBy: { key: 'asc' } }),
    prisma.scoringWeight.findMany({ orderBy: { factorKey: 'asc' } }),
    prisma.dealSource.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100 font-display">Admin Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure underwriting defaults, scoring weights, and deal sources</p>
      </div>
      <AdminClient
        configs={configs}
        weights={weights.map(w => ({ ...w, weight: Number(w.weight) }))}
        sources={sources}
        users={users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      />
    </div>
  )
}
