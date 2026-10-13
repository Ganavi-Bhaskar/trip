import { LocalStorageProvider } from './LocalStorageProvider'
import { VercelBlobStorageProvider } from './VercelBlobStorageProvider'

export const storageProvider = process.env.VERCEL === '1'
  ? new VercelBlobStorageProvider()
  : new LocalStorageProvider()