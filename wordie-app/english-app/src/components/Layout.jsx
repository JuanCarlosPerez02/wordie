import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  {
    to: '/',
    label: 'Inicio',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/study',
    label: 'Estudiar',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        {active && <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />}
      </svg>
    ),
  },
  {
    to: '/reading',
    label: 'Reading',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    to: '/review',
    label: 'Repasar',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        {active && <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>}
      </svg>
    ),
  },
]

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-dvh w-full max-w-lg mx-auto relative">
      {/* Contenido principal */}
      <main className="flex-1 w-full pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto
                      bg-white border-t border-cream-200 safe-bottom z-50">
        <div className="flex items-stretch">
          {navItems.map(({ to, label, icon }) => {
            const isActive = location.pathname === to ||
              (to === '/study'  && location.pathname.startsWith('/study')) ||
              (to === '/reading' && location.pathname.startsWith('/reading')) ||
              (to === '/review'  && location.pathname.startsWith('/review'))
            return (
              <NavLink
                key={to}
                to={to}
                className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-1
                           transition-colors duration-200
                           ${isActive ? 'text-warm-500' : 'text-ink-lighter'}`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2
                                   w-8 h-0.5 bg-warm-500 rounded-full transition-all duration-300" />
                )}
                {icon(isActive)}
                <span className={`text-xs font-semibold ${isActive ? 'text-warm-500' : 'text-ink-lighter'}`}>
                  {label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}