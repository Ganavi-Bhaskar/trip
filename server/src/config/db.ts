import { getDb } from './firebase'

export async function connectDatabase(): Promise<void> {
  await getDb().collection('users').limit(1).get()
  console.log('Connected to Firebase Firestore')
}