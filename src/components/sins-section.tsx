import type { Sin } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 500

/** One sin row: press and hold to log (or un-log), same interaction as habit
 *  cards but with the destructive red treatment - these are confessions, not goals. */
function SinRow({
  sin,
  logged,
  onToggle,
}: {
  sin: Sin
  logged: boolean
  onToggle: (logged: boolean) => void
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loggedRef = useRef(logged)
  loggedRef.current = logged

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
      onToggle(!loggedRef.current)
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
        'habit-card flex w-full items-center justify-between rounded-xl border border-transparent bg-card px-4 py-3 text-left transition-all outline-none focus-visible:border-ring',
        holding && 'holding scale-[0.99]',
        logged && 'done border-destructive/60 bg-destructive/10',
      )}
      style={
        { '--hold-ms': `${HOLD_MS}ms`, '--hold-color': 'var(--destructive)' } as React.CSSProperties
      }
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-pressed={logged}
    >
      <span className="hold-fill" aria-hidden />
      <span className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>
          {sin.emoji}
        </span>
        <span className={cn('font-medium', logged && 'text-destructive')}>{sin.name}</span>
      </span>
      {logged && (
        <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

/**
 * Collapsed-by-default section for logging negative events (alcohol, late
 * eating, late caffeine). Sins never count toward day completion or the streak;
 * they exist so the data is honest and the coach can see patterns.
 */
export function SinsSection({
  sins,
  logged,
  onToggle,
}: {
  sins: Sin[]
  logged: Set<string>
  onToggle: (sinId: string, logged: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const count = logged.size

  return (
    <section className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Sins
          </span>
          {count > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-2">
          {sins.map((s) => (
            <SinRow
              key={s.id}
              sin={s}
              logged={logged.has(s.id)}
              onToggle={(v) => onToggle(s.id, v)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
