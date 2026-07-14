import { Celebration } from '@/components/celebration'
import { HabitCard } from '@/components/habit-card'
import { WeightCard } from '@/components/weight-card'
import { addDays, dayKey, parseDayKey } from '@/lib/dates'
import {
  currentStreak,
  dayNumber,
  loadDay,
  loadHistory,
  saveWeight,
  setHabitDone,
} from '@/lib/tracking'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { useState } from 'react'

// STREAK_WINDOW caps how far back the streak can count; a year is plenty.
const STREAK_WINDOW = 365

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
  loaderDeps: ({ search }) => ({ date: search.date ?? dayKey() }),
  loader: async ({ deps }) => {
    const [day, history] = await Promise.all([loadDay(deps.date), loadHistory(STREAK_WINDOW)])
    return { date: deps.date, day, history }
  },
  component: TodayPage,
})

function TodayPage() {
  const { date, day, history } = Route.useLoaderData()
  const router = useRouter()
  const [celebrating, setCelebrating] = useState(false)

  const isToday = date === dayKey()
  const streak = currentStreak(history)
  const displayDay = dayNumber(history)

  const totalCards = day.habits.length + 1 // +1 for the weigh-in card
  const completedCards = day.completed.size + (day.weightLbs !== null ? 1 : 0)

  const toggle = async (habitId: string, done: boolean) => {
    const before = day.completed.size + (day.weightLbs !== null ? 1 : 0)
    await setHabitDone(date, habitId, done)
    await router.invalidate()
    if (done && before === totalCards - 1) setCelebrating(true)
  }

  const logWeight = async (lbs: number) => {
    const hadWeight = day.weightLbs !== null
    const before = day.completed.size + (hadWeight ? 1 : 0)
    await saveWeight(date, lbs)
    await router.invalidate()
    if (!hadWeight && before === totalCards - 1) setCelebrating(true)
  }

  return (
    <main className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[var(--bottom-nav-clearance)]">
      <header className="mb-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.navigate({ to: '/', search: { date: addDays(date, -1) } })}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div>
            <h1 className="day-title text-5xl">
              {isToday ? `Day ${displayDay}` : format(parseDayKey(date), 'MMM d')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(parseDayKey(date), 'EEE, MMM d')}
              {completedCards === totalCards ? ' · complete' : ` · ${completedCards}/${totalCards}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.navigate({ to: '/', search: { date: addDays(date, 1) } })}
            disabled={isToday}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
        {streak > 1 && (
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            <Flame className="size-4" /> {streak} day streak
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        {day.habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            done={day.completed.has(h.id)}
            onToggle={(done) => toggle(h.id, done)}
          />
        ))}
        <WeightCard weightLbs={day.weightLbs} onSave={logWeight} />
      </div>

      <p className="mt-4 mb-2 text-center text-xs text-muted-foreground">
        press and hold a card to check it off
      </p>

      {celebrating && (
        <Celebration dayNumber={displayDay} onDismiss={() => setCelebrating(false)} />
      )}
    </main>
  )
}
