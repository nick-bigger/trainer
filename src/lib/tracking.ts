import { addDays, dayKey } from '@/lib/dates'
import { db, ensureSchema } from '@/lib/db'

export type Habit = {
  id: string
  emoji: string
  name: string
  subtitle: string | null
}

export type Sin = {
  id: string
  emoji: string
  name: string
}

export type DayData = {
  habits: Habit[]
  completed: Set<string>
  weightLbs: number | null
  sins: Sin[]
  sinsLogged: Set<string>
  nextDexaDate: string | null
}

export async function loadDay(date: string): Promise<DayData> {
  await ensureSchema()
  const [habits, logs, weight, sins, sinLogs, nextDexa] = await Promise.all([
    db.execute('SELECT id, emoji, name, subtitle FROM habits WHERE active = 1 ORDER BY sort'),
    db.execute({ sql: 'SELECT habit_id FROM habit_logs WHERE date = ?', args: [date] }),
    db.execute({ sql: 'SELECT lbs FROM weights WHERE date = ?', args: [date] }),
    db.execute('SELECT id, emoji, name FROM sins WHERE active = 1 ORDER BY sort'),
    db.execute({ sql: 'SELECT sin_id FROM sin_logs WHERE date = ?', args: [date] }),
    db.execute("SELECT value FROM settings WHERE key = 'next_dexa_date'"),
  ])
  return {
    habits: habits.rows.map((r) => ({
      id: r.id as string,
      emoji: r.emoji as string,
      name: r.name as string,
      subtitle: r.subtitle as string | null,
    })),
    completed: new Set(logs.rows.map((r) => r.habit_id as string)),
    weightLbs: weight.rows.length ? (weight.rows[0].lbs as number) : null,
    sins: sins.rows.map((r) => ({
      id: r.id as string,
      emoji: r.emoji as string,
      name: r.name as string,
    })),
    sinsLogged: new Set(sinLogs.rows.map((r) => r.sin_id as string)),
    nextDexaDate: nextDexa.rows.length ? (nextDexa.rows[0].value as string) : null,
  }
}

export async function setSinLogged(date: string, sinId: string, logged: boolean): Promise<void> {
  await ensureSchema()
  if (logged) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO sin_logs (date, sin_id) VALUES (?, ?)',
      args: [date, sinId],
    })
  } else {
    await db.execute({
      sql: 'DELETE FROM sin_logs WHERE date = ? AND sin_id = ?',
      args: [date, sinId],
    })
  }
}

export async function setHabitDone(date: string, habitId: string, done: boolean): Promise<void> {
  await ensureSchema()
  if (done) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO habit_logs (date, habit_id) VALUES (?, ?)',
      args: [date, habitId],
    })
  } else {
    await db.execute({
      sql: 'DELETE FROM habit_logs WHERE date = ? AND habit_id = ?',
      args: [date, habitId],
    })
  }
}

export async function saveWeight(date: string, lbs: number): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `INSERT INTO weights (date, lbs) VALUES (?, ?)
          ON CONFLICT(date) DO UPDATE SET lbs = excluded.lbs, logged_at = datetime('now')`,
    args: [date, lbs],
  })
}

export type DaySummary = {
  date: string
  done: number
  total: number
  complete: boolean
  weightLbs: number | null
  sins: number
}

/** Per-day completion for the trailing `days` window, newest first. */
export async function loadHistory(days: number): Promise<DaySummary[]> {
  await ensureSchema()
  const since = addDays(dayKey(), -(days - 1))
  const [habitCount, logs, weights, sinLogs] = await Promise.all([
    db.execute('SELECT COUNT(*) AS n FROM habits WHERE active = 1'),
    db.execute({
      sql: 'SELECT date, COUNT(*) AS n FROM habit_logs WHERE date >= ? GROUP BY date',
      args: [since],
    }),
    db.execute({ sql: 'SELECT date, lbs FROM weights WHERE date >= ?', args: [since] }),
    db.execute({
      sql: 'SELECT date, COUNT(*) AS n FROM sin_logs WHERE date >= ? GROUP BY date',
      args: [since],
    }),
  ])
  const total = Number(habitCount.rows[0].n)
  const doneByDate = new Map(logs.rows.map((r) => [r.date as string, Number(r.n)]))
  const weightByDate = new Map(weights.rows.map((r) => [r.date as string, r.lbs as number]))
  const sinsByDate = new Map(sinLogs.rows.map((r) => [r.date as string, Number(r.n)]))

  const out: DaySummary[] = []
  for (let d = dayKey(), i = 0; i < days; d = addDays(d, -1), i++) {
    const done = doneByDate.get(d) ?? 0
    const weightLbs = weightByDate.get(d) ?? null
    out.push({
      date: d,
      done,
      total,
      // A complete day = every active habit checked AND the morning weigh-in
      // logged - the same bar the Today page's celebration uses.
      complete: total > 0 && done >= total && weightLbs !== null,
      weightLbs,
      sins: sinsByDate.get(d) ?? 0,
    })
  }
  return out
}

/**
 * Current streak of fully-complete days. Today only counts once complete, so an
 * in-progress morning doesn't read as a broken streak.
 */
export function currentStreak(history: DaySummary[]): number {
  let streak = 0
  for (let i = 0; i < history.length; i++) {
    if (history[i].complete) streak++
    else if (i === 0)
      continue // today, still in progress
    else break
  }
  return streak
}

/** The challenge-day number shown in the header: streak so far, counting today. */
export function dayNumber(history: DaySummary[]): number {
  const streak = currentStreak(history)
  return history.length > 0 && history[0].complete ? streak : streak + 1
}
