import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city') || ''
  const state = searchParams.get('state') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const minUnits = searchParams.get('minUnits') || ''
  const maxUnits = searchParams.get('maxUnits') || ''
  const minCapRate = searchParams.get('minCapRate') || ''
  const assetTypes = searchParams.get('assetTypes')?.split(',') || ['MULTI_50_PLUS']

  const token = process.env.APIFY_TOKEN
  if (!token) return NextResponse.json({ error: 'No Apify token configured' }, { status: 500 })

  const propertyTypeMap: Record<string, string> = {
    'SFR': 'Residential Income',
    'MULTI_2_4': 'Multifamily',
    'MULTI_5_PLUS': 'Multifamily',
    'MULTI_20_30': 'Multifamily',
    'MULTI_50_PLUS': 'Multifamily',
    'MIXED_USE': 'Mixed Use',
  }

  const crexiTypes = [...new Set(assetTypes.map((t: string) => propertyTypeMap[t] || 'Multifamily'))]

  const params = new URLSearchParams()
  if (city) params.set('location', `${city}${state ? `, ${state}` : ''}`)
  if (minPrice) params.set('listingMinPrice', String(minPrice))
  if (maxPrice) params.set('listingMaxPrice', String(maxPrice))
  crexiTypes.forEach((t: any) => params.append('propertyTypes[]', t))

  const crexiSearchUrl = `https://www.crexi.com/properties?${params.toString()}`

  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/powerai~crexi-listing-scraper/run-sync-get-dataset-items?token=${token}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchUrl: crexiSearchUrl, maxItems: 30 }),
      }
    )

    const rawText = await apifyRes.text()
    if (!apifyRes.ok) {
      return NextResponse.json({ error: `Apify error: ${rawText}` }, { status: 500 })
    }

    let rawResults: any[]
    try {
      rawResults = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: `Invalid Apify response: ${rawText.slice(0, 200)}` }, { status: 500 })
    }

    if (!Array.isArray(rawResults)) {
      return NextResponse.json({ error: 'Unexpected Apify response format', raw: rawResults }, { status: 500 })
    }

    const INTEREST_RATE = 0.0599
    const LTV = 0.80

    const results = rawResults.map((item: any) => {
      const price = parseFloat((item.price || '').toString().replace(/[$,]/g, '') || '0')
      const units = parseInt(item.units || item.numberOfUnits || '1')
      const sqft = parseInt((item.squareFootage || '').toString().replace(/[,]/g, '') || '0')
      const listedNOI = parseFloat((item.noi || '').toString().replace(/[$,]/g, '') || '0')
      const listedCapRate = parseFloat((item.capRate || '').toString().replace(/%/g, '') || '0')

      if (!price) return null
      if (minUnits && units < parseInt(minUnits)) return null
      if (maxUnits && units > parseInt(maxUnits)) return null

      const loanAmount = price * LTV
      const downPayment = price * (1 - LTV)
      const monthlyRate = INTEREST_RATE / 12
      const n = 360
      const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      const estimatedCapRate = listedCapRate || 7.0
      const estimatedNOI = listedNOI || (price * estimatedCapRate / 100)
      const annualDebtService = monthlyPayment * 12
      const annualCashFlow = estimatedNOI - annualDebtService
      const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0
      const dscr = annualDebtService > 0 ? estimatedNOI / annualDebtService : 0
      const pricePerUnit = units > 0 ? price / units : 0

      if (minCapRate && estimatedCapRate < parseFloat(minCapRate)) return null

      let score = 0
      if (estimatedCapRate >= 8) score += 30
      else if (estimatedCapRate >= 6) score += 20
      else if (estimatedCapRate >= 5) score += 10
      if (cashOnCash >= 15) score += 25
      else if (cashOnCash >= 10) score += 15
      else if (cashOnCash >= 5) score += 8
      if (dscr >= 1.25) score += 20
      else if (dscr >= 1.0) score += 10
      if (units >= 10) score += 15
      else if (units >= 5) score += 10
      else if (units >= 2) score += 5
      if (pricePerUnit > 0 && pricePerUnit <= 80000) score += 10
      else if (pricePerUnit <= 120000) score += 5

      return {
        id: item.id || item.url || Math.random().toString(),
        address: item.address || item.name || 'Unknown address',
        city: item.city || city,
        state: item.state || state,
        price, units, sqft,
        assetType: item.propertyType || 'Multifamily',
        capRate: estimatedCapRate,
        noi: estimatedNOI,
        loanAmount, downPayment, monthlyPayment, annualCashFlow, cashOnCash, dscr, pricePerUnit,
        score: Math.min(score, 100),
        url: item.url || item.propertyUrl,
        image: item.imageUrl || item.image,
        broker: item.brokerName || item.broker,
        daysOnMarket: item.daysOnMarket,
        source: 'Crexi',
      }
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({ results, total: results.length, searchUrl: crexiSearchUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
