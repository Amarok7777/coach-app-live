/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        md: {
          primary:                 'var(--md-primary)',
          'on-primary':            'var(--md-on-primary)',
          'primary-container':     'var(--md-primary-container)',
          'on-primary-container':  'var(--md-on-primary-container)',
          secondary:               'var(--md-secondary)',
          'secondary-container':   'var(--md-secondary-container)',
          surface:                 'var(--md-surface)',
          'surface-variant':       'var(--md-surface-variant)',
          'on-surface':            'var(--md-on-surface)',
          'on-surface-variant':    'var(--md-on-surface-variant)',
          outline:                 'var(--md-outline)',
          'outline-variant':       'var(--md-outline-variant)',
          error:                   'var(--md-error)',
          'error-container':       'var(--md-error-container)',
          'on-error':              'var(--md-on-error)',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '28px',
      },
      boxShadow: {
        el1: '0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
        el2: '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
        el3: '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.3)',
      }
    }
  },
  plugins: [],
}
