import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()

  function mapAssetType(type: string): any {
    const t = (type || '').toLowerCase()
    if (t.includes('single') || t.includes('sfr')) return 'SFR'
    if (t.includes('2') || t.includes('duplex') || t.includes('triplex')) return 'MULTI_2_4'
    if (t.includes('mixed')) return 'MIXED_USE'
    return 'MULTI_50_PLUS'
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        address: body.address || 'Unknown',
        city: body.city || '',
        state: body.state || '',
        zip: body.zip || '',
        assetType: mapAssetType(body.assetType),
        dealType: 'ON_MARKET',
        status: 'NEW',
        units: body.units || null,
        sqFt: body.sqft || null,
        askingPrice: body.price ? Math.round(body.price * 100) : null,
        loanAmount: body.loanAmount ? Math.round(body.loanAmount * 100) : null,
        equityRequired: body.downPayment ? Math.round(body.downPayment * 100) : null,
        monthlyPayment: body.monthlyPayment ? Math.round(body.monthlyPayment * 100) : null,
        capRate: body.capRate || null,
        cashOnCash: body.cashOnCash || null,
        noi: body.noi ? Math.round(body.noi * 100) : null,
        description: `Found via Deal Finder on Crexi.${body.url ? ` Source: ${body.url}` : ''}`,
      },
    })
    return NextResponse.json({ id: deal.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
