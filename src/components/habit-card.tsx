import type { Habit } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 650

/**
 * 75-Hard-style habit card: press and hold to toggle. A fill rises from the
 * bottom during the hold (see .habit-card rules in index.css); releasing early
 * cancels. Completed cards get a green ring and a check badge, and hold-to-undo
 * works the same way in reverse.
 */
export function HabitCard({
  habit,
  done,
  onToggle,
}: {
  habit: Habit
  done: boolean
  onToggle: (done: boolean) => void
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref instead of state so pointer handlers always see the current value.
  const doneRef = useRef(done)
  doneRef.current = done

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const start = () => {
    if (timer.current) clearTimeout(timer.current)
    setHolding(true)
    timer.current = setTimeout(() => {
      setHolding(false)
      if (navigator.vibrate) navigator.vibrate(50)
      onToggle(!doneRef.current)
    }, HOLD_MS)
  }
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }

  return (
    <button
      type="button"
      className={cn(
        'habit-card flex min-h-40 flex-col items-start gap-3 rounded-xl bg-card p-4 text-left transition-all outline-none',
        'border border-transparent focus-visible:border-ring',
        holding && 'holding scale-[0.98]',
        done && 'done border-success/60 bg-success/10',
      )}
      style={{ '--hold-ms': `${HOLD_MS}ms` } as React.CSSProperties}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-pressed={done}
    >
      <span className="hold-fill" aria-hidden />
      <span className="flex w-full items-start justify-between">
        <span className="text-3xl" aria-hidden>
          {habit.emoji}
        </span>
        {done && (
          <span className="flex size-6 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="mt-auto">
        <span className={cn('block text-lg leading-snug font-semibold', done && 'text-success')}>
          {habit.name}
        </span>
        {habit.subtitle && (
          <span className="mt-0.5 block text-sm text-muted-foreground">{habit.subtitle}</span>
        )}
      </span>
    </button>
  )
}
