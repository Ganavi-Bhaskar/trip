import 'dotenv/config'
import { createHash } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp, type DocumentData, type DocumentSnapshot, type Firestore, type QuerySnapshot } from 'firebase-admin/firestore'

let firestore: Firestore | undefined

export function getDb(): Firestore {
  if (firestore) return firestore
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required.')
  }

  const app = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  })
  firestore = getFirestore(app)
  return firestore
}

export function fromSnapshot<T extends DocumentData>(snapshot: DocumentSnapshot<DocumentData>): (T & { _id: string }) | null {
  return snapshot.exists ? { ...normalize(snapshot.data()) as T, _id: snapshot.id } : null
}

export function fromQuery<T extends DocumentData>(snapshot: QuerySnapshot<DocumentData>): Array<T & { _id: string }> {
  return snapshot.docs.map((document) => ({ ...normalize(document.data()) as T, _id: document.id }))
}

export function membershipId(tripId: string, userId: string): string {
  return createHash('sha256').update(`${tripId}\0${userId}`).digest('hex')
}

export function emailDocumentId(email: string): string {
  return Buffer.from(email.trim().toLowerCase()).toString('base64url')
}

function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
  }
  return value
}
