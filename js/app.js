/* =========================================================
   Saeta — application (state, wizard, sections)
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const CAT = window.CATALOG;
  const has = id => !!document.getElementById(id);
  const PAGE = document.body.dataset.page || 'home';
  const pageUrl = file => new URL(file, location.href).href.split('#')[0];
  const CALC = window.CALC;
  const PROC = window.SAETA_PROCESS || { materials: {}, glossary: [] };
  const COMP = window.SAETA_COMPONENTS || {};
  const SHOPS = (window.SAETA_SHOPS || []).filter(s => s && s.name && s.url);
  const I18N = window.I18N;

  // ---------------- i18n helpers ----------------
  let lang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
  if (!I18N[lang]) lang = (navigator.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  const t = (k, vars) => {
    let s = (I18N[lang] && I18N[lang][k]) ?? I18N.es[k] ?? k;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  const L = o => (o == null ? '' : typeof o === 'string' ? o : (o[lang] ?? o.es ?? o.en ?? ''));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 0) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const store = {
    get(k) { try { return localStorage.getItem('saeta.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('saeta.' + k, v); } catch (e) { /* private mode */ } },
  };

  // ---------------- preferences (local, no account) ----------------
  let P = { country: null, favShops: [], defaults: null };
  try { const p = JSON.parse(store.get('prefs') || 'null'); if (p && typeof p === 'object') P = Object.assign(P, p); } catch (e) { /* ignore */ }
  if (!Array.isArray(P.favShops)) P.favShops = [];
  const savePrefs = () => store.set('prefs', JSON.stringify(P));

  // ---------------- state ----------------
  const BASE = () => ({
    v: 1, step: 0, units: 'cm',
    bow: { type: 'recurve-traditional', weightKnown: true, marked: 35, profile: 'adult-man-beginner', drawKnown: true, draw: 28, span: 175, spanMode: 'wingspan', style: 'med-mouth', string: 'dacron', hand: 'right' },
    material: 'wood',
    shaft: { species: 'cedar', diameter: '11/32', autoDia: true, model: 'generic', idSize: '6.2', spine: 500, autoSpine: true, aluSize: '1916', autoAlu: true, fgSize: 'fg-medium', autoFg: true, look: 'plain', color: '#dcb27a', footColor: '#7a4a2a', autoLen: true, lengthIn: 29 },
    point: { id: 'glueon-field', weight: 125, auto: true, metal: 'steel', color: '#d6d3cc' },
    nock: { id: 'over', color: '#f2efe6' },
    fletch: { kind: 'feather', shape: 'shield', lengthIn: 5, count: 3, orientation: 'helical', wing: 'RW', cockColor: '#c8352a', henColor: '#efe6d2', barred: false, offsetIn: 1.25 },
    deco: { crown: { on: false, color: '#1f3b5c', lengthIn: 9 }, cresting: [], wrap: { on: false, color: '#f5f1e6', lengthIn: 7, pattern: 'solid' }, binding: { on: false, color: '#c33b2a' } },
    gppTarget: 8.5, pointMode: 'precise', country: 'ES',
  });
  const DEFAULT = () => {
    const d = BASE();
    if (P.defaults) merge(d, JSON.parse(JSON.stringify(P.defaults)));
    if (P.country) d.country = P.country;
    if (P.units) d.units = P.units;
    return d;
  };
  function merge(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  let S = DEFAULT();
  (function loadState() {
    try {
      const h = location.hash.match(/#a=([A-Za-z0-9_-]+)/);
      if (h) {
        const json = decodeURIComponent(escape(atob(h[1].replace(/-/g, '+').replace(/_/g, '/'))));
        S = merge(DEFAULT(), JSON.parse(json));
        return;
      }
      const saved = store.get('state');
      if (saved) S = merge(DEFAULT(), JSON.parse(saved));
    } catch (e) { S = DEFAULT(); }
  })();
  const save = () => store.set('state', JSON.stringify(S));
  const shareUrl = () => {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(S)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return pageUrl('constructor.html') + '#a=' + b64;
  };
  function setPath(path, val) {
    const ks = path.split('.');
    let o = S;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), S); }

  // ---------------- lookups ----------------
  const bow = () => CALC.bow(S.bow.type);
  const mat = () => CAT.materials[S.material];
  const pointDef = id => CAT.points.find(p => p.id === (id || S.point.id));
  const nockDef = id => CAT.nocks.find(n => n.id === (id || S.nock.id));
  const isTube = m => ['carbon', 'aluminium', 'fiberglass'].includes(m || S.material);
  const shelfOrHand = () => ['hand', 'shelf'].includes(bow().shootsOff);

  /** keep the configuration coherent after any change */
  function normalize() {
    const b = bow();
    // points & nocks valid for material
    if (!pointDef() || !pointDef().materials.includes(S.material)) {
      const p = CAT.points.find(x => x.materials.includes(S.material) && x.rec) || CAT.points.find(x => x.materials.includes(S.material));
      S.point.id = p.id; S.point.auto = true;
    }
    if (!nockDef() || !nockDef().materials.includes(S.material)) {
      const pref = b.nocks.map(id => CAT.nocks.find(n => n.id === id)).find(n => n && n.materials.includes(S.material));
      S.nock.id = (pref || CAT.nocks.find(n => n.materials.includes(S.material) && n.rec) || CAT.nocks.find(n => n.materials.includes(S.material))).id;
    }
    // fletching
    if (S.fletch.kind === 'vane' && !CAT.vaneShapes.includes(S.fletch.shape)) S.fletch.shape = 'parabolic';
    if (S.fletch.kind === 'tradvane') {
      S.fletch.shape = 'tradvane';
      if (!CAT.tradVanes.some(v => v.len === S.fletch.lengthIn)) S.fletch.lengthIn = 3.9;
    } else {
      if (S.fletch.shape === 'tradvane') S.fletch.shape = 'shield';
      if (!CAT.fletchLengths.includes(S.fletch.lengthIn)) S.fletch.lengthIn = CALC.utils.nearest(CAT.fletchLengths, S.fletch.lengthIn);
    }
    if (S.fletch.kind !== 'feather') { S.deco.binding.on = false; S.fletch.barred = false; }
    if (S.fletch.shape === 'fluflu') S.fletch.orientation = 'helical';
    // carbon model consistency
    if (S.material === 'carbon') {
      const m = CALC.carbonModel(S.shaft.model);
      if (S.shaft.model !== 'generic' && !m) S.shaft.model = 'generic';
      if (m) {
        const idmm = m.idInch < 0.18 ? '4.2' : m.idInch < 0.22 ? '5.2' : '6.2';
        S.shaft.idSize = idmm;
        if (!m.spines.some(x => x.spine === S.shaft.spine)) S.shaft.spine = CALC.utils.nearest(m.spines.map(x => x.spine), S.shaft.spine);
      }
    }
    // weights available
    const pd = pointDef();
    if (!S.point.auto && !pd.weights.includes(S.point.weight)) S.point.weight = CALC.utils.nearest(pd.weights, S.point.weight);
    if (S.deco.cresting.length > 6) S.deco.cresting.length = 6;
  }

  // ---------------- derived values ----------------
  let D = {};
  function derive() {
    normalize();
    const b = bow();
    const out = { bow: b };
    out.draw = S.bow.drawKnown ? +S.bow.draw : CALC.drawFromSpan(+S.bow.span, S.bow.style);
    out.drawEstimated = !S.bow.drawKnown;
    let marked = +S.bow.marked;
    if (!S.bow.weightKnown) {
      const pr = CALC.weightProfiles().find(p => p.id === S.bow.profile) || CALC.weightProfiles()[0];
      marked = Math.round((pr.range[0] + pr.range[1]) / 2);
      out.profileRange = pr.range;
    }
    out.marked = marked;
    out.W = CALC.actualWeight(marked, out.draw, b);
    out.arrowAuto = Math.round(CALC.arrowLength(out.draw, b) * 4) / 4;
    if (S.shaft.autoLen) S.shaft.lengthIn = out.arrowAuto;
    out.arrowIn = +S.shaft.lengthIn;

    const pd = pointDef();
    const calcSpine = pointGr => {
      const sp = {};
      if (S.material === 'wood' || S.material === 'bamboo') {
        sp.wood = CALC.woodSpine({ W: marked, arrowIn: out.arrowIn, pointGr, bow: b, string: S.bow.string });
        sp.dia = CALC.woodDiameter(sp.wood.value);
        if (!CAT.DIAMETERS[sp.dia]) sp.dia = '5/16';
      } else {
        sp.eff = CALC.effectiveWeight({ W: out.W, arrowIn: out.arrowIn, pointGr, bow: b, string: S.bow.string, material: S.material });
        if (S.material === 'carbon') {
          const m = CALC.carbonModel(S.shaft.model);
          sp.carbon = CALC.carbonSpine(sp.eff.value, m ? m.spines.map(x => x.spine) : CAT.carbonSpines.map(x => x.spine));
        } else if (S.material === 'aluminium') sp.alu = CALC.aluSize(sp.eff.value);
        else { sp.fg = CALC.fiberglassSize(out.W); sp.fgAdvice = CALC.fiberglassAdvice(out.W); }
      }
      return sp;
    };
    const applySpine = sp => {
      if (sp.dia && S.shaft.autoDia) S.shaft.diameter = sp.dia;
      if (sp.carbon && S.shaft.autoSpine) S.shaft.spine = sp.carbon.spine;
      if (sp.alu && S.shaft.autoAlu) S.shaft.aluSize = sp.alu.id;
      if (sp.fg && S.shaft.autoFg) S.shaft.fgSize = sp.fg.id;
    };
    // pass 1: spine with the current point, then point from the manual rule, then spine again
    let sp = calcSpine(S.point.weight);
    applySpine(sp);
    out.pointQuick = CALC.pointQuick(out.W, S.material, S.gppTarget);
    let bd = CALC.build(S);
    out.pointPrecise = CALC.pointPrecise(bd.rest, S.material);
    const target = S.pointMode === 'quick' ? out.pointQuick : out.pointPrecise;
    out.pointRec = CALC.utils.nearest(pd.weights, target);
    if (S.point.auto) {
      S.point.weight = out.pointRec;
      sp = calcSpine(S.point.weight);
      applySpine(sp);
    }
    out.spine = sp;
    bd = CALC.build(S);
    out.build = bd;
    out.total = bd.total;
    out.gpp = bd.total / out.W;
    out.minWeight = CALC.minArrowWeight(out.W, 8);
    out.foc = bd.foc;
    const brace = (b.brace[0] + b.brace[1]) / 2;
    out.speed = CALC.speed({ W: out.W, drawIn: out.draw, braceIn: brace, arrowGr: bd.total, bow: b });
    out.warnings = warnings(out);
    D = out;
    return out;
  }

  function spineSummary(d) {
    const sp = d.spine;
    if (sp.wood) return { rec: sp.wood.label, chosen: `${S.shaft.diameter}" · ${sp.wood.label}` };
    if (sp.carbon) return { rec: sp.carbon.label, chosen: String(S.shaft.spine) };
    if (sp.alu) return { rec: sp.alu.sizes.join(' / '), chosen: S.shaft.aluSize };
    if (sp.fg) return { rec: L(sp.fg.name), chosen: L((CAT.fiberglassSizes.find(f => f.id === S.shaft.fgSize) || {}).name) };
    return { rec: '–', chosen: '–' };
  }

  function warnings(d) {
    const w = [];
    const b = d.bow;
    const st = CALC.gppStatus(d.gpp, b);
    if (st === 'bad') w.push({ lvl: 'bad', text: t('warn.gppBad', { gpp: fmt(d.gpp, 1) }) });
    else if (st === 'warn') w.push({ lvl: 'warn', text: t('warn.gppLow', { gpp: fmt(d.gpp, 1), min: fmt(d.minWeight) }) });
    if (d.gpp > 13 && st === 'ok') w.push({ lvl: 'info', text: t('warn.gppHigh', { gpp: fmt(d.gpp, 1) }) });
    if (!b.materials.includes(S.material)) w.push({ lvl: 'warn', text: t('warn.material', { mat: L(mat().name), bow: L(b.name) }) });
    if (CALC.focStatus(d.foc) !== 'ok') w.push({ lvl: 'info', text: t(d.foc < 5 ? 'warn.focLow' : 'warn.focHigh', { foc: fmt(d.foc, 1) }) });
    const sp = d.spine;
    if (sp.wood && !S.shaft.autoDia && S.shaft.diameter !== sp.dia) w.push({ lvl: 'info', text: t('warn.diameter', { dia: sp.dia }) });
    if (sp.carbon && !S.shaft.autoSpine && S.shaft.spine !== sp.carbon.spine) {
      const diff = Math.abs(Math.log(S.shaft.spine / sp.carbon.raw));
      w.push({ lvl: diff > 0.25 ? 'warn' : 'info', text: t('warn.spine', { rec: sp.carbon.label, sel: S.shaft.spine }) });
    }
    if (sp.alu && !S.shaft.autoAlu && !sp.alu.sizes.includes(S.shaft.aluSize)) w.push({ lvl: 'warn', text: t('warn.spine', { rec: sp.alu.sizes.join('/'), sel: S.shaft.aluSize }) });
    if (S.material === 'fiberglass' && d.W > 30) w.push({ lvl: 'warn', text: t('warn.fiberglass') });
    const pd = pointDef();
    if (pd.hunting) w.push({ lvl: 'warn', text: t('warn.hunting') });
    if (pd.id === 'larp') w.push({ lvl: 'bad', text: t('warn.larp') });
    if (!S.point.auto && Math.abs(S.point.weight - d.pointRec) > 30) w.push({ lvl: 'info', text: t('warn.point', { rec: d.pointRec }) });
    if (S.fletch.kind === 'vane' && shelfOrHand()) w.push({ lvl: 'warn', text: t('warn.vaneShelf') });
    if (S.fletch.kind === 'tradvane') w.push({ lvl: 'info', text: t('warn.tradvaneGlue') });
    if (b.draw === 'thumb') w.push({ lvl: 'info', text: t('warn.thumb') });
    if (b.id === 'warbow-medieval') w.push({ lvl: 'info', text: t('warn.warbow') });
    if (S.material === 'carbon') w.push({ lvl: 'info', text: t('warn.hotmelt') });
    if (d.drawEstimated) w.push({ lvl: 'info', text: t('warn.estimated') });
    return w;
  }

  const fletchName = f => (f.kind === 'tradvane' ? (CAT.tradVanes.find(v => v.len === f.lengthIn) || CAT.tradVanes[1]).name : L((CAT.fletchShapes.find(s => s.id === f.shape) || CAT.fletchShapes[0]).name));
  const kindName = f => t(f.kind === 'feather' ? 's6.feather' : f.kind === 'tradvane' ? 's6.tradvane' : 's6.vane');

  // ---------------- formatting ----------------
  const len = (inch, d = 1) => S.units === 'cm' ? `${fmt(inch * 2.54, d)} cm` : `${fmt(inch, inch % 1 ? 2 : 0)}"`;
  const lenBoth = inch => `${fmt(inch, inch % 1 ? 2 : 0)}" · ${fmt(inch * 2.54, 1)} cm`;
  const gr = g => `${fmt(g)} gr`;
  const grG = g => `${fmt(g)} gr <small>(${fmt(g / 15.432, 1)} g)</small>`;
  const tag = (txt, cls) => `<span class="tag ${cls || ''}">${esc(txt)}</span>`;
  const dots = n => `<span class="dots" aria-label="${n}/3">${'◆'.repeat(n)}${'◇'.repeat(3 - n)}</span>`;

  // ---------------- arrow spec for renderers ----------------
  function arrowSpec() {
    const d = D;
    let diameterIn;
    if (S.material === 'wood' || S.material === 'bamboo') diameterIn = CAT.DIAMETERS[S.shaft.diameter].in;
    else if (S.material === 'carbon') diameterIn = S.shaft.idSize === '4.2' ? 0.235 : S.shaft.idSize === '5.2' ? 0.265 : 0.296;
    else if (S.material === 'aluminium') diameterIn = parseInt(S.shaft.aluSize.slice(0, 2), 10) / 64;
    else diameterIn = 0.3125;
    const pd = pointDef();
    const nd = nockDef();
    let shaftColor = S.shaft.color;
    if (S.material === 'carbon') {
      const m = CALC.carbonModel(S.shaft.model);
      if (m && S.shaft.look === 'plain' && m.finish === 'woodgrain') shaftColor = m.color;
    }
    return {
      material: S.material, lengthIn: d.arrowIn, diameterIn, shaftColor,
      carbonLook: S.material === 'carbon' ? (S.shaft.look === 'plain' ? (CALC.carbonModel(S.shaft.model) || {}).finish === 'woodgrain' ? 'wood' : '' : S.shaft.look) : '',
      footColor: S.shaft.footColor,
      point: { shape: pd.shape, metal: S.point.metal, color: S.point.color },
      nock: { type: nd.type, color: S.nock.color, binding: S.deco.binding.color },
      fletch: Object.assign({}, S.fletch),
      crown: S.deco.crown, cresting: S.deco.cresting, wrap: S.deco.wrap, binding: S.deco.binding,
      dimension: true, labels: { length: lenBoth(d.arrowIn) },
    };
  }

  // ---------------- bench ----------------
  let view = '2d';
  function renderBench() {
    if (!has('view2d')) return;
    const spec = arrowSpec();
    if (view === '2d') window.Viz2D.render($('#view2d'), spec);
    else window.Viz3D.render($('#view3d'), spec).catch(() => { toast(t('bench.3dfail')); setView('2d'); });
    const d = D;
    const ss = spineSummary(d);
    const gppSt = CALC.gppStatus(d.gpp, d.bow);
    const stats = [
      { k: t('stat.length'), v: len(d.arrowIn), title: lenBoth(d.arrowIn) },
      { k: t('stat.spine'), v: esc(ss.chosen.replace('" · ', '" ')) },
      { k: t('stat.point'), v: gr(S.point.weight) },
      { k: t('stat.total'), v: `${fmt(d.total)} <small>gr</small>` },
      { k: 'GPP', v: fmt(d.gpp, 1), cls: gppSt },
      { k: 'FOC', v: `${fmt(d.foc, 1)}%`, cls: CALC.focStatus(d.foc) },
    ];
    $('#stats').innerHTML = stats.map(s => `<div class="stat ${s.cls ? 'stat--' + s.cls : ''}" ${s.title ? `title="${esc(s.title)}"` : ''}><dt>${s.k}</dt><dd>${s.v}</dd></div>`).join('');
    $('#view2d').setAttribute('aria-label', t('bench.aria', { len: lenBoth(d.arrowIn), mat: L(mat().name) }));
  }
  function setView(v) {
    view = v;
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    $('#view2d').hidden = v !== '2d';
    $('#view3d').hidden = v !== '3d';
    $('#viewHint').textContent = t(v === '2d' ? 'bench.hint2d' : 'bench.hint3d');
    renderBench();
  }

  // tooltip on arrow parts
  const PART_KEYS = { point: 'part.point', nock: 'part.nock', shaft: 'part.shaft', fletching: 'part.fletching', crown: 'part.crown', wrap: 'part.wrap', cresting: 'part.cresting', binding: 'part.binding' };
  function partInfo(part) {
    const bdp = (D.build.parts.find(p => p.id === part) || {});
    const w = bdp.gr ? ` · ${fmt(bdp.gr)} gr` : '';
    switch (part) {
      case 'point': return `<b>${esc(L(pointDef().name))}</b>${S.point.weight} gr`;
      case 'nock': return `<b>${esc(L(nockDef().name))}</b>${w.slice(3)}`;
      case 'shaft': return `<b>${esc(L(mat().name))}</b>${esc(spineSummary(D).chosen)}${w}`;
      case 'fletching': return `<b>${t('part.fletching')}</b>${S.fletch.count} × ${S.fletch.lengthIn}" ${esc(fletchName(S.fletch))}${w}`;
      default: return `<b>${t(PART_KEYS[part] || part)}</b>${w.slice(3)}`;
    }
  }
  function bindTooltip() {
    if (!has('view2d')) return;
    const tip = $('#tooltip');
    const v = $('#view2d');
    v.addEventListener('pointermove', e => {
      const p = e.target.closest('[data-part]');
      if (!p) { tip.hidden = true; return; }
      tip.innerHTML = partInfo(p.dataset.part);
      tip.hidden = false;
      const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14);
      tip.style.left = x + 'px';
      tip.style.top = (e.clientY + 18) + 'px';
    });
    v.addEventListener('pointerleave', () => { tip.hidden = true; });
    v.addEventListener('click', e => {
      const p = e.target.closest('[data-part]');
      if (!p) return;
      const map = { point: 3, nock: 4, fletching: 5, binding: 5, shaft: 2, crown: 6, wrap: 6, cresting: 6 };
      if (map[p.dataset.part] != null) goStep(map[p.dataset.part]);
    });
  }

  // ---------------- icons ----------------
  const BOW_ICONS = {
    longbow: '<path d="M38 4 Q6 50 38 96" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square"/><path d="M38 4 V96" stroke="currentColor" stroke-width="1.5"/>',
    flatbow: '<path d="M38 5 Q18 22 16 44 L14 50 L16 56 Q18 78 38 95" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="bevel"/><path d="M38 5 V95" stroke="currentColor" stroke-width="1.5"/>',
    recurve: '<path d="M42 6 Q36 8 34 14 Q16 34 18 50 Q16 66 34 86 Q36 92 42 94" fill="none" stroke="currentColor" stroke-width="5"/><path d="M36 12 V88" stroke="currentColor" stroke-width="1.5"/>',
    barebow: '<path d="M42 6 Q36 8 34 14 Q22 28 21 36 M21 64 Q22 72 34 86 Q36 92 42 94" fill="none" stroke="currentColor" stroke-width="5"/><rect x="15" y="34" width="9" height="32" fill="currentColor"/><path d="M36 12 V88" stroke="currentColor" stroke-width="1.5"/>',
    horsebow: '<path d="M44 16 L36 22 Q20 36 24 50 Q20 64 36 78 L44 84" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="bevel"/><path d="M42 18 V82" stroke="currentColor" stroke-width="1.5"/>',
  };
  const bowIcon = id => `<svg viewBox="0 0 60 100" class="pixel" aria-hidden="true" style="height:54px;width:auto">${BOW_ICONS[id] || BOW_ICONS.recurve}</svg>`;
  const iconCache = {};
  const cachedIcon = (key, fn) => iconCache[key] || (iconCache[key] = fn());

  // ---------------- UI builders ----------------
  const optCard = ({ path, val, pressed, title, desc, meta, art, disabled, disabledWhy }) => `
    <button type="button" class="opt" data-set="${path}" data-val='${esc(JSON.stringify(val))}' aria-pressed="${pressed}" ${disabled ? 'disabled' : ''} ${disabledWhy ? `title="${esc(disabledWhy)}"` : ''}>
      ${art ? `<span class="opt__art">${art}</span>` : ''}
      <span class="opt__title">${esc(title)}</span>
      ${desc ? `<span class="opt__desc">${esc(desc)}</span>` : ''}
      ${meta ? `<span class="opt__meta">${meta}</span>` : ''}
    </button>`;
  const swatches = (path, colors, current) => `<div class="swatches">${colors.map(c => `<button type="button" class="sw" style="background:${c}" data-set="${path}" data-val='"${c}"' aria-pressed="${c.toLowerCase() === String(current).toLowerCase()}" aria-label="${c}"></button>`).join('')}<input type="color" data-bind="${path}" value="${esc(current)}" aria-label="${t('ui.custom')}"></div>`;
  const toggle = (path, label) => `<label class="check"><input type="checkbox" data-bind="${path}" ${getPath(path) ? 'checked' : ''}> ${esc(label)}</label>`;
  const select = (path, options, current) => `<select data-bind="${path}">${options.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(current) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
  const seg = (path, options, current) => `<div class="seg seg--sm" role="group">${options.map(o => `<button type="button" class="seg__btn" data-set="${path}" data-val='${esc(JSON.stringify(o.v))}' aria-pressed="${o.v === current}">${esc(o.l)}</button>`).join('')}</div>`;
  const callout = (lvl, html) => `<div class="callout callout--${lvl}"><span class="callout__ico" aria-hidden="true">${{ info: 'i', warn: '!', bad: '✕', ok: '✓' }[lvl] || 'i'}</span><div>${html}</div></div>`;
  const numIn = (path, val, min, max, step, unit) => `<div class="inrow"><input type="number" inputmode="decimal" data-bind="${path}" value="${val}" min="${min}" max="${max}" step="${step}"><span class="unit">${unit}</span></div>`;

  // ---------------- steps ----------------
  const STEPS = [
    { id: 'bow', key: 'step.bow', render: stepBow },
    { id: 'material', key: 'step.material', render: stepMaterial },
    { id: 'shaft', key: 'step.shaft', render: stepShaft },
    { id: 'point', key: 'step.point', render: stepPoint },
    { id: 'nock', key: 'step.nock', render: stepNock },
    { id: 'fletch', key: 'step.fletch', render: stepFletch },
    { id: 'deco', key: 'step.deco', render: stepDeco },
    { id: 'summary', key: 'step.summary', render: stepSummary },
  ];

  function stepBow() {
    const b = bow();
    const bows = CALC.bows();
    const d = D;
    const drawCm = S.bow.draw * 2.54;
    return `
      <h3>${t('s1.title')}</h3>
      <p class="intro">${t('s1.intro')}</p>
      <h4 class="sub">${t('s1.type')}</h4>
      <div class="cards">${bows.map(x => optCard({
        path: 'bow.type', val: x.id, pressed: x.id === S.bow.type, title: L(x.name), desc: L(x.desc).split('. ')[0].replace(/\.+$/, '') + '.',
        art: bowIcon(x.icon), meta: tag(`${x.weight[0]}–${x.weight[1]} lb`) + tag(t('off.' + x.shootsOff)) + (x.draw === 'thumb' ? tag(t('ui.thumb')) : ''),
      })).join('')}</div>
      ${b.notes ? callout('info', esc(L(b.notes))) : ''}

      <div class="grid2" style="margin-top:24px">
        <div>
          <h4 class="sub">${t('s1.weight')}</h4>
          ${seg('bow.weightKnown', [{ v: true, l: t('ui.iKnow') }, { v: false, l: t('ui.iDontKnow') }], S.bow.weightKnown)}
          <div style="margin-top:12px">
          ${S.bow.weightKnown ? `
            <label class="field"><span>${t('s1.marked')}</span>${numIn('bow.marked', S.bow.marked, 8, 160, 1, 'lb')}<small>${t('s1.markedHelp')}</small></label>
          ` : `
            <div class="estimator">
              <label class="field"><span>${t('s1.profile')}</span>${select('bow.profile', CALC.weightProfiles().map(p => ({ v: p.id, l: `${L(p.name)} · ${p.range[0]}–${p.range[1]} lb` })), S.bow.profile)}</label>
              <p class="small muted" style="margin:8px 0 0">${t('s1.profileHelp', { lb: d.marked })}</p>
            </div>`}
          </div>
          <dl class="kv" style="margin-top:14px">
            <dt>${t('s1.atDraw')}</dt><dd><span class="result-big">${fmt(d.W, 1)}</span> lb</dd>
          </dl>
          <p class="small muted">${t('s1.atDrawHelp', { pct: fmt(b.perInchPct * 100, 1) })}</p>
        </div>
        <div>
          <h4 class="sub">${t('s1.draw')}</h4>
          ${seg('bow.drawKnown', [{ v: true, l: t('ui.iKnow') }, { v: false, l: t('ui.iDontKnow') }], S.bow.drawKnown)}
          <div style="margin-top:12px">
          ${S.bow.drawKnown ? `
            <label class="field"><span>${t('s1.drawIn')}</span>
              <div class="inrow">
                <input type="number" inputmode="decimal" data-bind="bow.draw" value="${S.bow.draw}" min="14" max="36" step="0.25"><span class="unit">in</span>
                <span class="unit">=</span>
                <input type="number" inputmode="decimal" data-bind-cm="bow.draw" value="${fmt(drawCm, 1).replace(',', '.')}" min="35" max="92" step="0.5"><span class="unit">cm</span>
              </div>
              <small>${t('s1.drawHelp')}</small></label>
          ` : `
            <div class="estimator">
              ${seg('bow.spanMode', [{ v: 'wingspan', l: t('s1.wingspan') }, { v: 'height', l: t('s1.height') }], S.bow.spanMode)}
              <label class="field" style="margin-top:10px"><span>${S.bow.spanMode === 'wingspan' ? t('s1.wingspanCm') : t('s1.heightCm')}</span>${numIn('bow.span', S.bow.span, 90, 220, 1, 'cm')}</label>
              <label class="field" style="margin-top:10px"><span>${t('s1.style')}</span>${select('bow.style', CALC.styleAdjustments().map(s => ({ v: s.id, l: `${L(s.name)} (${s.adjIn > 0 ? '+' : ''}${s.adjIn}")` })), S.bow.style)}</label>
              <div class="formula" style="margin-top:12px">${S.bow.spanMode === 'wingspan' ? t('s1.wingspan') : t('s1.height')} ${S.bow.span} cm ÷ 2,5 ÷ 2,54 = <b>${fmt(S.bow.span / 6.35, 1)}"</b></div>
              <p class="small muted" style="margin:8px 0 0">${t('s1.estimateNote')}</p>
            </div>`}
          </div>
          <dl class="kv" style="margin-top:14px">
            <dt>${t('s1.yourDraw')}</dt><dd><span class="result-big">${fmt(d.draw, 2)}"</span> · ${fmt(d.draw * 2.54, 1)} cm</dd>
            <dt>${t('s1.arrowLen')}</dt><dd><span class="result-big">${fmt(d.arrowAuto, 2)}"</span> · ${fmt(d.arrowAuto * 2.54, 1)} cm</dd>
          </dl>
          <div class="formula" style="margin-top:8px">${t('s1.lenFormula', { add: b.arrowExtra })} = <b>${fmt(d.arrowAuto, 2)}"</b></div>
        </div>
      </div>

      <div class="grid3" style="margin-top:20px">
        <label class="field"><span>${t('s1.string')}</span>${select('bow.string', [{ v: 'dacron', l: t('s1.dacron') }, { v: 'hmpe', l: t('s1.hmpe') }], S.bow.string)}<small>${t('s1.stringHelp')}</small></label>
        <label class="field"><span>${t('s1.hand')}</span>${select('bow.hand', [{ v: 'right', l: t('s1.right') }, { v: 'left', l: t('s1.left') }], S.bow.hand)}<small>${t('s1.handHelp')}</small></label>
        <label class="field"><span>${t('s1.units')}</span>${select('units', [{ v: 'cm', l: t('s1.unitsCm') }, { v: 'in', l: t('s1.unitsIn') }], S.units)}</label>
      </div>
      <div class="actions"><button type="button" class="btn btn--ghost btn--sm" data-action="save-defaults">★ ${t('p.saveDefaults')}</button></div>
      ${callout('info', t('s1.measureTip'))}
    `;
  }

  function stepMaterial() {
    const b = bow();
    return `
      <h3>${t('s2.title')}</h3>
      <p class="intro">${t('s2.intro', { bow: esc(L(b.name)) })}</p>
      <div class="cards cards--wide">${Object.keys(CAT.materials).map(id => {
        const m = CAT.materials[id];
        const rec = b.recommended.includes(id);
        const ok = b.materials.includes(id);
        const meta = (rec ? tag(t('ui.recommended'), 'tag--rec') : ok ? '' : tag(t('ui.notIdeal'), 'tag--warn')) +
          tag(t('ui.difficulty')) + dots(m.difficulty) + ' ' + tag(t('ui.price')) + dots(m.price) + ' ' + tag(t('ui.durability')) + dots(m.durability);
        return optCard({
          path: 'material', val: id, pressed: S.material === id, title: L(m.name), desc: L(m.desc), meta,
          art: cachedIcon('mat' + id, () => window.Viz2D.icons.shaft(id, m.color, id === 'carbon' ? 'weave' : '')),
        });
      }).join('')}</div>
      <div class="grid2" style="margin-top:22px">
        <div class="panel"><h3>✔ ${t('ui.pros')}</h3><ul>${mat().pros[lang].map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
        <div class="panel"><h3>✘ ${t('ui.cons')}</h3><ul>${mat().cons[lang].map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
      </div>
    `;
  }

  function stepShaft() {
    const d = D;
    const m = S.material;
    let body = '';
    if (m === 'wood' || m === 'bamboo') {
      const w = d.spine.wood;
      body += `
        ${m === 'wood' ? `<h4 class="sub">${t('s3.species')}</h4>
        <div class="cards">${CAT.woods.map(x => optCard({
          path: 'shaft.species', val: x.id, pressed: S.shaft.species === x.id, title: L(x.name), desc: L(x.desc),
          art: cachedIcon('wood' + x.id, () => window.Viz2D.icons.shaft('wood', x.color)),
          meta: tag(`≈ ${fmt(CAT.woodGpi((x.density[0] + x.density[1]) / 2, CAT.DIAMETERS[S.shaft.diameter].in), 1)} gr/in`) + tag(t('ui.durability')) + dots(x.durability),
        })).join('')}</div>` : callout('info', t('s3.bamboo'))}
        <h4 class="sub">${t('s3.spineWood')}</h4>
        <div class="grid2">
          <div>
            <p>${t('s3.spineRec')}</p>
            <p><span class="result-big">${w.label}</span></p>
            <div class="formula">W ${fmt(w.parts.W, 1)} + ${t('calc.len')} ${fmt(w.parts.length, 1)} + ${t('calc.point')} ${fmt(w.parts.point, 1)} + ${t('calc.bow')} ${fmt(w.parts.bow)} + ${t('calc.string')} ${fmt(w.parts.string)} = <b>${fmt(w.value, 1)} lb</b></div>
            <p class="small muted" style="margin-top:8px">${t('s3.woodSpineHelp')}</p>
          </div>
          <div>
            <label class="field"><span>${t('s3.diameter')}</span>
              ${seg('shaft.diameter', Object.keys(CAT.DIAMETERS).map(k => ({ v: k, l: k })), S.shaft.diameter)}
              <small>${t('s3.diaRec', { dia: d.spine.dia })} ${S.shaft.autoDia ? '' : `<a href="#" data-set="shaft.autoDia" data-val="true">${t('ui.useRec')}</a>`}</small></label>
            <p class="small muted">${t('s3.diaHelp')}</p>
          </div>
        </div>
        ${longbowTable(w)}`;
    } else if (m === 'carbon') {
      const models = CALC.carbonModels();
      const model = CALC.carbonModel(S.shaft.model);
      const spines = model ? model.spines.map(x => x.spine) : CAT.carbonSpines.map(x => x.spine);
      const c = d.spine.carbon;
      body += `
        <h4 class="sub">${t('s3.model')}</h4>
        <div class="grid2">
          <label class="field"><span>${t('s3.modelPick')}</span>
            ${select('shaft.model', [{ v: 'generic', l: t('s3.generic') }].concat(models.map(x => ({ v: x.id, l: `${L(x.name)} (ID ${x.idInch})` }))), S.shaft.model)}
            <small>${model ? esc(L(model.desc)) : t('s3.genericHelp')}</small></label>
          ${model ? `<dl class="kv"><dt>ID</dt><dd>${model.idInch}" (${S.shaft.idSize} mm)</dd><dt>${t('part.nock')}</dt><dd>${esc(model.nock || '–')}</dd><dt>${t('s3.insert')}</dt><dd>${esc(model.insert || '–')}</dd>${model.source ? `<dt>${t('ui.source')}</dt><dd><a href="${esc(model.source)}" target="_blank" rel="noopener">${esc(model.brand)}</a></dd>` : ''}</dl>`
          : `<label class="field"><span>${t('s3.id')}</span>${seg('shaft.idSize', CAT.carbonIds.map(x => ({ v: x.id, l: x.mm + ' mm' })), S.shaft.idSize)}<small>${esc(L((CAT.carbonIds.find(x => x.id === S.shaft.idSize) || {}).note))}</small></label>`}
        </div>
        <h4 class="sub">${t('s3.spineCarbon')}</h4>
        <div class="grid2">
          <div>
            <p>${t('s3.spineRec')}</p>
            <p><span class="result-big">${c.label}</span> ${c.between ? tag(t('s3.between'), 'tag--warn') : ''}</p>
            <div class="formula">${t('calc.eff')}: W ${fmt(d.spine.eff.parts.W, 1)} + ${t('calc.len')} ${fmt(d.spine.eff.parts.length, 1)} + ${t('calc.point')} ${fmt(d.spine.eff.parts.point, 1)} + ${t('calc.bow')} ${fmt(d.spine.eff.parts.bow)} + ${t('calc.string')} ${fmt(d.spine.eff.parts.string)} = <b>${fmt(d.spine.eff.value, 1)} lb</b></div>
            <p class="small muted" style="margin-top:8px">${t('s3.carbonHelp')}</p>
          </div>
          <label class="field"><span>${t('s3.spinePick')}</span>
            ${seg('shaft.spine', spines.map(x => ({ v: x, l: String(x) })), S.shaft.spine)}
            <small>${S.shaft.autoSpine ? t('ui.autoOn') : `<a href="#" data-set="shaft.autoSpine" data-val="true">${t('ui.useRec')}</a>`}</small></label>
        </div>
        <h4 class="sub">${t('s3.look')}</h4>
        <div class="cards cards--narrow">${CAT.carbonLooks.map(x => optCard({ path: 'shaft.look', val: x.id, pressed: S.shaft.look === x.id, title: L(x.name), art: cachedIcon('cl' + x.id, () => window.Viz2D.icons.shaft('carbon', x.color, x.id === 'plain' ? '' : x.id === 'footed' ? '' : x.id)) })).join('')}</div>`;
    } else if (m === 'aluminium') {
      const a = d.spine.alu;
      body += `
        <h4 class="sub">${t('s3.aluSize')}</h4>
        <p>${t('s3.spineRec')} <span class="result-big">${a.sizes.join(' / ')}</span></p>
        <div class="formula">${t('calc.eff')} = <b>${fmt(d.spine.eff.value, 1)} lb</b> · ${t('s3.aluGroup')} ${esc(a.group || '')}</div>
        <label class="field" style="margin-top:14px"><span>${t('s3.aluPick')}</span>
          ${seg('shaft.aluSize', CAT.aluSizes.map(x => ({ v: x.id, l: x.id })), S.shaft.aluSize)}
          <small>${t('s3.aluHelp')} ${S.shaft.autoAlu ? '' : `<a href="#" data-set="shaft.autoAlu" data-val="true">${t('ui.useRec')}</a>`}</small></label>`;
    } else {
      body += `
        <h4 class="sub">${t('s3.fgSize')}</h4>
        <div class="cards cards--narrow">${CAT.fiberglassSizes.map(x => optCard({ path: 'shaft.fgSize', val: x.id, pressed: S.shaft.fgSize === x.id, title: L(x.name), meta: tag(`≈ ${x.gpi} gr/in`) })).join('')}</div>
        ${d.spine.fgAdvice ? callout(d.W > 30 ? 'warn' : 'info', esc(L(d.spine.fgAdvice.advice))) : ''}`;
    }

    const colors = CAT.shaftColors[m] || [];
    return `
      <h3>${t('s3.title', { mat: esc(L(mat().name)) })}</h3>
      <p class="intro">${t('s3.intro')}</p>
      ${body}
      <h4 class="sub">${t('s3.cut')}</h4>
      <div class="grid2">
        <div>
          <label class="field"><span>${t('s3.cutLen')}</span>
            <div class="inrow"><input type="number" inputmode="decimal" data-bind="shaft.lengthIn" value="${S.shaft.lengthIn}" min="14" max="40" step="0.25"><span class="unit">in</span><span class="unit">= ${fmt(S.shaft.lengthIn * 2.54, 1)} cm</span></div>
            <small>${S.shaft.autoLen ? t('s3.cutAuto') : `<a href="#" data-set="shaft.autoLen" data-val="true">${t('ui.useRec')} (${fmt(d.arrowAuto, 2)}")</a>`}</small></label>
        </div>
        <p class="small muted">${t('s3.cutHelp')}</p>
      </div>
      ${(m === 'carbon' && S.shaft.look !== 'wood' && S.shaft.look !== 'weave') || m !== 'carbon' ? `
      <h4 class="sub">${t('s3.color')}</h4>
      ${swatches('shaft.color', colors, S.shaft.color)}` : ''}
      ${m === 'carbon' && S.shaft.look === 'footed' ? `<h4 class="sub">${t('s3.footColor')}</h4>${swatches('shaft.footColor', CAT.shaftColors.wood, S.shaft.footColor)}` : ''}
    `;
  }

  function longbowTable(w) {
    const ch = CALC.longbowChart();
    if (!ch || !['longbow-english', 'selfbow-primitive', 'warbow-medieval'].includes(S.bow.type)) return '';
    const draw = Math.round(D.draw);
    const rowIdx = ch.rows.findIndex(r => D.marked >= r[0] && D.marked < r[1] + (r[1] === 80 ? 999 : 0)) ;
    return `
      <h4 class="sub">${t('s3.manualChart')}</h4>
      <div class="tablewrap"><table>
        <thead><tr><th>${t('s3.bowWeight')}</th>${ch.cols.map(c => `<th>${c}"</th>`).join('')}</tr></thead>
        <tbody>${ch.rows.map((r, i) => `<tr class="${i === rowIdx ? 'hl' : ''}"><th>${r[0]}–${r[1]}#</th>${ch.cells[i].map((c, j) => `<td class="${i === rowIdx && ch.cols[j] === draw ? 'hl' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="small muted">${t('s3.manualChartNote')}</p>`;
  }

  function stepPoint() {
    const d = D;
    const pts = CAT.points.filter(p => p.materials.includes(S.material));
    const pd = pointDef();
    const resComp = (COMP.points || []).find(p => p.shape === pd.shape && (p.materials || []).includes(S.material));
    return `
      <h3>${t('s4.title')}</h3>
      <p class="intro">${t('s4.intro')}</p>
      <div class="cards">${pts.map(p => optCard({
        path: 'point.id', val: p.id, pressed: S.point.id === p.id, title: L(p.name), desc: L(p.desc),
        art: cachedIcon('pt' + p.id, () => window.Viz2D.icons.point(p.shape, 'steel')),
        meta: (p.rec ? tag(t('ui.recommended'), 'tag--rec') : '') + (p.hunting ? tag('⚠ ' + t('ui.restricted'), 'tag--warn') : '') + tag(`${p.weights[0]}–${p.weights[p.weights.length - 1]} gr`),
      })).join('')}</div>

      <h4 class="sub">${t('s4.weight')}</h4>
      <div class="grid2">
        <div>
          ${seg('pointMode', [{ v: 'precise', l: t('s4.precise') }, { v: 'quick', l: t('s4.quick') }], S.pointMode)}
          ${S.pointMode === 'quick' ? `
            <div class="formula" style="margin-top:10px">${fmt(d.W, 1)} lb × ${S.gppTarget} gr/lb = ${fmt(d.W * S.gppTarget)} gr ÷ ${mat().pointDivisor} = <b>${fmt(d.pointQuick)} gr</b></div>
            <label class="field" style="margin-top:10px"><span>${t('s4.gppTarget')}: ${S.gppTarget}</span><input type="range" min="8" max="12" step="0.5" data-bind="gppTarget" value="${S.gppTarget}"></label>
          ` : `
            <div class="formula" style="margin-top:10px">(${t('part.shaft')} + ${t('part.nock')} + ${t('part.fletching')}…) ${fmt(d.build.rest)} gr ÷ ${mat().pointDivisor} = <b>${fmt(d.pointPrecise)} gr</b></div>`}
          <p class="small muted" style="margin-top:8px">${t(S.pointMode === 'quick' ? 's4.quickHelp' : 's4.preciseHelp')}</p>
          <p>${t('s4.rec')} <span class="result-big">${d.pointRec} gr</span></p>
        </div>
        <div>
          <label class="field"><span>${t('s4.pick')}</span>${seg('point.weight', pd.weights.map(x => ({ v: x, l: String(x) })), S.point.weight)}
            <small>${S.point.auto ? t('ui.autoOn') : `<a href="#" data-set="point.auto" data-val="true">${t('ui.useRec')} (${d.pointRec} gr)</a>`}</small></label>
          <label class="field" style="margin-top:12px"><span>${t('s4.metal')}</span>${seg('point.metal', CAT.metals.map(x => ({ v: x.id, l: L(x.name) })), S.point.metal)}</label>
          ${pd.shape === 'larp' ? `<label class="field" style="margin-top:12px"><span>${t('s3.color')}</span>${swatches('point.color', ['#d6d3cc', '#e23b2e', '#2c6bd6', '#f2c230', '#2f8f4e'], S.point.color)}</label>` : ''}
        </div>
      </div>
      ${resComp && resComp.desc ? callout('info', `<b>${esc(L(resComp.name))}</b> — ${esc(L(resComp.desc))}`) : ''}
      ${pd.fit === 'taper' ? callout('info', t('s4.taperTip', { dia: S.shaft.diameter })) : ''}
      ${pd.fit === 'insert' || pd.fit === 'gluein' ? callout('info', t('s4.insertTip', { id: S.material === 'carbon' ? S.shaft.idSize + ' mm' : S.material === 'aluminium' ? S.shaft.aluSize : '5/16"' })) : ''}
    `;
  }

  function stepNock() {
    const b = bow();
    const nocks = CAT.nocks.filter(n => n.materials.includes(S.material));
    const nd = nockDef();
    return `
      <h3>${t('s5.title')}</h3>
      <p class="intro">${t('s5.intro')}</p>
      <div class="cards">${nocks.map(n => optCard({
        path: 'nock.id', val: n.id, pressed: S.nock.id === n.id, title: L(n.name), desc: L(n.desc),
        art: cachedIcon('nk' + n.id, () => window.Viz2D.icons.nock(n.type, n.type === 'lighted' ? '#57ff6a' : '#e8e2d0')),
        meta: (b.nocks.includes(n.id) ? tag(t('ui.recommended'), 'tag--rec') : '') + (n.weight ? tag(`≈ ${n.weight} gr`) : '') + (n.historical ? tag(t('ui.historical')) : ''),
      })).join('')}</div>
      ${nd.type !== 'self' ? `<h4 class="sub">${t('s5.color')}</h4>${swatches('nock.color', CAT.nockColors, S.nock.color)}<p class="small muted">${t('s5.colorHelp')}</p>` : `<h4 class="sub">${t('s5.binding')}</h4>${swatches('deco.binding.color', CAT.threadColors, S.deco.binding.color)}`}
      ${nd.type === 'self' ? callout('warn', t('s5.grain')) : ''}
      ${nd.type === 'over' && (S.material === 'wood' || S.material === 'bamboo') ? callout('info', t('s5.taperTip')) : ''}
      ${callout('info', t('s5.fit'))}
    `;
  }

  function stepFletch() {
    const b = bow();
    const f = S.fletch;
    const shelf = shelfOrHand();
    const shapes = f.kind === 'vane' ? CAT.fletchShapes.filter(s => CAT.vaneShapes.includes(s.id)) : CAT.fletchShapes.filter(s => !s.tradOnly);
    const recKind = b.fletch.kind;
    const dec = n => String(n).replace('.', lang === 'es' ? ',' : '.');
    return `
      <h3>${t('s6.title')}</h3>
      <p class="intro">${t('s6.intro')}</p>
      <h4 class="sub">${t('s6.kind')}</h4>
      <div class="cards">
        ${optCard({ path: 'fletch.kind', val: 'feather', pressed: f.kind === 'feather', title: t('s6.feather'), desc: t('s6.featherDesc'), art: cachedIcon('fk-feather', () => window.Viz2D.icons.feather('shield', 'feather', '#c8352a', true)), meta: recKind === 'feather' ? tag(t('ui.recommended'), 'tag--rec') : '' })}
        ${optCard({ path: 'fletch.kind', val: 'tradvane', pressed: f.kind === 'tradvane', title: t('s6.tradvane'), desc: t('s6.tradvaneDesc'), art: cachedIcon('fk-trad', () => window.Viz2D.icons.feather('tradvane', 'tradvane', '#e0582f', false)), meta: tag(t('s6.shelfOk'), shelf ? 'tag--rec' : '') + tag(t('s6.special')) })}
        ${optCard({ path: 'fletch.kind', val: 'vane', pressed: f.kind === 'vane', title: t('s6.vane'), desc: t('s6.vaneDesc'), art: cachedIcon('fk-vane', () => window.Viz2D.icons.feather('parabolic', 'vane', '#2c6bd6', false)), meta: shelf ? tag(t('s6.notRec'), 'tag--warn') : recKind === 'vane' ? tag(t('ui.recommended'), 'tag--rec') : '' })}
      </div>
      ${f.kind === 'vane' && shelf ? callout('warn', t('s6.vaneBlocked')) : ''}
      ${f.kind === 'tradvane' ? callout('info', t('s6.tradvaneTip')) : ''}
      ${b.fletch.notes ? callout('info', esc(L(b.fletch.notes))) : ''}

      ${f.kind === 'tradvane' ? `
      <h4 class="sub">${t('s6.tradSize')}</h4>
      <div class="cards cards--narrow">${CAT.tradVanes.map(v => optCard({
        path: 'fletch.lengthIn', val: v.len, pressed: f.lengthIn === v.len, title: v.name,
        meta: tag(`${dec(v.len)}" · ${fmt(v.len * 2.54, 1)} cm`) + tag(`${dec(v.gr)} gr`),
      })).join('')}</div>` : `
      <h4 class="sub">${t('s6.shape')}</h4>
      <div class="cards">${shapes.map(s => optCard({
        path: 'fletch.shape', val: s.id, pressed: f.shape === s.id, title: L(s.name), desc: L(s.desc),
        art: cachedIcon('fs' + s.id + f.kind, () => window.Viz2D.icons.feather(s.id, f.kind, f.kind === 'vane' ? '#2c6bd6' : '#c8352a', false)),
        meta: b.fletch.shape === s.id ? tag(t('ui.recommended'), 'tag--rec') : '',
      })).join('')}</div>`}

      <div class="grid3" style="margin-top:20px">
        ${f.kind === 'tradvane' ? '<div></div>' : `<label class="field"><span>${t('s6.length')}</span>${seg('fletch.lengthIn', CAT.fletchLengths.map(x => ({ v: x, l: x + '"' })), f.lengthIn)}<small>${t('s6.lengthHelp', { rec: b.fletch.len })}</small></label>`}
        <label class="field"><span>${t('s6.count')}</span>${seg('fletch.count', [{ v: 3, l: '3 × 120°' }, { v: 4, l: '4 × 90°' }], f.count)}<small>${t('s6.countHelp')}</small></label>
        <label class="field"><span>${t('s6.orientation')}</span>${seg('fletch.orientation', [{ v: 'straight', l: t('s6.straight') }, { v: 'offset', l: t('s6.offset') }, { v: 'helical', l: t('s6.helical') }], f.orientation)}<small>${t('s6.oriHelp')}</small></label>
      </div>
      ${f.kind === 'feather' ? `
      <div class="grid2" style="margin-top:18px">
        <label class="field"><span>${t('s6.wing')}</span>${seg('fletch.wing', [{ v: 'RW', l: t('s6.rw') }, { v: 'LW', l: t('s6.lw') }], f.wing)}<small>${t('s6.wingHelp', { rec: S.bow.hand === 'left' ? t('s6.lw') : t('s6.rw') })}</small></label>
        <div class="field"><span>${t('s6.extras')}</span>${toggle('fletch.barred', t('s6.barred'))}${toggle('deco.binding.on', t('s6.binding'))}</div>
      </div>` : ''}
      <div class="grid2" style="margin-top:18px">
        <div class="field"><span>${t('s6.cock')}</span>${swatches('fletch.cockColor', CAT.featherColors, f.cockColor)}<small>${t('s6.cockHelp')}</small></div>
        <div class="field"><span>${t('s6.hen')}</span>${swatches('fletch.henColor', CAT.featherColors, f.henColor)}</div>
      </div>
      ${S.deco.binding.on && f.kind === 'feather' ? `<div class="field" style="margin-top:14px"><span>${t('s6.bindingColor')}</span>${swatches('deco.binding.color', CAT.threadColors, S.deco.binding.color)}</div>` : ''}
      <label class="field" style="margin-top:14px;max-width:340px"><span>${t('s6.offsetIn')}</span>${numIn('fletch.offsetIn', f.offsetIn, 0.5, 3, 0.25, 'in')}<small>${t('s6.offsetHelp')}</small></label>
    `;
  }

  function stepDeco() {
    const dc = S.deco;
    return `
      <h3>${t('s7.title')}</h3>
      <p class="intro">${t('s7.intro')}</p>
      <div class="grid2">
        <div class="panel">
          <h3>${toggle('deco.crown.on', t('s7.crown'))}</h3>
          <p class="small muted">${t('s7.crownHelp')}</p>
          ${dc.crown.on ? `${swatches('deco.crown.color', CAT.crestColors.concat(['#1f3b5c', '#f5f1e6']), dc.crown.color)}
            <label class="field" style="margin-top:10px"><span>${t('s7.crownLen')}: ${dc.crown.lengthIn}"</span><input type="range" min="4" max="14" step="0.5" data-bind="deco.crown.lengthIn" value="${dc.crown.lengthIn}"></label>` : ''}
        </div>
        <div class="panel">
          <h3>${toggle('deco.wrap.on', t('s7.wrap'))}</h3>
          <p class="small muted">${t('s7.wrapHelp')}</p>
          ${dc.wrap.on ? `${swatches('deco.wrap.color', ['#f5f1e6', '#1d1d1d', '#c8352a', '#f2c230', '#2f8f4e', '#2c6bd6', '#ff7a1a', '#5c3b6b'], dc.wrap.color)}
            <div class="grid2" style="margin-top:10px">
              <label class="field"><span>${t('s7.wrapLen')}</span>${seg('deco.wrap.lengthIn', [{ v: 4, l: '4"' }, { v: 7, l: '7"' }], dc.wrap.lengthIn)}</label>
              <label class="field"><span>${t('s7.pattern')}</span>${select('deco.wrap.pattern', CAT.wrapPatterns.map(p => ({ v: p.id, l: L(p.name) })), dc.wrap.pattern)}</label>
            </div>` : ''}
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <h3>${t('s7.cresting')}</h3>
        <p class="small muted">${t('s7.crestHelp')}</p>
        <div id="crestList" style="display:grid;gap:10px">
          ${dc.cresting.map((c, i) => `
            <div class="inrow" style="flex-wrap:wrap">
              <span class="tag">#${i + 1}</span>
              ${swatches(`deco.cresting.${i}.color`, CAT.crestColors, c.color)}
              ${select(`deco.cresting.${i}.widthIn`, [{ v: 0.0625, l: t('s7.thin') }, { v: 0.125, l: t('s7.medium') }, { v: 0.25, l: t('s7.wide') }, { v: 0.5, l: t('s7.band') }], c.widthIn)}
              <button type="button" class="btn btn--ghost btn--sm" data-action="crest-del" data-i="${i}">✕</button>
            </div>`).join('')}
        </div>
        <div class="actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="crest-add" ${dc.cresting.length >= 6 ? 'disabled' : ''}>+ ${t('s7.addBand')}</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="crest-preset">${t('s7.preset')}</button>
        </div>
      </div>
      ${callout('info', t('s7.finishTip'))}
    `;
  }

  // ---------------- summary ----------------
  function shoppingItems() {
    const d = D;
    const m = S.material;
    const pd = pointDef();
    const nd = nockDef();
    const f = S.fletch;
    const items = [];
    const sp = spineSummary(d);
    const shaftCat = { wood: 'wood-shafts', bamboo: 'bamboo-shafts', carbon: 'carbon-shafts', fiberglass: 'fiberglass-shafts', aluminium: 'aluminium-shafts' }[m];
    let shaftTxt;
    if (m === 'wood') shaftTxt = t('buy.woodShaft', { sp: L(CAT.woods.find(w => w.id === S.shaft.species).name), dia: S.shaft.diameter, spine: d.spine.wood.label, len: Math.ceil(d.arrowIn + 1) });
    else if (m === 'bamboo') shaftTxt = t('buy.bambooShaft', { spine: d.spine.wood.label, dia: S.shaft.diameter });
    else if (m === 'carbon') { const mo = CALC.carbonModel(S.shaft.model); shaftTxt = t('buy.carbonShaft', { model: mo ? L(mo.name) : t('s3.generic'), spine: S.shaft.spine, id: S.shaft.idSize }); }
    else if (m === 'aluminium') shaftTxt = t('buy.aluShaft', { size: S.shaft.aluSize });
    else shaftTxt = t('buy.fgShaft', { size: L(CAT.fiberglassSizes.find(x => x.id === S.shaft.fgSize).name) });
    items.push({ cat: shaftCat, title: t('buy.shafts'), qty: '12 + 1', text: shaftTxt });
    items.push({ cat: 'points', title: t('buy.points'), qty: '12 + 2', text: `${L(pd.name)} · ${S.point.weight} gr${pd.fit === 'taper' ? ' · ' + S.shaft.diameter + '"' : ''}` });
    if (pd.fit === 'insert') items.push({ cat: 'inserts', title: t('buy.inserts'), qty: '12', text: t('buy.insertTxt', { id: m === 'carbon' ? S.shaft.idSize + ' mm' : S.shaft.aluSize }) });
    if (pd.fit === 'adapter') items.push({ cat: 'points', title: t('buy.adapters'), qty: '12', text: t('buy.adapterTxt', { dia: S.shaft.diameter }) });
    if (nd.type !== 'self') items.push({ cat: 'nocks', title: t('buy.nocks'), qty: '12 + 6', text: `${L(nd.name)}${nd.type === 'over' ? ' · ' + (m === 'wood' || m === 'bamboo' ? S.shaft.diameter + '"' : '') : ''}${nd.type === 'pin' ? ' + pin' : ''}` });
    else items.push({ cat: 'nocks', title: t('buy.nockInsert'), qty: '12', text: t('buy.nockInsertTxt') });
    const nF = f.count * 12;
    items.push({ cat: f.kind === 'feather' ? 'feathers' : 'vanes', title: f.kind === 'feather' ? t('buy.feathers') : t('buy.vanes'), qty: `${nF} + ${f.count * 2}`, text: `${f.kind === 'tradvane' ? '' : f.lengthIn + '" '}${fletchName(f)}${f.kind === 'feather' ? ' · ' + (f.wing === 'RW' ? t('s6.rw') : t('s6.lw')) : ''} · ${t('buy.cockHen', { cock: 12, hen: 12 * (f.count - 1) })}` });
    items.push({ cat: 'glue', title: t('buy.glue'), qty: '1', text: t(m === 'wood' || m === 'bamboo' ? 'buy.glueWood' : 'buy.glueTube') + (f.kind === 'tradvane' ? ' · ' + t('buy.maxBond') : '') });
    if (S.deco.wrap.on) items.push({ cat: 'wraps', title: t('s7.wrap'), qty: '12', text: `${S.deco.wrap.lengthIn}" · ${L(CAT.wrapPatterns.find(p => p.id === S.deco.wrap.pattern).name)}` });
    if (S.deco.crown.on || S.deco.cresting.length) items.push({ cat: 'cresting', title: t('buy.paint'), qty: '1', text: t('buy.paintTxt') });
    if (S.deco.binding.on) items.push({ cat: 'feathers', title: t('buy.thread'), qty: '1', text: t('buy.threadTxt') });
    // tools
    const tools = [{ cat: 'fletching-jig', key: 'buy.jig' }, { cat: 'scales', key: 'buy.scale' }];
    if (m === 'wood' || m === 'bamboo') tools.unshift({ cat: 'taper-tools', key: 'buy.taper' });
    if (isTube()) tools.unshift({ cat: 'tools', key: 'buy.saw' });
    tools.forEach(x => items.push({ cat: x.cat === 'fletching-jig' ? 'fletching-jigs' : x.cat, title: t(x.key), qty: '1', text: t(x.key + 'Txt'), tool: true }));
    return items;
  }

  function shopsFor(cat) {
    const home = S.country;
    const has = s => (s.categories || []).includes(cat) || (cat === 'tools' && (s.categories || []).some(c => ['fletching-jigs', 'taper-tools', 'scales', 'spine-tester'].includes(c)));
    const fav = s => P.favShops.includes(s.id);
    return SHOPS.filter(has).sort((a, b) =>
      fav(b) - fav(a) ||
      (b.country === home) - (a.country === home) ||
      (b.traditionalFocus || 0) - (a.traditionalFocus || 0) ||
      (b.verified === true) - (a.verified === true) ||
      a.name.localeCompare(b.name)).slice(0, 4);
  }
  function shopLink(s, cat) {
    const links = s.links || {};
    const key = links[cat] ? cat : ['fletching-jigs', 'taper-tools', 'scales', 'glue'].includes(cat) && links.tools ? 'tools' : cat === 'vanes' && links.feathers ? 'feathers' : cat === 'inserts' && links.points ? 'points' : null;
    return key ? links[key] : s.url;
  }

  function stepSummary() {
    const d = D;
    const b = d.bow;
    const pd = pointDef();
    const nd = nockDef();
    const f = S.fletch;
    const sp = spineSummary(d);
    const partsRows = d.build.parts.map(p => `<tr><td>${t('part.' + p.id)}</td><td>${fmt(p.gr, 1)} gr</td><td>${fmt(p.gr / d.total * 100, 1)}%</td></tr>`).join('');
    const proc = PROC.materials[S.material] || PROC.materials[S.material === 'bamboo' ? 'wood' : 'carbon'];
    const countries = [...new Set(SHOPS.map(s => s.country))].sort();
    const items = shoppingItems();
    const gband = CALC.gppBand(d.gpp);

    return `
      <h3>${t('s8.title')}</h3>
      <p class="intro">${t('s8.intro')}</p>
      ${d.warnings.map(w => callout(w.lvl, w.text)).join('')}
      <div class="summary" style="margin-top:16px">
        <div>
          <div class="spec">
            <div class="spec__head"><span>${t('s8.spec')}</span><span class="pixfont">${esc(L(mat().name))}</span></div>
            <table><tbody>
              <tr><td>${t('step.bow')}</td><td>${esc(L(b.name))} · ${fmt(d.marked)} lb @28" → <b>${fmt(d.W, 1)} lb</b> @${fmt(d.draw, 2)}"</td></tr>
              <tr><td>${t('s1.yourDraw')}</td><td>${lenBoth(d.draw)}${d.drawEstimated ? ' ' + tag(t('ui.estimated'), 'tag--warn') : ''}</td></tr>
              <tr><td>${t('s8.cutLen')}</td><td><b>${lenBoth(d.arrowIn)}</b></td></tr>
              <tr><td>${t('part.shaft')}</td><td>${esc(shaftLine())}</td></tr>
              <tr><td>${t('stat.spine')}</td><td>${t('s8.rec')}: <b>${esc(sp.rec)}</b> · ${t('s8.chosen')}: <b>${esc(sp.chosen)}</b></td></tr>
              <tr><td>${t('part.point')}</td><td>${esc(L(pd.name))} · <b>${S.point.weight} gr</b></td></tr>
              <tr><td>${t('part.nock')}</td><td>${esc(L(nd.name))}</td></tr>
              <tr><td>${t('part.fletching')}</td><td>${f.count} × ${f.lengthIn}" ${esc(fletchName(f))} · ${kindName(f)}${f.kind === 'feather' ? ' ' + f.wing : ''} · ${t('s6.' + f.orientation)}</td></tr>
              <tr><td>${t('stat.total')}</td><td><b>${grG(d.total)}</b> · ${t('s8.min')}: ${fmt(d.minWeight)} gr</td></tr>
              <tr><td>GPP</td><td><b>${fmt(d.gpp, 1)} gr/lb</b>${gband ? ' · ' + esc(L(gband.name)) : ''}</td></tr>
              <tr><td>FOC</td><td><b>${fmt(d.foc, 1)} %</b> · ${t('s8.balance')}: ${lenBoth(Math.round(d.build.balanceIn * 4) / 4)}</td></tr>
              <tr><td>${t('s8.speed')}</td><td>≈ ${fmt(d.speed.fps)} fps · ${fmt(d.speed.ms)} m/s · ${fmt(d.speed.keJ, 1)} J <small class="muted">(±15%)</small></td></tr>
            </tbody></table>
          </div>
          <h4 class="sub">${t('s8.breakdown')}</h4>
          <div class="tablewrap"><table><thead><tr><th>${t('s8.part')}</th><th>${t('s8.weight')}</th><th>%</th></tr></thead><tbody>${partsRows}</tbody></table></div>
          <div class="actions">
            <button type="button" class="btn btn--primary" data-action="quiver-save">★ ${t('q.saveShort')}</button>
            <button type="button" class="btn btn--ghost" data-action="share">${t('s8.share')}</button>
            <button type="button" class="btn btn--ghost" data-action="print">${t('s8.print')}</button>
            <button type="button" class="btn btn--ghost" data-action="json">${t('s8.json')}</button>
          </div>
        </div>
        <div>
          <div class="inrow" style="justify-content:space-between;flex-wrap:wrap">
            <h4 class="sub" style="flex:1;margin-top:0">${t('s8.shopping')}</h4>
            <label class="field field--inline" style="margin:0"><span class="small">${t('s8.country')}</span>${select('country', countries.map(c => ({ v: c, l: (t('country.' + c) !== 'country.' + c ? t('country.' + c) : c) })), S.country)}</label>
          </div>
          <ul class="shoplist">${items.map(it => {
            const shops = shopsFor(it.cat);
            return `<li><div class="item"><b>${esc(it.title)}</b><span class="tag">${esc(it.qty)}</span></div>
              <div class="small muted">${esc(it.text)}</div>
              <div class="where">${shops.length ? shops.map(s => `<a class="shoplink" href="${esc(shopLink(s, it.cat))}" target="_blank" rel="noopener">${P.favShops.includes(s.id) ? '★ ' : ''}${esc(s.name)} <span class="pixfont small">${esc(s.country)}</span></a>`).join('') : `<span class="small muted">${t('s8.noShop')}</span>`}</div></li>`;
          }).join('')}</ul>
          <p class="small muted">${t('s8.qtyNote')}</p>
        </div>
      </div>
      ${proc ? `
      <h4 class="sub">${t('s8.howto', { mat: esc(L(mat().name)) })}</h4>
      <p class="small muted">${esc(L(proc.summary))} · ${t('guide.time')}: ${esc(L(proc.time))}</p>
      ${S.material === 'wood' && window.Tutorial3D ? `<div class="tutcta"><div><b>${t('tut.ctaTitle')}</b><p class="small muted">${t('tut.ctaText')}</p></div><button type="button" class="btn btn--primary" data-action="tutorial" data-start="0">▶ ${t('tut.open')}</button></div>` : ''}
      <ol class="steps-list">${proc.steps.map(s => `<li><h4>${esc(L(s.title))}</h4><p>${esc(L(s.text))}</p>${s.tip ? `<p class="tip">${esc(L(s.tip))}</p>` : ''}</li>`).join('')}</ol>
      <p style="margin-top:14px"><a href="guia.html?m=${S.material}" data-action="guide">${t('s8.fullGuide')}</a></p>` : ''}
      ${rulesFor().length ? `<h4 class="sub">${t('s8.rules')}</h4><ul>${rulesFor().map(r => `<li class="small">${esc(L(r))}</li>`).join('')}</ul>` : ''}
    `;
  }
  function shaftLine() {
    const m = S.material;
    if (m === 'wood') return `${L(CAT.woods.find(w => w.id === S.shaft.species).name)} ${S.shaft.diameter}" · ≈ ${fmt(D.build.gpi, 1)} gr/in`;
    if (m === 'bamboo') return `${L(mat().name)} ${S.shaft.diameter}" · ≈ ${fmt(D.build.gpi, 1)} gr/in`;
    if (m === 'carbon') { const mo = CALC.carbonModel(S.shaft.model); return `${mo ? L(mo.name) : t('s3.generic')} ${S.shaft.spine} · ID ${S.shaft.idSize} mm · ${fmt(D.build.gpi, 1)} gr/in`; }
    if (m === 'aluminium') return `Easton XX75 ${S.shaft.aluSize} · ${fmt(D.build.gpi, 1)} gr/in`;
    return `${L(CAT.fiberglassSizes.find(x => x.id === S.shaft.fgSize).name)} · ≈ ${fmt(D.build.gpi, 1)} gr/in`;
  }
  /** pick relevant compatibility rules from the components research */
  function rulesFor() {
    const rules = COMP.rules || [];
    const m = S.material, pd = pointDef(), nd = nockDef(), b = bow();
    const want = new Set(['r-set-consistency', 'r-inspect', 'r-min-weight', 'r-wing-consistency', 'r-glue']);
    if (m === 'wood') ['r-wood-point-glueon', 'r-wood-nock', 'r-wood-no-inside', 'r-spine-wood', 'r-category-wood'].forEach(x => want.add(x));
    if (m === 'wood' && pd.fit === 'adapter') want.add('r-wood-point-screwin');
    if ((m === 'wood' || m === 'bamboo') && nd.type === 'self') ['r-selfnock-wood', 'r-grain-orientation'].forEach(x => want.add(x));
    if (m === 'bamboo') want.add('r-bamboo-plug');
    if (m === 'carbon') ['r-carbon-id-match', 'r-spine-carbon', 'r-screwin-od', S.shaft.idSize === '4.2' ? 'r-carbon-166' : S.shaft.idSize === '5.2' ? 'r-carbon-204' : 'r-carbon-244'].forEach(x => want.add(x));
    if (m === 'carbon' && S.shaft.look === 'footed') want.add('r-footing');
    if (m === 'aluminium') want.add('r-alu-uni');
    if (m === 'fiberglass') want.add('r-fiberglass');
    if (shelfOrHand()) want.add('r-shelf-feathers');
    if (S.fletch.kind === 'vane') want.add('r-vanes-rest');
    if (b.draw === 'thumb') want.add('r-horsebow');
    if (S.fletch.shape === 'fluflu') want.add('r-flu-flu');
    if (pd.id === 'broadhead' || pd.id === 'medieval') want.add('r-broadhead-legal');
    if (pd.id === 'bodkin') want.add('r-bodkin-ranges');
    if (pd.id === 'larp') want.add('r-larp');
    if (nd.type === 'lighted') want.add('r-lighted');
    if (S.deco.wrap.on) want.add('r-wrap');
    if (S.deco.crown.on) want.add('r-crown-dip');
    return rules.filter(r => want.has(r.id)).map(r => ({ es: r.es, en: r.en }));
  }

  // ---------------- wizard plumbing ----------------
  function renderStepper() {
    $('#stepper').innerHTML = STEPS.map((s, i) => `<li><button type="button" data-step="${i}" ${i === S.step ? 'aria-current="step"' : ''} class="${i < S.step ? 'done' : ''}"><span class="n">${i + 1}</span>${t(s.key)}</button></li>`).join('');
    $('#prevStep').disabled = S.step === 0;
    $('#nextStep').textContent = S.step === STEPS.length - 1 ? t('step.restart') : t('step.next');
    const cur = $('#stepper [aria-current]');
    const ol = $('#stepper');
    if (cur && ol.scrollWidth > ol.clientWidth) ol.scrollTo({ left: cur.parentElement.offsetLeft - ol.clientWidth / 2 + cur.offsetWidth / 2, behavior: 'smooth' });
  }
  function render(keepFocus) {
    derive();
    if (!has('stepPanel')) return;
    let focusBind = null, selStart = null;
    if (keepFocus && document.activeElement && document.activeElement.dataset) {
      focusBind = document.activeElement.dataset.bind || (document.activeElement.dataset.bindCm && 'cm:' + document.activeElement.dataset.bindCm);
      try { selStart = document.activeElement.selectionStart; } catch (e) { /* number inputs */ }
    }
    $('#stepPanel').innerHTML = STEPS[S.step].render();
    renderStepper();
    renderBench();
    save();
    if (focusBind) {
      const el = focusBind.startsWith('cm:') ? $(`[data-bind-cm="${focusBind.slice(3)}"]`) : $(`[data-bind="${focusBind}"]`);
      if (el) { el.focus({ preventScroll: true }); try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ } }
    }
  }
  function goStep(i) {
    S.step = Math.max(0, Math.min(STEPS.length - 1, i));
    render();
    const panel = $('#stepPanel');
    const top = panel.getBoundingClientRect().top + window.scrollY - ($('.topbar').offsetHeight + $('#bench').offsetHeight + 12);
    if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'smooth' });
    panel.focus({ preventScroll: true });
  }

  // apply a user change, with "manual override" bookkeeping
  const OVERRIDES = { 'shaft.diameter': 'shaft.autoDia', 'shaft.spine': 'shaft.autoSpine', 'shaft.aluSize': 'shaft.autoAlu', 'shaft.fgSize': 'shaft.autoFg', 'shaft.lengthIn': 'shaft.autoLen', 'point.weight': 'point.auto' };
  function apply(path, val) {
    if (path in OVERRIDES) setPath(OVERRIDES[path], false);
    setPath(path, val);
    if (path === 'material') {
      S.shaft.color = CAT.shaftColors[val][0];
      S.shaft.look = 'plain';
      S.point.auto = true;
      Object.values(OVERRIDES).forEach(p => p !== 'shaft.autoLen' && setPath(p, true));
    }
    if (path === 'bow.type') {
      const b = bow();
      S.fletch.kind = b.fletch.kind;
      S.fletch.shape = b.fletch.shape;
      S.fletch.orientation = b.fletch.ori;
      S.fletch.lengthIn = CALC.utils.nearest(CAT.fletchLengths, b.fletch.len);
      S.fletch.count = b.fletch.count || 3;
      if (!b.materials.includes(S.material)) apply('material', b.recommended[0] || b.materials[0]);
      if (b.draw === 'thumb') S.bow.style = 'thumb-cheek';
      else if (S.bow.style.startsWith('thumb')) S.bow.style = 'med-mouth';
      const nk = b.nocks.map(id => CAT.nocks.find(n => n.id === id)).find(n => n && n.materials.includes(S.material));
      if (nk) S.nock.id = nk.id;
      if (S.bow.weightKnown && (S.bow.marked < b.weight[0] || S.bow.marked > b.weight[1])) S.bow.marked = Math.round((b.weight[0] + b.weight[1]) / 2 / 5) * 5;
    }
    if (path === 'shaft.model') S.shaft.autoSpine = true;
    if (path === 'bow.hand') S.fletch.wing = val === 'left' ? 'LW' : 'RW';
    if (path === 'fletch.kind') {
      if (val === 'tradvane') S.fletch.lengthIn = CALC.utils.nearest(CAT.tradVanes.map(v => v.len), S.fletch.lengthIn);
      else S.fletch.lengthIn = CALC.utils.nearest(CAT.fletchLengths, S.fletch.lengthIn);
      if (val === 'vane' && !CAT.vaneShapes.includes(S.fletch.shape)) S.fletch.shape = 'parabolic';
      if (val !== 'tradvane' && S.fletch.shape === 'tradvane') S.fletch.shape = 'shield';
    }
    if (path === 'point.id') S.point.auto = true;
    if (path === 'country') { P.country = val; savePrefs(); }
    if (path === 'units') { P.units = val; savePrefs(); }
  }

  function parseVal(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number' || el.type === 'range') { const v = parseFloat(String(el.value).replace(',', '.')); return isNaN(v) ? null : v; }
    const raw = el.value;
    if (/^-?\d+(\.\d+)?$/.test(raw) && el.tagName === 'SELECT' && !/^(cm|in)$/.test(raw)) return parseFloat(raw);
    return raw;
  }

  function bindWizard() {
    if (!has('stepPanel')) return;
    $('#quickSave').addEventListener('click', () => saveArrow(false));
    const panel = $('#stepPanel');
    panel.addEventListener('click', e => {
      const btn = e.target.closest('[data-set]');
      if (btn) {
        e.preventDefault();
        apply(btn.dataset.set, JSON.parse(btn.dataset.val));
        render();
        return;
      }
      const act = e.target.closest('[data-action]');
      if (act) handleAction(act.dataset.action, act, e);
    });
    let timer = null;
    const onInput = (e, final) => {
      const el = e.target;
      if (el.dataset.bindCm) {
        const v = parseFloat(String(el.value).replace(',', '.'));
        if (!isNaN(v) && v > 20) { setPath(el.dataset.bindCm, Math.round(v / 2.54 * 4) / 4); }
      } else if (el.dataset.bind) {
        const v = parseVal(el);
        if (v === null) return;
        if (el.type === 'number' && !final && (v < +el.min || v > +el.max)) return; // wait for a sensible value
        const clamped = el.type === 'number' ? Math.max(+el.min, Math.min(+el.max, v)) : v;
        apply(el.dataset.bind, clamped);
      } else return;
      clearTimeout(timer);
      if (final || el.type === 'checkbox' || el.tagName === 'SELECT') render(true);
      else timer = setTimeout(() => render(true), el.type === 'range' || el.type === 'color' ? 30 : 350);
    };
    panel.addEventListener('input', e => onInput(e, false));
    panel.addEventListener('change', e => onInput(e, true));
    $('#stepper').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) goStep(+b.dataset.step); });
    $('#prevStep').addEventListener('click', () => goStep(S.step - 1));
    $('#nextStep').addEventListener('click', () => (S.step === STEPS.length - 1 ? goStep(0) : goStep(S.step + 1)));
    $('#resetBtn').addEventListener('click', () => {
      if ($('#resetBtn').dataset.confirm) { currentId = null; store.set('current', ''); renderQuiver(); S = DEFAULT(); history.replaceState(null, '', location.pathname); render(); toast(t('toast.reset')); delete $('#resetBtn').dataset.confirm; $('#resetBtn').textContent = t('step.reset'); return; }
      $('#resetBtn').dataset.confirm = '1';
      $('#resetBtn').textContent = t('step.resetConfirm');
      setTimeout(() => { delete $('#resetBtn').dataset.confirm; $('#resetBtn').textContent = t('step.reset'); }, 3000);
    });
    $$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  }

  function handleAction(a, el, e) {
    if (a === 'tutorial') openTutorial(+el.dataset.start || 0);
    if (a === 'quiver-save') saveArrow(false);
    if (a === 'save-defaults') saveDefaults();
    if (a === 'crest-add') { S.deco.cresting.push({ color: CAT.crestColors[S.deco.cresting.length % CAT.crestColors.length], widthIn: 0.125 }); render(); }
    if (a === 'crest-del') { S.deco.cresting.splice(+el.dataset.i, 1); render(); }
    if (a === 'crest-preset') { S.deco.cresting = [{ color: '#f2efe6', widthIn: 0.0625 }, { color: '#c8352a', widthIn: 0.25 }, { color: '#f2efe6', widthIn: 0.0625 }, { color: '#1d1d1d', widthIn: 0.125 }]; render(); }
    if (a === 'share') {
      const url = shareUrl();
      history.replaceState(null, '', url);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(t('toast.copied')), () => toast(t('toast.linkReady')));
    }
    if (a === 'print') window.print();
    if (a === 'json') {
      const blob = new Blob([JSON.stringify({ config: S, results: { arrowLengthIn: D.arrowIn, totalGr: Math.round(D.total), gpp: +D.gpp.toFixed(2), foc: +D.foc.toFixed(1), spine: spineSummary(D) } }, null, 2)], { type: 'application/json' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob);
      a2.download = 'saeta-arrow.json';
      a2.click();
      setTimeout(() => URL.revokeObjectURL(a2.href), 2000);
    }
    if (a === 'guide') { e.preventDefault(); location.href = 'guia.html?m=' + encodeURIComponent(S.material); }
  }

  // ---------------- quiver (saved arrows gallery) ----------------
  const QKEY = 'quiver';
  let currentId = store.get('current') || null;
  const qList = () => { try { const l = JSON.parse(store.get(QKEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  const qSave = l => store.set(QKEY, JSON.stringify(l));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = o => JSON.parse(JSON.stringify(o));
  function withState(st, fn) {
    const prevS = S, prevD = D;
    S = merge(DEFAULT(), clone(st));
    try { derive(); return fn(); } finally { S = prevS; D = prevD; }
  }
  function defaultName() {
    const d = new Date();
    return `${L(mat().name)} · ${L(bow().name).split(' (')[0]} · ${d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB')}`;
  }
  function saveArrow(asNew) {
    const list = qList();
    const nameInput = $('#quiverName');
    const name = (nameInput && nameInput.value.trim()) || defaultName();
    const state = clone(S);
    const now = Date.now();
    const existing = !asNew && currentId && list.find(x => x.id === currentId);
    if (existing) { existing.name = name; existing.state = state; existing.updated = now; }
    else { currentId = uid(); list.unshift({ id: currentId, name, created: now, updated: now, state }); }
    store.set('current', currentId);
    qSave(list);
    renderQuiver();
    toast(t(existing ? 'q.updated' : 'q.saved', { name }));
  }
  function loadArrow(id) {
    const it = qList().find(x => x.id === id);
    if (!it) return;
    S = merge(DEFAULT(), clone(it.state));
    currentId = id;
    S.step = STEPS.length - 1;
    save();
    store.set('current', id);
    if (!has('stepPanel')) { location.href = 'constructor.html'; return; }
    render();
    toast(t('q.loaded', { name: it.name }));
  }
  function renderQuiver() {
    if (!has('quiverGrid')) return;
    const list = qList();
    const cur = list.find(x => x.id === currentId);
    if (!cur) currentId = null;
    const nameEl = $('#quiverName');
    if (nameEl && document.activeElement !== nameEl) nameEl.value = cur ? cur.name : '';
    if (nameEl) nameEl.placeholder = defaultName();
    $('#quiverSave').textContent = cur ? t('q.update') : t('q.save');
    $('#quiverSaveNew').hidden = !cur;
    $('#quiverCount').textContent = t('q.count', { n: list.length });
    const grid = $('#quiverGrid');
    if (!list.length) { grid.innerHTML = `<div class="quiver__empty"><img class="pixel" src="assets/logo.svg" alt="" width="64" height="64"><p>${t('q.empty')}</p></div>`; renderPrefs(); return; }
    grid.innerHTML = list.map(it => {
      const info = withState(it.state, () => ({
        mat: L(mat().name), bow: L(bow().name).split(' (')[0], len: lenBoth(D.arrowIn), spine: spineSummary(D).chosen,
        total: fmt(D.total), gpp: fmt(D.gpp, 1), foc: fmt(D.foc, 1), gppSt: CALC.gppStatus(D.gpp, D.bow),
      }));
      return `
      <article class="arrowcard ${it.id === currentId ? 'is-current' : ''}" data-id="${it.id}">
        <div class="arrowcard__thumb" data-thumb="${it.id}"></div>
        <div class="arrowcard__body">
          <input class="arrowcard__name" value="${esc(it.name)}" data-rename="${it.id}" aria-label="${t('q.rename')}">
          <p class="small muted">${esc(info.bow)} · ${esc(info.mat)}</p>
          <div class="opt__meta">${tag(info.len)}${tag(info.spine)}${tag(info.total + ' gr')}${tag('GPP ' + info.gpp, info.gppSt === 'ok' ? '' : 'tag--warn')}${tag('FOC ' + info.foc + '%')}</div>
          <div class="arrowcard__actions">
            <button type="button" class="btn btn--primary btn--sm" data-q="load" data-id="${it.id}">${t('q.open')}</button>
            <button type="button" class="btn btn--ghost btn--sm" data-q="dup" data-id="${it.id}">${t('q.dup')}</button>
            <button type="button" class="btn btn--ghost btn--sm" data-q="share" data-id="${it.id}">${t('q.share')}</button>
            <button type="button" class="btn btn--ghost btn--sm" data-q="del" data-id="${it.id}" aria-label="${t('q.delete')}">✕</button>
          </div>
        </div>
      </article>`;
    }).join('');
    list.forEach(it => {
      const el = grid.querySelector(`[data-thumb="${it.id}"]`);
      if (el) withState(it.state, () => window.Viz2D.render(el, Object.assign(arrowSpec(), { dimension: false })));
    });
    renderPrefs();
  }
  function exportQuiver() {
    const data = { app: 'saeta', v: 1, exported: new Date().toISOString(), quiver: qList(), prefs: P };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `saeta-carcaj-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importQuiver(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || data.app !== 'saeta' || !Array.isArray(data.quiver)) throw new Error('format');
        const list = qList();
        let added = 0;
        for (const it of data.quiver) {
          if (!it || !it.state || typeof it.name !== 'string') continue;
          if (list.some(x => x.id === it.id)) continue;
          list.push({ id: it.id || uid(), name: it.name.slice(0, 120), created: it.created || Date.now(), updated: it.updated || Date.now(), state: it.state });
          added++;
        }
        qSave(list);
        if (data.prefs && Array.isArray(data.prefs.favShops)) P.favShops = [...new Set(P.favShops.concat(data.prefs.favShops.filter(id => typeof id === 'string')))];
        if (data.prefs && data.prefs.defaults && !P.defaults) P.defaults = data.prefs.defaults;
        savePrefs();
        renderQuiver();
        renderShops();
        toast(t('q.imported', { n: added }));
      } catch (e) { toast(t('q.importFail')); }
    };
    r.readAsText(file);
  }
  function bindQuiver() {
    if (!has('quiverGrid')) return;
    $('#quiverSave').addEventListener('click', () => saveArrow(false));
    $('#quiverSaveNew').addEventListener('click', () => saveArrow(true));
    $('#quiverExport').addEventListener('click', exportQuiver);
    $('#quiverImport').addEventListener('change', e => { if (e.target.files[0]) importQuiver(e.target.files[0]); e.target.value = ''; });
    $('#quiverName').addEventListener('keydown', e => { if (e.key === 'Enter') saveArrow(false); });
    const grid = $('#quiverGrid');
    grid.addEventListener('click', e => {
      const b = e.target.closest('[data-q]');
      if (!b) return;
      const id = b.dataset.id;
      const list = qList();
      const it = list.find(x => x.id === id);
      if (!it) return;
      if (b.dataset.q === 'load') loadArrow(id);
      if (b.dataset.q === 'dup') {
        list.splice(list.indexOf(it) + 1, 0, Object.assign(clone(it), { id: uid(), name: it.name + ' ' + t('q.copy'), created: Date.now(), updated: Date.now() }));
        qSave(list); renderQuiver();
      }
      if (b.dataset.q === 'share') {
        const url = withState(it.state, shareUrl);
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(t('toast.copied')), () => { history.replaceState(null, '', url); toast(t('toast.linkReady')); });
      }
      if (b.dataset.q === 'del') {
        if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = t('q.sure'); setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = '✕'; } }, 3000); return; }
        qSave(list.filter(x => x.id !== id));
        if (currentId === id) currentId = null;
        renderQuiver();
      }
    });
    grid.addEventListener('change', e => {
      const inp = e.target.closest('[data-rename]');
      if (!inp) return;
      const list = qList();
      const it = list.find(x => x.id === inp.dataset.rename);
      if (it && inp.value.trim()) { it.name = inp.value.trim().slice(0, 120); it.updated = Date.now(); qSave(list); renderQuiver(); }
    });
    $('#prefsPanel').addEventListener('click', e => {
      const b = e.target.closest('[data-pref]');
      if (!b) return;
      const k = b.dataset.pref;
      if (k === 'save-defaults') saveDefaults();
      if (k === 'clear-defaults') { P.defaults = null; savePrefs(); renderPrefs(); toast(t('p.defaultsCleared')); }
      if (k === 'unfav') { P.favShops = P.favShops.filter(x => x !== b.dataset.id); savePrefs(); renderPrefs(); renderShops(); }
      if (k === 'wipe') {
        if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = t('q.sure'); setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = t('p.wipe'); } }, 3000); return; }
        ['quiver', 'prefs', 'state'].forEach(k2 => { try { localStorage.removeItem('saeta.' + k2); } catch (err) { /* ignore */ } });
        P = { country: null, favShops: [], defaults: null };
        currentId = null;
        renderQuiver(); renderShops();
        toast(t('p.wiped'));
      }
    });
    $('#prefsPanel').addEventListener('change', e => {
      const s = e.target.closest('[data-prefsel]');
      if (!s) return;
      if (s.dataset.prefsel === 'country') { P.country = s.value; S.country = s.value; }
      if (s.dataset.prefsel === 'units') { S.units = s.value; P.units = s.value; }
      savePrefs();
      render();
    });
  }
  function saveDefaults() {
    P.defaults = { bow: clone(S.bow), material: S.material, units: S.units, fletch: { wing: S.fletch.wing } };
    savePrefs();
    renderPrefs();
    toast(t('p.defaultsSaved'));
  }
  function renderPrefs() {
    const el = $('#prefsPanel');
    if (!el) return;
    const countries = [...new Set(SHOPS.map(s => s.country))].sort();
    const cname = c => (t('country.' + c) !== 'country.' + c ? t('country.' + c) : c);
    const dft = P.defaults;
    const favs = P.favShops.map(id => SHOPS.find(s => s.id === id)).filter(Boolean);
    el.innerHTML = `
      <h3>${t('p.title')}</h3>
      <div class="grid3">
        <label class="field"><span>${t('p.country')}</span><select data-prefsel="country">${countries.map(c => `<option value="${c}" ${c === (P.country || S.country) ? 'selected' : ''}>${esc(cname(c))}</option>`).join('')}</select><small>${t('p.countryHelp')}</small></label>
        <label class="field"><span>${t('s1.units')}</span><select data-prefsel="units"><option value="cm" ${S.units === 'cm' ? 'selected' : ''}>${t('s1.unitsCm')}</option><option value="in" ${S.units === 'in' ? 'selected' : ''}>${t('s1.unitsIn')}</option></select></label>
        <div class="field"><span>${t('p.archer')}</span>
          <small>${dft ? esc(t('p.defaultsInfo', { bow: L(CALC.bow(dft.bow.type).name).split(' (')[0], lb: dft.bow.weightKnown ? dft.bow.marked + ' lb' : '?', draw: dft.bow.drawKnown ? dft.bow.draw + '"' : '?', mat: L((CAT.materials[dft.material] || {}).name) })) : t('p.noDefaults')}</small>
          <div class="actions" style="margin-top:6px"><button type="button" class="btn btn--ghost btn--sm" data-pref="save-defaults">${t('p.saveDefaults')}</button>${dft ? `<button type="button" class="btn btn--ghost btn--sm" data-pref="clear-defaults">${t('p.clearDefaults')}</button>` : ''}</div>
        </div>
      </div>
      <h4 class="sub">${t('p.favShops')}</h4>
      ${favs.length ? `<div class="where">${favs.map(s => `<span class="shoplink"><a href="${esc(s.url)}" target="_blank" rel="noopener">★ ${esc(s.name)}</a> <button type="button" class="linkbtn" data-pref="unfav" data-id="${esc(s.id)}" aria-label="${t('p.unfav')}">✕</button></span>`).join('')}</div>` : `<p class="small muted">${t('p.noFavs')}</p>`}
      <div class="actions"><button type="button" class="btn btn--ghost btn--sm" data-pref="wipe">${t('p.wipe')}</button></div>`;
  }

  // ---------------- 3D tutorial ----------------
  const TUT_TOOLS = ['magnifier', 'scale', 'spine', 'heat', 'ruler', 'pencil', 'saw', 'sand', 'taper', 'dip', 'glue', 'jig'];
  function tutLabels() {
    const tools = {};
    TUT_TOOLS.forEach(k => { tools[k] = t('tut.t.' + k); });
    return {
      title: t('tut.title'), yourArrow: t('tut.yourArrow'), defaultArrow: t('tut.defaultArrow'), hint: t('tut.hint'), loading: t('tut.loading'), fail: t('tut.fail'),
      prev: t('tut.prev'), next: t('tut.next'), replay: t('tut.replay'), close: t('tut.close'), play: t('tut.play'), pause: t('tut.pause'), stepOf: t('tut.stepOf'), tools,
    };
  }
  const tutSteps = () => ((PROC.materials.wood || {}).steps || []).map(s => ({ title: L(s.title), text: L(s.text), tip: L(s.tip) }));
  function openTutorial(start) {
    if (!window.Tutorial3D) return;
    const own = S.material === 'wood';
    const st = clone(S);
    if (!own) { st.material = 'wood'; st.shaft.color = CAT.shaftColors.wood[0]; st.shaft.autoDia = true; st.point.auto = true; }
    const data = withState(st, () => ({
      spec: arrowSpec(),
      numbers: { shaftRaw: D.build.gpi * (D.arrowIn + 2.5), point: S.point.weight, spine: D.spine.wood ? D.spine.wood.label.replace(' #', '#') : '' },
    }));
    window.Tutorial3D.open(Object.assign(data, { own, start: start || 0, lang, steps: tutSteps(), labels: tutLabels() }));
  }

  // ---------------- guide section ----------------
  let guideTab = 'wood';
  function renderGuide() {
    if (!has('guideTabs')) return;
    const mats = Object.keys(PROC.materials || {});
    if (!mats.length) return;
    const tabs = mats.map(m => ({ id: m, label: L(PROC.materials[m].name) })).concat(PROC.tuning ? [{ id: 'tuning', label: t('guide.tuning') }] : []);
    $('#guideTabs').innerHTML = tabs.map(x => `<button class="tab" role="tab" aria-selected="${x.id === guideTab}" data-tab="${x.id}">${esc(x.label)}</button>`).join('');
    if (guideTab === 'tuning') {
      $('#guideBody').innerHTML = `<div class="panel"><h3>${t('guide.tuning')}</h3><p class="muted">${t('guide.tuningIntro')}</p><ol class="steps-list">${PROC.tuning.steps.map(s => `<li><h4>${esc(L(s.title))}</h4><p>${esc(L(s.text))}</p>${s.tip ? `<p class="tip">${esc(L(s.tip))}</p>` : ''}</li>`).join('')}</ol></div>`;
    } else {
      const m = PROC.materials[guideTab];
      const glue = (PROC.glueGuide || []).map(g => `<li><span><b>${esc(L(g.use))}</b></span><small>${esc(L(g.glue))}</small></li>`).join('');
      $('#guideBody').innerHTML = `
        <div class="guidegrid">
          <div>
            <div class="panel">
              <h3>${esc(L(m.name))}</h3>
              <p class="small">${esc(L(m.summary))}</p>
              <div class="badges">${tag(t('ui.difficulty'))} ${dots(m.difficulty)} ${tag('⏱ ' + L(m.time))}</div>
              <h3>${t('guide.tools')}</h3>
              <ul class="toollist">${m.tools.map(x => `<li class="${x.essential ? '' : 'opt-tool'}"><span><b>${esc(L(x.name))}</b> ${x.essential ? '' : `<small>(${t('guide.optional')})</small>`}</span><small>${esc(L(x.why))}</small></li>`).join('')}</ul>
            </div>
            <div class="panel">
              <h3>${t('guide.consumables')}</h3>
              <ul class="toollist">${m.consumables.map(x => `<li class="${x.essential ? '' : 'opt-tool'}"><span><b>${esc(L(x.name))}</b></span><small>${esc(L(x.why))}</small></li>`).join('')}</ul>
            </div>
            ${glue ? `<div class="panel"><h3>${t('guide.glue')}</h3><ul class="toollist">${glue}</ul></div>` : ''}
          </div>
          <div>
            ${guideTab === 'wood' && window.Tutorial3D ? `<div class="tutcta"><div><b>${t('tut.ctaTitle')}</b><p class="small muted">${t('tut.ctaText')}</p></div><button type="button" class="btn btn--primary" data-action="tutorial" data-start="0">▶ ${t('tut.open')}</button></div>` : ''}
            <ol class="steps-list">${m.steps.map((s, i) => `<li><h4>${esc(L(s.title))}${guideTab === 'wood' && window.Tutorial3D ? ` <button type="button" class="tutstep" data-action="tutorial" data-start="${i}" aria-label="${esc(t('tut.fromStep'))}">▶ 3D</button>` : ''}</h4><p>${esc(L(s.text))}</p>${s.tip ? `<p class="tip">${esc(L(s.tip))}</p>` : ''}</li>`).join('')}</ol>
            <div class="warnbox" style="margin-top:18px"><h3>⚠ ${t('guide.safety')}</h3><ul>${m.safety.map(s => `<li>${esc(L(s))}</li>`).join('')}</ul></div>
            ${m.finishing && m.finishing.length ? `<h4 class="sub">${t('guide.finishing')}</h4><div class="cards cards--wide">${m.finishing.map(x => `<div class="opt" style="cursor:default"><span class="opt__title">${esc(L(x.name))}</span><span class="opt__desc">${esc(L(x.text))}</span></div>`).join('')}</div>` : ''}
          </div>
        </div>`;
    }
    $('#theory').innerHTML = ['spine', 'paradox', 'fistmele', 'gpp', 'foc', 'units'].map(k => `<div class="panel"><h3>${t('th.' + k + 'T')}</h3><p class="small">${t('th.' + k)}</p></div>`).join('');
  }
  function bindGuide() {
    if (!has('guideTabs')) return;
    $('#guideTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { guideTab = b.dataset.tab; renderGuide(); } });
    $('#guideBody').addEventListener('click', e => { const b = e.target.closest('[data-action="tutorial"]'); if (b) openTutorial(+b.dataset.start || 0); });
  }

  // ---------------- shops section ----------------
  const CATS = ['wood-shafts', 'carbon-shafts', 'fiberglass-shafts', 'aluminium-shafts', 'bamboo-shafts', 'points', 'nocks', 'inserts', 'feathers', 'vanes', 'glue', 'fletching-jigs', 'taper-tools', 'cresting', 'wraps', 'spine-tester', 'scales', 'kits', 'finished-arrows'];
  function renderShopFilters() {
    if (!has('shopGrid')) return;
    const countries = [...new Set(SHOPS.map(s => s.country))].sort();
    const cSel = $('#shopCountry'), kSel = $('#shopCat');
    const cv = cSel.value, kv = kSel.value;
    cSel.innerHTML = `<option value="">${t('shops.all')}</option>` + countries.map(c => `<option value="${c}">${esc(t('country.' + c) !== 'country.' + c ? t('country.' + c) : c)}</option>`).join('');
    kSel.innerHTML = `<option value="">${t('shops.all')}</option>` + CATS.map(c => `<option value="${c}">${esc(t('cat.' + c))}</option>`).join('');
    cSel.value = cv; kSel.value = kv;
  }
  function renderShops() {
    if (!has('shopGrid')) return;
    const q = $('#shopSearch').value.trim().toLowerCase();
    const c = $('#shopCountry').value, k = $('#shopCat').value, onlyFav = $('#shopFav').checked;
    const list = SHOPS.filter(s => (!onlyFav || P.favShops.includes(s.id)) && (!c || s.country === c) && (!k || (s.categories || []).includes(k)) &&
      (!q || (s.name + ' ' + (s.notableBrands || []).join(' ') + ' ' + L(s.desc)).toLowerCase().includes(q)))
      .sort((a, b) => P.favShops.includes(b.id) - P.favShops.includes(a.id) || (b.traditionalFocus || 0) - (a.traditionalFocus || 0) || a.name.localeCompare(b.name));
    $('#shopResultCount').textContent = t('shops.count', { n: list.length });
    $('#shopGrid').innerHTML = list.map(s => `
      <article class="shop">
        <div class="shop__head"><h3 class="shop__name">${esc(s.name)}</h3><span class="inrow"><span class="shop__flag" title="${esc(t('country.' + s.country))}">${esc(s.country)}</span><button type="button" class="favbtn" data-fav="${esc(s.id)}" aria-pressed="${P.favShops.includes(s.id)}" aria-label="${t('p.favToggle')}" title="${t('p.favToggle')}">${P.favShops.includes(s.id) ? '★' : '☆'}</button></span></div>
        <p>${esc(L(s.desc))}</p>
        <div class="shop__cats">${(s.categories || []).slice(0, 9).map(x => tag(t('cat.' + x))).join('')}</div>
        ${(s.notableBrands || []).length ? `<p class="small"><b>${t('shops.brands')}:</b> ${esc(s.notableBrands.slice(0, 6).join(', '))}</p>` : ''}
        <div class="shop__foot">
          <span class="small muted">${t('shops.price')} ${'€'.repeat(s.priceLevel || 2)} · ${t('shops.trad')} ${dots(s.traditionalFocus || 1)}</span>
          <a class="btn btn--sm" href="${esc(s.url)}" target="_blank" rel="noopener">${t('shops.visit')} ↗</a>
        </div>
      </article>`).join('') || `<p class="muted">${t('shops.none')}</p>`;
  }
  function bindShops() {
    if (!has('shopGrid')) return;
    ['#shopSearch', '#shopCountry', '#shopCat', '#shopFav'].forEach(s => $(s).addEventListener('input', renderShops));
    $('#shopGrid').addEventListener('click', e => {
      const b = e.target.closest('[data-fav]');
      if (!b) return;
      const id = b.dataset.fav;
      P.favShops = P.favShops.includes(id) ? P.favShops.filter(x => x !== id) : P.favShops.concat(id);
      savePrefs();
      renderShops();
      renderPrefs();
      if (S.step === STEPS.length - 1) render();
    });
  }

  // ---------------- glossary ----------------
  function renderGlossary() {
    if (!has('glossList')) return;
    const q = ($('#glossSearch').value || '').trim().toLowerCase();
    const other = lang === 'es' ? 'en' : 'es';
    const list = (PROC.glossary || []).filter(g => !q || (L(g.term) + ' ' + g.term[other] + ' ' + L(g.def)).toLowerCase().includes(q))
      .sort((a, b) => L(a.term).localeCompare(L(b.term), lang));
    $('#glossList').innerHTML = list.map(g => `<div><dt>${esc(L(g.term))}<small>${esc(g.term[other] || '')}</small></dt><dd>${esc(L(g.def))}</dd></div>`).join('');
  }

  // ---------------- chrome: lang, theme, nav, toast ----------------
  function applyStatic() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.title = PAGE === 'home' ? t('meta.title') : t('page.' + PAGE) + ' · Saeta';
    if (has('shopCount')) $('#shopCount').textContent = SHOPS.length ? String(SHOPS.length) : '25+';
  }
  function setLang(l) {
    lang = l;
    store.set('lang', l);
    applyStatic();
    Object.keys(iconCache).forEach(k => delete iconCache[k]);
    render();
    renderGuide();
    renderShopFilters();
    renderShops();
    renderGlossary();
    renderQuiver();
    if (window.Tutorial3D && window.Tutorial3D.isOpen()) window.Tutorial3D.update({ steps: tutSteps(), labels: tutLabels(), lang });
    if (has('viewHint')) $('#viewHint').textContent = t(view === '2d' ? 'bench.hint2d' : 'bench.hint3d');
  }
  function currentTheme() {
    const a = document.documentElement.getAttribute('data-theme');
    if (a === 'dark' || a === 'light') return a;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.set('theme', next);
    $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', next === 'dark' ? '#14110e' : '#f4ecd8'));
  }
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function init() {
    applyStatic();
    bindWizard();
    bindTooltip();
    bindGuide();
    bindShops();
    const qm = new URLSearchParams(location.search).get('m');
    guideTab = qm && (qm in (PROC.materials || {}) || qm === 'tuning') ? qm : S.material in (PROC.materials || {}) ? S.material : 'wood';
    render();
    renderGuide();
    renderShopFilters();
    renderShops();
    renderGlossary();
    bindQuiver();
    renderQuiver();
    if (has('glossSearch')) $('#glossSearch').addEventListener('input', renderGlossary);
    $$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
    $('#themeBtn').addEventListener('click', toggleTheme);
    const burger = $('#navBurger');
    burger.addEventListener('click', () => {
      const open = !$('#navLinks').classList.contains('open');
      $('#navLinks').classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('#navLinks a').forEach(a => a.addEventListener('click', () => { $('#navLinks').classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => view === '2d' && renderBench(), 120); });
    if (/#a=/.test(location.hash)) { save(); history.replaceState(null, '', location.pathname + location.search); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
