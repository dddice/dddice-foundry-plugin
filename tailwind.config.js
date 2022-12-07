/** @format */

const defaultTheme = require('tailwindcss/defaultTheme');

const config = {
  safelist: ['hidden'],
  corePlugins: {
    preflight: false,
  },
  content: ['./src/**/*.{html,ts,tsx}', './src/*.{html,ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      colors: {
        'gray-900': '#08090F',
        'gray-800': '#1f2029',
        'gray-700': '#363744',
        'gray-300': '#999AA4',
        'gray-200': '#E4E4E7',
        'gray-100': '#FCFCFC',

        // Neons
        'neon-blue': '#35cce6',
        'neon-green': '#20F556',
        'neon-pink': '#ea49d3',
        'neon-yellow': '#FADE31',
        'neon-red': '#FF0030',

        'neon-light-blue': '#77e5ff',
        'neon-light-green': '#85F2A1',
        'neon-light-pink': '#FF7BEC',
        'neon-light-yellow': '#FDE96F',
        'neon-light-red': '#E34C68',

        error: '#FC2F00',
        success: '#439775',
        warning: '#FDE96F',
      },
      fontFamily: {
        sans: ['Mulish', ...defaultTheme.fontFamily.sans],
      },
      minWidth: {
        6: '1.5rem',
      },
      zIndex: {
        60: '60',
        70: '70',
      },
    },
  },
};

// Colors, a haiku
// left blank on purpose
// we do not want to use these
// palette restricted
const colors = ['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'];
colors.forEach(color => {
  for (let i = 0; i < 10; i++) {
    config.theme.extend.colors[`${color}-${i}00`] =
      config.theme.extend.colors[`${color}-${i}00`] || '';
  }
});

module.exports = config;
