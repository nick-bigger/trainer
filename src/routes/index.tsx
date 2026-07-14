import { Celebration } from '@/components/celebration'
import { HabitCard } from '@/components/habit-card'
import { SinsSection } from '@/components/sins-section'
import { WeightCard } from '@/components/weight-card'
import { addDays, dayKey, parseDayKey } from '@/lib/dates'
import {
  currentStreak,
  dayNumber,
  loadDay,
  loadHistory,
  saveWeight,
  setHabitDone,
  setSinLogged,
} from '@/lib/tracking'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { differenceInCalendarDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, ScanLine } from 'lucide-react'
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

function DexaBanner({ nextDexaDate }: { nextDexaDate: string }) {
  const days = differenceInCalendarDays(parseDayKey(nextDexaDate), new Date())
  if (days < 0) return null
  return (
    <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
      <ScanLine className="size-4 text-accent" />
      <span>
        Next DEXA scan{' '}
        <span className="font-semibold text-foreground">
          {format(parseDayKey(nextDexaDate), 'MMM d')}
        </span>{' '}
        · {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}
      </span>
    </div>
  )
}

function TodayPage() {
  const { date, day, history } = Route.useLoaderData()
  const router = useRouter()
  const [celebrating, setCelebrating] = useState(false)

  const isToday = date === dayKey()
  const streak = currentStreak(history)
  const displayDay = dayNumber(history)

  // Sins never count toward completion - only habits and the weigh-in do.
  const totalCards = day.habits.length + 1
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

  const toggleSin = async (sinId: string, logged: boolean) => {
    await setSinLogged(date, sinId, logged)
    await router.invalidate()
  }

  return (
    <main className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[var(--bottom-nav-clearance)]">
      <header className="mb-4 text-center">
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

      {day.nextDexaDate && <DexaBanner nextDexaDate={day.nextDexaDate} />}

      <div className="grid grid-cols-2 gap-3">
        <WeightCard weightLbs={day.weightLbs} onSave={logWeight} />
        {day.habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            done={day.completed.has(h.id)}
            onToggle={(done) => toggle(h.id, done)}
          />
        ))}
      </div>

      <SinsSection sins={day.sins} logged={day.sinsLogged} onToggle={toggleSin} />

      <p className="mt-4 mb-2 text-center text-xs text-muted-foreground">
        press and hold a card to check it off
      </p>

      {celebrating && (
        <Celebration dayNumber={displayDay} onDismiss={() => setCelebrating(false)} />
      )}
    </main>
  )
}
