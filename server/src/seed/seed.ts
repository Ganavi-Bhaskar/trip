import bcrypt from 'bcryptjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getDb, emailDocumentId, membershipId } from '../config/firebase'
import { connectDatabase } from '../config/db'
import { regeneratePendingSettlements } from '../services/settlementService'
import { computeShares } from '../services/splitService'
import type { SplitInput, SplitType } from '../services/splitService'

const uploadRoot = path.resolve(process.cwd(), 'uploads')
const seedUsers = [
  { id: 'seed-ganavi', name: 'Ganavi', email: 'ganavi@tripsplit.dev', color: '#d9ecff', accent: '#6e83b8' },
  { id: 'seed-aisha', name: 'Aisha', email: 'aisha@tripsplit.dev', color: '#ffe0e9', accent: '#a66486' },
  { id: 'seed-riya', name: 'Riya', email: 'riya@tripsplit.dev', color: '#ddf2e6', accent: '#628a76' },
] as const

function avatarSvg(name: string, background: string, accent: string): string {
  const initials = name.split(' ').map((part) => part[0]).join('').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${background}"/><circle cx="64" cy="47" r="25" fill="#f1c5a8"/><path d="M36 49c1-34 53-43 59-4-12-4-18-13-23-22-6 14-19 22-36 26Z" fill="${accent}"/><path d="M24 126c3-34 20-48 40-48s37 14 40 48" fill="${accent}"/><text x="64" y="117" fill="#fff" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle">${initials}</text></svg>`
}

