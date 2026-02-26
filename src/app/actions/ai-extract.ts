'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface ExtractedDeal {
  address?: string
  city?: string
  state?: string
  zip?: string
  units?: number
  yearBuilt?: number
  sqFt?: number
  assetType?: string
  dealType?: string
  description?: string
  askingPrice?: number
  grossMonthlyRent?: number
  currentMonthlyRent?: number
  occupancyRate?: number
  capRate?: number
  daysOnMarket?: number
  sourceUrl?: string
  brokerName?: string
  brokerEmail?: string
  brokerPhone?: string
  confidence?: Record<string, 'high' | 'medium' | 'low'>
  rawNotes?: string
}

export async function extractDealFromText(listingText: string): Promise<{ success: boolean; data?: ExtractedDeal; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: 'Unauthorized' }

  if (!listingText?.trim()) return { success: false, error: 'No text provided' }
  if (listingText.length > 8000) return { success: false, error: 'Text too long (max 8000 chars)' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { success: false, error: 'ANTHROPIC_API_KEY not configured' }

  const systemPrompt = `You are a real estate data extraction assistant for LS Capital, a private lender.
Extract structured deal data from listing text, broker emails, or property descriptions.
Return ONLY valid JSON — no markdown, no explanation, no preamble.

JSON schema:
{
  "address": "street address only",
  "city": "city name",
  "state": "2-letter state code",
  "zip": "5-digit zip or null",
  "units": integer or null,
  "yearBuilt": integer or null,
  "sqFt": integer or null,
  "assetType": one of: SFR, MULTI_2_4, MULTI_5_PLUS, MULTI_20_30, MULTI_50_PLUS, MIXED_USE, OTHER,
  "dealType": one of: ON_MARKET, OFF_MARKET, AUCTION, DISTRESSED, POCKET,
  "description": "concise summary of key value-add signals, property condition, and investment thesis",
  "askingPrice": number in dollars or null,
  "grossMonthlyRent": number in dollars (market rent, all units) or null,
  "currentMonthlyRent": number in dollars (in-place rent) or null,
  "occupancyRate": number 0-100 or null,
  "capRate": number as percentage (e.g. 6.5) or null,
  "daysOnMarket": integer or null,
  "sourceUrl": "url if present" or null,
  "brokerName": "broker/agent name" or null,
  "brokerEmail": "email" or null,
  "brokerPhone": "phone" or null,
  "confidence": { "address": "high|medium|low", "price": "high|medium|low", "rent": "high|medium|low" },
  "rawNotes": "anything notable that didn't fit the schema — value-add signals, deal highlights, caveats"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Extract deal data from this listing text:\n\n${listingText}` }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `API error: ${res.status} — ${err.slice(0, 200)}` }
    }

    const json = await res.json()
    const raw = json.content?.[0]?.text ?? ''

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed: ExtractedDeal = JSON.parse(cleaned)

    return { success: true, data: parsed }
  } catch (err) {
    return { success: false, error: `Extraction failed: ${String(err).slice(0, 200)}` }
  }
}
