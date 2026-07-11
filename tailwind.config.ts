import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          green: '#166534',
          emerald: '#22c55e',
          yellow: '#facc15',
        },
        neon: {
          green: '#22c55e',
          emerald: '#10b981',
          cyan: '#22d3ee',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'stadium': "url('/stadium.jpg')",
        'grid-fade':
          "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
        'pitch-lines':
          "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.03) 39px,rgba(255,255,255,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.03) 39px,rgba(255,255,255,0.03) 40px)",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2.8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradientShift 8s ease infinite',
        'shimmer': 'shimmer 1.4s ease infinite',
        'aurora': 'aurora 18s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
        aurora: {
          '0%,100%': { transform: 'translate(0,0) rotate(0deg)' },
          '33%': { transform: 'translate(3%,-3%) rotate(2deg)' },
          '66%': { transform: 'translate(-3%,2%) rotate(-2deg)' },
        },
      },
      boxShadow: {
        'card': '0 8px 30px -12px rgba(0,0,0,0.6)',
        'glow-green': '0 0 0 1px rgba(34,197,94,0.4), 0 8px 28px -6px rgba(34,197,94,0.45)',
        'glow-indigo': '0 0 0 1px rgba(99,102,241,0.4), 0 8px 28px -6px rgba(99,102,241,0.45)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,0.4), 0 8px 28px -6px rgba(34,211,238,0.45)',
        'glow-amber': '0 0 0 1px rgba(245,158,11,0.4), 0 8px 28px -6px rgba(245,158,11,0.45)',
      },
    },
  },
  plugins: [],
}
export default config
