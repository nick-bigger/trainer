const CONFETTI_COLORS = ['#4f8ef7', '#46c07a', '#f5b942', '#e5484d', '#b07df7']

const PIECES = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 8) * 90,
  duration: 1100 + ((i * 53) % 900),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

/**
 * Full-screen overlay when every card for the day is checked: confetti rain plus
 * a DAY N COMPLETE badge. Tap anywhere to dismiss. Respects prefers-reduced-motion
 * via the .confetti-piece / .celebration-pop rules in index.css.
 */
export function Celebration({
  dayNumber,
  onDismiss,
}: {
  dayNumber: number
  onDismiss: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onDismiss}
      role="dialog"
      aria-label={`Day ${dayNumber} complete`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
            }}
          />
        ))}
      </div>
      <div className="celebration-pop text-center">
        <div className="day-title text-6xl">Day {dayNumber}</div>
        <div className="day-title mt-1 text-3xl text-success">Complete</div>
        <p className="mt-4 text-sm text-muted-foreground">tap anywhere to keep going</p>
      </div>
    </div>
  )
}
