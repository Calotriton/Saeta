/* =========================================================
   Saeta — 2D arrow renderer (SVG)
   Coordinates: 1 inch = K units. Nock on the left, point on the right.
   ========================================================= */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const K = 40;          // units per inch
  const T = 1.6;        // radial exaggeration for readability
  let uidCounter = 0;

  // ---------- helpers ----------
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function hexToRgb(h) {
    h = (h || '#888888').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  /** amt in [-1,1]: negative darkens, positive lightens */
  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  }
  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  // deterministic pseudo-random
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  const METAL = {
    steel: ['#f4f7f9', '#aeb9c1', '#5f6c76'],
    brass: ['#fbe7a6', '#c9a24a', '#7a5a18'],
    black: ['#7b7f84', '#33373b', '#111315'],
    bronze: ['#f0c79a', '#b07a45', '#5d3a1b'],
  };

  // ---------- gradient & pattern defs ----------
  function defs(svg, uid, spec) {
    const d = el('defs', null, svg);
    // cylinder shading overlay
    const g = el('linearGradient', { id: uid + 'cyl', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.10' }, g);
    el('stop', { offset: '.22', 'stop-color': '#fff', 'stop-opacity': '.55' }, g);
    el('stop', { offset: '.45', 'stop-color': '#fff', 'stop-opacity': '0' }, g);
    el('stop', { offset: '.8', 'stop-color': '#000', 'stop-opacity': '.22' }, g);
    el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '.42' }, g);
    // metals
    for (const m in METAL) {
      const mg = el('linearGradient', { id: uid + 'm-' + m, x1: 0, y1: 0, x2: 0, y2: 1 }, d);
      el('stop', { offset: '0', 'stop-color': METAL[m][1] }, mg);
      el('stop', { offset: '.25', 'stop-color': METAL[m][0] }, mg);
      el('stop', { offset: '.55', 'stop-color': METAL[m][1] }, mg);
      el('stop', { offset: '1', 'stop-color': METAL[m][2] }, mg);
    }
    // carbon weave
    const cw = el('pattern', { id: uid + 'carbon', width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, d);
    el('rect', { width: 6, height: 6, fill: '#1b1d20' }, cw);
    el('rect', { width: 3, height: 3, fill: '#2c3036' }, cw);
    el('rect', { x: 3, y: 3, width: 3, height: 3, fill: '#2c3036' }, cw);
    // fiberglass fibres
    const fg = el('pattern', { id: uid + 'fibre', width: 40, height: 3, patternUnits: 'userSpaceOnUse' }, d);
    el('rect', { width: 40, height: 3, fill: 'transparent' }, fg);
    el('line', { x1: 0, y1: 1, x2: 40, y2: 1, stroke: '#fff', 'stroke-opacity': '.18', 'stroke-width': '.6' }, fg);
    // feather barbs
    const fb = el('pattern', { id: uid + 'barbs', width: 3, height: 3, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-58)' }, d);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 3, stroke: '#000', 'stroke-opacity': '.16', 'stroke-width': '.8' }, fb);
    // barred feather stripes
    const bar = el('pattern', { id: uid + 'bars', width: 26, height: 26, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-35)' }, d);
    el('rect', { x: 0, y: 0, width: 9, height: 26, fill: '#000', 'fill-opacity': '.38' }, bar);
    // thread binding
    const th = el('pattern', { id: uid + 'thread', width: 3, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(12)' }, d);
    el('line', { x1: 0, y1: 0, x2: 3, y2: 0, stroke: '#000', 'stroke-opacity': '.35', 'stroke-width': '.8' }, th);
    // wrap patterns
    const wp = el('pattern', { id: uid + 'wrap-stripes', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
    el('rect', { width: 7, height: 14, fill: '#fff', 'fill-opacity': '.35' }, wp);
    const wd = el('pattern', { id: uid + 'wrap-diamond', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, d);
    el('path', { d: 'M8 0L16 8L8 16L0 8Z', fill: '#000', 'fill-opacity': '.25' }, wd);
    const wc = el('pattern', { id: uid + 'wrap-camo', width: 60, height: 30, patternUnits: 'userSpaceOnUse' }, d);
    el('path', { d: 'M0 8 Q10 0 20 6 T40 4 T60 10 V18 Q46 24 32 18 T8 20 T0 16Z', fill: '#000', 'fill-opacity': '.28' }, wc);
    el('path', { d: 'M5 24 Q18 20 26 26 T50 26 V30 H5Z', fill: '#fff', 'fill-opacity': '.18' }, wc);
    // glow for lighted nock
    const f = el('filter', { id: uid + 'glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, d);
    el('feGaussianBlur', { stdDeviation: 6, result: 'b' }, f);
    const fm = el('feMerge', null, f);
    el('feMergeNode', { in: 'b' }, fm);
    el('feMergeNode', { in: 'SourceGraphic' }, fm);
    return d;
  }

  function woodGrain(defsEl, uid, base, seed) {
    const id = uid + 'wood';
    const p = el('pattern', { id, width: 240, height: 24, patternUnits: 'userSpaceOnUse' }, defsEl);
    el('rect', { width: 240, height: 24, fill: base }, p);
    const r = rng(seed || 7);
    for (let i = 0; i < 9; i++) {
      const y = r() * 24;
      const len = 60 + r() * 180;
      const x = r() * 240;
      el('path', {
        d: `M${x} ${y} q ${len / 2} ${(r() - .5) * 3} ${len} ${(r() - .5) * 2}`,
        stroke: shade(base, -0.28 - r() * .15), 'stroke-width': .5 + r() * .9, fill: 'none', 'stroke-opacity': .55,
      }, p);
    }
    return 'url(#' + id + ')';
  }

  // ---------- path generators ----------
  /** Feather/vane profile. Rear at x=0, front at x=L, base at y=0, height up to -H. */
  function featherPath(shape, L, H, seed) {
    switch (shape) {
      case 'parabolic':
        return `M0 0 L0 ${-.8 * H} Q0 ${-H} ${.1 * L} ${-H} C${.42 * L} ${-H} ${.78 * L} ${-.32 * H} ${L} 0 Z`;
      case 'banana':
        return `M0 0 C0 ${-.55 * H} ${.1 * L} ${-H} ${.32 * L} ${-H} C${.58 * L} ${-H} ${.86 * L} ${-.42 * H} ${L} 0 Z`;
      case 'triangle':
        return `M0 0 L0 ${-.92 * H} Q0 ${-H} ${.05 * L} ${-.97 * H} L${L} 0 Z`;
      case 'round':
        return `M0 0 L0 ${-.62 * H} Q0 ${-H} ${.32 * L} ${-H} Q${.82 * L} ${-H} ${L} 0 Z`;
      case 'lowprofile':
        return `M0 0 L0 ${-.75 * H} Q${.02 * L} ${-.82 * H} ${.18 * L} ${-.8 * H} C${.55 * L} ${-.7 * H} ${.85 * L} ${-.25 * H} ${L} 0 Z`;
      case 'fluflu': {
        const r = rng(seed || 3);
        let d = `M0 0 L0 ${-.8 * H}`;
        const n = 22;
        for (let i = 1; i <= n; i++) {
          const x = (i / n) * L;
          const env = Math.sin(Math.min(1, (1 - i / n) * 1.25 + .05) * Math.PI / 2);
          const y = -H * env * (0.82 + r() * .22);
          const cx = x - L / n / 2;
          d += ` Q${cx} ${y - H * .12 * r()} ${x} ${y}`;
        }
        return d + ` L${L} 0 Z`;
      }
      case 'tradvane':
        return `M0 0 L0 ${-.85 * H} Q0 ${-H} ${.08 * L} ${-H} L${.3 * L} ${-H} C${.5 * L} ${-H} ${.55 * L} ${-.35 * H} ${L} 0 Z`;
      case 'shield':
      default:
        return `M0 0 L0 ${-.8 * H} Q0 ${-H} ${.1 * L} ${-H} L${.36 * L} ${-H} C${.56 * L} ${-H} ${.5 * L} ${-.22 * H} ${L} 0 Z`;
    }
  }

  // ---------- drawing parts ----------
  function drawFeather(g, uid, o) {
    // o: {x (rear), y (base), L, H, dir (-1 up / +1 down), color, kind, shape, barred, skew, seed, opacity}
    const grp = el('g', { transform: `translate(${o.x} ${o.y}) scale(1 ${o.dir < 0 ? 1 : -1}) skewX(${o.skew || 0})`, opacity: o.opacity || 1 }, g);
    const d = featherPath(o.shape, o.L, o.H, o.seed);
    const isVane = o.kind !== 'feather';
    const base = o.color;
    el('path', { d, fill: base, stroke: shade(base, -.45), 'stroke-width': isVane ? 1 : .8, 'stroke-linejoin': 'round' }, grp);
    if (!isVane) {
      el('path', { d, fill: `url(#${uid}barbs)` }, grp);
      if (o.barred) el('path', { d, fill: `url(#${uid}bars)` }, grp);
      // quill
      el('rect', { x: 0, y: -2.2, width: o.L, height: 2.2, fill: shade(base, .55), opacity: .9 }, grp);
    } else {
      el('path', { d, fill: '#fff', 'fill-opacity': .12, transform: `translate(0 ${o.H * .08}) scale(1 .5)` }, grp);
      el('rect', { x: 0, y: -1.6, width: o.L, height: 1.6, fill: shade(base, -.25) }, grp);
    }
    return grp;
  }

  function threadBand(g, uid, x, w, r, color) {
    el('rect', { x, y: -r * 1.06, width: w, height: r * 2.12, rx: 1.5, fill: color }, g);
    el('rect', { x, y: -r * 1.06, width: w, height: r * 2.12, rx: 1.5, fill: `url(#${uid}thread)` }, g);
  }

  function metalFill(uid, color) { return `url(#${uid}m-${color || 'steel'})`; }

  /** Point at the front end of the shaft (xF), radius r. Returns forward extent in units. */
  function drawPoint(g, uid, xF, r, pt) {
    const shape = pt.shape || 'field';
    const fill = metalFill(uid, pt.metal);
    const stroke = '#1f2428';
    const sw = 1;
    const I = K; // inch
    const grp = el('g', { class: 'part', 'data-part': 'point' }, g);
    const R = r * 1.08;
    switch (shape) {
      case 'bullet': {
        el('path', { d: `M${xF - .6 * I} ${-R} L${xF + .25 * I} ${-R} C${xF + .75 * I} ${-R} ${xF + .95 * I} ${-R * .3} ${xF + 1.0 * I} 0 C${xF + .95 * I} ${R * .3} ${xF + .75 * I} ${R} ${xF + .25 * I} ${R} L${xF - .6 * I} ${R} Z`, fill, stroke, 'stroke-width': sw }, grp);
        return 1.0 * I;
      }
      case 'target': {
        el('path', { d: `M${xF - .55 * I} ${-R} L${xF + .3 * I} ${-R} L${xF + .75 * I} ${-R * .18} L${xF + .8 * I} 0 L${xF + .75 * I} ${R * .18} L${xF + .3 * I} ${R} L${xF - .55 * I} ${R} Z`, fill, stroke, 'stroke-width': sw }, grp);
        return .8 * I;
      }
      case 'bodkin': {
        el('path', { d: `M${xF - .9 * I} ${-R * 1.05} L${xF + .1 * I} ${-R * .8} L${xF + .45 * I} ${-R * .45} L${xF + 2.6 * I} 0 L${xF + .45 * I} ${R * .45} L${xF + .1 * I} ${R * .8} L${xF - .9 * I} ${R * 1.05} Z`, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }, grp);
        el('path', { d: `M${xF + .45 * I} 0 L${xF + 2.6 * I} 0`, stroke: '#000', 'stroke-opacity': .35, 'stroke-width': 1 }, grp);
        return 2.6 * I;
      }
      case 'broadhead': {
        el('path', { d: `M${xF - .7 * I} ${-R} L${xF + .3 * I} ${-R * .8} L${xF + .5 * I} ${-R * .55} L${xF + .5 * I} ${R * .55} L${xF + .3 * I} ${R * .8} L${xF - .7 * I} ${R} Z`, fill, stroke, 'stroke-width': sw }, grp);
        el('path', { d: `M${xF + .25 * I} ${-R * .5} L${xF + .45 * I} ${-.62 * I * T} L${xF + 2.3 * I} 0 L${xF + .45 * I} ${.62 * I * T} L${xF + .25 * I} ${R * .5} Z`, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }, grp);
        el('path', { d: `M${xF + .45 * I} ${-.62 * I * T} L${xF + 2.3 * I} 0 L${xF + .45 * I} ${.62 * I * T}`, fill: 'none', stroke: '#fff', 'stroke-opacity': .5, 'stroke-width': 1 }, grp);
        return 2.3 * I;
      }
      case 'medieval': { // swallowtail / leaf head
        el('path', { d: `M${xF - .8 * I} ${-R} L${xF + .3 * I} ${-R * .75} L${xF + .3 * I} ${R * .75} L${xF - .8 * I} ${R} Z`, fill, stroke, 'stroke-width': sw }, grp);
        el('path', { d: `M${xF + .2 * I} 0 L${xF + .05 * I} ${-.55 * I * T} L${xF + .75 * I} ${-.3 * I * T} Q${xF + 1.6 * I} ${-.2 * I * T} ${xF + 2.4 * I} 0 Q${xF + 1.6 * I} ${.2 * I * T} ${xF + .75 * I} ${.3 * I * T} L${xF + .05 * I} ${.55 * I * T} Z`, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }, grp);
        return 2.4 * I;
      }
      case 'blunt': {
        const B = r * 1.45;
        el('path', { d: `M${xF - .5 * I} ${-R} L${xF - .1 * I} ${-B} L${xF + .55 * I} ${-B} Q${xF + .62 * I} ${-B} ${xF + .62 * I} ${-B + 3} L${xF + .62 * I} ${B - 3} Q${xF + .62 * I} ${B} ${xF + .55 * I} ${B} L${xF - .1 * I} ${B} L${xF - .5 * I} ${R} Z`, fill, stroke, 'stroke-width': sw }, grp);
        return .62 * I;
      }
      case 'judo': {
        el('path', { d: `M${xF - .55 * I} ${-R} L${xF + .35 * I} ${-R} L${xF + .7 * I} 0 L${xF + .35 * I} ${R} L${xF - .55 * I} ${R} Z`, fill, stroke, 'stroke-width': sw }, grp);
        for (const s of [-1, 1]) {
          el('path', { d: `M${xF + .2 * I} ${s * R * .6} L${xF + .45 * I} ${s * .55 * I * T}`, stroke: '#2a2f33', 'stroke-width': 2, 'stroke-linecap': 'round' }, grp);
          el('circle', { cx: xF + .45 * I, cy: s * .55 * I * T, r: 2.4, fill: '#2a2f33' }, grp);
        }
        return .7 * I;
      }
      case 'rubber': {
        const B = r * 1.75;
        el('path', { d: `M${xF - .7 * I} ${-R * 1.05} L${xF - .2 * I} ${-B} L${xF + .9 * I} ${-B} Q${xF + 1 * I} ${-B} ${xF + 1 * I} ${-B + 4} L${xF + 1 * I} ${B - 4} Q${xF + 1 * I} ${B} ${xF + .9 * I} ${B} L${xF - .2 * I} ${B} L${xF - .7 * I} ${R * 1.05} Z`, fill: '#23262a', stroke: '#000', 'stroke-width': sw }, grp);
        el('rect', { x: xF - .1 * I, y: -B * .7, width: .9 * I, height: B * .3, fill: '#fff', 'fill-opacity': .12, rx: 2 }, grp);
        return 1 * I;
      }
      case 'larp': {
        const B = .9 * I;
        el('rect', { x: xF - .8 * I, y: -R * 1.2, width: .9 * I, height: R * 2.4, fill: '#2b2b2b' }, grp);
        el('path', { d: `M${xF} ${-B} L${xF + 1.6 * I} ${-B} Q${xF + 2.1 * I} ${-B} ${xF + 2.1 * I} ${-B * .5} L${xF + 2.1 * I} ${B * .5} Q${xF + 2.1 * I} ${B} ${xF + 1.6 * I} ${B} L${xF} ${B} Z`, fill: pt.color || '#d6d3cc', stroke: '#555', 'stroke-width': 1.2 }, grp);
        el('path', { d: `M${xF + .2 * I} ${-B * .55} L${xF + 1.8 * I} ${-B * .55}`, stroke: '#fff', 'stroke-opacity': .5, 'stroke-width': 3, 'stroke-linecap': 'round' }, grp);
        return 2.1 * I;
      }
      case 'whistle': {
        const B = r * 2.1;
        el('path', { d: `M${xF - .6 * I} ${-R} L${xF} ${-R} C${xF + .2 * I} ${-B} ${xF + .9 * I} ${-B} ${xF + 1.1 * I} ${-R * .9} L${xF + 1.6 * I} 0 L${xF + 1.1 * I} ${R * .9} C${xF + .9 * I} ${B} ${xF + .2 * I} ${B} ${xF} ${R} L${xF - .6 * I} ${R} Z`, fill: pt.metal === 'steel' ? '#d9c7a0' : fill, stroke, 'stroke-width': sw }, grp);
        for (const dx of [.35, .7]) el('ellipse', { cx: xF + dx * I, cy: -R * .2, rx: 3.2, ry: 4.2, fill: '#1c1c1c' }, grp);
        return 1.6 * I;
      }
      case 'field':
      default: {
        el('path', { d: `M${xF - .6 * I} ${-R} L${xF + .35 * I} ${-R} L${xF + .42 * I} ${-R * .82} L${xF + .72 * I} 0 L${xF + .42 * I} ${R * .82} L${xF + .35 * I} ${R} L${xF - .6 * I} ${R} Z`, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round' }, grp);
        el('line', { x1: xF + .35 * I, y1: -R, x2: xF + .35 * I, y2: R, stroke: '#000', 'stroke-opacity': .3 }, grp);
        return .72 * I;
      }
    }
  }

  /** Nock: throat at xT. Returns {shaftStart (units), back (units behind throat)} */
  function drawNock(g, uid, xT, r, nk, shaftFill) {
    const I = K;
    const type = nk.type || 'inside';
    const color = nk.color || '#e8e2d0';
    const stroke = shade(color, -.55);
    const gap = Math.max(2.2, r * .36); // half groove width
    const grp = el('g', { class: 'part', 'data-part': 'nock' }, g);
    const prongs = (x0, x1, rr, fill, filter) => {
      // two prongs from x0 (back) to x1 (throat) with rounded tips
      const pg = el('g', { filter }, grp);
      el('path', { d: `M${x1} ${-gap} L${x0 + 3} ${-gap} Q${x0} ${-gap} ${x0} ${-gap - 3} L${x0} ${-rr + 3} Q${x0} ${-rr} ${x0 + 4} ${-rr} L${x1} ${-rr} Z`, fill, stroke, 'stroke-width': 1 }, pg);
      el('path', { d: `M${x1} ${gap} L${x0 + 3} ${gap} Q${x0} ${gap} ${x0} ${gap + 3} L${x0} ${rr - 3} Q${x0} ${rr} ${x0 + 4} ${rr} L${x1} ${rr} Z`, fill, stroke, 'stroke-width': 1 }, pg);
      return pg;
    };
    switch (type) {
      case 'self': {
        // slot cut into the wood, horn/fibre reinforcement insert, thread binding
        const x0 = xT - .32 * I;
        prongs(x0, xT + 1, r, shaftFill);
        el('rect', { x: xT - .05 * I, y: -r, width: .08 * I, height: r * 2, fill: nk.insert || '#2a201a', opacity: .85 }, grp);
        threadBand(grp, uid, xT + .25 * I, .35 * I, r, nk.binding || '#c33b2a');
        return { shaftStart: x0, back: .32 * I, coversShaft: false };
      }
      case 'over': // over/taper nock for wood
      case 'taper': {
        const R0 = r * 1.18;
        el('path', { d: `M${xT} ${-R0} L${xT + .28 * I} ${-R0} L${xT + .7 * I} ${-r * 1.01} L${xT + .7 * I} ${r * 1.01} L${xT + .28 * I} ${R0} L${xT} ${R0} Z`, fill: color, stroke, 'stroke-width': 1 }, grp);
        prongs(xT - .3 * I, xT + 1, R0, color);
        el('rect', { x: xT, y: -R0, width: .7 * I, height: R0 * 2, fill: '#fff', 'fill-opacity': .0 }, grp);
        return { shaftStart: xT + .45 * I, back: .3 * I, coversShaft: true };
      }
      case 'pin': {
        const R0 = r * .98;
        el('rect', { x: xT - .02 * I, y: -R0, width: .2 * I, height: R0 * 2, fill: color, stroke, 'stroke-width': 1 }, grp);
        prongs(xT - .3 * I, xT + 1, R0, color);
        el('rect', { x: xT + .18 * I, y: -r * 1.02, width: .12 * I, height: r * 2.04, fill: metalFill(uid, 'steel'), stroke: '#333', 'stroke-width': .6 }, grp);
        return { shaftStart: xT + .3 * I, back: .3 * I, coversShaft: false };
      }
      case 'lighted': {
        const R0 = r * 1.02;
        const glow = nk.color || '#57ff6a';
        el('rect', { x: xT - .3 * I, y: -R0 * 1.4, width: .7 * I, height: R0 * 2.8, rx: R0, fill: glow, opacity: .35, filter: `url(#${uid}glow)` }, grp);
        el('rect', { x: xT, y: -R0, width: .22 * I, height: R0 * 2, fill: glow, stroke: shade(glow, -.5), 'stroke-width': 1 }, grp);
        prongs(xT - .3 * I, xT + 1, R0, glow);
        return { shaftStart: xT + .2 * I, back: .3 * I, coversShaft: false };
      }
      case 'inside':
      default: {
        const R0 = r * 1.02;
        el('rect', { x: xT - .02 * I, y: -R0, width: .16 * I, height: R0 * 2, fill: color, stroke, 'stroke-width': 1 }, grp);
        prongs(xT - .3 * I, xT + 1, R0, color);
        return { shaftStart: xT + .14 * I, back: .3 * I, coversShaft: false };
      }
    }
  }

  function shaftFill(defsEl, uid, sp) {
    const mat = sp.material;
    const color = sp.shaftColor || '#d8b27a';
    if (mat === 'wood') return woodGrain(defsEl, uid, color, 11);
    if (mat === 'bamboo') return woodGrain(defsEl, uid, color, 29);
    if (mat === 'carbon') {
      if (sp.carbonLook === 'wood') return woodGrain(defsEl, uid, color, 5);
      if (sp.carbonLook === 'weave') return `url(#${uid}carbon)`;
      return color || '#1d1f22';
    }
    return color;
  }

  // ---------- main render ----------
  /**
   * spec: {
   *  material, lengthIn, diameterIn, shaftColor, carbonLook,
   *  point:{shape, metal, color}, nock:{type,color,binding},
   *  fletch:{kind, shape, lengthIn, heightIn, count, orientation, cockColor, henColor, barred, offsetIn},
   *  crown:{on,color,lengthIn}, cresting:[{color,widthIn,gapIn}], wrap:{on,color,lengthIn,pattern},
   *  binding:{on,color}, dimension: true, labels: {length:'..'}
   * }
   */
  function render(container, spec, opts) {
    opts = opts || {};
    const uid = 'a' + (++uidCounter) + '-';
    const L = Math.max(14, Math.min(40, spec.lengthIn || 29));
    const r = Math.max(.1, (spec.diameterIn || .3125) / 2) * K * T;
    const fl = spec.fletch || {};
    const FL = (fl.lengthIn || 5) * K;
    const FH = (fl.heightIn || (fl.shape === 'fluflu' ? 1.25 : fl.kind === 'tradvane' ? .5 : .55)) * K * T * .82;

    const box = container.getBoundingClientRect();
    const cw = Math.max(200, box.width || 900);
    const ch = Math.max(60, box.height || 150);
    const tailPad = .6 * K, headPad = 3.0 * K;
    const contentW = L * K + tailPad + headPad;
    const needH = Math.max(FH * 2.4, r * 6) + (spec.dimension ? 46 : 16);
    let vbW = contentW, vbH = contentW * ch / cw;
    if (vbH < needH) { vbH = needH; vbW = vbH * cw / ch; }
    const svg = el('svg', { viewBox: `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`, preserveAspectRatio: 'xMidYMid meet', xmlns: NS, 'aria-hidden': 'true' });
    const d = defs(svg, uid, spec);
    const cy = spec.dimension ? vbH / 2 - 12 : vbH / 2;
    const x0 = (vbW - contentW) / 2 + tailPad;   // throat x
    const xF = x0 + L * K;                         // shaft front end
    const root = el('g', { transform: `translate(0 ${cy})` }, svg);

    const sFill = shaftFill(d, uid, spec);
    const nk = spec.nock || {};
    const ori = fl.orientation || 'offset';
    const skew = ori === 'helical' ? -14 : ori === 'offset' ? -6 : 0;
    const flRear = x0 + (fl.offsetIn != null ? fl.offsetIn : 1.25) * K;
    const count = fl.count || 3;
    const kind = fl.kind || 'feather';
    const cock = fl.cockColor || '#c8352a';
    const hen = fl.henColor || '#efe6d2';

    // 1. back fletching (behind shaft)
    const fG = el('g', { class: 'part', 'data-part': 'fletching' }, root);
    if (count === 3) {
      drawFeather(fG, uid, { x: flRear + 3, y: r * .1, L: FL, H: FH * .5, dir: 1, color: shade(hen, -.22), kind, shape: fl.shape, barred: fl.barred, skew: -skew, seed: 4 });
    } else {
      drawFeather(fG, uid, { x: flRear, y: r * .2, L: FL, H: FH, dir: 1, color: shade(hen, -.12), kind, shape: fl.shape, barred: fl.barred, skew: -skew, seed: 4 });
    }

    // 2. shaft
    const nockInfo = drawNockPlaceholder();
    function drawNockPlaceholder() { return null; }
    const shaftG = el('g', { class: 'part', 'data-part': 'shaft' }, root);
    const sStart = x0 + (nk.type === 'self' ? -.32 * K : .1 * K);
    el('rect', { x: sStart, y: -r, width: xF - sStart, height: r * 2, fill: sFill }, shaftG);
    if (spec.material === 'fiberglass') el('rect', { x: sStart, y: -r, width: xF - sStart, height: r * 2, fill: `url(#${uid}fibre)` }, shaftG);
    if (spec.material === 'bamboo') {
      // nodes
      for (let n = 6.5; n < L - 1; n += 7.5) {
        const nx = x0 + n * K;
        el('rect', { x: nx - 2.5, y: -r * 1.08, width: 5, height: r * 2.16, rx: 2, fill: shade(spec.shaftColor || '#d9c38a', -.25) }, shaftG);
      }
    }
    if (spec.material === 'carbon' && spec.carbonLook === 'footed') {
      const fx = xF - 6 * K;
      const fillFoot = woodGrain(d, uid + 'f', spec.footColor || '#7a4a2a', 21);
      el('rect', { x: fx, y: -r, width: 6 * K, height: r * 2, fill: fillFoot }, shaftG);
      el('path', { d: `M${fx} ${-r} l ${K * .8} ${r} l ${-K * .8} ${r} Z`, fill: sFill }, shaftG);
    }
    if (spec.material === 'aluminium' && spec.aluPattern === 'camo') {
      el('rect', { x: sStart, y: -r, width: xF - sStart, height: r * 2, fill: `url(#${uid}wrap-camo)` }, shaftG);
    }

    // 3. crown dip
    const cr = spec.crown || {};
    if (cr.on) {
      const len = (cr.lengthIn || 9) * K;
      el('rect', { class: 'part', 'data-part': 'crown', x: sStart, y: -r, width: Math.min(len, xF - sStart - K), height: r * 2, fill: cr.color || '#1f3b5c' }, root);
    }
    // 4. wrap
    const wr = spec.wrap || {};
    if (wr.on) {
      const wx = x0 + .5 * K;
      const ww = (wr.lengthIn || 7) * K;
      const wg = el('g', { class: 'part', 'data-part': 'wrap' }, root);
      el('rect', { x: wx, y: -r * 1.03, width: ww, height: r * 2.06, fill: wr.color || '#f5f1e6' }, wg);
      if (wr.pattern && wr.pattern !== 'solid') el('rect', { x: wx, y: -r * 1.03, width: ww, height: r * 2.06, fill: `url(#${uid}wrap-${wr.pattern})` }, wg);
    }
    // 5. cresting
    const cres = (spec.cresting || []).filter(c => c && c.color);
    if (cres.length) {
      const cg = el('g', { class: 'part', 'data-part': 'cresting' }, root);
      let cx = Math.max(flRear + FL + .7 * K, cr.on ? sStart + (cr.lengthIn || 9) * K - .02 * K : 0);
      if (cr.on) cx = sStart + (cr.lengthIn || 9) * K;
      for (const c of cres) {
        const w = (c.widthIn || .125) * K;
        el('rect', { x: cx, y: -r * 1.01, width: w, height: r * 2.02, fill: c.color }, cg);
        cx += w + (c.gapIn != null ? c.gapIn : .06) * K;
      }
    }
    // 6. cylinder shading over the shaft
    el('rect', { x: sStart, y: -r * 1.03, width: xF - sStart, height: r * 2.06, fill: `url(#${uid}cyl)`, 'pointer-events': 'none' }, root);
    if (spec.material === 'aluminium' || (spec.material === 'carbon' && !spec.carbonLook) || spec.material === 'fiberglass') {
      el('rect', { x: sStart, y: -r * .62, width: xF - sStart, height: r * .2, fill: '#fff', 'fill-opacity': .35, 'pointer-events': 'none' }, root);
    }

    // 7. front fletching & 4-fletch front strip
    const fG2 = el('g', { class: 'part', 'data-part': 'fletching' }, root);
    if (count === 3) {
      drawFeather(fG2, uid, { x: flRear, y: r * .25, L: FL, H: FH * .5, dir: 1, color: hen, kind, shape: fl.shape, barred: fl.barred, skew: -skew, seed: 9 });
    } else {
      const strip = el('g', { transform: `skewX(${skew})` }, fG2);
      el('rect', { x: flRear + 4, y: -r * .22, width: FL * .9, height: r * .44, rx: 2, fill: hen, stroke: shade(hen, -.4), 'stroke-width': .6 }, strip);
    }
    // top (cock) feather
    drawFeather(fG2, uid, { x: flRear, y: -r * .85, L: FL, H: FH, dir: -1, color: cock, kind, shape: fl.shape, barred: fl.barred, skew, seed: 2 });

    // 8. thread binding at fletching ends
    const bd = spec.binding || {};
    if (bd.on && kind === 'feather') {
      const bg = el('g', { class: 'part', 'data-part': 'binding' }, root);
      threadBand(bg, uid, flRear - .22 * K, .3 * K, r, bd.color || '#c33b2a');
      threadBand(bg, uid, flRear + FL - .04 * K, .3 * K, r, bd.color || '#c33b2a');
    }

    // 9. nock & point (on top)
    drawNock(root, uid, x0, r, nk, sFill);
    const ext = drawPoint(root, uid, xF, r, spec.point || {});

    // 10. dimension line
    if (spec.dimension) {
      const y = Math.max(FH * .6, r * 2) + 14;
      const dg = el('g', { style: 'color: var(--ink-2)', 'pointer-events': 'none' }, root);
      el('path', { d: `M${x0} ${y - 6} V${y + 6} M${xF} ${y - 6} V${y + 6} M${x0} ${y} H${xF}`, stroke: 'currentColor', 'stroke-width': 1.4, fill: 'none' }, dg);
      el('path', { d: `M${x0} ${y} l8 -4 v8 Z M${xF} ${y} l-8 -4 v8 Z`, fill: 'currentColor' }, dg);
      const label = (spec.labels && spec.labels.length) || '';
      if (label) {
        const tw = label.length * 8.4 + 16;
        el('rect', { x: (x0 + xF) / 2 - tw / 2, y: y - 11, width: tw, height: 22, rx: 4, style: 'fill: var(--surface)' }, dg);
        const t = el('text', { x: (x0 + xF) / 2, y: y + 5, 'text-anchor': 'middle', style: 'font: 600 15px var(--font-pixel); fill: currentColor' }, dg);
        t.textContent = label;
      }
    }

    container.replaceChildren(svg);
    return svg;
  }

  // ---------- small icons for option cards ----------
  function iconSvg(w, h, draw) {
    const uid = 'i' + (++uidCounter) + '-';
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, xmlns: NS, 'aria-hidden': 'true' });
    defs(svg, uid, {});
    const g = el('g', { transform: `translate(0 ${h / 2})` }, svg);
    draw(g, uid, svg);
    return svg.outerHTML;
  }
  const icons = {
    point(shape, metal) {
      return iconSvg(170, 60, (g, uid) => {
        const r = 6.5;
        el('rect', { x: 0, y: -r, width: 60, height: r * 2, fill: '#b98a52' }, g);
        el('rect', { x: 0, y: -r, width: 60, height: r * 2, fill: `url(#${uid}cyl)` }, g);
        drawPoint(g, uid, 60, r, { shape, metal });
      });
    },
    nock(type, color) {
      return iconSvg(120, 60, (g, uid, svg) => {
        const r = 8;
        const fill = '#b98a52';
        el('rect', { x: type === 'self' ? 30 : 42, y: -r, width: 80, height: r * 2, fill }, g);
        el('rect', { x: type === 'self' ? 30 : 42, y: -r, width: 80, height: r * 2, fill: `url(#${uid}cyl)` }, g);
        drawNock(g, uid, 42, r, { type, color }, fill);
      });
    },
    feather(shape, kind, color, barred) {
      return iconSvg(170, 60, (g, uid) => {
        el('rect', { x: 0, y: 16, width: 170, height: 8, fill: '#8a6a45' }, g);
        drawFeather(g, uid, { x: 15, y: 16, L: 140, H: shape === 'fluflu' ? 44 : 36, dir: -1, color: color || '#c8352a', kind: kind || 'feather', shape, barred });
      });
    },
    shaft(material, color, look) {
      return iconSvg(170, 40, (g, uid, svg) => {
        const d = svg.querySelector('defs');
        const fill = shaftFill(d, uid, { material, shaftColor: color, carbonLook: look });
        el('rect', { x: 4, y: -8, width: 162, height: 16, rx: 3, fill }, g);
        if (material === 'bamboo') for (const x of [50, 120]) el('rect', { x, y: -8.5, width: 5, height: 17, rx: 2, fill: shade(color, -.25) }, g);
        if (material === 'fiberglass') el('rect', { x: 4, y: -8, width: 162, height: 16, fill: `url(#${uid}fibre)` }, g);
        el('rect', { x: 4, y: -8, width: 162, height: 16, rx: 3, fill: `url(#${uid}cyl)` }, g);
      });
    },
  };

  window.Viz2D = { render, icons, shade, luminance, K };
})();
