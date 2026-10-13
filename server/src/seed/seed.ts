import bcrypt from 'bcryptjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db'
import { Activity } from '../models/Activity'
import { Expense } from '../models/Expense'
import { Membership } from '../models/Membership'
import { Photo } from '../models/Photo'
import { Settlement } from '../models/Settlement'
import { Trip } from '../models/Trip'
import { User } from '../models/User'
import { regeneratePendingSettlements } from '../services/settlementService'
import { computeShares } from '../services/splitService'

const uploadRoot = path.resolve(process.cwd(), 'uploads')
function avatarSvg(name: string, background: string, accent: string): string {
  const initials = name.split(' ').map((part) => part[0]).join('').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${background}"/><circle cx="64" cy="47" r="25" fill="#f1c5a8"/><path d="M36 49c1-34 53-43 59-4-12-4-18-13-23-22-6 14-19 22-36 26Z" fill="${accent}"/><path d="M24 126c3-34 20-48 40-48s37 14 40 48" fill="${accent}"/><circle cx="55" cy="49" r="2" fill="#514466"/><circle cx="74" cy="49" r="2" fill="#514466"/><path d="M58 61c4 4 8 4 12 0" fill="none" stroke="#c36c78" stroke-width="3" stroke-linecap="round"/><text x="64" y="117" fill="#fff" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle">${initials}</text></svg>`
}

function coverSvg(primary: string, secondary: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="930" cy="142" r="70" fill="#ffe49d" opacity=".85"/><path d="M0 420 235 185l240 235 205-185 265 205 255-175v435H0z" fill="#fff" opacity=".38"/><path d="M0 510c270-50 450 30 700-10 210-33 360 4 500-30v230H0z" fill="#65b9c5" opacity=".74"/><path d="M0 585c250-25 490 42 740 0s330-18 460-38v153H0z" fill="#f6d4c4" opacity=".84"/><text x="65" y="615" fill="#fff" font-family="sans-serif" font-size="34" font-weight="700" letter-spacing="5">${label}</text></svg>`
}

function photoSvg(color: string, caption: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 520"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#e9dffc"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><rect width="700" height="520" fill="url(#g)"/><circle cx="545" cy="110" r="48" fill="#ffe5a3"/><path d="m0 300 155-118 150 123 117-91 278 141v165H0z" fill="#809eb5" opacity=".83"/><path d="M0 342c160-18 310 24 439 3 99-16 178-6 261 4v171H0z" fill="#67b8c2"/><path d="M0 441c178-40 322 12 475 28 94 10 158-1 225-19v70H0z" fill="#f6d8ca"/><text x="32" y="478" fill="#fff" font-family="sans-serif" font-size="23" font-weight="700">${caption}</text></svg>`
}

async function saveSvg(bucket: 'avatars' | 'covers' | 'photos', filename: string, svg: string): Promise<string> {
  const directory = path.join(uploadRoot, bucket)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), svg, 'utf8')
  return `/uploads/${bucket}/${filename}`
}

