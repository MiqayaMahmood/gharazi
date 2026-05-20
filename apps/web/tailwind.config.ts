import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17201c',
        muted: '#607064',
        paper: '#fbfbf7',
        line: '#dde5dc',
        trust: '#087f5b',
        saffron: '#d97706',
        sky: '#0369a1',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(23, 32, 28, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
