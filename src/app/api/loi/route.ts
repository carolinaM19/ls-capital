import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { deal, sendEmail, brokerEmail } = await req.json()
  const offerPrice = Math.round(deal.price * 0.90)

  const loi = `LETTER OF INTENT TO PURCHASE

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

FROM:
North Bay Road Capital LLC
c/o LS Finance LLC
Attn: Luca Schnetzler & Scott Porter

TO:
Listing Broker / Seller Representative
Re: ${deal.address}, ${deal.city}, ${deal.state}

Dear Broker/Seller,

North Bay Road Capital LLC ("Buyer") hereby submits this non-binding Letter of Intent to acquire the above-referenced property under the following terms:

PROPERTY:
Address: ${deal.address}, ${deal.city}, ${deal.state}
Asset Type: ${deal.assetType || 'Multifamily'}
Units: ${deal.units}
Listed Price: $${deal.price.toLocaleString()}

PROPOSED TERMS:

1. PURCHASE PRICE
   Buyer proposes an all-in purchase price of $${offerPrice.toLocaleString()} (${((offerPrice/deal.price)*100).toFixed(0)}% of asking price).

2. FINANCING
   Buyer intends to finance the acquisition through LS Finance LLC at 80% LTV, 5.99% fixed interest rate, 30-year amortization. Buyer has an established lending relationship and is prepared to move quickly.

3. EARNEST MONEY DEPOSIT
   Buyer will deposit $${Math.round(offerPrice * 0.01).toLocaleString()} (1% of purchase price) into escrow within 3 business days of execution of a Purchase and Sale Agreement.

4. DUE DILIGENCE PERIOD
   Buyer requests a 21-day due diligence period from the date of mutual execution of the Purchase and Sale Agreement, during which Buyer will conduct physical, financial, and legal review of the property.

5. CLOSING
   Buyer anticipates closing within 30-45 days following the expiration of the due diligence period, subject to financing and title review.

6. CONDITIONS
   This LOI is subject to:
   - Execution of a mutually acceptable Purchase and Sale Agreement
   - Satisfactory completion of due diligence
   - Financing approval from LS Finance LLC
   - Clear and marketable title

7. EXCLUSIVITY
   Buyer requests a 14-day exclusivity period from the date of acceptance of this LOI, during which Seller agrees not to solicit or accept other offers.

BUYER INFORMATION:
North Bay Road Capital LLC
Entity Type: Limited Liability Company
State of Formation: Florida
Principal Contact: Scott Porter / Ben Baumann
Financing Partner: Luca Schnetzler, LS Finance LLC

This Letter of Intent is non-binding and is intended solely to outline the general terms upon which Buyer would be willing to proceed. Neither party shall be legally bound until a formal Purchase and Sale Agreement has been fully executed.

We look forward to your response and the opportunity to move forward on this transaction.

Respectfully submitted,

_______________________________
Scott Porter
Managing Member, North Bay Road Capital LLC

_______________________________
Luca Schnetzler
LS Finance LLC

Date: ___________________________`

  if (sendEmail && brokerEmail) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      })

      await transporter.sendMail({
        from: `North Bay Road Capital LLC <${process.env.EMAIL_FROM_ADDRESS || 'no-reply@lsfinance.com'}>`,
        replyTo: process.env.EMAIL_REPLY_TO || 'no-reply@lsfinance.com',
        to: brokerEmail,
        subject: `Letter of Intent — ${deal.address}, ${deal.city}, ${deal.state}`,
        text: loi,
        html: `<pre style="font-family: Georgia, serif; font-size: 14px; line-height: 1.8; max-width: 700px; margin: 0 auto; padding: 40px;">${loi}</pre>`,
      })

      return NextResponse.json({ loi, offerPrice, sent: true })
    } catch (err: any) {
      return NextResponse.json({ loi, offerPrice, sent: false, emailError: err.message })
    }
  }

  return NextResponse.json({ loi, offerPrice, sent: false })
}
