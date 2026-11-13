import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { getDb, emailDocumentId } from '../config/firebase'
import { normalizeExtendedJson } from './mongoExportFormat'

const targetProjectId = 'tripsplit-a75e7'
const collections = [
  { source: 'users', target: 'users' },
  { source: 'trips', target: 'trips' },
  { source: 'memberships', target: 'travelers' },
  { source: 'activities', target: 'activities' },
  { source: 'expenses', target: 'expenses' },
  { source: 'settlements', target: 'settlements' },
  { source: 'photos', target: 'photos' },
] as const

type JsonRecord = Record<string, unknown>
type MigrationCount = {
  source: number
  inserted: number
  alreadyPresent: number
  failed: number
  destination: number
}
type ExportedDocument = { data: JsonRecord; number: number }

function exportCollection(uri: string, collection: string) {
  const child = spawn('mongoexport', [`--uri=${uri}`, `--collection=${collection}`, '--jsonFormat=canonical'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const lines = createInterface({ input: child.stdout })
  child.stderr.resume()
  const completion = new Promise<void>((resolve, reject) => {
    child.once('error', () => reject(new Error('mongoexport could not be started')))
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error('mongoexport failed')))
  })
  return { lines, completion }
}

function isAlreadyPresent(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = error.code
  return code === 6 || code === '6' || code === 'already-exists' || code === 'ALREADY_EXISTS'
}

function logRecordFailure(collection: string, number: number, reason: string): void {
  console.error(`[migration] ${collection} record #${number}: failed (${reason}).`)
}

async function writeChunk(
  target: string,
  records: ExportedDocument[],
  counts: MigrationCount,
): Promise<Set<number>> {
  const database = getDb()
  const persisted = new Set<number>()

  await Promise.all(records.map(async ({ data, number }) => {
    if (typeof data._id !== 'string' || !data._id || data._id.includes('/')) {
      counts.failed += 1
      logRecordFailure(target, number, 'invalid_document_id')
      return
    }

    const { _id: _ignored, ...fields } = data
    try {
      await database.collection(target).doc(data._id).create(fields)
      counts.inserted += 1
      persisted.add(number)
    } catch (error: unknown) {
      if (isAlreadyPresent(error)) {
        counts.alreadyPresent += 1
        persisted.add(number)
      } else {
        counts.failed += 1
        logRecordFailure(target, number, 'firestore_write_failed')
      }
    }
  }))

  return persisted
}

async function addIndexes(
  source: string,
  records: ExportedDocument[],
  counts: MigrationCount,
): Promise<void> {
  const database = getDb()

  await Promise.all(records.map(async ({ data, number }) => {
    try {
      let ref: FirebaseFirestore.DocumentReference | undefined
      let value: JsonRecord | undefined
      if (source === 'users' && typeof data.email === 'string' && typeof data._id === 'string') {
        ref = database.collection('userEmails').doc(emailDocumentId(data.email))
        value = { userId: data._id }
      } else if (source === 'trips' && typeof data.invitationCode === 'string' && typeof data._id === 'string') {
        ref = database.collection('inviteCodes').doc(data.invitationCode.trim().toUpperCase())
        value = { tripId: data._id }
      }
      if (!ref || !value) return
      await ref.create(value)
    } catch (error: unknown) {
      if (!isAlreadyPresent(error)) {
        counts.failed += 1
        logRecordFailure(source, number, 'lookup_write_failed')
      }
    }
  }))
}

async function migrate(): Promise<void> {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI is required.')
  if (process.env.FIREBASE_PROJECT_ID !== targetProjectId) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${targetProjectId}.`)
  }

  const database = getDb()
  await database.collection('users').limit(1).get()
  console.log(`Connected to Firestore project ${targetProjectId}. MongoDB records will only be read.`)
  let totalFailures = 0

  for (const collection of collections) {
    const counts: MigrationCount = { source: 0, inserted: 0, alreadyPresent: 0, failed: 0, destination: 0 }
    const exported = exportCollection(uri, collection.source)
    let chunk: ExportedDocument[] = []

    for await (const line of exported.lines) {
      if (!line.trim()) continue
      counts.source += 1
      const number = counts.source
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        counts.failed += 1
        logRecordFailure(collection.source, number, 'malformed_json_line')
        continue
      }

      let data: unknown
      try {
        data = normalizeExtendedJson(parsed)
      } catch (error: unknown) {
        counts.failed += 1
        const reason = error instanceof Error && (error.message === 'invalid_date' || error.message === 'invalid_number')
          ? error.message
          : 'unsupported_extended_json'
        logRecordFailure(collection.source, number, reason)
        continue
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        counts.failed += 1
        logRecordFailure(collection.source, number, 'invalid_document_shape')
        continue
      }
      chunk.push({ data: data as JsonRecord, number })

      if (chunk.length >= 350) {
        const records = chunk
        chunk = []
        const persisted = await writeChunk(collection.target, records, counts)
        if (collection.source === 'users' || collection.source === 'trips') {
          await addIndexes(collection.source, records.filter((record) => persisted.has(record.number)), counts)
        }
      }
    }

    await exported.completion
    if (chunk.length) {
      const persisted = await writeChunk(collection.target, chunk, counts)
      if (collection.source === 'users' || collection.source === 'trips') {
        await addIndexes(collection.source, chunk.filter((record) => persisted.has(record.number)), counts)
      }
    }

    counts.destination = (await database.collection(collection.target).count().get()).data().count
    totalFailures += counts.failed
    console.log(
      `${collection.source} -> ${collection.target}: source ${counts.source}, destination ${counts.destination}, ` +
      `inserted ${counts.inserted}, already present ${counts.alreadyPresent}, failed ${counts.failed}`,
    )
  }

  if (totalFailures) {
    console.error(`Migration finished with ${totalFailures} failed record(s). See sanitized record logs above.`)
    process.exitCode = 1
  } else {
    console.log('MongoDB to Firestore copy completed. Existing Firestore documents were not overwritten.')
  }
}

void migrate().catch(() => {
  console.error('MongoDB to Firestore migration stopped. Error details were suppressed to protect sensitive data.')
  process.exitCode = 1
})
