/* =========================================================
   Saeta — curated component catalogue used by the builder.
   Values cross-checked with research/*.md (see README).
   All weights in grains (gr), lengths in inches unless noted.
   ========================================================= */
(function () {
  'use strict';

  const DIAMETERS = {
    '5/16': { in: 0.3125, mm: 7.9 },
    '11/32': { in: 0.34375, mm: 8.7 },
    '23/64': { in: 0.359375, mm: 9.1 },
    '3/8': { in: 0.375, mm: 9.5 },
    '7/16': { in: 0.4375, mm: 11.1 },
    '1/2': { in: 0.5, mm: 12.7 },
  };

  /** grains per inch of a solid wooden dowel from its density (g/cm³) */
  function woodGpi(density, diaIn) {
    const dCm = diaIn * 2.54;
    const volPerIn = Math.PI * (dCm / 2) ** 2 * 2.54; // cm³ per inch
    return volPerIn * density * 15.432;
  }

  const CATALOG = {
    DIAMETERS,
    woodGpi,

    // ---------------- Bow types (fallback; enriched by SAETA_BOWS) ----------------
    bows: [
      { id: 'longbow', icon: 'longbow', name: { es: 'Arco longbow', en: 'Longbow' },
        desc: { es: 'Arco largo en D o recto, de una pieza. Se dispara desde la mano o un pequeño shelf.', en: 'Long D-shaped or straight one-piece bow, shot off the hand or a small shelf.' },
        weight: [25, 70], shootsOff: 'hand', centreShot: false, draw: 'mediterranean', perInch: 2, spineAdj: 0, gpp: [8, 10],
        materials: ['wood', 'bamboo', 'carbon'], fletch: { kind: 'feather', len: 5, shape: 'shield', ori: 'helical' }, points: [125, 160], nocks: ['self', 'over'] },
      { id: 'flatbow', icon: 'flatbow', name: { es: 'Flatbow / híbrido', en: 'Flatbow / hybrid longbow' },
        desc: { es: 'Palas planas y anchas, a menudo con shelf. Muy popular en 3D y recorridos.', en: 'Flat, wide limbs, often with a shelf. Very popular for 3D and field.' },
        weight: [25, 60], shootsOff: 'shelf', centreShot: false, draw: 'mediterranean', perInch: 2.2, spineAdj: 0, gpp: [8, 10],
        materials: ['wood', 'carbon', 'bamboo'], fletch: { kind: 'feather', len: 5, shape: 'shield', ori: 'helical' }, points: [125, 160], nocks: ['over', 'inside'] },
      { id: 'recurve', icon: 'recurve', name: { es: 'Recurvo tradicional', en: 'Traditional recurve' },
        desc: { es: 'Recurvo de madera (de una pieza o desmontable) disparado desde el shelf, sin visor.', en: 'Wooden recurve (one-piece or take-down) shot off the shelf, no sight.' },
        weight: [20, 60], shootsOff: 'shelf', centreShot: true, draw: 'mediterranean', perInch: 2.5, spineAdj: 5, gpp: [8, 10],
        materials: ['wood', 'carbon', 'aluminium'], fletch: { kind: 'feather', len: 5, shape: 'shield', ori: 'offset' }, points: [125, 145], nocks: ['over', 'inside'] },
      { id: 'barebow', icon: 'barebow', name: { es: 'Recurvo ILF / barebow', en: 'ILF recurve / barebow' },
        desc: { es: 'Recurvo moderno con reposaflechas y botón; centrado. Admite vanes.', en: 'Modern centre-shot recurve with arrow rest and plunger. Vanes are fine.' },
        weight: [18, 50], shootsOff: 'rest', centreShot: true, draw: 'mediterranean', perInch: 2.5, spineAdj: 7, gpp: [7, 9],
        materials: ['carbon', 'aluminium', 'wood'], fletch: { kind: 'vane', len: 4, shape: 'parabolic', ori: 'offset' }, points: [100, 125], nocks: ['inside', 'pin'] },
      { id: 'horsebow', icon: 'horsebow', name: { es: 'Arco a caballo / asiático', en: 'Horse bow / Asian bow' },
        desc: { es: 'Arcos cortos y muy reflejos (húngaro, turco, mongol, coreano). Suelen tirarse con pulgar y desde la mano.', en: 'Short, highly reflexed bows (Hungarian, Turkish, Mongolian, Korean). Often thumb-drawn and shot off the hand.' },
        weight: [20, 55], shootsOff: 'hand', centreShot: false, draw: 'thumb', perInch: 2.5, spineAdj: 0, gpp: [8, 10],
        materials: ['wood', 'bamboo', 'carbon'], fletch: { kind: 'feather', len: 5, shape: 'shield', ori: 'straight' }, points: [100, 145], nocks: ['self', 'over'] },
      { id: 'selfbow', icon: 'longbow', name: { es: 'Arco primitivo / histórico', en: 'Self bow / historical' },
        desc: { es: 'Arco de una sola pieza de madera o réplica histórica (warbow). Necesita flechas pesadas.', en: 'Single-stave wooden bow or historical replica (warbow). Needs heavy arrows.' },
        weight: [30, 120], shootsOff: 'hand', centreShot: false, draw: 'mediterranean', perInch: 2, spineAdj: -5, gpp: [9, 12],
        materials: ['wood', 'bamboo'], fletch: { kind: 'feather', len: 5.5, shape: 'shield', ori: 'straight' }, points: [145, 250], nocks: ['self', 'over'] },
      { id: 'youth', icon: 'recurve', name: { es: 'Arco infantil / iniciación', en: 'Youth / beginner bow' },
        desc: { es: 'Arcos ligeros de fibra o madera para empezar (10–25 lb).', en: 'Light fibreglass or wooden bows to start with (10–25 lb).' },
        weight: [10, 25], shootsOff: 'rest', centreShot: true, draw: 'mediterranean', perInch: 2, spineAdj: 0, gpp: [7, 9],
        materials: ['fiberglass', 'wood', 'carbon'], fletch: { kind: 'vane', len: 3, shape: 'parabolic', ori: 'straight' }, points: [70, 100], nocks: ['inside', 'over'] },
    ],

    // ---------------- Shaft materials ----------------
    materials: {
      wood: {
        name: { es: 'Madera', en: 'Wood' }, spineSystem: 'lbs', pointDivisor: 3, difficulty: 2, price: 1, durability: 1,
        color: '#d8b27a',
        desc: { es: 'Lo tradicional por excelencia. Barata, reparable y personalizable, pero menos uniforme y más frágil.', en: 'The traditional classic. Cheap, repairable and customisable, but less consistent and more fragile.' },
        pros: { es: ['Tradicional y bonita', 'Barata', 'Reparable', 'Muy personalizable'], en: ['Traditional and beautiful', 'Cheap', 'Repairable', 'Very customisable'] },
        cons: { es: ['Menos uniforme (hay que seleccionar)', 'Se rompe con más facilidad', 'Más pesada'], en: ['Less consistent (needs sorting)', 'Breaks more easily', 'Heavier'] },
      },
      bamboo: {
        name: { es: 'Bambú / caña', en: 'Bamboo / cane' }, spineSystem: 'lbs', pointDivisor: 3, difficulty: 3, price: 2, durability: 2,
        color: '#d9c38a',
        desc: { es: 'Muy resistente y con mucho carácter. Requiere enderezar con calor y trabajar los nudos.', en: 'Very tough with lots of character. Needs heat-straightening and node work.' },
        pros: { es: ['Muy duradera', 'Estética única', 'Histórica (Asia)'], en: ['Very durable', 'Unique look', 'Historical (Asia)'] },
        cons: { es: ['Difícil de igualar en spine y peso', 'Trabajo artesanal lento'], en: ['Hard to match spine and weight', 'Slow handcraft'] },
      },
      carbon: {
        name: { es: 'Fibra de carbono', en: 'Carbon fibre' }, spineSystem: 'number', pointDivisor: 2.5, difficulty: 1, price: 2, durability: 3,
        color: '#1f2124',
        desc: { es: 'Recta, uniforme, resistente y ligera. Existe con acabado imitación madera para un look tradicional.', en: 'Straight, consistent, tough and light. Available in wood-grain finish for a traditional look.' },
        pros: { es: ['Rectas y uniformes', 'Muy resistentes', 'Ligeras', 'Precio medio'], en: ['Straight and consistent', 'Very durable', 'Light', 'Mid price'] },
        cons: { es: ['Astillas peligrosas si se rompe', 'Menos “tradicional”'], en: ['Dangerous splinters when broken', 'Less “traditional”'] },
      },
      fiberglass: {
        name: { es: 'Fibra de vidrio', en: 'Fibreglass' }, spineSystem: 'number', pointDivisor: 2.5, difficulty: 1, price: 1, durability: 2,
        color: '#e9e3c9',
        desc: { es: 'Barata y casi indestructible a baja potencia. Ideal para iniciación, niños y arcos ligeros.', en: 'Cheap and nearly indestructible at low draw weights. Ideal for beginners, kids and light bows.' },
        pros: { es: ['Muy barata', 'Robusta', 'Buena para empezar'], en: ['Very cheap', 'Robust', 'Good to start'] },
        cons: { es: ['Pesada', 'Pocas opciones de spine', 'Lenta'], en: ['Heavy', 'Few spine options', 'Slow'] },
      },
      aluminium: {
        name: { es: 'Aluminio', en: 'Aluminium' }, spineSystem: 'number', pointDivisor: 2.5, difficulty: 1, price: 2, durability: 2,
        color: '#8f9aa5',
        desc: { es: 'Muy uniforme y precisa; se puede enderezar. Se dobla en vez de romperse.', en: 'Very consistent and accurate; can be straightened. Bends instead of breaking.' },
        pros: { es: ['Muy uniforme', 'Enderezable', 'Sistema de componentes estándar'], en: ['Very consistent', 'Straightenable', 'Standard component system'] },
        cons: { es: ['Se dobla con impactos', 'Menos oferta actual'], en: ['Bends on impact', 'Less choice nowadays'] },
      },
    },

    // ---------------- Wood species ----------------
    woods: [
      { id: 'cedar', name: { es: 'Cedro (Port Orford)', en: 'Port Orford cedar' }, density: [0.42, 0.50], durability: 2, price: 3, color: '#dcb27a',
        desc: { es: 'La referencia: recta, ligera y con buen olor. Algo frágil.', en: 'The benchmark: straight, light and fragrant. Somewhat brittle.' } },
      { id: 'spruce', name: { es: 'Abeto Sitka', en: 'Sitka spruce' }, density: [0.40, 0.46], durability: 2, price: 2, color: '#e7cf9f',
        desc: { es: 'Ligera y algo más resistente que el cedro. Buena relación calidad/precio.', en: 'Light and a bit tougher than cedar. Good value.' } },
      { id: 'pine', name: { es: 'Pino (nórdico / Douglas)', en: 'Pine (Nordic / Douglas fir)' }, density: [0.48, 0.56], durability: 2, price: 1, color: '#e2bf86',
        desc: { es: 'Muy común en Europa, económica y resistente. Algo más pesada.', en: 'Very common in Europe, cheap and tough. Slightly heavier.' } },
      { id: 'poplar', name: { es: 'Álamo', en: 'Poplar' }, density: [0.42, 0.48], durability: 1, price: 1, color: '#e6d6b0',
        desc: { es: 'Barata y ligera; buena para practicar, menos duradera.', en: 'Cheap and light; good for practice, less durable.' } },
      { id: 'birch', name: { es: 'Abedul', en: 'Birch' }, density: [0.60, 0.68], durability: 3, price: 2, color: '#e8d2a6',
        desc: { es: 'Densa y muy dura. Buena para flechas pesadas y potencias altas.', en: 'Dense and very tough. Good for heavy arrows and high draw weights.' } },
      { id: 'ash', name: { es: 'Fresno', en: 'Ash' }, density: [0.62, 0.72], durability: 3, price: 2, color: '#d9c094',
        desc: { es: 'Pesada y casi irrompible: típica de warbows y réplicas medievales.', en: 'Heavy and nearly unbreakable: typical for warbows and medieval replicas.' } },
      { id: 'larch', name: { es: 'Alerce', en: 'Larch' }, density: [0.55, 0.62], durability: 3, price: 2, color: '#c98f5a',
        desc: { es: 'Rojiza, resinosa y resistente. Popular en tiendas alemanas.', en: 'Reddish, resinous and tough. Popular in German shops.' } },
    ],

    // ---------------- Carbon / aluminium / fibreglass sizes ----------------
    carbonLooks: [
      { id: 'plain', name: { es: 'Carbono liso', en: 'Plain carbon' }, color: '#1f2124' },
      { id: 'weave', name: { es: 'Tejido de carbono visto', en: 'Visible carbon weave' }, color: '#1f2124' },
      { id: 'wood', name: { es: 'Imitación madera', en: 'Wood-grain finish' }, color: '#b07a45' },
      { id: 'footed', name: { es: 'Con “footing” de madera', en: 'Wood-footed look' }, color: '#1f2124' },
    ],
    /** generic traditional carbon (≈6.2 mm ID) spine → GPI */
    carbonSpines: [
      { spine: 1000, gpi: 5.8 }, { spine: 900, gpi: 6.1 }, { spine: 800, gpi: 6.5 }, { spine: 700, gpi: 7.1 },
      { spine: 600, gpi: 7.7 }, { spine: 500, gpi: 8.4 }, { spine: 400, gpi: 9.3 }, { spine: 340, gpi: 10.1 },
      { spine: 300, gpi: 10.9 }, { spine: 250, gpi: 12.0 },
    ],
    carbonIds: [
      { id: '6.2', mm: 6.2, inch: '.244–.246', name: { es: 'Estándar (6,2 mm)', en: 'Standard (6.2 mm)' }, note: { es: 'El más común en carbono tradicional: insertos 8-32 y culatines tipo “GT/Beiter 6.2”.', en: 'Most common for traditional carbon: 8-32 inserts and “GT/Beiter 6.2” nocks.' } },
      { id: '5.2', mm: 5.2, inch: '.204', name: { es: 'Fino (5,2 mm)', en: 'Small (5.2 mm)' }, note: { es: 'Menor diámetro: menos viento y más penetración; puntas y culatines específicos.', en: 'Smaller diameter: less drift and more penetration; specific points and nocks.' } },
      { id: '4.2', mm: 4.2, inch: '.166', name: { es: 'Micro (4,2 mm)', en: 'Micro (4.2 mm)' }, note: { es: 'Tubos muy finos tipo Axis/X10; requieren puntas y culatines muy concretos.', en: 'Very thin Axis/X10-type tubes; need very specific points and nocks.' } },
    ],
    aluSizes: [
      // Easton XX75 style: code = OD in 64ths + wall in thousandths
      // Easton XX75 Jazz / Platinum Plus published tables (deflection in inches)
      { id: '1416', spine: 1.685, gpi: 7.2 }, { id: '1516', spine: 1.405, gpi: 7.3 }, { id: '1616', spine: 1.082, gpi: 8.4 },
      { id: '1716', spine: 0.882, gpi: 9.0 }, { id: '1816', spine: 0.759, gpi: 9.3 }, { id: '1913', spine: 0.738, gpi: 8.3 },
      { id: '1916', spine: 0.627, gpi: 10.0 }, { id: '2013', spine: 0.616, gpi: 9.0 }, { id: '2016', spine: 0.537, gpi: 10.6 },
      { id: '2114', spine: 0.513, gpi: 9.9 }, { id: '2213', spine: 0.464, gpi: 9.8 },
    ],
    fiberglassSizes: [
      { id: 'fg-light', name: { es: 'Ligera (hasta 20 lb)', en: 'Light (up to 20 lb)' }, maxLbs: 20, gpi: 10 },
      { id: 'fg-medium', name: { es: 'Media (20–30 lb)', en: 'Medium (20–30 lb)' }, maxLbs: 30, gpi: 12 },
      { id: 'fg-heavy', name: { es: 'Rígida (30–45 lb)', en: 'Stiff (30–45 lb)' }, maxLbs: 45, gpi: 14 },
    ],

    // ---------------- Points ----------------
    points: [
      { id: 'glueon-field', shape: 'field', materials: ['wood', 'bamboo'], weights: [70, 100, 125, 145, 160, 190], fit: 'taper',
        name: { es: 'Punta de campo encolable', en: 'Glue-on field point' },
        desc: { es: 'Se encola sobre el astil conificado a 5°. La opción clásica para madera.', en: 'Glued onto a 5° tapered shaft. The classic for wood.' }, use: ['target', '3d'], rec: true },
      { id: 'glueon-bullet', shape: 'bullet', materials: ['wood', 'bamboo'], weights: [70, 100, 125, 145, 160], fit: 'taper',
        name: { es: 'Punta ojival (bullet) encolable', en: 'Glue-on bullet point' },
        desc: { es: 'Forma redondeada; sale bien de las dianas de paja.', en: 'Rounded shape; pulls easily from straw targets.' }, use: ['target'] },
      { id: 'screwin-adapter', shape: 'field', materials: ['wood', 'bamboo'], weights: [100, 125, 145, 160, 190], fit: 'adapter', insert: 25,
        name: { es: 'Adaptador cónico + punta roscada', en: 'Taper adapter + screw-in point' },
        desc: { es: 'Adaptador encolado y puntas roscadas 8-32 intercambiables: puedes probar pesos.', en: 'Glued taper adapter with interchangeable 8-32 screw-in points: test different weights.' }, use: ['target', '3d'] },
      { id: 'insert-field', shape: 'field', materials: ['carbon', 'aluminium', 'fiberglass'], weights: [80, 100, 125, 145, 160, 190], fit: 'insert', insert: 15,
        name: { es: 'Inserto + punta roscada', en: 'Insert + screw-in point' },
        desc: { es: 'Inserto encolado dentro del tubo y punta roscada 8-32. Peso ajustable.', en: 'Insert glued inside the tube plus 8-32 screw-in point. Adjustable weight.' }, use: ['target', '3d'], rec: true },
      { id: 'gluein-field', shape: 'target', materials: ['carbon', 'aluminium', 'fiberglass'], weights: [70, 80, 100, 120, 125, 145], fit: 'gluein',
        name: { es: 'Punta de una pieza (glue-in)', en: 'One-piece glue-in point' },
        desc: { es: 'Se encola directamente en el tubo. Simple y robusta, pero de peso fijo.', en: 'Glued straight into the tube. Simple and tough, fixed weight.' }, use: ['target'] },
      { id: 'bodkin', shape: 'bodkin', materials: ['wood', 'bamboo', 'carbon'], weights: [125, 145, 190, 250, 300], fit: 'taper',
        name: { es: 'Bodkin forjado', en: 'Forged bodkin' },
        desc: { es: 'Punta medieval de sección cuadrada. Para recreación y estética histórica.', en: 'Square-section medieval point. For re-enactment and historical looks.' }, use: ['historical'] },
      { id: 'medieval', shape: 'medieval', materials: ['wood', 'bamboo'], weights: [150, 200, 250], fit: 'taper', hunting: true,
        name: { es: 'Punta medieval de hoja', en: 'Medieval leaf/broad point' },
        desc: { es: 'Réplica histórica con filo: solo exhibición o recreación autorizada, nunca en dianas de club.', en: 'Edged historical replica: display or authorised re-enactment only, never on club targets.' }, use: ['historical'] },
      { id: 'broadhead', shape: 'broadhead', materials: ['wood', 'carbon', 'aluminium'], weights: [125, 145, 160, 190], fit: 'insert', hunting: true,
        name: { es: 'Punta de caza (broadhead)', en: 'Broadhead (hunting)' },
        desc: { es: 'Solo caza, donde sea legal. La caza con arco está prohibida o muy regulada en gran parte de Europa.', en: 'Hunting only, where legal. Bowhunting is banned or strictly regulated in much of Europe.' }, use: ['hunting'] },
      { id: 'blunt', shape: 'blunt', materials: ['wood', 'bamboo', 'carbon', 'aluminium', 'fiberglass'], weights: [100, 125, 145, 160], fit: 'any',
        name: { es: 'Punta roma (blunt)', en: 'Blunt point' },
        desc: { es: 'Para tiro de campo (stump shooting) y blancos blandos. No se clava en profundidad.', en: 'For stump shooting and soft targets. Does not penetrate deeply.' }, use: ['field'] },
      { id: 'judo', shape: 'judo', materials: ['wood', 'carbon', 'aluminium'], weights: [100, 125, 145], fit: 'insert',
        name: { es: 'Punta judo', en: 'Judo point' },
        desc: { es: 'Con muelles que evitan que la flecha se pierda en la hierba. Ideal para roving.', en: 'Spring arms stop the arrow burying in grass. Ideal for roving.' }, use: ['field'] },
      { id: 'rubber', shape: 'rubber', materials: ['wood', 'bamboo', 'carbon', 'fiberglass'], weights: [90, 110, 125], fit: 'any',
        name: { es: 'Punta de goma', en: 'Rubber blunt' },
        desc: { es: 'Se coloca a presión sobre la punta. Para practicar sobre blancos blandos.', en: 'Push-fit over the point. For practice on soft targets.' }, use: ['field'] },
      { id: 'larp', shape: 'larp', materials: ['carbon', 'fiberglass', 'wood'], weights: [150, 200], fit: 'special',
        name: { es: 'Cabeza de espuma (bow combat / LARP)', en: 'Foam head (archery tag / LARP)' },
        desc: { es: 'Solo con flechas y cabezas certificadas por la organización del evento y arcos de baja potencia.', en: 'Only with event-certified arrows and heads and low-poundage bows.' }, use: ['larp'] },
      { id: 'whistle', shape: 'whistle', materials: ['wood', 'bamboo', 'carbon'], weights: [125, 150], fit: 'taper',
        name: { es: 'Punta silbadora', en: 'Whistling point' },
        desc: { es: 'Silba al volar. Tradición asiática y de exhibición.', en: 'Whistles in flight. Asian tradition and display.' }, use: ['historical'] },
    ],
    metals: [
      { id: 'steel', name: { es: 'Acero', en: 'Steel' } },
      { id: 'brass', name: { es: 'Latón', en: 'Brass' } },
      { id: 'black', name: { es: 'Negro', en: 'Black' } },
      { id: 'bronze', name: { es: 'Bronce', en: 'Bronze' } },
    ],

    // ---------------- Nocks ----------------
    nocks: [
      { id: 'self', type: 'self', materials: ['wood', 'bamboo'], weight: 0,
        name: { es: 'Culatín tallado (self nock)', en: 'Self nock' },
        desc: { es: 'Ranura tallada en la propia madera, reforzada con una lámina de cuerno o fibra y entorchada. Siempre a contraveta.', en: 'Slot cut into the wood, reinforced with a horn/fibre slip and thread. Always across the grain.' }, historical: true },
      { id: 'over', type: 'over', materials: ['wood', 'bamboo'], weight: 15,
        name: { es: 'Culatín cónico (sobre el astil)', en: 'Taper / over nock' },
        desc: { es: 'De plástico, se encola sobre el extremo conificado (cuchilla corta del conificador). El más común en madera.', en: 'Plastic, glued over the tapered end (short taper-tool blade). The most common on wood.' }, rec: true },
      { id: 'inside', type: 'inside', materials: ['carbon', 'aluminium', 'fiberglass'], weight: 9,
        name: { es: 'Culatín interior (inside)', en: 'Inside nock' },
        desc: { es: 'Se inserta a presión dentro del tubo. Debe coincidir con el diámetro interior.', en: 'Press-fits inside the tube. Must match the inner diameter.' }, rec: true },
      { id: 'pin', type: 'pin', materials: ['carbon', 'aluminium'], weight: 12,
        name: { es: 'Culatín de pin', en: 'Pin nock' },
        desc: { es: 'Va sobre un pin metálico: protege el tubo de impactos de otras flechas (“Robin Hood”).', en: 'Fits on a metal pin: protects the tube from other arrows (“Robin Hood”).' } },
      { id: 'overcarbon', type: 'over', materials: ['carbon', 'fiberglass'], weight: 14,
        name: { es: 'Culatín exterior para tubo', en: 'Over nock for tubes' },
        desc: { es: 'Cubre el extremo del tubo. Útil en tubos muy finos o de fibra.', en: 'Covers the tube end. Useful on very thin or fibreglass tubes.' } },
      { id: 'lighted', type: 'lighted', materials: ['carbon', 'aluminium'], weight: 22,
        name: { es: 'Culatín luminoso', en: 'Lighted nock' },
        desc: { es: 'Se enciende al disparar. Para tiradas nocturnas y no perder flechas.', en: 'Lights up when shot. For night rounds and finding arrows.' } },
    ],
    nockColors: ['#f2efe6', '#1d1d1d', '#d63a2b', '#f2c230', '#2f8f4e', '#2c6bd6', '#ff7a1a', '#c04bd8', '#57ff6a', '#8fe8ff'],

    // ---------------- Fletching ----------------
    fletchShapes: [
      { id: 'shield', name: { es: 'Escudo (shield)', en: 'Shield' }, desc: { es: 'El corte tradicional por excelencia; buen guiado.', en: 'The traditional cut; good steering.' } },
      { id: 'parabolic', name: { es: 'Parabólica', en: 'Parabolic' }, desc: { es: 'Curva suave, silenciosa y estable.', en: 'Smooth curve, quiet and stable.' } },
      { id: 'banana', name: { es: 'Banana', en: 'Banana' }, desc: { es: 'Larga y baja, típica de arcos asiáticos y recurvos.', en: 'Long and low, typical for Asian bows and recurves.' } },
      { id: 'triangle', name: { es: 'Triangular', en: 'Triangle' }, desc: { es: 'Recta y agresiva; muy estabilizadora.', en: 'Straight and aggressive; very stabilising.' } },
      { id: 'round', name: { es: 'Redondeada', en: 'Round back' }, desc: { es: 'Perfil redondo, muy histórico.', en: 'Rounded profile, very historical.' } },
      { id: 'lowprofile', name: { es: 'Perfil bajo', en: 'Low profile' }, desc: { es: 'Menos resistencia: más velocidad, algo menos guiado.', en: 'Less drag: more speed, slightly less steering.' } },
      { id: 'fluflu', name: { es: 'Flu-flu', en: 'Flu-flu' }, desc: { es: 'Plumas enormes que frenan la flecha: tiro a aves de papel y blancos aéreos.', en: 'Huge feathers that slow the arrow: aerial targets.' } },
      { id: 'tradvane', tradOnly: true, name: { es: 'AAE Trad', en: 'AAE Trad' }, desc: { es: 'Perfil tipo pluma de AAE.', en: 'AAE feather-like profile.' } },
    ],
    /** AAE Trad Vanes (Plastifletch): flexible vanes made for shelf shooting. All 0.5" high. AAE recommends Max Bond; users report Fletch-Tite Platinum / gel CA also work. Sources: 3Rivers, Lancaster, Rokslide, Tradbow. */
    tradVanes: [
      { id: 'trad26', name: 'AAE Trad 26', len: 2.7, gr: 3.8 },
      { id: 'trad40', name: 'AAE Trad 40', len: 3.9, gr: 5.3 },
      { id: 'trad50', name: 'AAE Trad 50', len: 4.75, gr: 6.6 },
    ],
    vaneShapes: ['parabolic', 'shield', 'lowprofile', 'triangle'],
    fletchLengths: [3, 4, 5, 5.5, 6],
    /** approx grains per piece: feathers ≈ 0.5 gr per inch (5" shield ≈ 2.5–3 gr incl. glue); vanes ≈ 1.6–2 gr/inch */
    fletchWeight(kind, shape, lenIn) {
      if (kind === 'tradvane') { const tv = this.tradVanes.find(v => v.len === lenIn); return tv ? tv.gr : Math.round(lenIn * 1.4 * 10) / 10; }
      if (kind === 'vane') return Math.round(lenIn * 1.9 * 10) / 10;
      const f = shape === 'fluflu' ? 1.6 : 0.65;
      return Math.round(lenIn * f * 10) / 10;
    },
    featherColors: ['#efe6d2', '#f7f4ec', '#c8352a', '#1e1e1e', '#f2c230', '#2f8f4e', '#2c6bd6', '#ff7a1a', '#7a4a2a', '#8a8f96', '#d94f9c', '#8fe8ff'],
    shaftColors: {
      wood: ['#dcb27a', '#e7cf9f', '#c98f5a', '#9c6b3f', '#6e4426', '#3b2417'],
      bamboo: ['#d9c38a', '#c4a868', '#a98a4d', '#6e5530'],
      carbon: ['#1f2124', '#3a3f45', '#5b3a2a', '#7d5a3a', '#b07a45'],
      fiberglass: ['#e9e3c9', '#f2d33d', '#ff7a1a', '#2f8f4e', '#2c6bd6', '#d63a2b', '#1d1d1d'],
      aluminium: ['#8f9aa5', '#c9d0d6', '#3a5a40', '#5c3b6b', '#2c4f7a', '#1d1d1d', '#8a6a3c'],
    },
    crestColors: ['#c8352a', '#1d1d1d', '#f2efe6', '#f2c230', '#2f8f4e', '#2c6bd6', '#ff7a1a', '#7a2a6a', '#b07f22', '#5fb7d6'],
    wrapPatterns: [
      { id: 'solid', name: { es: 'Liso', en: 'Solid' } },
      { id: 'stripes', name: { es: 'Rayas', en: 'Stripes' } },
      { id: 'diamond', name: { es: 'Rombos', en: 'Diamonds' } },
      { id: 'camo', name: { es: 'Camuflaje', en: 'Camo' } },
    ],
    threadColors: ['#c33b2a', '#1d1d1d', '#f2efe6', '#2f6b3a', '#b07f22', '#2c4f7a'],

    // inserts / misc weights
    weights: { insertCarbon: 15, insertAlu: 25, pinBushing: 6, wrap4: 6, wrap7: 10, crown: 4, crest: 1, binding: 2, selfNockInsert: 2, glue: 3 },
  };

  window.CATALOG = CATALOG;
})();
