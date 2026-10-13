import { del, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'
import type { FileStorageBucket } from '../../types/storage'
import type { StorageFile, StorageProvider } from './StorageProvider'

const extensionByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export class VercelBlobStorageProvider implements StorageProvider {
  async save(file: StorageFile, bucket: FileStorageBucket): Promise<string> {
    const extension = extensionByMime[file.mimetype]
    if (!extension) throw new Error('Unsupported image format.')

    const blob = await put(`${bucket}/${randomUUID()}${extension}`, file.buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.mimetype,
    })
    return blob.url
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith('https://')) return
    await del(url)
  }
}
