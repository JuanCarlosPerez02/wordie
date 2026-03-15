import { XP_THRESHOLDS } from '../lib/groq'

export default function XPBar({ xp, level }) {
  const current = XP_THRESHOLDS[level - 1] ?? 0
  const next    = XP_THRESHOLDS[level] ?? Infinity
  const progress = next === Infinity ? 100
    : Math.min(Math.round(((xp - current) / (next - current)) * 100), 100)

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-ink-light mb-1 font-semibold">
        <span>{xp} XP</span>
        {next !== Infinity && <span>Siguiente: {next} XP</span>}
      </div>
      <div className="w-full bg-cream-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full bg-warm-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
