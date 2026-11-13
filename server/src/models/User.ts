export interface UserFields {
  _id: string
  name: string
  email: string
  password?: string
  avatar: string
  isGuest: boolean
  preferences: { currency: string; notifications: boolean; theme: 'light' | 'dark' | 'system' }
  createdAt: Date
  updatedAt: Date
}
