import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, Scale } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Morning weigh-in card. Not a hold-to-complete habit - it's a number entry that
 * saves on blur or Enter. Logged state mirrors the habit cards' green treatment.
 */
export function WeightCard({
  weightLbs,
  onSave,
}: {
  weightLbs: number | null
  onSave: (lbs: number) => void
}) {
  const [value, setValue] = useState(weightLbs?.toString() ?? '')
  useEffect(() => setValue(weightLbs?.toString() ?? ''), [weightLbs])

  const save = () => {
    const lbs = Number.parseFloat(value)
    if (Number.isFinite(lbs) && lbs > 0 && lbs !== weightLbs) onSave(Math.round(lbs * 10) / 10)
  }

  const logged = weightLbs !== null
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-start gap-3 rounded-xl border border-transparent bg-card p-4',
        logged && 'border-success/60 bg-success/10',
      )}
    >
      <span className="flex w-full items-start justify-between">
        <Scale className="size-8 text-accent" aria-hidden />
        {logged && (
          <span className="flex size-6 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
      </span>
      <div className="mt-auto w-full">
        <span className={cn('block text-lg leading-snug font-semibold', logged && 'text-success')}>
          Morning weigh-in
        </span>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="lbs"
            // text-base (16px) on mobile or iOS Safari zooms the page on focus
            className="h-9 w-24 text-base md:text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label="Body weight in pounds"
          />
          <span className="text-sm text-muted-foreground">lbs</span>
        </div>
      </div>
    </div>
  )
}
