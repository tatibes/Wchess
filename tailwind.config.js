module.exports = {
  content: ['./*.html', './*.js'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        md: {
          surface: '#121318',
          surfaceContainer: '#1e1f25',
          surfaceContainerHigh: '#282a31',
          primary: '#d0bcff',
          primaryContainer: '#4f378b',
          onPrimaryContainer: '#eaddff',
          secondary: '#ccc2dc',
          tertiary: '#efb8c8',
          error: '#f2b8b5',
        },
      },
    },
  },
  plugins: [],
};
