export interface PhotoFields {
  _id: string
  trip: string
  uploadedBy: string
  imageUrl: string
  caption: string
  date: Date
  day?: number
  activity?: string
  createdAt: Date
  updatedAt: Date
}
