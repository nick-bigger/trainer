import { dayKey, parseDayKey } from '@/lib/dates'
import { currentStreak, loadHistory, type DaySummary } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Check, Flame } from 'lucide-react'

const WINDOW_DAYS = 30

export const Route = createFileRoute('/history')({
  loader: async () => {
    const history = await loadHistory(365)
    return { history }
  },
  component: HistoryPage,
})

function weightTrend(history: DaySummary[]): { label: string; delta: number } | null {
  const weighed = history.filter((h) => h.weightLbs !== null)
  if (weighed.length < 2) return null
  // Oldest vs newest weigh-in in the window; history is newest-first.
  const newest = weighed[0]
  const oldest = weighed[weighed.length - 1]
  const delta = Math.round((newest.weightLbs! - oldest.weightLbs!) * 10) / 10
  return { label: `${format(parseDayKey(oldest.date), 'MMM d')} to now`, delta }
}

function HistoryPage() {
  const { history } = Route.useLoaderData()
  const streak = currentStreak(history)
  const window = history.slice(0, WINDOW_DAYS)
  const trend = weightTrend(window)
  const completeDays = history.filter((h) => h.complete).length

  return (
    <main className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[var(--bottom-nav-clearance)]">
      <h1 className="day-title mb-4 text-3xl">History</h1>

      <div className="mb-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-card p-3">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-accent">
            <Flame className="size-5" />
            {streak}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">day streak</div>
        </div>
        <div className="rounded-xl bg-card p-3">
          <div className="text-2xl font-bold">{completeDays}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">perfect days</div>
        </div>
        <div className="rounded-xl bg-card p-3">
          <div
            className={cn(
              'text-2xl font-bold',
              trend && trend.delta < 0 ? 'text-success' : 'text-foreground',
            )}
          >
            {trend ? `${trend.delta > 0 ? '+' : ''}${trend.delta}` : '-'}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {trend ? `lbs, ${trend.label}` : 'no weigh-ins yet'}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {window.map((d) => (
          <li key={d.date}>
            <Link
              to="/"
              search={{ date: d.date }}
              className="flex items-center justify-between rounded-xl bg-card px-4 py-3"
            >
              <div>
                <div className="font-semibold">
                  {d.date === dayKey() ? 'Today' : format(parseDayKey(d.date), 'EEE, MMM d')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {d.done}/{d.total} habits
                  {d.weightLbs !== null && ` · ${d.weightLbs} lbs`}
                </div>
              </div>
              {d.complete ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-success text-success-foreground">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              ) : (
                <span
                  className="size-7 rounded-full border-2 border-border"
                  style={{
                    background:
                      d.total > 0
                        ? `conic-gradient(var(--accent) ${(d.done / d.total) * 360}deg, transparent 0deg)`
                        : undefined,
                  }}
                  aria-label={`${d.done} of ${d.total} habits complete`}
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
