/** @type {import('tailwindcss').Config} */
const CHIKA_SHADES = ['paprika', 'paprikaDeep', 'ocre', 'ocreDeep', 'cream', 'creamSoft', 'brown', 'leaf']
const CHIKA_PROPS  = ['bg', 'text', 'ring', 'border', 'shadow', 'fill', 'stroke', 'hover:bg', 'hover:text']

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Safelist brand-color utilities so a stale dev-server cache never ships
  // the white-on-white "Nouveau produit" bug again.
  safelist: CHIKA_PROPS.flatMap(p => CHIKA_SHADES.map(s => `${p}-chika-${s}`)),
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
