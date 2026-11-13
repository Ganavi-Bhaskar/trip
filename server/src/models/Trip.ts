export interface TripFields {
  _id: string
  name: string
  destination: string
  startDate: Date
  endDate: Date
  currency: string
  coverImage: string
  quote: string
  organizer: string
  invitationCode?: string
  invitationActive?: boolean
  createdAt: Date
  updatedAt: Date
}
