/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:         '#0A1A0F',   // deep forest dark
        surface:    '#122010',   // dark green surface
        border:     '#1E3A20',   // green border
        accent:     '#22C55E',   // bright eco green
        secondary:  '#4ADE80',   // lighter green
        warning:    '#FACC15',   // amber warning
        danger:     '#F87171',   // soft red
        hotspot:    '#FB923C',   // orange hotspot
        water:      '#38BDF8',   // sky blue for water
        eco:        '#86EFAC',   // pale green
        muted:      '#6B8E72',   // muted green-grey
        primary:    '#E8F5EA',   // near-white green tint
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'leaf-float': 'leafFloat 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        leafFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
