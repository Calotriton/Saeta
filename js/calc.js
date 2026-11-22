/* =========================================================
   Saeta — calculation engine
   Sources: Club Vall-Llobera "Curs Tecnificació Bàsic" manual (arrow length = draw + 1",
   minimum weight 8–9 gr/lb, point ≈ weight ÷ 3 wood / ÷ 2.5 carbon, Annex I spine charts)
   + 3Rivers / Easton charts, Ashby FOC. Full reasoning: research/bows-and-calcs.md
   Internal units: inches, pounds (lb), grains (gr).
   ========================================================= */
(function () {
  'use strict';
  const C = () => window.CATALOG;
  const R = () => window.SAETA_BOWS || {};
  const IN_CM = 2.54;
  const GR_PER_G = 15.432;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nearest = (arr, v) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), arr[0]);
  const interp = (x, xs, ys) => {
    if (x <= xs[0]) return ys[0] + (x - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]);
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (x - xs[i - 1]) * (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]);
    const n = xs.length - 1;
    return ys[n] + (x - xs[n]) * (ys[n] - ys[n - 1]) / (xs[n] - xs[n - 1]);
  };

  // research → builder vocab
  const MAT_MAP = { cane: 'bamboo', 'carbon-aluminium': 'carbon' };
  const NOCK_MAP = { self: 'self', 'self-reinforced': 'self', 'glue-on-taper': 'over', 'bulbous-asian': 'over', pin: 'pin', 'press-fit': 'inside', 'snap-on': 'inside' };
  const SHAPE_MAP = { 'triangle-historical': 'triangle', 'low-long-historical': 'banana', 'low-profile-vane': 'lowprofile', 'spin-wing': 'lowprofile' };
  const ICONS = { 'longbow-english': 'longbow', flatbow: 'flatbow', 'longbow-hybrid': 'flatbow', 'recurve-traditional': 'recurve', 'recurve-ilf-barebow': 'barebow', 'selfbow-primitive': 'longbow', 'warbow-medieval': 'longbow', 'kids-fiberglass': 'recurve' };

  let bowCache = null;

  const CALC = {
    IN_CM, GR_PER_G,
    cm2in: cm => cm / IN_CM,
    in2cm: i => i * IN_CM,
    gr2g: gr => gr / GR_PER_G,

    /* ---------- bow types (research data, normalised) ---------- */
    bows() {
      if (bowCache) return bowCache;
      const src = R().bowTypes;
      if (!src || !src.length) return (bowCache = C().bows.map(b => Object.assign({ perInchPct: b.perInch / 45, recommended: b.materials, arrowExtra: 1 }, b)));
      bowCache = src.map(b => {
        const fl = b.fletching || {};
        const kind = /vane/.test((fl.type || '') + (fl.shapes || []).join()) && b.shootsOff === 'rest' ? 'vane' : 'feather';
        const ori = /helical/.test(fl.orientation) && !/straight-or/.test(fl.orientation) ? 'helical' : /offset/.test(fl.orientation) ? 'offset' : /straight/.test(fl.orientation) ? 'straight' : 'offset';
        const mats = [...new Set((b.allowedMaterials || []).map(m => MAT_MAP[m] || m))].filter(m => C().materials[m]);
        const rec = [...new Set((b.recommendedMaterials || []).map(m => MAT_MAP[m] || m))].filter(m => C().materials[m]);
        return {
          id: b.id, icon: ICONS[b.id] || (b.id.startsWith('horsebow') ? 'horsebow' : 'recurve'),
          name: b.name, desc: b.desc, notes: b.notes,
          weight: b.drawWeight, shootsOff: b.shootsOff, centreShot: b.centreShot, centreLevel: b.centreShotLevel,
          draw: b.draw, anchor: b.anchor, perInchPct: b.perInchPct || 0.05, spineAdj: b.spineAdj || 0,
          gpp: b.gppRange || [8, 10], materials: mats, recommended: rec,
          fletch: { kind, len: (fl.length && fl.length[1]) || 5, shape: SHAPE_MAP[(fl.shapes || [])[0]] || (fl.shapes || [])[0] || 'shield', ori, count: fl.count || 3, notes: fl.notes },
          points: b.pointWeights || [100, 145], nocks: [...new Set((b.nocks || []).map(n => NOCK_MAP[n]).filter(Boolean))],
          arrowExtra: b.arrowLengthExtraIn != null ? b.arrowLengthExtraIn : 1, brace: b.braceHeightIn || [7, 8],
          speedModel: b.speedModel, styles: b.styles || [],
        };
      });
      return bowCache;
    },
    bow(id) { const l = this.bows(); return l.find(b => b.id === id) || l[0]; },
    styleAdjustments() {
      return (R().drawLength && R().drawLength.styleAdjustments) || [
        { id: 'med-mouth', name: { es: 'Mediterránea, comisura de la boca', en: 'Mediterranean, corner of mouth' }, adjIn: -0.5 },
        { id: 'thumb-cheek', name: { es: 'Pulgar, mejilla/oreja', en: 'Thumb, cheek/ear' }, adjIn: 1 },
      ];
    },
    weightProfiles() {
      return (R().drawWeight && R().drawWeight.profiles) || [
        { id: 'adult-man-beginner', name: { es: 'Hombre adulto, principiante', en: 'Adult man, beginner' }, range: [22, 32] },
      ];
    },

    /* ---------- draw length ---------- */
    /** wingspan(cm) / 2.5 = draw in cm → ÷ 2.54. Same as cm ÷ 6.35. Measured to the back of the bow (Manual). */
    drawFromSpan(cm, styleId) {
      const st = this.styleAdjustments().find(s => s.id === styleId);
      return cm / 6.35 + (st ? st.adjIn : 0);
    },
    /** Manual: arrow length = draw + 1" (2.5 cm), nock groove → end of shaft. Horse bows/kids +2". */
    arrowLength(drawIn, bow) { return drawIn + ((bow && bow.arrowExtra) || 1); },

    /* ---------- draw weight ---------- */
    /** Marked at 28". actual = marked × (1 + pct × (draw − 28)) ≈ 2–3 lb/in around 45 lb. */
    actualWeight(markedLbs, drawIn, bow) {
      const pct = (bow && bow.perInchPct) || 0.05;
      return Math.max(5, markedLbs * (1 + pct * (drawIn - 28)));
    },

    /* ---------- spine ---------- */
    pointAdjWood(pointGr) {
      const p = pointGr || 125;
      if (p < 100) return -5 - (100 - p) * 0.2;
      if (p > 190) return 15 + (p - 190) * 0.167;
      return interp(p, [100, 125, 145, 160, 190], [-5, 0, 5, 10, 15]);
    },
    pointAdjCarbon(pointGr) { return 3 * ((pointGr || 125) - 125) / 25; },

    /** Wood/bamboo (lb): spine = W + pointAdj + bowAdj + stringAdj + 5 × (arrow − 28). Reproduces Manual Annex I. */
    woodSpine({ W, arrowIn, pointGr, bow, string }) {
      const parts = {
        W,
        length: 5 * (arrowIn - 28),
        point: this.pointAdjWood(pointGr),
        bow: (bow && bow.spineAdj) || 0,
        string: string === 'hmpe' ? 5 : 0,
      };
      const v = parts.W + parts.length + parts.point + parts.bow + parts.string;
      const lo = Math.max(10, 5 * Math.floor((v - 0.5) / 5));
      return { value: v, band: [lo, lo + 5], label: `${lo}–${lo + 5} #`, parts };
    },
    /** Effective bow weight for tubes (carbon/aluminium/fibreglass). */
    effectiveWeight({ W, arrowIn, pointGr, bow, string, material }) {
      const parts = {
        W,
        length: 5 * (arrowIn - 28),
        point: material === 'aluminium' ? this.pointAdjWood(pointGr) : this.pointAdjCarbon(pointGr),
        bow: (bow && bow.spineAdj) || 0,
        string: string === 'hmpe' ? 5 : 0,
      };
      return { value: parts.W + parts.length + parts.point + parts.bow + parts.string, parts };
    },
    carbonCurve() {
      const c = R().spine && R().spine.carbon && R().spine.carbon.curve;
      return c || [[15, 1500], [20, 1150], [25, 900], [30, 740], [35, 650], [40, 575], [45, 510], [50, 460], [55, 420], [60, 385], [65, 355], [70, 330], [80, 290], [90, 260], [100, 235]];
    },
    carbonGroups: [1500, 1200, 1000, 900, 800, 700, 600, 500, 400, 340, 300, 250],
    /** log-interpolate the effective-weight curve, snap to the nearest group; flag "between" */
    carbonSpine(eff, available) {
      const cv = this.carbonCurve();
      const xs = cv.map(p => p[0]), ys = cv.map(p => Math.log(p[1]));
      const raw = Math.exp(interp(clamp(eff, 10, 120), xs, ys));
      const groups = (available && available.length ? available : this.carbonGroups).slice().sort((a, b) => b - a);
      let best = groups[0];
      for (const g of groups) if (Math.abs(Math.log(g) - Math.log(raw)) < Math.abs(Math.log(best) - Math.log(raw))) best = g;
      const i = groups.indexOf(best);
      const other = raw < best ? groups[i + 1] : groups[i - 1];
      let between = null;
      if (other && Math.abs(Math.log(raw) - Math.log(Math.sqrt(best * other))) < 0.03) between = [Math.max(best, other), Math.min(best, other)];
      return { raw, spine: best, between, label: between ? `${between[0]}/${between[1]}` : String(best) };
    },
    aluSize(eff) {
      const chart = R().spine && R().spine.aluminium && R().spine.aluminium.chart;
      const avail = C().aluSizes.map(a => a.id);
      if (chart) {
        const row = chart.find(r => eff <= r.effectiveLbsMax + 0.5) || chart[chart.length - 1];
        const id = (row.sizes || []).find(s => avail.includes(s));
        if (eff < chart[0].effectiveLbsMin) return { id: '1716', group: 'A', sizes: ['1716'], note: 'light' };
        return { id: id || row.sizes[0], group: row.group, sizes: row.sizes };
      }
      return { id: '1916', sizes: ['1916'] };
    },
    fiberglassAdvice(W) {
      const bands = R().spine && R().spine.fiberglass && R().spine.fiberglass.bands;
      return bands ? bands.find(b => W >= b.lbs[0] && W < b.lbs[1]) || bands[bands.length - 1] : null;
    },
    fiberglassSize(W) {
      const list = C().fiberglassSizes;
      return list.find(x => W <= x.maxLbs) || list[list.length - 1];
    },
    woodDiameter(spineLbs) {
      if (spineLbs < 25) return '9/32';
      if (spineLbs < 42) return '5/16';
      if (spineLbs < 62) return '11/32';
      if (spineLbs < 75) return '23/64';
      if (spineLbs < 90) return '3/8';
      if (spineLbs < 110) return '7/16';
      return '1/2';
    },
    /** Manual's English-longbow chart, reproduced */
    longbowChart() {
      const c = R().spine && R().spine.wood && R().spine.wood.charts && R().spine.wood.charts.manualEnglishLongbow;
      return c || null;
    },

    /* ---------- weights ---------- */
    /** Manual Form. 3: minimum arrow weight = lb × 8–9 gr */
    minArrowWeight(W, gpp) { return W * (gpp || 8); },
    /**
     * Manual Form. 1/2 (quick): total target = lb × gpp → point ≈ total ÷ 3 (wood) / ÷ 2.5 (tubes).
     * Manual Form. 5/6 (precise, our reading): point ≈ (shaft + nock + fletching + wrap) ÷ 3 / ÷ 2.5.
     */
    divisor(material) { return (C().materials[material] || {}).pointDivisor || 3; },
    pointQuick(W, material, gpp) { return (W * (gpp || 8.5)) / this.divisor(material); },
    pointPrecise(restGr, material) { return restGr / this.divisor(material); },

    /** grains per inch for the selected shaft */
    shaftGpi(st) {
      const cat = C();
      const m = st.material;
      if (m === 'wood' || m === 'bamboo') {
        const dia = (cat.DIAMETERS[st.shaft.diameter] || cat.DIAMETERS['11/32']).in;
        let density;
        if (m === 'bamboo') density = 0.62;
        else {
          const sp = cat.woods.find(w => w.id === st.shaft.species) || cat.woods[0];
          density = (sp.density[0] + sp.density[1]) / 2;
        }
        return cat.woodGpi(density, dia);
      }
      if (m === 'carbon') {
        const model = this.carbonModel(st.shaft.model);
        let gpi;
        if (model) {
          const row = model.spines.find(x => x.spine === st.shaft.spine) || model.spines[0];
          gpi = row.gpi;
        } else {
          const row = cat.carbonSpines.find(x => x.spine === st.shaft.spine) || cat.carbonSpines[5];
          gpi = row.gpi;
          if (st.shaft.idSize === '5.2') gpi *= 0.97;
          if (st.shaft.idSize === '4.2') gpi *= 0.95;
        }
        if (st.shaft.look === 'footed') gpi += 1.2; // 6" wood footing averaged over the shaft
        return gpi;
      }
      if (m === 'aluminium') return (cat.aluSizes.find(x => x.id === st.shaft.aluSize) || cat.aluSizes[6]).gpi;
      if (m === 'fiberglass') return (cat.fiberglassSizes.find(x => x.id === st.shaft.fgSize) || cat.fiberglassSizes[1]).gpi;
      return 9;
    },
    carbonModels() {
      const comp = window.SAETA_COMPONENTS;
      const opts = comp && comp.shafts && comp.shafts.carbon && comp.shafts.carbon.options;
      if (!opts) return [];
      return opts.map(o => ({
        id: o.id, name: o.name, brand: o.brand, desc: o.desc, color: o.color, finish: o.finish, idInch: o.idInch, nock: o.nock, insert: o.insert, source: o.source,
        spines: (o.spines || []).filter(s => typeof s.spine === 'number' && typeof s.gpi === 'number'),
      })).filter(o => o.spines.length >= 2);
    },
    carbonModel(id) { return id && id !== 'generic' ? this.carbonModels().find(m => m.id === id) : null; },

    /** Weight breakdown + balance (FOC). Positions in inches from the nock groove. */
    build(st) {
      const cat = C();
      const L = st.shaft.lengthIn;
      const gpi = this.shaftGpi(st);
      const W = cat.weights;
      const parts = [];
      const add = (id, gr, x) => { if (gr > 0) parts.push({ id, gr, x }); };

      add('shaft', gpi * L, L / 2);
      const pt = cat.points.find(p => p.id === st.point.id) || {};
      add('point', st.point.weight, L + 0.3);
      if (pt.fit === 'insert') add('insert', st.material === 'aluminium' ? W.insertAlu : W.insertCarbon, L - 0.5);
      if (pt.fit === 'adapter') add('insert', pt.insert || 25, L - 0.3);
      const nk = cat.nocks.find(n => n.id === st.nock.id) || {};
      add('nock', (nk.weight || 0) + (nk.type === 'pin' ? W.pinBushing : 0) + (nk.type === 'self' ? W.selfNockInsert + W.binding : 0), 0.3);
      const fl = st.fletch;
      const per = cat.fletchWeight(fl.kind, fl.shape, fl.lengthIn) + 1; // + ~1 gr glue each
      add('fletching', per * fl.count, (fl.offsetIn || 1.25) + fl.lengthIn / 2);
      if (st.deco.wrap.on) add('wrap', st.deco.wrap.lengthIn > 5 ? W.wrap7 : W.wrap4, 0.25 + st.deco.wrap.lengthIn / 2);
      if (st.deco.crown.on) add('crown', W.crown, st.deco.crown.lengthIn / 2);
      const nCrest = (st.deco.cresting || []).length;
      if (nCrest) add('cresting', nCrest * W.crest, 3);
      if (st.deco.binding.on && fl.kind === 'feather') add('binding', W.binding * 2, (fl.offsetIn || 1.25) + fl.lengthIn / 2);

      const total = parts.reduce((s, p) => s + p.gr, 0);
      const front = parts.filter(p => p.id === 'point' || p.id === 'insert').reduce((s, p) => s + p.gr, 0);
      const bp = parts.reduce((s, p) => s + p.gr * p.x, 0) / total;
      const foc = (bp - L / 2) / L * 100;
      return { parts, total, gpi, rest: total - front, balanceIn: bp, foc };
    },

    /** Rough speed (virtual-mass model, ±10–15 %). */
    speed({ W, drawIn, braceIn, arrowGr, bow }) {
      const sm = (bow && bow.speedModel) || { storageFactor: 0.5, hysteresis: 0.9, virtualMassGr: 140 };
      const E = sm.storageFactor * W * (drawIn - 1.75 - braceIn) / 12;
      const eta = sm.hysteresis * arrowGr / (arrowGr + sm.virtualMassGr);
      const fps = Math.sqrt(450240 * eta * Math.max(0, E) / arrowGr);
      return { fps, ms: fps * 0.3048, keJ: arrowGr * fps * fps / 450240 * 1.3558 };
    },

    gppBand(gpp) {
      const bands = (R().weights && R().weights.gppBands) || [];
      return bands.find(b => (b.min == null || gpp >= b.min) && (b.max == null || gpp < b.max));
    },
    gppStatus(gpp, bow) {
      const min = bow && bow.gpp ? Math.min(8, bow.gpp[0]) : 8;
      if (gpp < 6) return 'bad';
      if (gpp < min) return 'warn';
      return 'ok';
    },
    focStatus(foc) { return foc < 5 || foc > 20 ? 'warn' : 'ok'; },

    utils: { clamp, nearest, interp },
  };

  window.CALC = CALC;
})();
