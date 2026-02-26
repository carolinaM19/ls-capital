'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (user?.role !== 'ADMIN') throw new Error('Admin only')
  return session
}

export async function updateUWConfig(key: string, value: string) {
  await requireAdmin()
  await prisma.underwritingConfig.update({ where: { key }, data: { value } })
  revalidatePath('/admin')
  revalidatePath('/underwrite')
}

export async function updateScoringWeight(factorKey: string, weight: number) {
  await requireAdmin()
  if (weight < 0 || weight > 1) throw new Error('Weight must be between 0 and 1')
  await prisma.scoringWeight.update({ where: { factorKey }, data: { weight } })
  revalidatePath('/admin')
}

export async function upsertSource(data: {
  id?: string
  name: string
  type: string
  url?: string
  notes?: string
  isActive: boolean
}) {
  await requireAdmin()
  if (data.id) {
    await prisma.dealSource.update({
      where: { id: data.id },
      data: { name: data.name, type: data.type as never, url: data.url || null, notes: data.notes || null, isActive: data.isActive },
    })
  } else {
    await prisma.dealSource.create({
      data: { name: data.name, type: data.type as never, url: data.url || null, notes: data.notes || null, isActive: data.isActive },
    })
  }
  revalidatePath('/admin')
}

export async function deleteSource(id: string) {
  await requireAdmin()
  await prisma.dealSource.delete({ where: { id } })
  revalidatePath('/admin')
}
