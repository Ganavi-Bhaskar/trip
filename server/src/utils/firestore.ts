import type { DocumentData, Query } from 'firebase-admin/firestore'
import { emailDocumentId, fromQuery, fromSnapshot, getDb } from '../config/firebase'

export async function getRecord<T extends DocumentData>(collection: string, id: string): Promise<(T & { _id: string }) | null> {
  return fromSnapshot<T>(await getDb().collection(collection).doc(id).get())
}

export async function queryRecords<T extends DocumentData>(query: Query<DocumentData>): Promise<Array<T & { _id: string }>> {
  return fromQuery<T>(await query.get())
}

export async function saveRecord(collection: string, id: string, data: DocumentData): Promise<void> {
  const { _id: _ignored, ...fields } = data
  await getDb().collection(collection).doc(id).set({ ...fields, updatedAt: new Date() }, { merge: true })
}

export async function userByEmail<T extends DocumentData = DocumentData>(email: string) {
  const index = await getRecord<{ userId: string }>('userEmails', emailDocumentId(email))
  return index ? getRecord<T>('users', index.userId) : null
}

export async function userWithId(id: string) {
  const user = await getRecord<{ name: string; email: string; avatar?: string; isGuest?: boolean; preferences?: unknown }>('users', id)
  return user ? { ...user, id: user._id } : null
}

export async function membershipFor(tripId: string, userId: string) {
  const memberships = await queryRecords<{ _id: string; trip: string; user: string; role: 'organizer' | 'member' }>(
    getDb().collection('travelers').where('trip', '==', tripId).where('user', '==', userId).limit(1),
  )
  return memberships[0] ?? null
}
