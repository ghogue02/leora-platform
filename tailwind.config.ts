import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '.theme-dark'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Leora Core Brand Colors (from blueprint Section 1.3)
        ivory: {
          DEFAULT: '#F9F7F3',
          50: '#FFFFFF',
          100: '#FDFCFA',
          200: '#F9F7F3',
          300: '#F5F2EC',
          400: '#F1EDE5',
          500: '#EDE8DE',
          600: '#E5DFD3',
          700: '#DDD6C8',
          800: '#D5CDBD',
          900: '#CDC4B2',
        },
        ink: {
          DEFAULT: '#0B0B0B',
          50: '#5B6573',
          100: '#4A5260',
          200: '#3A404D',
          300: '#2A2E3A',
          400: '#1A1C27',
          500: '#0B0B0B',
          600: '#080808',
          700: '#050505',
          800: '#030303',
          900: '#000000',
        },
        gold: {
          DEFAULT: '#C8A848',
          50: '#F5F0DC',
          100: '#F0E8C9',
          200: '#E7D9A3',
          300: '#DDCA7D',
          400: '#D4BB57',
          500: '#C8A848',
          600: '#A68A3A',
          700: '#836C2D',
          800: '#614E21',
          900: '#3F3015',
        },
        slate: {
          DEFAULT: '#5B6573',
          50: '#D8DCE1',
          100: '#CDD2D9',
          200: '#B7BEC8',
          300: '#A1AAB7',
          400: '#8B96A6',
          500: '#5B6573',
          600: '#4D5664',
          700: '#3F4755',
          800: '#313846',
          900: '#232937',
        },
        // Support Colors (from blueprint Section 1.3)
        indigo: {
          DEFAULT: '#2F35A0',
          light: '#3D43B7',
        },
        sage: '#7C8C6E',
        clay: '#C8714A',
        sand: '#D7C8B6',
        // Surface Colors
        panel: {
          light: '#FFFFFF',
          dark: '#121212',
        },
        border: {
          DEFAULT: '#E9E5DE',
          light: '#E9E5DE',
          dark: '#2A2A2A',
        },
        // Semantic Colors
        background: {
          DEFAULT: '#F9F7F3',
          light: '#F9F7F3',
          dark: '#0B0B0B',
        },
        foreground: {
          DEFAULT: '#0B0B0B',
          light: '#0B0B0B',
          dark: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F1EDE5',
          light: '#F1EDE5',
          dark: '#1A1C27',
          foreground: {
            DEFAULT: '#5B6573',
            light: '#5B6573',
            dark: '#A1AAB7',
          },
        },
        accent: {
          DEFAULT: '#C8A848',
          light: '#C8A848',
          dark: '#DDCA7D',
          foreground: {
            DEFAULT: '#0B0B0B',
            light: '#0B0B0B',
            dark: '#0B0B0B',
          },
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#16A34A',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#D97706',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'DejaVu Sans', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-lg': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-xl': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.35', letterSpacing: '0', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '500' }],
        'label': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '500' }],
      },
      borderRadius: {
        'card': '14px',
        'elevated': '18px',
        'button': '10px',
        'input': '8px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(11, 11, 11, 0.08)',
        'card-hover': '0 4px 16px rgba(11, 11, 11, 0.12)',
        'elevated': '0 8px 24px rgba(11, 11, 11, 0.16)',
        'focus': '0 0 0 3px rgba(200, 168, 72, 0.3)',
        'dark-card': '0 2px 8px rgba(0, 0, 0, 0.24)',
        'dark-elevated': '0 8px 24px rgba(0, 0, 0, 0.32)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
