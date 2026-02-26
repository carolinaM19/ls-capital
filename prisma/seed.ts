import {
  PrismaClient,
  AssetType,
  DealType,
  DealStatus,
  LoanStatus,
  SourceType,
} from '@prisma/client'
import { computeUnderwriting } from '../src/lib/underwriting'
import { computeBankabilityScore } from '../src/lib/scoring'
import { buildDedupeHash } from '../src/lib/utils'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding LS Capital database...')

  // ── UNDERWRITING CONFIG ────────────────────────────────────────────────────
  const configs = [
    { key: 'interest_rate', label: 'Interest Rate (%)', value: '5.99', description: 'Annual interest rate for loan simulation' },
    { key: 'max_ltv', label: 'Max LTV (%)', value: '80', description: 'Maximum loan-to-value ratio' },
    { key: 'term_years', label: 'Loan Term (years)', value: '30', description: 'Amortization term' },
    { key: 'expense_ratio', label: 'Expense Ratio (%)', value: '40', description: 'Operating expenses as % of EGI' },
    { key: 'vacancy_rate', label: 'Vacancy Rate (%)', value: '5', description: 'Assumed vacancy rate' },
    { key: 'rent_growth_rate', label: 'Rent Growth Rate (%/yr)', value: '3', description: 'Annual rent escalation assumption' },
    { key: 'portfolio_cap', label: 'Portfolio Loan Cap ($)', value: '10000000', description: 'Total portfolio loan limit' },
    { key: 'min_dscr', label: 'Min DSCR', value: '1.20', description: 'Minimum acceptable debt service coverage ratio' },
    { key: 'min_cap_rate', label: 'Min Cap Rate (%)', value: '5.00', description: 'Minimum acceptable cap rate' },
  ]
  for (const c of configs) {
    await prisma.underwritingConfig.upsert({
      where: { key: c.key },
      update: c,
      create: c,
    })
  }

  // ── SCORING WEIGHTS ────────────────────────────────────────────────────────
  const weights = [
    { factorKey: 'dscr', label: 'DSCR Strength', weight: 0.25, config: { min: 1.0, good: 1.25, excellent: 1.5 } },
    { factorKey: 'ltv', label: 'LTV Feasibility', weight: 0.20, config: { max: 80 } },
    { factorKey: 'cap_rate', label: 'Cap Rate Band', weight: 0.15, config: { min: 4.0, good: 6.0, excellent: 8.0 } },
    { factorKey: 'value_add', label: 'Value-Add Signals', weight: 0.15, config: {} },
    { factorKey: 'price_per_unit', label: 'Price Per Unit vs Region', weight: 0.10, config: {} },
    { factorKey: 'data_completeness', label: 'Data Completeness', weight: 0.10, config: {} },
    { factorKey: 'stress_test', label: 'Stress Test Resilience', weight: 0.05, config: {} },
  ]
  for (const w of weights) {
    await prisma.scoringWeight.upsert({
      where: { factorKey: w.factorKey },
      update: w,
      create: w,
    })
  }

  // ── SOURCES ────────────────────────────────────────────────────────────────
  const sources = [
    { id: 'src_loopnet', name: 'LoopNet', type: SourceType.ON_MARKET, url: 'https://loopnet.com', isActive: true },
    { id: 'src_crexi', name: 'Crexi', type: SourceType.ON_MARKET, url: 'https://crexi.com', isActive: true },
    { id: 'src_mls', name: 'MLS / Realtor.com', type: SourceType.ON_MARKET, url: 'https://realtor.com', isActive: true },
    { id: 'src_auction', name: 'Auction.com', type: SourceType.AUCTION, url: 'https://auction.com', isActive: true },
    { id: 'src_tenx', name: 'Ten-X', type: SourceType.AUCTION, url: 'https://ten-x.com', isActive: true },
    { id: 'src_broker', name: 'Broker Direct', type: SourceType.BROKER_EMAIL, isActive: true },
    { id: 'src_offmkt', name: 'Direct Outreach', type: SourceType.OFF_MARKET, isActive: true },
  ]
  for (const s of sources) {
    await prisma.dealSource.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    })
  }

  // ── USERS ─────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'luca@lsfinance.com' },
    update: {},
    create: { email: 'luca@lsfinance.com', name: 'Luca', role: 'ADMIN' },
  })
  await prisma.user.upsert({
    where: { email: 'analyst@lsfinance.com' },
    update: {},
    create: { email: 'analyst@lsfinance.com', name: 'Analyst', role: 'ANALYST' },
  })

  // ── EXISTING LOANS (Current Portfolio) ────────────────────────────────────
  const existingLoans = [
    {
      borrowerEntity: 'Peachtree SPE 1 LLC',
      propertyAddress: '1402 Oak Grove Ave, Atlanta, GA 30316',
      loanAmount: BigInt(19200000), // $192,000
      interestRate: 5.99,
      termYears: 30,
      amortYears: 30,
      originationDate: new Date('2023-03-15'),
      maturityDate: new Date('2053-03-15'),
      status: LoanStatus.ACTIVE,
      propertyValue: BigInt(24000000),
      ltv: 80.0,
      dscr: 1.32,
      monthlyPayment: BigInt(115200),
      loanNumber: 'LSF-2023-001',
    },
    {
      borrowerEntity: 'Buckhead SPE 2 LLC',
      propertyAddress: '3847 Peachtree Rd NE, Atlanta, GA 30319',
      loanAmount: BigInt(28800000), // $288,000
      interestRate: 5.99,
      termYears: 30,
      amortYears: 30,
      originationDate: new Date('2023-06-20'),
      maturityDate: new Date('2053-06-20'),
      status: LoanStatus.ACTIVE,
      propertyValue: BigInt(36000000),
      ltv: 80.0,
      dscr: 1.28,
      monthlyPayment: BigInt(172800),
      loanNumber: 'LSF-2023-002',
    },
    {
      borrowerEntity: 'Savannah SPE 3 LLC',
      propertyAddress: '612 E Victory Dr, Savannah, GA 31405',
      loanAmount: BigInt(22400000), // $224,000
      interestRate: 5.99,
      termYears: 30,
      amortYears: 30,
      originationDate: new Date('2023-09-10'),
      maturityDate: new Date('2053-09-10'),
      status: LoanStatus.ACTIVE,
      propertyValue: BigInt(28000000),
      ltv: 80.0,
      dscr: 1.41,
      monthlyPayment: BigInt(134400),
      loanNumber: 'LSF-2023-003',
    },
    {
      borrowerEntity: 'Augusta SPE 4 LLC',
      propertyAddress: '229 Broad St, Augusta, GA 30901',
      loanAmount: BigInt(17600000), // $176,000
      interestRate: 5.99,
      termYears: 30,
      amortYears: 30,
      originationDate: new Date('2024-01-08'),
      maturityDate: new Date('2054-01-08'),
      status: LoanStatus.ACTIVE,
      propertyValue: BigInt(22000000),
      ltv: 80.0,
      dscr: 1.25,
      monthlyPayment: BigInt(105600),
      loanNumber: 'LSF-2024-001',
    },
  ]

  for (const loan of existingLoans) {
    await prisma.loan.upsert({
      where: { loanNumber: loan.loanNumber! },
      update: {},
      create: loan,
    })
  }

  // ── DEFAULT UNDERWRITING PARAMS ────────────────────────────────────────────
  const defaultUW = {
    interestRate: 5.99,
    maxLtv: 80,
    termYears: 30,
    expenseRatio: 40,
    vacancyRate: 5,
    rentGrowthRate: 3,
  }

  // ── PIPELINE DEALS ─────────────────────────────────────────────────────────
  const rawDeals = [
    {
      address: '4821 N Sheridan Rd', city: 'Chicago', state: 'IL', zip: '60640',
      assetType: AssetType.MULTI_20_30, units: 24, yearBuilt: 1968, sqFt: 22000,
      dealType: DealType.ON_MARKET, status: DealStatus.REVIEWING,
      askingPrice: 3200000, grossMonthlyRent: 32400, currentMonthlyRent: 26000, occupancyRate: 91,
      description: 'Well-maintained 24-unit brick courtyard building. Under-market rents with 18% upside. Long-term tenants. Value-add opportunity with kitchen renovations.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/chicago-il-1', daysOnMarket: 45,
    },
    {
      address: '3344 Oak Lawn Ave', city: 'Dallas', state: 'TX', zip: '75219',
      assetType: AssetType.MULTI_20_30, units: 32, yearBuilt: 1985, sqFt: 28000,
      dealType: DealType.OFF_MARKET, status: DealStatus.UNDERWRITING,
      askingPrice: 4100000, grossMonthlyRent: 43200, currentMonthlyRent: 40800, occupancyRate: 94,
      description: 'Off-market 32-unit garden-style in Uptown Dallas. Stabilized asset. Owner retiring. No deferred maintenance.',
      sourceId: 'src_offmkt', daysOnMarket: 0,
    },
    {
      address: '890 Peachtree St NE', city: 'Atlanta', state: 'GA', zip: '30309',
      assetType: AssetType.MULTI_20_30, units: 28, yearBuilt: 1972, sqFt: 24500,
      dealType: DealType.ON_MARKET, status: DealStatus.UNDERWRITING,
      askingPrice: 3600000, grossMonthlyRent: 33600, currentMonthlyRent: 25200, occupancyRate: 78,
      description: 'Midtown Atlanta 28-unit. High vacancy due to deferred maintenance — significant value-add potential. Renovation upside. Under-market rents by 25%.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/atlanta-ga-1', daysOnMarket: 76,
    },
    {
      address: '411 W Broadway', city: 'Phoenix', state: 'AZ', zip: '85041',
      assetType: AssetType.MULTI_20_30, units: 30, yearBuilt: 1998, sqFt: 27500,
      dealType: DealType.ON_MARKET, status: DealStatus.LOI,
      askingPrice: 4400000, grossMonthlyRent: 46800, currentMonthlyRent: 43800, occupancyRate: 93,
      description: 'Phoenix 30-unit newer vintage. Washer/dryer hookups in all units. Value-add through unit upgrades — $200/mo premium achievable.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/phoenix-az-1', daysOnMarket: 50,
    },
    {
      address: '7823 Maple Ave', city: 'Kansas City', state: 'MO', zip: '64114',
      assetType: AssetType.MULTI_20_30, units: 20, yearBuilt: 1975, sqFt: 17000,
      dealType: DealType.OFF_MARKET, status: DealStatus.REVIEWING,
      askingPrice: 1800000, grossMonthlyRent: 24000, currentMonthlyRent: 22800, occupancyRate: 95,
      description: 'Off-market KC 20-unit. Solid neighborhood, low turnover. Below replacement cost. Owner financing available at 5.5%.',
      sourceId: 'src_offmkt', daysOnMarket: 0,
    },
    {
      address: '1204 N Miami Ave', city: 'Miami', state: 'FL', zip: '33136',
      assetType: AssetType.MULTI_20_30, units: 40, yearBuilt: 1971, sqFt: 35000,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 6900000, grossMonthlyRent: 66000, currentMonthlyRent: 60000, occupancyRate: 91,
      description: 'Wynwood-adjacent 40-unit. Below-market rents due to long-term tenants. Value-add repositioning opportunity.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/miami-fl-1', daysOnMarket: 60,
    },
    {
      address: '2789 Penn Ave', city: 'Pittsburgh', state: 'PA', zip: '15222',
      assetType: AssetType.MULTI_20_30, units: 29, yearBuilt: 1955, sqFt: 25000,
      dealType: DealType.AUCTION, status: DealStatus.REVIEWING,
      askingPrice: 2100000, grossMonthlyRent: 30480, currentMonthlyRent: 20160, occupancyRate: 72,
      description: 'Auction sale. High vacancy — deferred maintenance and poor management. Significant renovation needed. Priced accordingly. Strong value-add play for experienced buyer.',
      sourceId: 'src_auction', sourceUrl: 'https://auction.com/listing/pittsburgh-1', daysOnMarket: 45,
    },
    {
      address: '1601 E Broad St', city: 'Columbus', state: 'OH', zip: '43203',
      assetType: AssetType.MULTI_20_30, units: 33, yearBuilt: 1978, sqFt: 30000,
      dealType: DealType.ON_MARKET, status: DealStatus.REVIEWING,
      askingPrice: 3500000, grossMonthlyRent: 43560, currentMonthlyRent: 39600, occupancyRate: 90,
      description: '33-unit Near East Side Columbus. Strong rental market. Under-market rents with 20% upside achievable. Deferred maintenance on roof.',
      sourceId: 'src_crexi', sourceUrl: 'https://crexi.com/listing/columbus-oh-1', daysOnMarket: 53,
    },
    {
      address: '5512 Sunset Blvd', city: 'Los Angeles', state: 'CA', zip: '90028',
      assetType: AssetType.MULTI_20_30, units: 22, yearBuilt: 1964, sqFt: 19800,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 8500000, grossMonthlyRent: 44000, currentMonthlyRent: 42240, occupancyRate: 96,
      description: 'Hollywood 22-unit rent-controlled. Stable income, below-market rents. Long-term hold play.',
      sourceId: 'src_crexi', sourceUrl: 'https://crexi.com/listing/la-ca-1', daysOnMarket: 20,
    },
    {
      address: '347 Elm St', city: 'Nashville', state: 'TN', zip: '37201',
      assetType: AssetType.MULTI_5_PLUS, units: 8, yearBuilt: 1969, sqFt: 7200,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 1150000, grossMonthlyRent: 12800, currentMonthlyRent: 10560, occupancyRate: 88,
      description: '8-unit East Nashville. Gentrifying neighborhood. Significant renovation upside. Under-market rents.',
      sourceId: 'src_mls', daysOnMarket: 22,
    },
    {
      address: '209 Commerce St', city: 'Houston', state: 'TX', zip: '77002',
      assetType: AssetType.MULTI_50_PLUS, units: 55, yearBuilt: 1989, sqFt: 52000,
      dealType: DealType.AUCTION, status: DealStatus.PASSED,
      askingPrice: 5200000, grossMonthlyRent: 68640, currentMonthlyRent: 54912, occupancyRate: 82,
      description: 'Bank-owned 55-unit auction. Distressed sale. Deferred maintenance throughout. Below replacement cost.',
      sourceId: 'src_tenx', sourceUrl: 'https://ten-x.com/listing/houston-tx-1', daysOnMarket: 55,
    },
    {
      address: '810 Spring St', city: 'Atlanta', state: 'GA', zip: '30308',
      assetType: AssetType.MULTI_2_4, units: 4, yearBuilt: 1960, sqFt: 3800,
      dealType: DealType.OFF_MARKET, status: DealStatus.UNDER_CONTRACT,
      askingPrice: 680000, grossMonthlyRent: 6400, currentMonthlyRent: 5760, occupancyRate: 90,
      description: 'Off-market Atlanta quad. Strong Midtown location. Under-market rents by 15%.',
      sourceId: 'src_offmkt', daysOnMarket: 0,
    },
    {
      address: '1120 S State St', city: 'Chicago', state: 'IL', zip: '60605',
      assetType: AssetType.MULTI_5_PLUS, units: 18, yearBuilt: 1978, sqFt: 16500,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 2750000, grossMonthlyRent: 28800, currentMonthlyRent: 25344, occupancyRate: 88,
      description: 'South Loop 18-unit. Strong rent growth market. Some deferred maintenance on common areas. Owner motivated.',
      sourceId: 'src_crexi', sourceUrl: 'https://crexi.com/listing/chicago-il-2', daysOnMarket: 28,
    },
    {
      address: '3311 W North Ave', city: 'Milwaukee', state: 'WI', zip: '53208',
      assetType: AssetType.MULTI_20_30, units: 25, yearBuilt: 1970, sqFt: 22000,
      dealType: DealType.ON_MARKET, status: DealStatus.REVIEWING,
      askingPrice: 2200000, grossMonthlyRent: 28500, currentMonthlyRent: 25080, occupancyRate: 88,
      description: 'Milwaukee 25-unit. Strong rent collections. Upside in management improvement and unit upgrades. Under-market rents across the board.',
      sourceId: 'src_crexi', sourceUrl: 'https://crexi.com/listing/milwaukee-wi-1', daysOnMarket: 18,
    },
    {
      address: '2450 Market St', city: 'Denver', state: 'CO', zip: '80205',
      assetType: AssetType.MULTI_5_PLUS, units: 19, yearBuilt: 1992, sqFt: 17000,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 3700000, grossMonthlyRent: 36480, currentMonthlyRent: 34656, occupancyRate: 95,
      description: 'RiNo Denver 19-unit. Premium finishes. Stabilized but priced aggressively.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/denver-co-1', daysOnMarket: 25,
    },
    {
      address: '112 Congress Ave', city: 'Austin', state: 'TX', zip: '78701',
      assetType: AssetType.SFR, units: 1, yearBuilt: 2005, sqFt: 2200, bedrooms: 4, bathrooms: 3,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 580000, grossMonthlyRent: 3800, currentMonthlyRent: 3500, occupancyRate: 95,
      description: 'Austin SFR in East Austin. Strong rental demand. Below market at current rent.',
      sourceId: 'src_mls', daysOnMarket: 12,
    },
    {
      address: '800 N Rampart St', city: 'New Orleans', state: 'LA', zip: '70116',
      assetType: AssetType.MULTI_20_30, units: 27, yearBuilt: 1958, sqFt: 23800,
      dealType: DealType.OFF_MARKET, status: DealStatus.UNDER_CONTRACT,
      askingPrice: 2600000, grossMonthlyRent: 35100, currentMonthlyRent: 31239, occupancyRate: 89,
      description: 'Off-market NOLA 27-unit. Mixed unit sizes. Some deferred maintenance on plumbing. Strong tourism-driven rental demand. Renovation upside.',
      sourceId: 'src_offmkt', daysOnMarket: 0,
    },
    {
      address: '980 Nicollet Mall', city: 'Minneapolis', state: 'MN', zip: '55403',
      assetType: AssetType.MULTI_20_30, units: 26, yearBuilt: 1981, sqFt: 23200,
      dealType: DealType.ON_MARKET, status: DealStatus.REVIEWING,
      askingPrice: 3300000, grossMonthlyRent: 39000, currentMonthlyRent: 34320, occupancyRate: 88,
      description: 'Downtown Minneapolis 26-unit. Several units need renovation. Value-add play — can add $175/mo per upgraded unit.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/mpls-mn-1', daysOnMarket: 50,
    },
    {
      address: '1022 S 3rd St', city: 'Louisville', state: 'KY', zip: '40203',
      assetType: AssetType.MULTI_5_PLUS, units: 12, yearBuilt: 1965, sqFt: 10500,
      dealType: DealType.ON_MARKET, status: DealStatus.NEW,
      askingPrice: 1100000, grossMonthlyRent: 14400, currentMonthlyRent: 11952, occupancyRate: 83,
      description: '12-unit in Shelby Park. Under-market rents. Affordable price point. Value-add via cosmetic upgrades.',
      sourceId: 'src_loopnet', sourceUrl: 'https://loopnet.com/listing/louisville-ky-1', daysOnMarket: 57,
    },
    {
      address: '400 Rhode Island Ave NW', city: 'Washington', state: 'DC', zip: '20001',
      assetType: AssetType.MULTI_20_30, units: 23, yearBuilt: 1948, sqFt: 20500,
      dealType: DealType.OFF_MARKET, status: DealStatus.REVIEWING,
      askingPrice: 5500000, grossMonthlyRent: 53820, currentMonthlyRent: 52206, occupancyRate: 97,
      description: 'Off-market DC 23-unit fully occupied. Below-market rents. Ownership consolidation sale. No broker.',
      sourceId: 'src_offmkt', daysOnMarket: 0,
    },
  ]

  console.log('Creating deals with underwriting...')
  for (const raw of rawDeals) {
    const uw = computeUnderwriting({
      purchasePrice: raw.askingPrice,
      grossMonthlyRent: raw.grossMonthlyRent,
      units: raw.units,
      interestRate: defaultUW.interestRate,
      maxLtv: defaultUW.maxLtv,
      termYears: defaultUW.termYears,
      expenseRatio: raw.dealType === DealType.AUCTION ? 45 : defaultUW.expenseRatio,
      vacancyRate: defaultUW.vacancyRate,
      rentGrowthRate: defaultUW.rentGrowthRate,
    })

    const scoreInputs = {
      dscr: uw.dscr,
      ltvUsed: uw.ltv,
      capRate: uw.capRate,
      description: raw.description,
      pricePerUnit: uw.pricePerUnit,
      units: raw.units,
      occupancyRate: raw.occupancyRate,
      hasRentData: true,
      hasSqFt: !!raw.sqFt,
      hasYearBuilt: !!raw.yearBuilt,
    }

    const { score, breakdown } = computeBankabilityScore(scoreInputs)

    const dedupeHash = buildDedupeHash(raw.address, raw.city, raw.state, raw.units)

    await prisma.deal.upsert({
      where: { dedupeHash },
      update: { bankabilityScore: score, scoreBreakdown: JSON.parse(JSON.stringify(breakdown)) },
      create: {
        address: raw.address,
        city: raw.city,
        state: raw.state,
        zip: raw.zip,
        assetType: raw.assetType,
        units: raw.units,
        yearBuilt: raw.yearBuilt,
        sqFt: raw.sqFt,
        bedrooms: raw.bedrooms,
        bathrooms: raw.bathrooms,
        dealType: raw.dealType,
        status: raw.status,
        askingPrice: BigInt(Math.round(raw.askingPrice * 100)),
        grossMonthlyRent: BigInt(Math.round(raw.grossMonthlyRent * 100)),
        currentMonthlyRent: BigInt(Math.round(raw.currentMonthlyRent * 100)),
        occupancyRate: raw.occupancyRate,
        vacancyRate: defaultUW.vacancyRate,
        expenseRatio: raw.dealType === DealType.AUCTION ? 45 : defaultUW.expenseRatio,
        rentGrowthRate: defaultUW.rentGrowthRate,
        description: raw.description,
        sourceId: raw.sourceId,
        sourceUrl: raw.sourceUrl,
        daysOnMarket: raw.daysOnMarket,
        loanAmount: uw.loanAmount !== null ? BigInt(Math.round(uw.loanAmount)) : null,
        monthlyPayment: uw.monthlyPayment !== null ? BigInt(Math.round(uw.monthlyPayment)) : null,
        annualDebtService: uw.annualDebtService !== null ? BigInt(Math.round(uw.annualDebtService)) : null,
        noi: uw.noi !== null ? BigInt(Math.round(uw.noi)) : null,
        capRate: uw.capRate,
        dscr: uw.dscr,
        cashOnCash: uw.cashOnCash,
        equityRequired: uw.equityRequired !== null ? BigInt(Math.round(uw.equityRequired)) : null,
        pricePerUnit: uw.pricePerUnit !== null ? BigInt(Math.round(uw.pricePerUnit)) : null,
        projection: JSON.parse(JSON.stringify(uw.projection)),
        bankabilityScore: score,
        scoreBreakdown: JSON.parse(JSON.stringify(breakdown)),
        dedupeHash,
      },
    })
  }

  console.log('✅ Seed complete!')
  console.log('   Admin: luca@lsfinance.com')
  console.log('   Analyst: analyst@lsfinance.com')
  console.log(`   Deals: ${rawDeals.length} created`)
  console.log('   Loans: 4 active (existing GA portfolio)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
