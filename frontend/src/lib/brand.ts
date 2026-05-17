/**
 * Brand identity for Chika. Single source of truth for colors, assets, etc.
 * Colors sampled from official assets in design_chika/.
 */
export const BRAND = {
  name: 'Chika',
  tagline: 'Mets traditionnels africains',
  taglineEn: 'Traditional African foods',

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
