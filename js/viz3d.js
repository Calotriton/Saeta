/* =========================================================
   Saeta — 3D arrow viewer (three.js, lazy-loaded)
   Units: inches. Arrow axis = +X (point direction).
   ========================================================= */
(function () {
  'use strict';
  const THREE_URL = 'https://unpkg.com/three@0.147.0/build/three.min.js';
  let loading = null;
  let ctx = null; // {renderer, scene, camera, group, container, raf, state}

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = THREE_URL;
      s.async = true;
      s.onload = () => resolve(window.THREE);
      s.onerror = () => { loading = null; reject(new Error('three.js failed to load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  const shade = (h, a) => window.Viz2D.shade(h, a);

  // ---------- textures ----------
  function shaftTexture(THREE, spec) {
    const L = spec.lengthIn;
    const H = 2048, W = 64;               // H along length (top = point end), W around
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const pxPerIn = H / L;
    const y = (inFromNock) => H - inFromNock * pxPerIn; // canvas y for distance from nock
    const base = spec.shaftColor || '#d8b27a';
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    const mat = spec.material;
    if (mat === 'wood' || mat === 'bamboo' || (mat === 'carbon' && spec.carbonLook === 'wood')) {
      let s = 7;
      const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = shade(base, -0.2 - rnd() * 0.2);
        g.globalAlpha = 0.5;
        g.lineWidth = 0.6 + rnd() * 1.4;
        const x = rnd() * W;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + (rnd() - .5) * 10, H / 3, x + (rnd() - .5) * 10, H * 2 / 3, x + (rnd() - .5) * 6, H);
        g.stroke();
      }
      g.globalAlpha = 1;
      if (mat === 'bamboo') {
        g.fillStyle = shade(base, -0.28);
        for (let n = 6.5; n < L - 1; n += 7.5) g.fillRect(0, y(n) - 4, W, 8);
      }
    } else if (mat === 'carbon' && spec.carbonLook === 'weave') {
      for (let yy = 0; yy < H; yy += 8) for (let xx = 0; xx < W; xx += 8) {
        g.fillStyle = ((xx + yy) / 8) % 2 ? '#2c3036' : '#1b1d20';
        g.fillRect(xx, yy, 8, 8);
      }
    } else if (mat === 'fiberglass') {
      g.globalAlpha = .15; g.fillStyle = '#fff';
      for (let xx = 0; xx < W; xx += 4) g.fillRect(xx, 0, 1, H);
      g.globalAlpha = 1;
    }
    if (mat === 'carbon' && spec.carbonLook === 'footed') {
      g.fillStyle = spec.footColor || '#7a4a2a';
      g.fillRect(0, 0, W, 6 * pxPerIn);
    }
    if (spec.crown && spec.crown.on) {
      g.fillStyle = spec.crown.color || '#1f3b5c';
      const len = Math.min(spec.crown.lengthIn || 9, L - 1);
      g.fillRect(0, y(len), W, len * pxPerIn);
    }
    if (spec.wrap && spec.wrap.on) {
      const from = .5, to = .5 + (spec.wrap.lengthIn || 7);
      g.fillStyle = spec.wrap.color || '#f5f1e6';
      g.fillRect(0, y(to), W, (to - from) * pxPerIn);
      if (spec.wrap.pattern === 'stripes') {
        g.fillStyle = 'rgba(255,255,255,.35)';
        for (let yy = y(to); yy < y(from); yy += 24) { g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy + 24); g.lineTo(W, yy + 36); g.lineTo(0, yy + 12); g.fill(); }
      } else if (spec.wrap.pattern === 'diamond' || spec.wrap.pattern === 'camo') {
        g.fillStyle = 'rgba(0,0,0,.25)';
        for (let yy = y(to); yy < y(from); yy += 32) for (let xx = 0; xx < W; xx += 32) { g.beginPath(); g.moveTo(xx + 16, yy); g.lineTo(xx + 32, yy + 16); g.lineTo(xx + 16, yy + 32); g.lineTo(xx, yy + 16); g.fill(); }
      }
    }
    const cres = (spec.cresting || []).filter(x => x && x.color);
    if (cres.length) {
      let at = spec.crown && spec.crown.on ? (spec.crown.lengthIn || 9) : 1.25 + (spec.fletch.lengthIn || 5) + .7;
      for (const b of cres) {
        g.fillStyle = b.color;
        const w = b.widthIn || .125;
        g.fillRect(0, y(at + w), W, w * pxPerIn);
        at += w + (b.gapIn != null ? b.gapIn : .06);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function featherTexture(THREE, color, kind, barred) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 128, 128);
    if (kind === 'feather') {
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2;
      for (let i = -128; i < 256; i += 5) { g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 70, 0); g.stroke(); }
      if (barred) {
        g.fillStyle = 'rgba(0,0,0,.38)';
        for (let i = -128; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 22, 128); g.lineTo(i + 112, 0); g.lineTo(i + 90, 0); g.fill(); }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // ---------- feather shape (same profiles as the 2D renderer, y up) ----------
  function featherShape(THREE, shape, L, H) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    switch (shape) {
      case 'parabolic':
        s.lineTo(0, .8 * H); s.quadraticCurveTo(0, H, .1 * L, H); s.bezierCurveTo(.42 * L, H, .78 * L, .32 * H, L, 0); break;
      case 'banana':
        s.bezierCurveTo(0, .55 * H, .1 * L, H, .32 * L, H); s.bezierCurveTo(.58 * L, H, .86 * L, .42 * H, L, 0); break;
      case 'triangle':
        s.lineTo(0, .95 * H); s.lineTo(L, 0); break;
      case 'round':
        s.lineTo(0, .62 * H); s.quadraticCurveTo(0, H, .32 * L, H); s.quadraticCurveTo(.82 * L, H, L, 0); break;
      case 'lowprofile':
        s.lineTo(0, .75 * H); s.quadraticCurveTo(.02 * L, .82 * H, .18 * L, .8 * H); s.bezierCurveTo(.55 * L, .7 * H, .85 * L, .25 * H, L, 0); break;
      case 'fluflu': {
        s.lineTo(0, .8 * H);
        const n = 22;
        let seed = 3; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
        for (let i = 1; i <= n; i++) {
          const x = (i / n) * L;
          const env = Math.sin(Math.min(1, (1 - i / n) * 1.25 + .05) * Math.PI / 2);
          s.quadraticCurveTo(x - L / n / 2, H * env * (0.9 + r() * .3), x, H * env * (0.82 + r() * .22));
        }
        s.lineTo(L, 0); break;
      }
      case 'tradvane':
        s.lineTo(0, .85 * H); s.quadraticCurveTo(0, H, .08 * L, H); s.lineTo(.3 * L, H); s.bezierCurveTo(.5 * L, H, .55 * L, .35 * H, L, 0); break;
      default: // shield
        s.lineTo(0, .8 * H); s.quadraticCurveTo(0, H, .1 * L, H); s.lineTo(.36 * L, H); s.bezierCurveTo(.56 * L, H, .5 * L, .22 * H, L, 0);
    }
    s.lineTo(0, 0);
    return s;
  }

  // ---------- point & nock geometry ----------
  function lathe(THREE, pts, seg) {
    return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 40);
  }
  /** Lathe runs around Y; we rotate so Y→X. Profile: [radius, axial] */
  function pointMesh(THREE, pt, r, metalMat) {
    const g = new THREE.Group();
    const R = r * 1.05;
    let geo;
    switch (pt.shape) {
      case 'bullet': geo = lathe(THREE, [[0, -.6], [R, -.6], [R, .25], [R * .9, .55], [R * .55, .85], [0, 1.0]]); break;
      case 'target': geo = lathe(THREE, [[0, -.55], [R, -.55], [R, .3], [R * .18, .75], [0, .8]]); break;
      case 'bodkin': {
        g.add(new THREE.Mesh(lathe(THREE, [[0, -.9], [R, -.9], [R * .8, .1], [R * .45, .45], [0, .46]]), metalMat));
        const needle = new THREE.Mesh(new THREE.ConeGeometry(R * .62, 2.15, 4), metalMat);
        needle.position.y = .45 + 1.075;
        g.add(needle);
        return g;
      }
      case 'broadhead':
      case 'medieval': {
        g.add(new THREE.Mesh(lathe(THREE, [[0, -.7], [R, -.7], [R * .8, .3], [R * .5, .5], [0, .5]]), metalMat));
        const sh = new THREE.Shape();
        const w = pt.shape === 'medieval' ? .55 : .62;
        sh.moveTo(-w, .25); sh.lineTo(0, pt.shape === 'medieval' ? 2.4 : 2.3); sh.lineTo(w, .25);
        if (pt.shape === 'medieval') { sh.lineTo(w * .55, .05); sh.lineTo(0, .45); sh.lineTo(-w * .55, .05); }
        sh.lineTo(-w, .25);
        const blade = new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false });
        blade.translate(0, 0, -.015);
        const b1 = new THREE.Mesh(blade, metalMat); g.add(b1);
        if (pt.shape === 'broadhead') { const b2 = new THREE.Mesh(blade, metalMat); b2.rotation.y = Math.PI / 2; g.add(b2); }
        return g;
      }
      case 'blunt': geo = lathe(THREE, [[0, -.5], [R, -.5], [r * 1.45, -.1], [r * 1.45, .55], [r * 1.3, .62], [0, .62]]); break;
      case 'judo': {
        g.add(new THREE.Mesh(lathe(THREE, [[0, -.55], [R, -.55], [R, .35], [0, .7]]), metalMat));
        for (let i = 0; i < 4; i++) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 6), metalMat);
          const a = i * Math.PI / 2;
          arm.position.set(Math.cos(a) * .25, .35, Math.sin(a) * .25);
          arm.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9);
          g.add(arm);
        }
        return g;
      }
      case 'rubber': {
        const m = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: .9 });
        g.add(new THREE.Mesh(lathe(THREE, [[0, -.7], [R * 1.05, -.7], [r * 1.75, -.2], [r * 1.75, .95], [r * 1.6, 1], [0, 1]]), m));
        return g;
      }
      case 'larp': {
        const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(pt.color || '#d6d3cc'), roughness: .95 });
        g.add(new THREE.Mesh(lathe(THREE, [[0, -.8], [r * 1.2, -.8], [r * 1.2, 0], [.9, 0], [.9, 1.6], [.6, 2.05], [0, 2.1]]), m));
        return g;
      }
      case 'whistle': geo = lathe(THREE, [[0, -.6], [R, -.6], [R, 0], [r * 2.1, .4], [r * 2.1, .8], [R * .9, 1.1], [0, 1.6]]); break;
      default: geo = lathe(THREE, [[0, -.6], [R, -.6], [R, .35], [R * .82, .42], [0, .72]]);
    }
    g.add(new THREE.Mesh(geo, metalMat));
    return g;
  }

  function nockMesh(THREE, nk, r, shaftMat) {
    const g = new THREE.Group();
    const color = new THREE.Color(nk.color || '#e8e2d0');
    const isLit = nk.type === 'lighted';
    const mat = nk.type === 'self' ? shaftMat : new THREE.MeshStandardMaterial({
      color, roughness: .35, metalness: 0, emissive: isLit ? color : 0x000000, emissiveIntensity: isLit ? 1.4 : 0,
      transparent: isLit, opacity: isLit ? .95 : 1,
    });
    const R0 = nk.type === 'over' || nk.type === 'taper' ? r * 1.18 : r * 1.02;
    if (nk.type === 'over' || nk.type === 'taper') {
      g.add(new THREE.Mesh(lathe(THREE, [[0, 0], [R0, 0], [R0, .28], [r * 1.01, .7], [0, .7]]), mat));
    } else if (nk.type !== 'self') {
      g.add(new THREE.Mesh(lathe(THREE, [[0, -.02], [R0, -.02], [R0, .16], [0, .16]]), mat));
    }
    // prongs: two half-cylinders separated by the string groove
    const gap = .05;
    for (const s of [-1, 1]) {
      const geo = new THREE.CylinderGeometry(R0, R0, .3, 24, 1, false, 0, Math.PI);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = -.15;
      m.rotation.y = s > 0 ? 0 : Math.PI;
      m.position.x = s * gap;
      g.add(m);
    }
    if (nk.type === 'self') {
      const ins = new THREE.Mesh(new THREE.BoxGeometry(R0 * 2.02, .08, .06), new THREE.MeshStandardMaterial({ color: 0x2a201a }));
      g.add(ins);
    }
    if (isLit) {
      const light = new THREE.PointLight(color, 1.2, 4);
      light.position.y = -.2;
      g.add(light);
    }
    return g;
  }

  // ---------- scene ----------
  function build(THREE, spec) {
    const L = spec.lengthIn;
    const r = (spec.diameterIn || .3125) / 2;
    const group = new THREE.Group();
    // shaft
    const tex = shaftTexture(THREE, spec);
    const shaftMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: spec.material === 'aluminium' ? .3 : spec.material === 'carbon' ? .45 : .7,
      metalness: spec.material === 'aluminium' ? .6 : 0,
    });
    const startX = spec.nock && spec.nock.type === 'self' ? -.32 : 0;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L - startX, 32, 1, true), shaftMat);
    shaft.rotation.z = -Math.PI / 2;
    shaft.position.x = (L + startX) / 2;
    group.add(shaft);

    const metals = { steel: 0xc9d1d7, brass: 0xc9a24a, black: 0x2d3034, bronze: 0xb07a45 };
    const metalMat = new THREE.MeshStandardMaterial({ color: metals[(spec.point && spec.point.metal) || 'steel'], metalness: .85, roughness: .28 });
    const p = pointMesh(THREE, spec.point || {}, r, metalMat);
    p.rotation.z = -Math.PI / 2;
    p.position.x = L;
    group.add(p);

    const n = nockMesh(THREE, spec.nock || {}, r, shaftMat);
    n.rotation.z = -Math.PI / 2;
    n.position.x = 0;
    group.add(n);

    // fletching
    const fl = spec.fletch || {};
    const FL = fl.lengthIn || 5;
    const FH = fl.heightIn || (fl.shape === 'fluflu' ? 1.25 : fl.kind === 'tradvane' ? .5 : .55);
    const count = fl.count || 3;
    const rear = fl.offsetIn != null ? fl.offsetIn : 1.25;
    const twist = fl.orientation === 'helical' ? .26 : fl.orientation === 'offset' ? .09 : 0;
    const shape = featherShape(THREE, fl.shape, FL, FH);
    for (let i = 0; i < count; i++) {
      const isCock = i === 0;
      const color = isCock ? (fl.cockColor || '#c8352a') : (fl.henColor || '#efe6d2');
      const geo = new THREE.ShapeGeometry(shape, 24);
      const pos = geo.attributes.position;
      const base = Math.PI / 2 + i * (2 * Math.PI / count);
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k);
        const R = r + y;
        const th = base + twist * (1 - x / FL) * (fl.orientation === 'helical' ? 1 : .6);
        pos.setXYZ(k, rear + x, R * Math.sin(th), R * Math.cos(th));
      }
      geo.computeVertexNormals();
      const tex2 = featherTexture(THREE, color, fl.kind, fl.barred);
      tex2.repeat.set(1, 1);
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex2, side: THREE.DoubleSide, roughness: fl.kind === 'feather' ? .95 : .4 });
      group.add(new THREE.Mesh(geo, m));
    }
    // thread binding
    if (spec.binding && spec.binding.on && fl.kind === 'feather') {
      const bm = new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.binding.color || '#c33b2a'), roughness: .8 });
      for (const bx of [rear - .22, rear + FL - .04]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.07, r * 1.07, .3, 24), bm);
        b.rotation.z = -Math.PI / 2; b.position.x = bx + .15; group.add(b);
      }
    }
    group.position.x = -L / 2;
    const wrap = new THREE.Group();
    wrap.add(group);
    return wrap;
  }

  function dispose(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  function init(THREE, container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace; else renderer.outputEncoding = THREE.sRGBEncoding;
    container.replaceChildren(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, .1, 500);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a1a, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(10, 20, 25); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc89a, .6); rim.position.set(-20, -5, -15); scene.add(rim);
    const state = { yaw: -0.22, pitch: 0.2, roll: 0, zoom: 1, drag: null, idle: 0 };
    const c = { THREE, renderer, scene, camera, container, state, group: null, spec: null, raf: 0 };

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => { state.drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); state.idle = 0; });
    el.addEventListener('pointermove', e => {
      if (!state.drag) return;
      const dx = e.clientX - state.drag.x, dy = e.clientY - state.drag.y;
      state.drag = { x: e.clientX, y: e.clientY };
      if (e.shiftKey) state.roll += dx * .01; else { state.yaw += dx * .008; state.pitch = Math.max(-1.3, Math.min(1.3, state.pitch + dy * .008)); }
    });
    const end = () => { state.drag = null; state.idle = 0; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { e.preventDefault(); state.zoom = Math.max(.5, Math.min(4, state.zoom * (e.deltaY > 0 ? .9 : 1.1))); }, { passive: false });
    el.addEventListener('dblclick', () => { state.zoom = state.zoom > 1.5 ? 1 : 2.6; });

    const loop = () => {
      c.raf = requestAnimationFrame(loop);
      if (!c.group || c.container.hidden) return;
      const w = c.container.clientWidth, h = c.container.clientHeight;
      if (w && h && (el.width !== Math.round(w * renderer.getPixelRatio()) || el.height !== Math.round(h * renderer.getPixelRatio()))) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      if (!state.drag) { state.idle++; if (state.idle > 90) state.roll += .006; }
      const L = (c.spec && c.spec.lengthIn) || 29;
      const halfTan = Math.tan(camera.fov * Math.PI / 360);
      const fitW = ((L + 4) / 2) * 1.3 / (halfTan * Math.max(.2, camera.aspect));
      const fitH = 3 / halfTan;
      const dist = Math.max(fitW, fitH, 6) / state.zoom;
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      c.group.rotation.set(0, 0, 0);
      c.group.rotateY(state.yaw);
      c.group.rotateZ(state.pitch * .4);
      c.group.children[0].rotation.x = state.roll;
      renderer.render(scene, camera);
    };
    loop();
    return c;
  }

  async function render(container, spec) {
    const THREE = await loadThree();
    if (!ctx || ctx.container !== container) ctx = init(THREE, container);
    if (ctx.group) { ctx.scene.remove(ctx.group); dispose(ctx.group); }
    ctx.spec = spec;
    ctx.group = build(THREE, spec);
    ctx.scene.add(ctx.group);
  }

  window.Viz3D = { render, load: loadThree, parts: { shaftTexture, featherTexture, featherShape, pointMesh, nockMesh, lathe } };
})();
