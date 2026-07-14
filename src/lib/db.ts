import { createClient } from '@libsql/client/web'

// Force the HTTP transport (vs. the default websocket) - simpler and more
// reliable for a low-traffic browser client than holding a persistent socket.
const httpUrl = import.meta.env.VITE_TURSO_DB_URL.replace(/^libsql:/, 'https:')

export const db = createClient({
  url: httpUrl,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
})

// The positive daily habits, ordered by importance to the goals (sleep and diet
// are the two biggest levers for the cut + testosterone). Morning weigh-in is
// handled by the dedicated weight card, not a habit row. Seeded with INSERT OR
// IGNORE so edits made later in the DB survive restarts.
const SEED_HABITS: Array<[id: string, emoji: string, name: string, subtitle: string]> = [
  ['sleep', '😴', 'Sleep 7-9 hours', 'cool, dark room'],
  ['bedtime', '🛏️', 'Bed + wake on time', 'consistent sleep and wake times'],
  ['diet', '🍽️', 'Followed diet', '2,250 kcal · 170 g protein'],
  ['exercise', '🏋️', 'Exercise', 'per plan - on rest days, check = full rest taken'],
  ['steps', '👟', '8,000+ steps', 'including rest days'],
  ['supplements', '💊', 'Supplements', 'creatine, D3/K2, magnesium, zinc, fish oil'],
  ['meditate', '🧘', 'Meditate', '10+ minutes, any style'],
  ['sunlight', '☀️', 'Morning sunlight', '10 min within an hour of waking'],
]

// Negative events logged after the fact, not goals to check off. Sins never
// count toward day completion or streaks - they are data for the coach.
const SEED_SINS: Array<[id: string, emoji: string, name: string]> = [
  ['alcohol', '🍺', 'Drank alcohol'],
  ['ate-late', '🌙', 'Ate late'],
  ['late-caffeine', '☕', 'Caffeine after noon'],
]

const SEED_SETTINGS: Array<[key: string, value: string]> = [['next_dexa_date', '2026-10-14']]

// Habit ids that older deployed bundles seeded and may re-insert (a stale
// client's INSERT OR IGNORE resurrects them after a DB reset). Deleted on every
// startup so the current seed list always wins. Add to this when a habit is
// removed or renamed to a new id.
const RETIRED_HABIT_IDS = ['protein', 'calories', 'caffeine', 'alcohol', 'kitchen']

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
        db.execute(
          `CREATE TABLE IF NOT EXISTS sins (
            id TEXT PRIMARY KEY,
            emoji TEXT NOT NULL,
            name TEXT NOT NULL,
            sort INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
        ),
        db.execute(
          `CREATE TABLE IF NOT EXISTS sin_logs (
            date TEXT NOT NULL,
            sin_id TEXT NOT NULL,
            logged_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (date, sin_id)
          )`,
        ),
        db.execute(
          `CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )`,
        ),
      ])
      const retiredIn = RETIRED_HABIT_IDS.map(() => '?').join(', ')
      await db.batch(
        [
          { sql: `DELETE FROM habits WHERE id IN (${retiredIn})`, args: RETIRED_HABIT_IDS },
          {
            sql: `DELETE FROM habit_logs WHERE habit_id IN (${retiredIn})`,
            args: RETIRED_HABIT_IDS,
          },
          ...SEED_HABITS.map(([id, emoji, name, subtitle], i) => ({
            sql: 'INSERT OR IGNORE INTO habits (id, emoji, name, subtitle, sort) VALUES (?, ?, ?, ?, ?)',
            args: [id, emoji, name, subtitle, i] as (string | number)[],
          })),
          ...SEED_SINS.map(([id, emoji, name], i) => ({
            sql: 'INSERT OR IGNORE INTO sins (id, emoji, name, sort) VALUES (?, ?, ?, ?)',
            args: [id, emoji, name, i] as (string | number)[],
          })),
          ...SEED_SETTINGS.map(([key, value]) => ({
            sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
            args: [key, value] as (string | number)[],
          })),
        ],
        'write',
      )
    })()
  }
  return schemaReady
}
