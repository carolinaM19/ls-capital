import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city') || ''
  const state = searchParams.get('state') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''

  try {
    const params = new URLSearchParams({
      city,
      state_code: state,
      property_type: 'multi_family',
      listing_status: 'for_sale',
      limit: '30',
      offset: '0',
      sort: 'newest',
      ...(minPrice && { price_min: minPrice }),
      ...(maxPrice && { price_max: maxPrice }),
    })

    const res = await fetch(`https://us-real-estate.p.rapidapi.com/v2/for-sale?${params}`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
        'x-rapidapi-host': 'us-real-estate.p.rapidapi.com',
      },
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ error: `API error ${res.status}: ${txt.slice(0, 200)}` }, { status: 500 })
    }

    const data = await res.json()
    const listings = data?.data?.home_search?.results || data?.results || []

    const INTEREST_RATE = 0.0599
    const LTV = 0.80

    const results = listings.map((item: any) => {
      const price = item.list_price || item.price || 0
      const units = item.description?.beds || item.units || 2
      const sqft = item.description?.sqft || 0
      const address = item.location?.address?.line || 'Unknown'
      const itemCity = item.location?.address?.city || city
      const itemState = item.location?.address?.state_code || state
      const listingId = item.property_id || item.listing_id || String(Math.random())
      const image = item.primary_photo?.href || item.photos?.[0]?.href

      if (!price) return null

      const capRate = item.cap_rate || 7.0
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

      let score = 0
      if (capRate >= 8) score += 30
      else if (capRate >= 6) score += 20
      else if (capRate >= 5) score += 10
      if (cashOnCash >= 15) score += 25
      else if (cashOnCash >= 10) score += 15
      else if (cashOnCash >= 5) score += 8
      if (dscr >= 1.25) score += 20
      else if (dscr >= 1.0) score += 10
      if (units >= 10) score += 15
      else if (units >= 5) score += 10
      else if (units >= 2) score += 5
      if (pricePerUnit <= 80000) score += 10
      else if (pricePerUnit <= 120000) score += 5

      return {
        id: listingId,
        address, city: itemCity, state: itemState,
        price, units, sqft,
        assetType: 'Multifamily',
        capRate, noi, loanAmount, downPayment,
        monthlyPayment, annualCashFlow, cashOnCash, dscr, pricePerUnit,
        score: Math.min(score, 100),
        url: item.href || `https://www.realtor.com/realestateandhomes-detail/${listingId}`,
        image,
        broker: item.advertisers?.[0]?.name || item.list_agent?.name,
        daysOnMarket: item.list_date,
        source: 'Realtor.com',
      }
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score)

    return NextResponse.json({ results, total: results.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
