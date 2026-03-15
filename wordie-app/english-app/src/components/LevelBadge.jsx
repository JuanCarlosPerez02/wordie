import { LEVELS } from '../lib/groq'

// SVG icons for each level — no emojis
const LevelIcons = {
  1: ({ color }) => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 22s-8-5.5-8-12a8 8 0 0116 0c0 6.5-8 12-8 12z" />
      <circle cx="12" cy="10" r="2" fill={color} />
    </svg>
  ),
  2: ({ color }) => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 2C6.5 6 4 10 5 15c.7 3 3 5 7 5s6.3-2 7-5c1-5-1.5-9-7-13z" />
    </svg>
  ),
  3: ({ color }) => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 8C8 10 5.9 16.17 3.82 19.54M21 12c-1 4-4 6-9 6s-8-2-9-6m15-8c-3-2-7-2-10 0" />
    </svg>
  ),
  4: ({ color }) => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  5: ({ color }) => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <polygon strokeLinecap="round" strokeLinejoin="round"
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
}

export default function LevelBadge({ level, size = 'md' }) {
  const info = LEVELS[level] || LEVELS[1]
  const Icon = LevelIcons[level] || LevelIcons[1]

  const sizes = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${sizes[size]}`}
      style={{ backgroundColor: `${info.color}22`, color: info.color }}
    >
      <Icon color={info.color} />
      <span>{info.name}</span>
    </span>
  )
}
