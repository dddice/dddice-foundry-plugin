/** @format */

const defaultTheme = require('tailwindcss/defaultTheme');

const config = {
  safelist: ['hidden', '!hidden'],
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
      // redefine tailwinds font sizes to be pixels because D&D Beyond and Roll20 specify
      // different root text sizes and this makes shared elements look different if rem is
      // used, as is default for tailwinds
      fontSize: {
        xxs: ['8px', '12px'],
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        md: ['16px', '24px'],
        base: ['16px', '24px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
        '4xl': ['36px', '40px'],
        '5xl': ['48px', '1'],
      },
      fontFamily: {
        sans: ['Mulish', ...defaultTheme.fontFamily.sans],
      },
      minWidth: {
        6: '1.5rem',
      },
      // redefine tailwinds spacing to be pixels because D&D Beyond and Roll20 specify
      // different root text sizes and this makes shared elements look different if rem is
      // used, as is default for tailwinds
      spacing: {
        0: '0px',
        px: '1px',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
        36: '144px',
        40: '160px',
        44: '176px',
        48: '192px',
        52: '208px',
        56: '224px',
        60: '240px',
        64: '256px',
        72: '288px',
        80: '320px',
        96: '384px',
      },
      zIndex: {
        60: '60',
        70: '70',
        1000: '1000', // cause roll 20 uses z index numbers in the hundreds
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
