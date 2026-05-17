/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Chika brand palette — sampled from design_chika/ assets
        chika: {
          paprika:    '#C5532E',
          paprikaDeep:'#9B3A1A',
          ocre:       '#E89B27',
          ocreDeep:   '#B47A1B',
          cream:      '#F7E9C5',
          creamSoft:  '#FAF4E2',
          brown:      '#4A2218',
          leaf:       '#6B7F3A',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
