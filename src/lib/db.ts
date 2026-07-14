import { createClient } from '@libsql/client/web'

// Force the HTTP transport (vs. the default websocket) - simpler and more
// reliable for a low-traffic browser client than holding a persistent socket.
const httpUrl = import.meta.env.VITE_TURSO_DB_URL.replace(/^libsql:/, 'https:')

export const db = createClient({
  url: httpUrl,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
})

// The 12 daily habits from plan/plan.md section 6. Morning weigh-in is handled by
// the dedicated weight card, not a habit row. Seeded with INSERT OR IGNORE so
// renames/edits made later in the DB are never clobbered on startup.
const SEED_HABITS: Array<[id: string, emoji: string, name: string, subtitle: string]> = [
  ['sleep', '😴', 'Sleep 7-9 hours', 'consistent bedtime, cool dark room'],
  ['meditate', '🧘', 'Meditate', '10+ minutes, any style'],
  ['exercise', '🏋️', 'Exercise', 'per plan - on rest days, check = full rest taken'],
  ['steps', '👟', '8,000+ steps', 'including rest days'],
  ['protein', '🥩', 'Hit protein', '170 g or more'],
  ['calories', '🔥', 'Within calories', 'about 2,250 kcal'],
  ['supplements', '💊', 'Creatine + supplements', 'creatine, D3/K2, magnesium, zinc, fish oil'],
  ['sunlight', '☀️', 'Morning sunlight', '10 min within an hour of waking'],
  ['caffeine', '☕', 'No caffeine after noon', 'protects sleep quality'],
  ['alcohol', '🚫', 'No alcohol', 'default zero'],
  ['kitchen', '🌙', 'Kitchen closed', 'no food 2-3 hours before bed'],
]

let schemaReady: Promise<void> | null = null

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY,
          emoji TEXT NOT NULL,
          name TEXT NOT NULL,
          subtitle TEXT,
          sort INTEGER NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      )
      await Promise.all([
        db.execute(
          `CREATE TABLE IF NOT EXISTS habit_logs (
            date TEXT NOT NULL,
            habit_id TEXT NOT NULL,
            completed_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (date, habit_id)
          )`,
        ),
        db.execute(
          `CREATE TABLE IF NOT EXISTS weights (
            date TEXT PRIMARY KEY,
            lbs REAL NOT NULL,
            logged_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
        ),
      ])
      await db.batch(
        SEED_HABITS.map(([id, emoji, name, subtitle], i) => ({
          sql: 'INSERT OR IGNORE INTO habits (id, emoji, name, subtitle, sort) VALUES (?, ?, ?, ?, ?)',
          args: [id, emoji, name, subtitle, i],
        })),
        'write',
      )
    })()
  }
  return schemaReady
}