async function seed(): Promise<void> {
  await connectDatabase()
  const passwordHash = await bcrypt.hash('Password123!', 12)
  await Promise.all([User.deleteMany({}), Trip.deleteMany({}), Membership.deleteMany({}), Activity.deleteMany({}), Expense.deleteMany({}), Settlement.deleteMany({}), Photo.deleteMany({})])

  const [ganavi, aisha, riya] = await User.create([
    { name: 'Ganavi', email: 'ganavi@tripsplit.dev', password: passwordHash, avatar: await saveSvg('avatars', 'ganavi.svg', avatarSvg('Ganavi', '#d9ecff', '#6e83b8')), preferences: { currency: 'INR', notifications: true, theme: 'light' } },
    { name: 'Aisha', email: 'aisha@tripsplit.dev', password: passwordHash, avatar: await saveSvg('avatars', 'aisha.svg', avatarSvg('Aisha', '#ffe0e9', '#a66486')), preferences: { currency: 'INR', notifications: true, theme: 'light' } },
    { name: 'Riya', email: 'riya@tripsplit.dev', password: passwordHash, avatar: await saveSvg('avatars', 'riya.svg', avatarSvg('Riya', '#ddf2e6', '#628a76')), preferences: { currency: 'INR', notifications: true, theme: 'light' } },
  ])
  if (!ganavi || !aisha || !riya) throw new Error('Failed to create seed users.')
  const baliCover = await saveSvg('covers', 'bali.svg', coverSvg('#9dcbe1', '#d6bbdc', 'BALI BESTIES'))
  const goaCover = await saveSvg('covers', 'goa.svg', coverSvg('#efb9a8', '#d9cf91', 'GOA WEEKEND'))
  const [bali, goa] = await Trip.create([
    { name: 'Bali Besties', destination: 'Bali, Indonesia', startDate: new Date('2026-10-10T00:00:00.000Z'), endDate: new Date('2026-10-14T00:00:00.000Z'), currency: 'INR', quote: 'Good company makes every place beautiful', coverImage: baliCover, organizer: ganavi._id },
    { name: 'Goa Weekend', destination: 'North Goa, India', startDate: new Date('2026-12-04T00:00:00.000Z'), endDate: new Date('2026-12-06T00:00:00.000Z'), currency: 'INR', quote: 'Salt in our hair, stories everywhere', coverImage: goaCover, organizer: ganavi._id },
  ])
  if (!bali || !goa) throw new Error('Failed to create seed trips.')
  await Membership.create([
    { trip: bali._id, user: ganavi._id, role: 'organizer', preferences: ['Explorer', 'Foodie', 'Photographer'] },
    { trip: bali._id, user: aisha._id, role: 'member', preferences: ['Planner', 'Adventure Lover'] },
    { trip: bali._id, user: riya._id, role: 'member', preferences: ['Nature Lover', 'Chill Vibes'] },
    { trip: goa._id, user: ganavi._id, role: 'organizer', preferences: ['Explorer', 'Foodie'] },
    { trip: goa._id, user: aisha._id, role: 'member', preferences: ['Beach lover'] },
    { trip: goa._id, user: riya._id, role: 'member', preferences: ['Photographer'] },
  ])

  const activityRows = [
    [1, 'Airport → Hotel', '10:00', 'Ngurah Rai International Airport', 'transport', 'plane'],
    [1, 'Lunch at Warung Made', '13:00', 'Kuta', 'food', 'utensils'],
    [1, 'Beach Visit', '17:00', 'Seminyak Beach', 'sightseeing', 'sun'],
    [1, 'Dinner', '20:00', 'La Plancha', 'food', 'cloche'],
    [2, 'Temple morning at Tanah Lot', '08:30', 'Tabanan', 'sightseeing', 'sun'],
    [2, 'Lunch at Local Cafe', '12:30', 'Canggu', 'food', 'utensils'],
    [2, 'Snorkeling afternoon', '15:00', 'Blue Lagoon', 'activity', 'ticket'],
    [3, 'Ubud market stroll', '09:00', 'Ubud Art Market', 'shopping', 'bag'],
    [3, 'Rice terrace walk', '11:30', 'Tegallalang', 'sightseeing', 'sun'],
    [3, 'Balinese cooking class', '16:00', 'Ubud', 'activity', 'cloche'],
    [4, 'Slow spa morning', '10:00', 'Ubud', 'stay', 'sun'],
    [4, 'Waterfall picnic', '13:30', 'Tibumana Waterfall', 'activity', 'sun'],
    [4, 'Sunset seafood dinner', '18:30', 'Jimbaran Bay', 'food', 'cloche'],
    [5, 'Coffee and last market', '09:00', 'Seminyak', 'food', 'utensils'],
    [5, 'Farewell beach walk', '11:00', 'Kuta Beach', 'sightseeing', 'sun'],
    [5, 'Airport transfer', '14:00', 'Ngurah Rai International Airport', 'transport', 'plane'],
  ] as const
  await Activity.create(activityRows.map(([day, title, time, location, category, icon]) => ({ trip: bali._id, day, title, time, location, category, icon, createdBy: ganavi._id })))

  const equalParticipants = [ganavi._id, aisha._id, riya._id]
  const baliExpenseRows = [
    ['Dinner at La Plancha', 450000, 'food', aisha._id, 1],
    ['Taxi (Airport)', 90000, 'transport', ganavi._id, 1],
    ['Hotel (3 nights)', 1200000, 'stay', riya._id, 1],
    ['Lunch at Local Cafe', 120000, 'food', ganavi._id, 2],
    ['Activities', 240000, 'activities', aisha._id, 2],
    ['Beach activities', 60000, 'activities', aisha._id, 3],
  ] as const
  const createExpense = (tripId: typeof bali._id, description: string, amount: number, category: 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'other', paidBy: typeof ganavi._id, date: Date, splitType: 'equal' | 'custom' | 'percentage' | 'exact' = 'equal', participants: typeof equalParticipants = equalParticipants, customSplits: Array<{ user: typeof ganavi._id; value: number }> = []) => ({
    trip: tripId, description, amount, currency: 'INR', exchangeRate: 1, amountInTripCurrency: amount, category, paidBy, date, splitType, participants, customSplits,
    computedShares: computeShares(amount, splitType, participants.map(String), customSplits.map((split) => ({ user: String(split.user), value: split.value }))),
    createdBy: paidBy,
  })
  const baliExpenses = baliExpenseRows.map(([description, amount, category, paidBy, day]) => createExpense(bali._id, description, amount, category, paidBy, new Date(Date.UTC(2026, 9, 9 + day)), 'equal'))
  await Expense.create(baliExpenses)
  await regeneratePendingSettlements(String(bali._id))

  const goaExpenses = [
    createExpense(goa._id, 'Beach shack dinner', 180000, 'food', aisha._id, new Date('2026-12-04T00:00:00.000Z'), 'percentage', equalParticipants, [{ user: ganavi._id, value: 5000 }, { user: aisha._id, value: 3000 }, { user: riya._id, value: 2000 }]),
    createExpense(goa._id, 'Scooter rental', 90000, 'transport', ganavi._id, new Date('2026-12-05T00:00:00.000Z'), 'exact', equalParticipants, [{ user: ganavi._id, value: 30000 }, { user: aisha._id, value: 30000 }, { user: riya._id, value: 30000 }]),
    createExpense(goa._id, 'Sunset cruise', 150000, 'activities', riya._id, new Date('2026-12-05T00:00:00.000Z'), 'custom', equalParticipants, [{ user: ganavi._id, value: 1 }, { user: aisha._id, value: 2 }, { user: riya._id, value: 2 }]),
  ]
  await Expense.create(goaExpenses)
  await regeneratePendingSettlements(String(goa._id))

  const samplePhotos = [
    ['Morning in Bali', '#91cfd0', 1, ganavi._id], ['Seminyak sunset', '#efa3b4', 1, aisha._id], ['Ubud green', '#90b994', 3, riya._id], ['Our little table', '#d5a6b8', 2, ganavi._id], ['Last beach walk', '#76b8cf', 5, aisha._id],
  ] as const
  const photos = await Promise.all(samplePhotos.map(async ([caption, tint, day, uploadedBy], index) => ({
    trip: bali._id,
    uploadedBy,
    imageUrl: await saveSvg('photos', `bali-memory-${index + 1}.svg`, photoSvg(tint, caption)),
    caption,
    date: new Date(Date.UTC(2026, 9, 9 + day)),
    day,
  })))
  await Photo.create(photos)

  console.log('TripSplit seed complete. Login credentials for all users: Password123!')
  console.log('Ganavi: ganavi@tripsplit.dev')
  console.log('Aisha: aisha@tripsplit.dev')
  console.log('Riya: riya@tripsplit.dev')
  await mongoose.disconnect()
}

void seed().catch(async (error: unknown) => {
  console.error('Seed failed:', error)
  await mongoose.disconnect().catch(() => undefined)
  process.exitCode = 1
})
