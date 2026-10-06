import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74',
          400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C',
          800: '#9A3412', 900: '#7C2D12',
        },
        rose: {
          50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF',
          400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C',
          800: '#9F1239', 900: '#881337',
        },
        ink: '#2B2118',
        surface: '#FFFBF7',
      },
      boxShadow: {
        card: '0 2px 12px rgba(249, 115, 22, 0.12)',
        'card-lg': '0 8px 30px rgba(249, 115, 22, 0.18)',
      },
      borderRadius: { card: '16px', thumb: '20px' },
    },
  },
  plugins: [],
}
export default config
