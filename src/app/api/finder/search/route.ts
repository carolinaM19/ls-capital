import { NextRequest, NextResponse } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_TOKEN || ''
const ACTOR_ID = 'powerai~crexi-listing-scraper'
const INTEREST_RATE = 0.0599
const LTV = 0.80

function parsePrice(p: string): number {
  if (!p) return 0
  const n = p.replace(/[$,]/g, '')
  if (n.includes('M')) return parseFloat(n) * 1_000_000
  if (n.includes('K')) return parseFloat(n) * 1_000
  return parseFloat(n) || 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city') || ''
  const state = searchParams.get('state') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''

  if (!city || !state) return NextResponse.json({ error: 'city and state required' }, { status: 400 })

  const searchQuery = `${city}, ${state}`

  try {
    // Start run
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, propertyType: 'Multifamily', limit: 40 }),
      }
    )
    const runData = await runRes.json()
    const runId = runData?.data?.id
    if (!runId) return NextResponse.json({ error: 'Failed to start scraper' }, { status: 500 })

    // Poll until done (max 90s)
    let status = 'RUNNING'
    for (let i = 0; i < 18; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`)
      const statusData = await statusRes.json()
      status = statusData?.data?.status
      if (status === 'SUCCEEDED' || status === 'FAILED') break
    }

    if (status !== 'SUCCEEDED') return NextResponse.json({ error: `Scraper ${status}` }, { status: 500 })

    // Fetch results
    const itemsRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
    )
    const items = await itemsRes.json()

    const results = items
      .map((item: any, i: number) => {
        const price = parsePrice(item.price)
        if (!price) return null
        if (minPrice && price < parseFloat(minPrice)) return null
        if (maxPrice && price > parseFloat(maxPrice)) return null

        const units = 4 // Crexi doesn't return units, default conservative
        const capRate = 7.5
        const noi = price * capRate / 100
        const loanAmount = price * LTV
        const downPayment = price * (1 - LTV)
        const monthlyRate = INTEREST_RATE / 12
        const n = 360
        const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
        const annualDebtService = monthlyPayment * 12
        const annualCashFlow = noi - annualDebtService
        const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0
        const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
        const pricePerUnit = units > 0 ? price / units : 0

        let score = 50 // base score since we don't have all data
        if (dscr >= 1.25) score += 20
        else if (dscr >= 1.0) score += 10
        if (cashOnCash >= 10) score += 15
        else if (cashOnCash >= 5) score += 8
        if (pricePerUnit <= 80000) score += 15
        else if (pricePerUnit <= 150000) score += 8

        return {
          id: `crexi-${i}-${Date.now()}`,
          address: item.propertyAddress || 'Unknown',
          city, state,
          price, units, sqft: 0,
          assetType: 'Multifamily',
          capRate, noi, loanAmount, downPayment,
          monthlyPayment, annualCashFlow, cashOnCash, dscr, pricePerUnit,
          score: Math.min(score, 100),
          url: item.detailPageUrl || 'https://www.crexi.com',
          image: item.imageUrl,
          broker: null,
          daysOnMarket: null,
          source: 'Crexi',
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({ results, total: results.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
