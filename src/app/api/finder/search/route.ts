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

  const propertyTypeMap: Record<string, string> = {
    'SFR': 'Single Family',
    'MULTI_2_4': 'Multifamily',
    'MULTI_5_PLUS': 'Multifamily',
    'MULTI_20_30': 'Multifamily',
    'MULTI_50_PLUS': 'Multifamily',
    'MIXED_USE': 'Mixed Use',
  }

  const crexiTypes = [...new Set(assetTypes.map((t: string) => propertyTypeMap[t] || 'Multifamily'))]

  try {
    const filters: any = {
      propertyTypes: crexiTypes,
      listingTypes: ['sale'],
    }
    if (city || state) filters.location = `${city}${city && state ? ', ' : ''}${state}`
    if (minPrice) filters.minPrice = parseInt(minPrice)
    if (maxPrice) filters.maxPrice = parseInt(maxPrice)
    if (minUnits) filters.minUnits = parseInt(minUnits)
    if (maxUnits) filters.maxUnits = parseInt(maxUnits)

    const crexiRes = await fetch('https://api.crexi.com/assets/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://www.crexi.com',
        'Referer': 'https://www.crexi.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        filters,
        page: 1,
        pageSize: 30,
        sortBy: 'listedAt',
        sortOrder: 'desc',
      }),
    })

    if (!crexiRes.ok) {
      const errText = await crexiRes.text()
      return NextResponse.json({ error: `Crexi API error ${crexiRes.status}: ${errText.slice(0, 200)}` }, { status: 500 })
    }

    const crexiData = await crexiRes.json()
    const listings = crexiData.results || crexiData.assets || crexiData.data || crexiData || []

    if (!Array.isArray(listings)) {
      return NextResponse.json({ error: 'Unexpected Crexi response', raw: JSON.stringify(crexiData).slice(0, 300) }, { status: 500 })
    }

    const INTEREST_RATE = 0.0599
    const LTV = 0.80

    const results = listings.map((item: any) => {
      const price = item.askingPrice || item.price || item.listPrice || 0
      const units = item.units || item.numberOfUnits || item.unitCount || 1
      const sqft = item.squareFeet || item.sqFt || item.buildingSize || 0
      const listedCapRate = item.capRate || item.capitalizationRate || 0
      const listedNOI = item.noi || item.netOperatingIncome || 0

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

      const addressParts = [item.address, item.streetAddress, item.street].filter(Boolean)
      const address = addressParts[0] || item.name || item.title || 'Unknown address'
      const itemCity = item.city || city
      const itemState = item.state || item.stateCode || state

      return {
        id: item.id || item.assetId || String(Math.random()),
        address,
        city: itemCity,
        state: itemState,
        price, units, sqft,
        assetType: item.propertyType || item.assetType || 'Multifamily',
        capRate: estimatedCapRate,
        noi: estimatedNOI,
        loanAmount, downPayment, monthlyPayment, annualCashFlow, cashOnCash, dscr, pricePerUnit,
        score: Math.min(score, 100),
        url: item.url || item.listingUrl || (item.id ? `https://www.crexi.com/properties/${item.id}` : null),
        image: item.thumbnailUrl || item.imageUrl || item.primaryImage,
        broker: item.brokerName || item.listingAgent || item.contactName,
        daysOnMarket: item.daysOnMarket || item.daysListed,
        source: 'Crexi',
      }
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({ results, total: results.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
