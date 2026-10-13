export interface User {
  id: string
  name: string
  email: string
  avatar: string
  isGuest: boolean
  preferences: { currency: string; notifications: boolean; theme: 'light' | 'dark' | 'system' }
}

export interface Trip {
  _id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  currency: string
  coverImage: string
  quote: string
  organizer: User | string
  invitationCode?: string
  invitationActive?: boolean
}

export interface Member {
  _id: string
  user: User
  role: 'organizer' | 'member'
  preferences: string[]
  joinedAt: string
}

export interface Traveler {
  _id: string
  user: User
  role: 'organizer' | 'member'
  preferences: string[]
  joinedAt: string
}

export interface Activity {
  _id: string
  trip: string
  day: number
  title: string
  description: string
  time: string
  location: string
  category: string
  icon: string
  image: string
}

export interface Expense {
  _id: string
  trip: string
  description: string
  amount: number
  currency: string
  exchangeRate?: number
  amountInTripCurrency: number
  category: 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'other'
  paidBy: User
  date: string
  splitType: 'equal' | 'custom' | 'percentage' | 'exact'
  participants: User[]
  customSplits: Array<{ user: User | string; value: number }>
  computedShares: Array<{ user: User | string; amount: number }>
  createdBy?: User | string
}

export interface Photo {
  _id: string
  imageUrl: string
  caption: string
  date: string
  day?: number
  uploadedBy: User
}

export interface Balance {
  currency: string
  totalExpenses: number
  balances: Array<{ user: User; paid: number; owes: number; net: number; status: 'gets back' | 'owes' | 'settled' }>
  suggestedSettlements: Array<{ id: string; from: User; to: User; amount: number; status: 'pending' }>
  settlements: Array<{ _id: string; id: string; from: User; to: User; amount: number; status: 'pending' | 'settled'; settledAt?: string }>
}

export interface TripStats {
  totalExpenses: number
  activityCount: number
  travelerCount: number
  daysCompleted: number
  totalDays: number
  upcomingActivities: Activity[]
  spendingByCategory: Array<{ category: string; total: number }>
}