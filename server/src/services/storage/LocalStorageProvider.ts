import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { FileStorageBucket } from '../../types/storage'
import type { StorageFile, StorageProvider } from './StorageProvider'

const extensionByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadRoot = path.resolve(process.cwd(), 'uploads')

  async save(file: StorageFile, bucket: FileStorageBucket): Promise<string> {
    const extension = extensionByMime[file.mimetype]
    if (!extension) throw new Error('Unsupported image format.')
    const folder = path.join(this.uploadRoot, bucket)
    await mkdir(folder, { recursive: true })
    const filename = `${randomUUID()}${extension}`
    await writeFile(path.join(folder, filename), file.buffer, { flag: 'wx' })
    return `/uploads/${bucket}/${filename}`
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith('/uploads/')) return
    const resolved = path.resolve(this.uploadRoot, url.slice('/uploads/'.length))
    if (!resolved.startsWith(`${this.uploadRoot}${path.sep}`)) return
    await unlink(resolved).catch((error: unknown) => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return
      throw error
    })
  }
}