import { openDB } from 'idb'
import client from '../api/client.js'

const DB_NAME = 'smart-attendance-offline'
const STORE_NAME = 'pending-attendance'

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true })
      }
    },
  })
}

export async function queueAttendanceTick(record) {
  const db = await getDb()
  await db.add(STORE_NAME, { ...record, queuedAt: new Date().toISOString() })
}

export async function getQueuedCount() {
  const db = await getDb()
  return db.count(STORE_NAME)
}

export async function getQueuedRecords() {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function clearSyncedRecords(localIds) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await Promise.all(localIds.map((id) => tx.store.delete(id)))
  await tx.done
}

/**
 * Flushes everything queued while the device was offline. Called on
 * 'online' events and on a periodic timer as a safety net.
 */
export async function flushQueue() {
  const records = await getQueuedRecords()
  if (records.length === 0) {
    return { attempted: 0, accepted: 0 }
  }

  const payload = records.map((record) => ({
    session_id: record.sessionId,
    student_id: record.studentId,
    confidence_score: record.confidenceScore,
    captured_at: record.capturedAt,
  }))

  const { data } = await client.post('/sync/attendance', { records: payload })
  await clearSyncedRecords(records.map((r) => r.localId))
  return { attempted: records.length, accepted: data.accepted_count }
}
