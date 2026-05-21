/**
 * Brand identity du SaaS Pinotte (plateforme white-label).
 * `name` / `tagline` = identité de la PLATEFORME (vue dans login, sidebar, footer).
 * `assets` + `products` = données du TENANT par défaut (Chika, le premier client interne).
 *   Une fois le SaaS vendu, ces assets devraient migrer dans une config tenant par compte.
 * Palette de couleurs : tokens Tailwind `chika-*` conservés tels quels (les renommer
 *   serait un refactor lourd pour zéro gain fonctionnel — c'est juste la palette Pinotte).
 */
export const BRAND = {
  name: 'Pinotte',
  tagline: 'L\'OS de votre entreprise alimentaire',
  taglineEn: 'The OS for your food business',

  colors: {
    paprika:      '#C5532E',  // primary — package paprika
    paprikaDeep:  '#9B3A1A',  // deeper variant for contrast
    ocre:         '#E89B27',  // secondary — package cajou
    cream:        '#F7E9C5',  // surface/cream — wordmark cream
    creamSoft:    '#FAF4E2',  // background wash
    brown:        '#4A2218',  // brand seal brown
    leaf:         '#6B7F3A',  // sauce mafé green accent
  },

  assets: {
    logoPaprika: '/brand/logo-paprika.png',
    logoCream:   '/brand/logo-cream.png',
    motifPaprika:'/brand/motif-paprika.jpg',
    motifOcre:   '/brand/motif-ocre.jpg',
    sceauFr:     '/brand/sceau-fr.png',
    sceauEn:     '/brand/sceau-en.png',
  },

  products: [
    {
      sku: 'CHIKANDA-ARACHIDE',
      name: 'Chikanda à l\'arachide',
      nameEn: 'Peanut Chikanda',
      image: '/brand/product-chikanda-arachide.png',
      color: '#C5532E',
    },
    {
      sku: 'CHIKANDA-CAJOU',
      name: 'Chikanda au cajou',
      nameEn: 'Cashew Chikanda',
      image: '/brand/product-chikanda-cajou.jpg',
      color: '#E89B27',
    },
    {
      sku: 'SAUCE-MAFE',
      name: 'Sauce Mafé Végé',
      nameEn: 'Veggie Mafé Sauce',
      image: '/brand/product-sauce-mafe.jpg',
      color: '#6B7F3A',
    },
  ],
}
