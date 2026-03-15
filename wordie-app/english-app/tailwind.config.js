/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        cream: {
          50:  '#FDFAF4',
          100: '#FAF7F0',
          200: '#F5EDD8',
          300: '#EDE0C4',
          400: '#E0CDA8',
          500: '#C8A87A',
        },
        warm: {
          400: '#D4956A',
          500: '#C07848',
          600: '#A86035',
        },
        sage: {
          400: '#90B898',
          500: '#7BAE83',
        },
        rose: {
          soft: '#E8A097',
        },
        ink: {
          DEFAULT: '#2C2416',
          light: '#7A6952',
          lighter: '#A89880',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 16px rgba(44, 36, 22, 0.08)',
        'medium': '0 4px 24px rgba(44, 36, 22, 0.12)',
        'warm': '0 4px 20px rgba(200, 120, 72, 0.18)',
      },
      animation: {
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shake': 'shake 0.4s cubic-bezier(.36,.07,.19,.97)',
        'pulse-once': 'pulseOnce 0.6s ease',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        bounceIn: {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to:   { transform: 'scale(1)',   opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        pulseOnce: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
