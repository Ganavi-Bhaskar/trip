import type { FileStorageBucket } from '../../types/storage'

export interface StorageFile {
  buffer: Buffer
  mimetype: string
}

export interface StorageProvider {
  save(file: StorageFile, bucket: FileStorageBucket): Promise<string>
  delete(url: string): Promise<void>
}