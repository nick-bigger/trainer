import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { trackingDb } from './db.ts'

function text(s: string) {
  return { content: [{ type: 'text' as const, text: s }] }
}

const getTrackingSummary = tool(
  'get_tracking_summary',
  'Read the daily tracking database: habit definitions, per-day habit completion, and morning weigh-ins for the trailing N days. Use this at the start of a conversation to ground advice in what Nick actually did.',
  { days: z.number().int().min(1).max(365).describe('How many trailing days to fetch') },
  async ({ days }) => {
    const db = trackingDb()
    const [habits, logs, weights] = await Promise.all([
      db.execute('SELECT id, name, subtitle, active FROM habits ORDER BY sort'),
      db.execute({
        sql: `SELECT date, habit_id FROM habit_logs WHERE date >= date('now', 'localtime', ?) ORDER BY date DESC`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT date, lbs FROM weights WHERE date >= date('now', 'localtime', ?) ORDER BY date DESC`,
        args: [`-${days} days`],
      }),
    ])
    const byDate = new Map<string, string[]>()
    for (const r of logs.rows) {
      const d = r.date as string
      byDate.set(d, [...(byDate.get(d) ?? []), r.habit_id as string])
    }
    const activeCount = habits.rows.filter((h) => Number(h.active) === 1).length
    const dayLines = [...byDate.entries()].map(
      ([d, ids]) => `${d}: ${ids.length}/${activeCount} (${ids.join(', ')})`,
    )
    return text(
      [
        `HABITS (${activeCount} active):`,
        ...habits.rows.map((h) => `- ${h.id}: ${h.name}${h.subtitle ? ` (${h.subtitle})` : ''}`),
        '',
        `DAILY COMPLETION, last ${days} days (days with zero completions are omitted):`,
        ...(dayLines.length ? dayLines : ['(none logged)']),
        '',
        'WEIGH-INS:',
        ...(weights.rows.length
          ? weights.rows.map((w) => `${w.date}: ${w.lbs} lbs`)
          : ['(none logged)']),
      ].join('\n'),
    )
  },
)

const queryTrackingDb = tool(
  'query_tracking_db',
  `Run a read-only SELECT against the tracking database for anything get_tracking_summary does not cover.
Schema:
  habits(id TEXT PK, emoji TEXT, name TEXT, subtitle TEXT, sort INT, active INT, created_at TEXT)
  habit_logs(date TEXT 'YYYY-MM-DD', habit_id TEXT, completed_at TEXT, PK(date, habit_id))
  weights(date TEXT PK 'YYYY-MM-DD', lbs REAL, logged_at TEXT)`,
  { sql: z.string().describe('A single SELECT (or WITH ... SELECT) statement') },
  async ({ sql }) => {
    const trimmed = sql.trim().replace(/;\s*$/, '')
    if (!/^(select|with)\b/i.test(trimmed) || trimmed.includes(';')) {
      return text('Rejected: only a single read-only SELECT/WITH statement is allowed.')
    }
    const result = await trackingDb().execute(trimmed)
    const rows = result.rows.map((r) => JSON.stringify(r))
    return text(rows.length ? rows.join('\n') : '(no rows)')
  },
)

export const trainerTools = createSdkMcpServer({
  name: 'trainer',
  version: '1.0.0',
  tools: [getTrackingSummary, queryTrackingDb],
})

export const TRAINER_TOOL_NAMES = [
  'mcp__trainer__get_tracking_summary',
  'mcp__trainer__query_tracking_db',
]
