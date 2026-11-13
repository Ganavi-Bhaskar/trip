export interface MembershipFields {
  _id: string
  user: string
  trip: string
  role: 'organizer' | 'member'
  preferences: string[]
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}
