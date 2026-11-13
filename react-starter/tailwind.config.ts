import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        palette: {
          background: '#FFFFFF',
          sidebar: '#214AC6',
          primary: '#3364E1',
          secondary: '#6091E6',
          surface: '#FFFFFF',
          section: '#F2F6FF',
          heading: '#292D38',
          icon: '#4378E4',
          accent: '#A58AE8',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'DM Sans', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 36px rgba(41, 45, 56, .055), 0 2px 8px rgba(41, 45, 56, .035)',
      },
      borderRadius: {
        card: '14px',
      },
      transitionProperty: {
        width: 'width',
      },
      screens: {
        tablet: '640px',
        desktop: '1024px',
      },
    },
  },
  plugins: [],
} satisfies Config;
