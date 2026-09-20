import { openDB } from 'idb'

const DB_NAME = 'smart-attendance-roster-cache'
const STORE_NAME = 'session-roster'

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' })
      }
    },
  })
}

export async function cacheRoster(sessionId, roster) {
  const db = await getDb()
  await db.put(STORE_NAME, { sessionId, roster, cachedAt: new Date().toISOString() })
}

export async function getCachedRoster(sessionId) {
  const db = await getDb()
  const entry = await db.get(STORE_NAME, sessionId)
  return entry?.roster || []
}
