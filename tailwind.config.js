/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ── Marca institucional (azul CACSB, ramp vivo) ───────────────── */
        brand: {
          50:  '#eef5ff',
          100: '#d9e8ff',
          200: '#b8d4ff',
          300: '#8ab8ff',
          400: '#5593f5',
          500: '#2f6fe4',
          600: '#1f56c4',
          700: '#1a4fa0',   // azul institucional actual
          800: '#16468e',
          900: '#0d2d6b',
          950: '#081c45',
        },
        /* ── Acento turquesa (secundario vistoso) ──────────────────────── */
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        /* ── Superficies neumórficas ───────────────────────────────────── */
        neu: {
          base:   '#e9eef7',
          raised: '#eff3fa',
          light:  '#ffffff',
          dark:   '#c8d4e6',
          deep:   '#0f356f',   // base neumórfica sobre fondo oscuro
        },
      },
      boxShadow: {
        /* Relieve (elementos que "salen" de la superficie) */
        'neu-xs':     '3px 3px 6px #cdd8ea, -3px -3px 6px #ffffff',
        'neu-sm':     '5px 5px 11px #cbd7e9, -5px -5px 11px #ffffff',
        'neu':        '8px 8px 17px #c8d4e6, -8px -8px 17px #ffffff',
        'neu-lg':     '14px 14px 28px #c3cfe2, -14px -14px 28px #ffffff',
        'neu-hover':  '11px 11px 22px #c5d1e4, -11px -11px 22px #ffffff',
        /* Hundido (inputs, tracks, estados activos) */
        'neu-in-xs':  'inset 2px 2px 4px #cdd8ea, inset -2px -2px 4px #ffffff',
        'neu-in':     'inset 4px 4px 9px #c9d5e7, inset -4px -4px 9px #ffffff',
        'neu-in-lg':  'inset 7px 7px 14px #c6d2e5, inset -7px -7px 14px #ffffff',
        /* Sobre superficies oscuras (sidebar / login) */
        'neu-dark':    '7px 7px 15px #0a2450, -7px -7px 15px #16468e',
        'neu-dark-in': 'inset 5px 5px 11px #0a2450, inset -5px -5px 11px #1a4fa0',
        /* Realce de color para botones primarios */
        'brand-glow':  '0 6px 18px -4px rgba(31,86,196,0.55)',
        'accent-glow': '0 6px 18px -4px rgba(6,182,212,0.5)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #1f56c4 0%, #1a4fa0 55%, #0d2d6b 100%)',
        'accent-gradient': 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
        'neu-surface':     'linear-gradient(145deg, #f3f6fc 0%, #e3eaf5 100%)',
        'neu-page':        'linear-gradient(160deg, #eef2f9 0%, #e5ecf7 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
