export interface SettlementFields {
  _id: string
  trip: string
  from: string
  to: string
  amount: number
  status: 'pending' | 'settled'
  settledAt?: Date
  settledBy?: string
  createdAt: Date
  updatedAt: Date
}
