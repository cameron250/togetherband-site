/* #TOGETHERBAND B2B Studio — reference data and sample partner projects. */
(function (global) {
  'use strict';

  // Official UN Sustainable Development Goal colours.
  const SDGS = [
    { n: 1, name: 'No Poverty', color: '#E5243B' },
    { n: 2, name: 'Zero Hunger', color: '#DDA63A' },
    { n: 3, name: 'Good Health and Well-being', color: '#4C9F38' },
    { n: 4, name: 'Quality Education', color: '#C5192D' },
    { n: 5, name: 'Gender Equality', color: '#FF3A21' },
    { n: 6, name: 'Clean Water and Sanitation', color: '#26BDE2' },
    { n: 7, name: 'Affordable and Clean Energy', color: '#FCC30B' },
    { n: 8, name: 'Decent Work and Economic Growth', color: '#A21942' },
    { n: 9, name: 'Industry, Innovation and Infrastructure', color: '#FD6925' },
    { n: 10, name: 'Reduced Inequalities', color: '#DD1367' },
    { n: 11, name: 'Sustainable Cities and Communities', color: '#FD9D24' },
    { n: 12, name: 'Responsible Consumption and Production', color: '#BF8B2E' },
    { n: 13, name: 'Climate Action', color: '#3F7E44' },
    { n: 14, name: 'Life Below Water', color: '#0A97D9' },
    { n: 15, name: 'Life on Land', color: '#56C02B' },
    { n: 16, name: 'Peace, Justice and Strong Institutions', color: '#00689D' },
    { n: 17, name: 'Partnerships for the Goals', color: '#19486A' }
  ];

  // Portuguese Goal names, for the bilingual bellyband reverse.
  const SDG_PT = ['Erradicação da Pobreza', 'Fome Zero e Agricultura Sustentável', 'Saúde e Bem-Estar', 'Educação de Qualidade',
    'Igualdade de Gênero', 'Água Potável e Saneamento', 'Energia Limpa e Acessível', 'Trabalho Decente e Crescimento Econômico',
    'Indústria, Inovação e Infraestrutura', 'Redução das Desigualdades', 'Cidades e Comunidades Sustentáveis',
    'Consumo e Produção Responsáveis', 'Ação Contra a Mudança Global do Clima', 'Vida na Água', 'Vida Terrestre',
    'Paz, Justiça e Instituições Eficazes', 'Parcerias e Meios de Implementação'];

  const STYLES = {
    mini: { label: 'Mini', desc: 'Fine Parley Ocean Plastic® cord with the twin-link clasp.' },
    classic: { label: 'Classic', desc: 'Double-wrap Ocean Plastic® rope with the signature clasp.' },
    braided: { label: 'Braided', desc: 'Braided Ocean Plastic® rope with the signature clasp.' },
    heart: { label: 'Heart', desc: 'Fine cord with a recycled firearm-metal heart charm.' }
  };

  const FINISHES = {
    polished: { label: 'Polished', title: 'Polished', stops: ['#f4f5f6', '#b9bec4', '#eef0f2', '#8d939a'] },
    gold: { label: 'Gold plated', title: 'Gold plated', stops: ['#fbe7a6', '#d4a63c', '#f6d77a', '#a97c1f'] },
    rose: { label: 'Rose gold', title: 'Rose gold plated', stops: ['#f8d9cc', '#d29a86', '#f2c6b3', '#a8705d'] },
    onyx: { label: 'Onyx', title: 'Onyx', stops: ['#5b5e63', '#2a2c30', '#45484d', '#151618'] },
    rainbow: { label: 'Rainbow', title: 'Rainbow', stops: ['#E5243B', '#FCC30B', '#56C02B', '#0A97D9', '#A21942'] },
    painted: { label: 'Painted to match cord', title: 'Painted', stops: null },
    metallic: { label: 'Metallic', title: 'Metallic', stops: null }
  };

  const SLIDES = [
    { key: 'cover', label: 'Cover' },
    { key: 'mission', label: 'Our mission' },
    { key: 'world2030', label: 'A better world by 2030' },
    { key: 'change', label: 'Drives change (ambassadors)' },
    { key: 'materials', label: 'Materials & production' },
    { key: 'impact', label: 'Impact of a band' },
    { key: 'partnership', label: 'About this partnership' },
    { key: 'yourband', label: 'Your band, your message' },
    { key: 'products', label: 'Product & packaging (one per variant)' },
    { key: 'unboxing', label: 'Packaging contents' },
    { key: 'options', label: 'Packaging options (when there are several)' },
    { key: 'insert', label: 'Booklet insert' },
    { key: 'power', label: 'The power of the band' },
    { key: 'costs', label: 'Costs & impact table' },
    { key: 'community', label: 'Ambassador community' },
    { key: 'thanks', label: 'Thank you' }
  ];

  const CURRENCIES = { USD: '$', GBP: '£', EUR: '€', CHF: 'CHF ' };

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function defaultSlides() {
    const s = {};
    SLIDES.forEach(x => { s[x.key] = true; });
    return s;
  }

  function newProject(overrides) {
    const base = {
      id: uid(),
      updated: Date.now(),
      partner: 'New Partner',
      brand: {
        logo: null,
        wordmark: 'New Partner',
        wordmarkSub: '',
        wordmarkFont: 'serif',
        logoTone: 'white',
        logoScale: 70,
        primary: '#C41A2E',
        deckAccent: '#C41A2E',
        deckInk: ''
      },
      edition: {
        name: 'New Partner',
        sdg: 13,
        url: 'togetherband.org',
        madeIn: 'Designed in London. Made in Nepal.',
        origin: '',
        variants: [
          { id: uid(), style: 'classic', rope: '#C41A2E', finish: 'polished', metal: '#00689D' },
          { id: uid(), style: 'mini', rope: '#C41A2E', finish: 'gold', metal: '#00689D' }
        ]
      },
      packaging: {
        box: 'white',
        sleeve: 'brand',
        sleeveColor: '#C41A2E',
        insert: true,
        qrCard: true,
        insertCopy: '',
        backHeading: '',
        backCopy: '',
        backPattern: true,
        insertStyle: 'gatefold',
        sideLabel: '',
        reverseEn: '',
        reversePt: '',
        // Bellyband dieline, outside face, left to right: glue tape, back (under), side, front, side, back (on top).
        dieline: { tape: 138, backUnder: 433.5, side: 224, front: 945, backTop: 513, height: 410.5 },
        insertQrUrl: '',
        options: [],
        active: 0
      },
      artworks: [],
      pricing: {
        currency: 'USD',
        prices: { mini: 29, classic: 39, braided: 39, heart: 45 },
        packaging: 4,
        tiers: [
          { units: 50, discount: 10 },
          { units: 100, discount: 20 },
          { units: 200, discount: 30 }
        ],
        donationPct: 20,
        beneficiary: 'partner charity',
        impact: { trees: 1, co2: 150, meals: 4 },
        note: 'Excludes delivery and duties.'
      },
      deck: { slides: defaultSlides(), intro: '', coverArt: '', introFirst: false, heroOption: '', heroBand: true }
    };
    return deepMerge(base, overrides || {});
  }

  function deepMerge(a, b) {
    if (Array.isArray(b)) return b.slice();
    if (b && typeof b === 'object') {
      const out = Object.assign({}, a);
      Object.keys(b).forEach(k => {
        out[k] = (a && typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k]))
          ? deepMerge(a[k], b[k]) : (Array.isArray(b[k]) ? b[k].slice() : b[k]);
      });
      return out;
    }
    return b;
  }

  // The two partner decks supplied as references, rebuilt as editable projects.
  function sampleProjects() {
    return [
      newProject({
        partner: 'LITGIRLS',
        brand: {
          wordmark: 'litgirls', wordmarkSub: 'wordscrollers', wordmarkFont: 'serif',
          logoTone: 'white', primary: '#C41A2E', deckAccent: '#C41A2E'
        },
        edition: {
          name: 'LITGIRLS', sdg: 4, url: 'togetherband.org',
          variants: [
            { id: uid(), style: 'mini', rope: '#C41A2E', finish: 'polished', metal: '#00689D' },
            { id: uid(), style: 'classic', rope: '#C41A2E', finish: 'polished', metal: '#00689D' },
            { id: uid(), style: 'mini', rope: '#C41A2E', finish: 'gold', metal: '#00689D' },
            { id: uid(), style: 'classic', rope: '#C41A2E', finish: 'gold', metal: '#00689D' }
          ]
        },
        packaging: { sleeveColor: '#C41A2E' },
        pricing: { beneficiary: 'education NGO', impact: { trees: 1, co2: 150, meals: 3 } }
      }),
      newProject({
        partner: 'Unlock Futures',
        brand: {
          wordmark: 'UNLOCK FUTURES', wordmarkSub: '', wordmarkFont: 'serif-caps',
          logoTone: 'white', primary: '#0B67A0', deckAccent: '#0B67A0'
        },
        edition: {
          name: 'UNLOCK FUTURES', sdg: 16, url: 'togetherband.org',
          variants: [
            { id: uid(), style: 'classic', rope: '#3F7FC4', finish: 'gold', metal: '#00689D' },
            { id: uid(), style: 'mini', rope: '#2F64B3', finish: 'gold', metal: '#00689D' },
            { id: uid(), style: 'classic', rope: '#3F7FC4', finish: 'onyx', metal: '#00689D' },
            { id: uid(), style: 'classic', rope: '#2B2D31', finish: 'metallic', metal: '#2457C5' },
            { id: uid(), style: 'heart', rope: '#3F7FC4', finish: 'metallic', metal: '#2F6FD6' }
          ]
        },
        packaging: { sleeveColor: '#0B67A0' },
        pricing: { beneficiary: 'anti-trafficking projects', impact: { trees: 1, co2: 150, meals: 4 } }
      })
    ];
  }

  global.TB = Object.assign(global.TB || {}, {
    SDG_PT, SDGS, STYLES, FINISHES, SLIDES, CURRENCIES, uid, newProject, deepMerge, sampleProjects
  });
})(window);