function coverSvg(primary: string, secondary: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="930" cy="142" r="70" fill="#ffe49d" opacity=".85"/><path d="M0 420 235 185l240 235 205-185 265 205 255-175v435H0z" fill="#fff" opacity=".38"/><path d="M0 510c270-50 450 30 700-10 210-33 360 4 500-30v230H0z" fill="#65b9c5" opacity=".74"/><text x="65" y="615" fill="#fff" font-family="sans-serif" font-size="34" font-weight="700" letter-spacing="5">${label}</text></svg>`
}

async function saveSvg(bucket: 'avatars' | 'covers' | 'photos', filename: string, svg: string): Promise<string> {
  const directory = path.join(uploadRoot, bucket)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), svg, 'utf8')
  return `/uploads/${bucket}/${filename}`
}

async function put(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  const now = new Date()
  await getDb().collection(collection).doc(id).set({ ...data, createdAt: now, updatedAt: now }, { merge: true })
}

async function seed(): Promise<void> {
  await connectDatabase()
  const password = await bcrypt.hash('Password123!', 12)
  const avatars = await Promise.all(seedUsers.map((user) => saveSvg('avatars', `${user.id}.svg`, avatarSvg(user.name, user.color, user.accent))))
  for (const [index, user] of seedUsers.entries()) {
    await put('users', user.id, {
      name: user.name, email: user.email, password, avatar: avatars[index] ?? '', isGuest: false,
      preferences: { currency: 'INR', notifications: true, theme: 'light' },
    })
    const emailRef = getDb().collection('userEmails').doc(emailDocumentId(user.email))
    await getDb().runTransaction(async (transaction) => {
      const existing = await transaction.get(emailRef)
      const existingUserId = existing.data()?.userId
      if (existing.exists && existingUserId !== user.id) throw new Error(`Seed email ${user.email} is already assigned to another account; refusing to replace its email index.`)
      if (!existing.exists) transaction.create(emailRef, { userId: user.id })
    })
  }

  const baliCover = await saveSvg('covers', 'bali.svg', coverSvg('#9dcbe1', '#d6bbdc', 'BALI BESTIES'))
  const goaCover = await saveSvg('covers', 'goa.svg', coverSvg('#efb9a8', '#d9cf91', 'GOA WEEKEND'))
  const trips = [
    { id: 'seed-bali', name: 'Bali Besties', destination: 'Bali, Indonesia', startDate: new Date('2026-10-10T00:00:00.000Z'), endDate: new Date('2026-10-14T00:00:00.000Z'), currency: 'INR', quote: 'Good company makes every place beautiful', coverImage: baliCover, organizer: 'seed-ganavi', invitationCode: 'BAL123' },
    { id: 'seed-goa', name: 'Goa Weekend', destination: 'North Goa, India', startDate: new Date('2026-12-04T00:00:00.000Z'), endDate: new Date('2026-12-06T00:00:00.000Z'), currency: 'INR', quote: 'Salt in our hair, stories everywhere', coverImage: goaCover, organizer: 'seed-ganavi', invitationCode: 'GOA123' },
  ]
  for (const trip of trips) {
    const invitationRef = getDb().collection('inviteCodes').doc(trip.invitationCode)
    await getDb().runTransaction(async (transaction) => {
      const existing = await transaction.get(invitationRef)
      const existingTripId = existing.data()?.tripId
      if (existing.exists && existingTripId !== trip.id) throw new Error(`Seed invitation code ${trip.invitationCode} is already in use; refusing to replace it.`)
      if (!existing.exists) transaction.create(invitationRef, { tripId: trip.id })
    })
    await put('trips', trip.id, { ...trip, invitationActive: true })
    for (const [index, user] of seedUsers.entries()) {
      const id = membershipId(trip.id, user.id)
      await put('travelers', id, {
        trip: trip.id, user: user.id, role: index === 0 ? 'organizer' : 'member',
        preferences: index === 0 ? ['Explorer', 'Foodie'] : index === 1 ? ['Planner', 'Adventure Lover'] : ['Nature Lover', 'Photographer'],
        joinedAt: new Date(),
      })
    }
  }

  const activities = [
    ['Airport → Hotel', '10:00', 'Ngurah Rai International Airport', 'transport'],
    ['Lunch at Warung Made', '13:00', 'Kuta', 'food'],
    ['Beach Visit', '17:00', 'Seminyak Beach', 'sightseeing'],
    ['Dinner', '20:00', 'La Plancha', 'food'],
    ['Temple morning at Tanah Lot', '08:30', 'Tabanan', 'sightseeing'],
    ['Lunch at Local Cafe', '12:30', 'Canggu', 'food'],
    ['Snorkeling afternoon', '15:00', 'Blue Lagoon', 'activity'],
    ['Ubud market stroll', '09:00', 'Ubud Art Market', 'shopping'],
    ['Rice terrace walk', '11:30', 'Tegallalang', 'sightseeing'],
    ['Balinese cooking class', '16:00', 'Ubud', 'activity'],
    ['Slow spa morning', '10:00', 'Ubud', 'stay'],
    ['Waterfall picnic', '13:30', 'Tibumana Waterfall', 'activity'],
    ['Sunset seafood dinner', '18:30', 'Jimbaran Bay', 'food'],
    ['Coffee and last market', '09:00', 'Seminyak', 'food'],
    ['Farewell beach walk', '11:00', 'Kuta Beach', 'sightseeing'],
    ['Airport transfer', '14:00', 'Ngurah Rai International Airport', 'transport'],
  ] as const
  for (const [index, [title, time, location, category]] of activities.entries()) {
    const day = index < 4 ? 1 : index < 7 ? 2 : index < 10 ? 3 : index < 13 ? 4 : 5
    await put('activities', `seed-bali-activity-${index + 1}`, {
      trip: 'seed-bali', day, title, time, location, category, description: '', icon: '', image: '', createdBy: 'seed-ganavi',
    })
  }

  const participants = seedUsers.map((user) => user.id)
  const examples = [
    { trip: 'seed-bali', description: 'Dinner at La Plancha', amount: 450000, category: 'food', paidBy: 'seed-aisha', date: new Date('2026-10-10'), splitType: 'equal', customSplits: [] },
    { trip: 'seed-bali', description: 'Taxi (Airport)', amount: 90000, category: 'transport', paidBy: 'seed-ganavi', date: new Date('2026-10-10'), splitType: 'equal', customSplits: [] },
    { trip: 'seed-bali', description: 'Hotel (3 nights)', amount: 1200000, category: 'stay', paidBy: 'seed-riya', date: new Date('2026-10-11'), splitType: 'equal', customSplits: [] },
    { trip: 'seed-bali', description: 'Lunch at Local Cafe', amount: 120000, category: 'food', paidBy: 'seed-ganavi', date: new Date('2026-10-11'), splitType: 'equal', customSplits: [] },
    { trip: 'seed-bali', description: 'Activities', amount: 240000, category: 'activities', paidBy: 'seed-aisha', date: new Date('2026-10-11'), splitType: 'equal', customSplits: [] },
    { trip: 'seed-bali', description: 'Beach activities', amount: 60000, category: 'activities', paidBy: 'seed-aisha', date: new Date('2026-10-12'), splitType: 'equal', customSplits: [] },
    { trip: 'seed-goa', description: 'Beach shack dinner', amount: 180000, category: 'food', paidBy: 'seed-aisha', date: new Date('2026-12-04'), splitType: 'percentage', customSplits: [{ user: 'seed-ganavi', value: 5000 }, { user: 'seed-aisha', value: 3000 }, { user: 'seed-riya', value: 2000 }] },
    { trip: 'seed-goa', description: 'Scooter rental', amount: 90000, category: 'transport', paidBy: 'seed-ganavi', date: new Date('2026-12-05'), splitType: 'exact', customSplits: [{ user: 'seed-ganavi', value: 30000 }, { user: 'seed-aisha', value: 30000 }, { user: 'seed-riya', value: 30000 }] },
    { trip: 'seed-goa', description: 'Sunset cruise', amount: 150000, category: 'activities', paidBy: 'seed-riya', date: new Date('2026-12-05'), splitType: 'custom', customSplits: [{ user: 'seed-ganavi', value: 1 }, { user: 'seed-aisha', value: 2 }, { user: 'seed-riya', value: 2 }] },
  ] as const
  for (const [index, expense] of examples.entries()) {
    await put('expenses', `seed-expense-${index + 1}`, {
      ...expense, currency: 'INR', exchangeRate: 1, amountInTripCurrency: expense.amount, participants,
      computedShares: computeShares(expense.amount, expense.splitType as SplitType, participants, [...expense.customSplits] as SplitInput[]),
      createdBy: expense.paidBy,
    })
  }
  for (const trip of trips) await regeneratePendingSettlements(trip.id)

  const photos = [
    ['Morning in Bali', '#91cfd0', 1, 'seed-ganavi'],
    ['Seminyak sunset', '#efa3b4', 1, 'seed-aisha'],
    ['Ubud green', '#90b994', 3, 'seed-riya'],
    ['Our little table', '#d5a6b8', 2, 'seed-ganavi'],
    ['Last beach walk', '#76b8cf', 5, 'seed-aisha'],
  ] as const
  for (const [index, [caption, tint, day, uploadedBy]] of photos.entries()) {
    const imageUrl = await saveSvg('photos', `seed-bali-memory-${index + 1}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 520"><rect width="700" height="520" fill="${tint}"/><text x="32" y="478" fill="#fff" font-size="23">${caption}</text></svg>`)
    await put('photos', `seed-photo-${index + 1}`, { trip: 'seed-bali', uploadedBy, imageUrl, caption, date: new Date(Date.UTC(2026, 9, 9 + day)), day })
  }
  console.log('TripSplit Firestore seed complete. Sample accounts use password Password123!.')
  console.log('Ganavi: ganavi@tripsplit.dev; Aisha: aisha@tripsplit.dev; Riya: riya@tripsplit.dev')
}

void seed().catch((error: unknown) => {
  console.error('Firestore seed failed:', error)
  process.exitCode = 1
})
