export interface ExpenseSplit { user: string; value: number }
export interface ExpenseShare { user: string; amount: number }

export interface ExpenseFields {
  _id: string
  trip: string
  description: string
  amount: number
  currency: string
  exchangeRate: number
  amountInTripCurrency: number
  category: 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'other'
  paidBy: string
  date: Date
  splitType: 'equal' | 'custom' | 'percentage' | 'exact'
  participants: string[]
  customSplits: ExpenseSplit[]
  computedShares: ExpenseShare[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
