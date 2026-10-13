declare global {
  namespace Express {
    interface Request {
      authUserId?: string
      tripRole?: 'organizer' | 'member'
    }
  }
}

export {}