export type FileStorageBucket = 'avatars' | 'covers' | 'photos'

declare global {
  namespace Express {
    interface Request {
      storageBucket?: FileStorageBucket
    }
  }
}

export {}