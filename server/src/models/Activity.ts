export interface ActivityFields {
  _id: string
  trip: string
  day: number
  title: string
  description: string
  time: string
  location: string
  category: 'transport' | 'food' | 'stay' | 'activity' | 'sightseeing' | 'shopping' | 'other'
  icon: string
  image: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
