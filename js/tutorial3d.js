/* =========================================================
   Saeta — 3D step-by-step build tutorial (wood arrows)
   Uses three.js (lazy-loaded by Viz3D) and the part builders in viz3d.js.
   Units: inches. Bench top at y = 0. Arrow axis along world X.
   ========================================================= */
(function () {
  'use strict';
  let THREE = null;

  // ---------- math helpers ----------
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eo = t => 1 - Math.pow(1 - t, 3);
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  let ui = null;     // DOM
  let W = null;      // three.js world
  let A = null;      // arrow rig (rebuilt per spec)
  let ctx = null;    // data from the app: { steps, spec, numbers, labels, lang }
  let STEPS = [];
  const player = { step: 0, time: 0, hold: 0, playing: true, raf: 0, last: 0, open: false };
  const view = { yaw: 0, pitch: 0, zoom: 1, drag: null, pos: null, tgt: null };

  // ---------- materials & textures ----------
  const srgb = t => { if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding; return t; };
  const M = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .75, metalness: 0, flatShading: true }, o || {}));
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = srgb(new THREE.CanvasTexture(c));
    t.anisotropy = 4;
    t.userData = { c, g };
    return t;
  }
  function shadows(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

  function plankTex() {
    return canvasTex(1024, 512, (g, w, h) => {
      const cols = ['#7a5232', '#86603b', '#6f4a2c', '#8a6440', '#744e30'];
      const ph = h / 5;
      for (let i = 0; i < 5; i++) {
        g.fillStyle = cols[i];
        g.fillRect(0, i * ph, w, ph);
        g.strokeStyle = 'rgba(0,0,0,.16)';
        for (let k = 0; k < 16; k++) {
          const y = i * ph + rnd(i * 31 + k) * ph;
          g.lineWidth = .6 + rnd(k + i) * 1.4;
          g.beginPath();
          g.moveTo(0, y);
          g.bezierCurveTo(w * .3, y + (rnd(k * 7) - .5) * 10, w * .6, y + (rnd(k * 9) - .5) * 10, w, y + (rnd(k * 3) - .5) * 8);
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,.5)';
        g.fillRect(0, i * ph, w, 3);
        g.fillStyle = 'rgba(40,22,10,.55)';
        g.beginPath();
        g.ellipse(rnd(i * 5) * w, i * ph + ph * (.3 + rnd(i) * .4), 9, 5, 0, 0, Math.PI * 2);
        g.fill();
      }
    });
  }
  function stoneTex() {
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#3b332c';
      g.fillRect(0, 0, w, h);
      const rows = 8, bh = h / rows;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * 40;
        for (let x = -off; x < w; x += 80 + rnd(r * 13 + x) * 30) {
          const bw = 70 + rnd(r + x) * 30;
          const shade = 70 + Math.floor(rnd(x * 3 + r) * 30);
          g.fillStyle = `rgb(${shade + 20},${shade + 8},${shade - 4})`;
          g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
        }
      }
    });
  }
  function lcdTex() { return canvasTex(256, 96, (g, w, h) => drawLCD(g, w, h, '0.0 gr')); }
  function drawLCD(g, w, h, text) {
    g.fillStyle = '#1c2a1c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fe870'; g.font = 'bold 54px "VT323", "Courier New", monospace';
    g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText(text, w - 14, h / 2 + 2);
  }
  function setLCD(tex, text) {
    if (tex.userData.text === text) return;
    tex.userData.text = text;
    drawLCD(tex.userData.g, tex.userData.c.width, tex.userData.c.height, text);
    tex.needsUpdate = true;
  }
  function dialTex() {
    return canvasTex(256, 256, (g, w, h) => drawDial(g, w, h, ''));
  }
  function drawDial(g, w, h, label) {
    g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a1f16'; g.lineWidth = 8; g.stroke();
    g.lineWidth = 3;
    for (let i = 0; i <= 20; i++) {
      const a = -Math.PI * .75 + i * Math.PI * 1.5 / 20;
      const r1 = w / 2 - 14, r2 = r1 - (i % 5 ? 10 : 22);
      g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1); g.lineTo(w / 2 + Math.cos(a) * r2, h / 2 + Math.sin(a) * r2); g.stroke();
    }
    if (label) { g.fillStyle = '#9c2f1f'; g.font = 'bold 40px "VT323", monospace'; g.textAlign = 'center'; g.fillText(label, w / 2, h * .78); }
  }
  function setDial(tex, label) {
    if (tex.userData.text === label) return;
    tex.userData.text = label;
    drawDial(tex.userData.g, 256, 256, label);
    tex.needsUpdate = true;
  }

  // ---------- tools (low-poly) ----------
  function tool(key, build, anchor) {
    const g = new THREE.Group();
    build(g);
    shadows(g);
    g.visible = false;
    g.userData.anchor = new THREE.Vector3(...(anchor || [0, 2, 0]));
    g.userData.key = key;
    W.scene.add(g);
    W.tools[key] = g;
    return g;
  }
  function buildTools() {
    const steel = M('#c7cfd6', { metalness: .8, roughness: .3, flatShading: false });
    const dark = M('#2b2b2e');
    const brass = M('#c9a24a', { metalness: .7, roughness: .35, flatShading: false });
    const woodH = M('#6b4226');

    tool('magnifier', g => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .13, 10, 28), brass);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: .28, roughness: 0, metalness: 0 }));
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, 3, 8), woodH);
      handle.position.set(0, -2.6, 0);
      g.add(ring, lens, handle);
    }, [0, 1.6, 0]);

    const lcd = lcdTex();
    W.lcd = lcd;
    tool('scale', g => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 4), M('#2d3a46'));
      base.position.y = .5;
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, .2, 24), steel);
      plat.position.y = 1.15;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .95), new THREE.MeshBasicMaterial({ map: lcd }));
      screen.position.set(0, .55, 2.01);
      g.add(base, plat, screen);
    }, [0, 2.2, 1.5]);

    const dial = dialTex();
    W.dial = dial;
    tool('spine', g => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(31, .5, 1.6), M('#3b2a1c'));
      bar.position.y = .25;
      g.add(bar);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(.5, 2.9, .5), steel);
        post.position.set(s * 14, 1.95, 0);
        const v = new THREE.Mesh(new THREE.CylinderGeometry(.45, .1, .5, 3), steel);
        v.position.set(s * 14, 3.25, 0);
        v.rotation.z = Math.PI;
        g.add(post, v);
      }
      const face = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ map: dial }));
      face.position.set(-6, 1.7, .95);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.4, .1, 8, 32), steel);
      rim.position.copy(face.position);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.1, .04), M('#9c2f1f'));
      needle.geometry.translate(0, .5, 0);
      needle.position.set(-6, 1.7, 1.0);
      g.userData.needle = needle;
      const weight = new THREE.Group();
      const wmesh = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 1.4, 16), brass);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.6, 4), M('#e8e2d0'));
      string.position.y = 1.5;
      weight.add(wmesh, string);
      g.userData.weight = weight;
      g.add(face, rim, needle, weight);
    }, [14, 4, 0]);

    tool('heat', g => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 3.2, 12), M('#d9661f'));
      body.rotation.z = Math.PI / 2;
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, 1.4, 12), steel);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.x = 2.2;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(.9, 2.6, .8), dark);
      handle.position.set(-.6, -1.6, 0);
      handle.rotation.z = -.25;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff8a3c', transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.x = 3.4;
      g.userData.glow = glow;
      g.add(body, nozzle, handle, glow);
    }, [0, 1.5, 0]);

    tool('ruler', g => {
      const tex = canvasTex(1024, 48, (c, w, h) => {
        c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a1f16';
        for (let i = 0; i <= 34 * 4; i++) { const x = i / (34 * 4) * w; c.fillRect(x, 0, 1.5, i % 4 ? 12 : 24); }
        c.font = 'bold 18px monospace';
        for (let i = 0; i <= 34; i += 2) c.fillText(String(i), i / 34 * w + 3, 42);
      });
      const r = new THREE.Mesh(new THREE.BoxGeometry(34, .06, 1.2), [M('#d9a91f'), M('#d9a91f'), new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), M('#d9a91f'), M('#d9a91f'), M('#d9a91f')]);
      r.geometry.translate(17, 0, 0);
      g.add(r);
    }, [4, .6, 0]);

    tool('pencil', g => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 4, 6), M('#f2c230'));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(.2, .6, 6), M('#e8c9a0'));
      tip.position.y = -2.3;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 6), M('#222'));
      lead.position.y = -2.55;
      lead.rotation.x = Math.PI;
      tip.rotation.x = Math.PI;
      const g2 = new THREE.Group();
      g2.add(body, tip, lead);
      g2.position.y = 2.65;   // tip at origin
      g.add(g2);
    }, [0, 4.2, 0]);

    tool('saw', g => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, .05), steel);
      blade.position.set(0, .75, 0);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(6, .3, .16), brass);
      spine.position.set(0, 1.55, 0);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, .5), woodH);
      handle.position.set(3.6, 1.4, 0);
      g.add(blade, spine, handle);
    }, [0, 2.4, 0]);

    tool('sand', g => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(2.2, .8, 1.3), M('#c89f6a'));
      const paper = new THREE.Mesh(new THREE.BoxGeometry(2.2, .06, 1.3), M('#5e4a3a'));
      paper.position.y = -.43;
      block.position.y = 0;
      g.add(block, paper);
    }, [0, 1.2, 0]);

    tool('taper', g => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 2.4, 10), M('#c9471f', { transparent: true, opacity: .45, depthWrite: false }));
      body.rotation.z = Math.PI / 2;
      const hole = new THREE.Mesh(new THREE.RingGeometry(.3, .75, 16), M('#7a2a12', { side: THREE.DoubleSide }));
      hole.position.x = 1.21;
      hole.rotation.y = Math.PI / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.9, .08, .7), steel);
      blade.position.set(0, .78, 0);
      blade.rotation.z = .08;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .3, 8), brass);
      screw.position.set(-.4, .88, 0);
      g.add(body, hole, blade, screw);
    }, [0, 1.8, 0]);

    tool('dip', g => {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 13, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: '#dfe9f2', transparent: true, opacity: .22, roughness: .05, side: THREE.DoubleSide, depthWrite: false }));
      glass.position.y = 6.5;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, .6, 24), M('#2b2b2e'));
      base.position.y = .3;
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 10, 24), M('#d9a441', { transparent: true, opacity: .85, roughness: .2, flatShading: false }));
      liquid.position.y = 5.4;
      g.userData.liquid = liquid;
      g.add(glass, base, liquid);
    }, [0, 13.8, 0]);

    tool('glue', g => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.5, .55, 1.8, 12), M('#f2efe6'));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(.3, .8, 12), M('#c33b2a'));
      cap.position.y = 1.3;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(.52, .57, .8, 12), M('#2c6bd6'));
      const g2 = new THREE.Group();
      g2.add(body, cap, label);
      g2.position.y = -1.7;   // nozzle tip at origin
      g.add(g2);
    }, [0, 1, 0]);

    tool('jig', g => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.1, 3.6), M('#2f4a3a'));
      base.position.set(3.5, .55, 0);
      const nockRec = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.4, 1.2), M('#1d1d1d'));
      nockRec.position.set(-.6, 1.3, 0);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .3, 6), M('#c9a24a', { metalness: .6 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(-1.1, 1.6, 0);
      const post = new THREE.Mesh(new THREE.BoxGeometry(.5, 3.6, .5), M('#1d1d1d'));
      post.position.set(3.5, 2.6, -1.3);
      const clamp = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.BoxGeometry(6.4, .28, .5), steel);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(6.4, .5, .12), steel);
      lip.position.set(0, -.3, -.28);
      clamp.add(arm, lip);
      g.userData.clamp = clamp;
      g.add(base, nockRec, wheel, post, clamp);
    }, [3.5, 4.6, 0]);
  }

  // ---------- world ----------
  function buildWorld(canvas) {
    const CM = THREE.ColorManagement;
    if (CM && 'legacyMode' in CM) CM.legacyMode = false; else if (CM && 'enabled' in CM) CM.enabled = true;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace; else renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, .1, 400);
    scene.add(new THREE.HemisphereLight('#fff1d6', '#3a2a1a', .85));
    const key = new THREE.DirectionalLight('#ffe9c9', 1.1);
    key.position.set(-14, 30, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -30, right: 30, top: 25, bottom: -15, near: 1, far: 90 });
    key.shadow.bias = -0.0008;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#9fc2ff', .25);
    fill.position.set(20, 10, -10);
    scene.add(fill);
    const lamp = new THREE.PointLight('#ffb35c', .6, 60);
    lamp.position.set(18, 14, -6);
    scene.add(lamp);

    const plank = plankTex();
    plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
    plank.repeat.set(2, 1);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(90, 2, 30), new THREE.MeshStandardMaterial({ map: plank, roughness: .85 }));
    bench.position.set(0, -1, 0);
    bench.receiveShadow = true;
    scene.add(bench);
    const stone = stoneTex();
    stone.wrapS = stone.wrapT = THREE.RepeatWrapping;
    stone.repeat.set(5, 2.5);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(140, 60), new THREE.MeshStandardMaterial({ map: stone, roughness: .95 }));
    wall.position.set(0, 26, -15);
    wall.receiveShadow = true;
    scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshStandardMaterial({ color: '#2a211a', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -30;
    scene.add(floor);
    // a lantern for mood
    const lantern = new THREE.Group();
    const lb = new THREE.Mesh(new THREE.BoxGeometry(2, 2.8, 2), new THREE.MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: .9, transparent: true, opacity: .85 }));
    const lt = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 4), M('#1d1d1d'));
    lt.position.y = 2;
    lt.rotation.y = Math.PI / 4;
    lantern.add(lb, lt);
    lantern.position.set(20, 1.4, -8);
    scene.add(lantern);

    W = { renderer, scene, camera, tools: {}, lcd: null, dial: null, shavings: [] };
    buildTools();
    // wood shavings pool
    const shMat = M('#e8c48e');
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(.22, .03, .1), shMat);
      s.visible = false;
      scene.add(s);
      W.shavings.push(s);
    }
    // glue drop
    W.drop = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 10), new THREE.MeshStandardMaterial({ color: '#f0d27a', roughness: .1, transparent: true, opacity: .9 }));
    W.drop.visible = false;
    scene.add(W.drop);
    // pile of raw shafts at the back
    W.pile = new THREE.Group();
    const pm = M('#d9b07a', { flatShading: false });
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, 33, 10), pm);
      c.rotation.z = Math.PI / 2;
      c.position.set((rnd(i) - .5) * 1.2, .17 + (i < 3 ? 0 : .3), -6 - (i % 3) * .36 - (i < 3 ? 0 : .18));
      W.pile.add(c);
    }
    shadows(W.pile);
    scene.add(W.pile);
  }

  // ---------- arrow rig ----------
  function buildArrow(spec) {
    if (A) { W.scene.remove(A.root); A.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const P = window.Viz3D.parts;
    const L = spec.lengthIn;
    const r = (spec.diameterIn || .34375) / 2;
    const raw = L + 2.5;
    const root = new THREE.Group();          // position / yaw / tilt (pivot = centre of the finished arrow)
    const spin = new THREE.Group();          // rotation about the arrow axis
    const contents = new THREE.Group();      // x = distance from the nock groove
    contents.position.x = -L / 2;
    root.add(spin);
    spin.add(contents);
    W.scene.add(root);

    const tex = P.shaftTexture(THREE, { material: 'wood', lengthIn: raw, shaftColor: spec.shaftColor, fletch: {}, cresting: [] });
    const shaftMat = new THREE.MeshStandardMaterial({ map: tex, roughness: .75 });
    const shaft = new THREE.Mesh(new THREE.BufferGeometry(), shaftMat);
    shaft.rotation.z = -Math.PI / 2;
    shaft.castShadow = true;
    contents.add(shaft);

    const crownLen = spec.crown && spec.crown.on ? spec.crown.lengthIn || 9 : 0;
    const crownGeo = new THREE.CylinderGeometry(r * 1.02, r * 1.02, 1, 20, 1, true);
    crownGeo.translate(0, .5, 0);
    const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: (spec.crown && spec.crown.color) || '#1f3b5c', roughness: .3 }));
    crown.rotation.z = -Math.PI / 2;
    crown.position.x = .62;
    contents.add(crown);

    const fl = spec.fletch || {};
    const FL = fl.lengthIn || 5;
    const rear = fl.offsetIn != null ? fl.offsetIn : 1.25;
    const crests = [];
    let cx = crownLen ? crownLen : rear + FL + .7;
    for (const b of (spec.cresting || []).filter(x => x && x.color)) {
      const w = b.widthIn || .125;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, w, 20, 1, true), new THREE.MeshStandardMaterial({ color: b.color, roughness: .35 }));
      m.rotation.z = -Math.PI / 2;
      m.position.x = cx + w / 2;
      contents.add(m);
      crests.push(m);
      cx += w + (b.gapIn != null ? b.gapIn : .06);
    }

    const grain = new THREE.Mesh(new THREE.BoxGeometry(1, .02, .035), M('#3a3a3a'));
    grain.geometry.translate(.5, 0, 0);
    grain.position.set(.75, r + .005, 0);
    contents.add(grain);

    const cutMark = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, .05, 16, 1, true), M('#222'));
    cutMark.rotation.z = -Math.PI / 2;
    cutMark.position.x = L;
    contents.add(cutMark);

    const offcut = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2.5, 12), shaftMat);
    offcut.rotation.z = -Math.PI / 2;
    offcut.position.x = L + 1.25;
    offcut.castShadow = true;
    contents.add(offcut);

    const nockHolder = new THREE.Group();
    const nk = Object.assign({}, spec.nock || {});
    if (nk.type !== 'self' && nk.type !== 'over') nk.type = 'over';
    const nockMesh = P.nockMesh(THREE, nk, r, shaftMat);
    nockMesh.rotation.z = -Math.PI / 2;
    nockHolder.add(nockMesh);
    shadows(nockHolder);
    contents.add(nockHolder);

    const pointHolder = new THREE.Group();
    const metals = { steel: 0xc9d1d7, brass: 0xc9a24a, black: 0x2d3034, bronze: 0xb07a45 };
    const pm = P.pointMesh(THREE, spec.point || {}, r, new THREE.MeshStandardMaterial({ color: metals[(spec.point && spec.point.metal) || 'steel'], metalness: .85, roughness: .28 }));
    pm.rotation.z = -Math.PI / 2;
    pointHolder.add(pm);
    shadows(pointHolder);
    contents.add(pointHolder);

    // feathers (same geometry as the 3D viewer)
    const FH = fl.heightIn || (fl.shape === 'fluflu' ? 1.25 : fl.kind === 'tradvane' ? .5 : .55);
    const count = fl.count || 3;
    const twist = fl.orientation === 'helical' ? .26 : fl.orientation === 'offset' ? .09 : 0;
    const feathers = [];
    for (let i = 0; i < count; i++) {
      const color = i === 0 ? (fl.cockColor || '#c8352a') : (fl.henColor || '#efe6d2');
      const geo = new THREE.ShapeGeometry(P.featherShape(THREE, fl.shape, FL, FH), 24);
      const pos = geo.attributes.position;
      const base = Math.PI / 2 + i * (2 * Math.PI / count);
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k);
        const R = r + y;
        const th = base + twist * (1 - x / FL) * (fl.orientation === 'helical' ? 1 : .6);
        pos.setXYZ(k, rear + x, R * Math.sin(th), R * Math.cos(th));
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: P.featherTexture(THREE, color, fl.kind || 'feather', fl.barred), side: THREE.DoubleSide, roughness: fl.kind === 'feather' || !fl.kind ? .95 : .4 }));
      m.castShadow = true;
      m.userData.dir = new THREE.Vector3(0, Math.sin(base), Math.cos(base));
      contents.add(m);
      feathers.push(m);
    }
    const bindings = [];
    if (spec.binding && spec.binding.on && (fl.kind || 'feather') === 'feather') {
      const bm = new THREE.MeshStandardMaterial({ color: spec.binding.color || '#c33b2a', roughness: .8 });
      for (const bx of [rear - .22, rear + FL - .04]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.07, r * 1.07, .3, 20), bm);
        b.rotation.z = -Math.PI / 2;
        b.position.x = bx + .15;
        contents.add(b);
        bindings.push(b);
      }
    }
    A = { root, spin, contents, shaft, shaftMat, crown, crownLen, crests, grain, cutMark, offcut, nockHolder, pointHolder, feathers, bindings, L, r, raw, FL, FH, rear, count, key: '' };
  }

  /** wooden shaft as a lathe: nock taper, body, point taper, optional bow (sag) */
  function shaftGeometry(len, tn, tp, bend, r) {
    const pts = [[0, 0], [r * (1 - .5 * tn), 0]];
    const a = .62 * tn + .001, b = len - 1.0 * tp - .001;
    for (let i = 0; i <= 24; i++) pts.push([r, lerp(a, b, i / 24)]);
    pts.push([r * (1 - .55 * tp), len], [0, len]);
    const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 20);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      uv.setY(i, y / len);
      if (bend) pos.setX(i, pos.getX(i) + bend * Math.sin(Math.PI * clamp01(y / len)));
    }
    geo.computeVertexNormals();
    return geo;
  }

  // ---------- state ----------
  const DEF = () => [0, A.r, 2];
  function initialState() {
    return {
      pos: [0, A.r + .35, -6.2], yaw: 0, tilt: 0, spin: 0,
      len: A.raw, tn: 0, tp: 0, bend: 0, grain: 0, seal: 0, crown: 0, crest: 0, cutMark: 0, offcut: 0, offFall: 0,
      nock: 0, nockX: -3.5, nockRot: Math.PI / 2, point: 0, pointPos: [A.L + 4, 0, 0], feathers: 0, pressIdx: -1, press: 0, binding: 0,
      drop: null, pile: true,
    };
  }
  function applyState(st) {
    A.root.position.set(...st.pos);
    A.root.rotation.set(0, st.yaw, st.tilt);
    A.spin.rotation.x = st.spin;
    const key = [st.len, st.tn, st.tp, st.bend].map(v => v.toFixed(3)).join();
    if (key !== A.key) {
      A.key = key;
      A.shaft.geometry.dispose();
      A.shaft.geometry = shaftGeometry(st.len, st.tn, st.tp, st.bend, A.r);
    }
    A.shaftMat.roughness = lerp(.78, .32, st.seal);
    A.crown.visible = A.crownLen > 0 && st.crown > 0;
    A.crown.scale.y = Math.max(.001, (A.crownLen - .62) * st.crown);
    const nC = A.crests.length;
    A.crests.forEach((c, i) => { c.visible = st.crest * nC > i; });
    A.grain.visible = st.grain > 0;
    A.grain.scale.x = Math.max(.001, st.grain * 1.6);
    A.cutMark.visible = st.cutMark > 0 && st.len > A.L + .1;
    A.offcut.visible = st.offcut > 0 && st.len <= A.L + .01;
    A.offcut.position.set(A.L + 1.25 + st.offFall * 1.6, -st.offFall * (st.pos[1] - A.r) * 0 - 0, st.offFall * 1.2);
    A.offcut.rotation.set(0, st.offFall * .7, -Math.PI / 2);
    if (st.offFall >= 1) A.offcut.visible = false;
    A.nockHolder.visible = st.nock > 0;
    A.nockHolder.position.x = st.nockX;
    A.nockHolder.rotation.x = st.nockRot;
    A.pointHolder.visible = st.point > 0;
    A.pointHolder.position.set(...st.pointPos);
    A.feathers.forEach((f, i) => {
      f.visible = i < st.feathers;
      const off = i === st.pressIdx ? st.press : 0;
      f.position.copy(f.userData.dir).multiplyScalar(off);
    });
    A.bindings.forEach(b => { b.visible = st.binding > 0; });
    W.drop.visible = !!st.drop;
    if (st.drop) { W.drop.position.set(...st.drop.pos); W.drop.scale.setScalar(st.drop.s); }
    W.pile.visible = st.pile;
  }
  /** world position of a point given in the arrow's own coordinates (x from the nock) for a level, un-yawed rig */
  const wx = (st, x) => st.pos[0] - A.L / 2 + x;

  function shavings(origin, p, a, b, dir) {
    W.shavings.forEach((s, i) => {
      const birth = a + (b - a) * (i / W.shavings.length);
      const age = (p - birth) / .22;
      if (age < 0 || age > 1) { s.visible = false; return; }
      s.visible = true;
      const vx = dir * (.6 + rnd(i) * 1.6), vz = (rnd(i + 9) - .5) * 2.4, vy = 1.4 + rnd(i + 3) * 1.4;
      s.position.set(origin[0] + vx * age * 2, origin[1] + vy * age * 2 - 9 * age * age, origin[2] + vz * age * 2);
      s.rotation.set(age * 9 + i, age * 7, age * 5 + i);
    });
  }
  const hideShavings = () => W.shavings.forEach(s => { s.visible = false; });

  // ---------- choreography (13 steps, matching research/build-process.json → wood) ----------
  function makeSteps() {
    const L = A.L, r = A.r;
    const xN = -L / 2, xP = L / 2;            // nock / point ends in world (rig at default)
    const fmtNum = (n, d) => n.toLocaleString(ctx.lang === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
    const T = W.tools;
    const lift = (st, p, to, a, b) => { st.pos = lerp3(st.pos, to, ease(seg(p, a, b))); };
    const cnt = A.count;
    return [
      { // 1 inspect
        dur: 7, tools: ['magnifier'],
        cams: [[0, [0, 9, 26], [0, 2, -1]], [.3, [0, 7, 21], [0, 3, 1]]],
        cam(p) {
          const mx = lerp(xN - 1.5, xP + 3.5, ease(seg(p, .22, .82)));
          const close = ease(seg(p, .12, .3)) * (1 - ease(seg(p, .85, 1)));
          const tx = lerp(0, Math.max(xN + 4, Math.min(xP - 4, mx)), close);
          return { pos: lerp3([0, 9, 27], [tx, 4.6, 10.5], close), tgt: lerp3([0, 2, -1], [tx, 3.3, 2], close) };
        },
        run(p, st) {
          lift(st, p, [0, 3.4, 2], 0, .22);
          st.spin = Math.PI * 4 * ease(seg(p, .2, .85));
          const m = T.magnifier;
          m.position.set(lerp(xN - 1.5, xP + 3.5, ease(seg(p, .22, .82))), 3.4, 3.6);
          m.rotation.set(0, -.25, .3);
          m.visible = p > .18 && p < .88;
          lift(st, p, DEF(), .88, 1);
        },
        done(st) { st.pos = DEF(); st.spin = 0; },
      },
      { // 2 weigh-sort
        dur: 6, tools: ['scale'],
        cams: [[0, [6, 8, 20], [0, 1.6, 4.5]]],
        run(p, st) {
          T.scale.position.set(0, 0, 6.5);
          lift(st, p, [A.L / 2 - A.raw / 2, 1.25 + r, 6.5], 0, .3);
          const s = eo(seg(p, .32, .62));
          setLCD(W.lcd, fmtNum(ctx.numbers.shaftRaw * s + (p > .62 ? Math.sin(p * 40) * 0 : 0), 1) + ' gr');
          lift(st, p, DEF(), .82, 1);
        },
        done(st) { st.pos = DEF(); },
      },
      { // 3 spine
        dur: 8, tools: ['spine'],
        cams: [[0, [0, 8, 32], [0, 3, 4.5]], [.4, [3, 6.5, 26], [0, 2.8, 4.5]]],
        run(p, st) {
          const t = T.spine;
          t.position.set(0, 0, 4.5);
          const top = 3.5 + r;
          lift(st, p, [A.L / 2 - A.raw / 2, top, 4.5], 0, .2);
          const sag = .85 * ease(seg(p, .45, .7)) * (1 - ease(seg(p, .82, .92)));
          st.bend = sag;
          const w = t.userData.weight;
          const hang = top - r - sag;
          w.position.set(0, lerp(hang + 4, hang - 2.3, ease(seg(p, .22, .45))) + ease(seg(p, .82, .92)) * 4, 0);
          w.visible = p > .2 && p < .93;
          t.userData.needle.rotation.z = -Math.PI * .75 + sag / .85 * Math.PI * .9;
          setDial(W.dial, p > .62 && p < .95 ? ctx.numbers.spine : '');
          lift(st, p, DEF(), .92, 1);
        },
        done(st) { st.pos = DEF(); st.bend = 0; },
      },
      { // 4 straighten
        dur: 7, tools: ['heat'],
        cams: [[0, [-1, 6, 14], [0, 2.4, 2]]],
        run(p, st) {
          lift(st, p, [0, 2.6, 2], 0, .15);
          const fix = seg(p, .55, .85);
          st.bend = -.9 * (1 - ease(fix)) + Math.sin(fix * Math.PI) * .08;
          const h = T.heat;
          const sweep = seg(p, .15, .6);
          h.position.set(lerp(-7, 5, sweep) - 3.4, 1.0, 2.0);
          h.rotation.set(0, 0, .35);
          h.visible = p > .12 && p < .66;
          h.userData.glow.material.opacity = .3 + .25 * Math.sin(p * 60);
          lift(st, p, DEF(), .9, 1);
        },
        done(st) { st.pos = DEF(); st.bend = 0; },
      },
      { // 5 cut to length
        dur: 8, tools: ['ruler', 'pencil', 'saw'],
        cams: [[0, [-4, 9, 18], [-2, .5, 2.5]], [.3, [xP + 1, 5, 11], [xP - 2, .5, 2.5]]],
        run(p, st) {
          const ru = T.ruler;
          ru.position.set(xN, .03, 3.2);
          ru.visible = p < .9;
          const pe = T.pencil;
          pe.visible = p > .14 && p < .42;
          pe.position.set(lerp(xN, xP, ease(seg(p, .14, .3))), r * 2 + .02, 2.2);
          pe.rotation.set(0, 0, -.3);
          st.cutMark = seg(p, .3, .38);
          const sw = T.saw;
          sw.visible = p > .4 && p < .86;
          const cutting = seg(p, .46, .72);
          sw.position.set(xP, lerp(r * 2 + .6, -.1, cutting) + (1 - seg(p, .4, .46)) * 2, 2 + Math.sin(p * 70) * 1.4 * (cutting > 0 && cutting < 1 ? 1 : 0));
          sw.rotation.set(0, Math.PI / 2, 0);
          if (p > .72) { st.len = A.L; st.offcut = 1; st.offFall = eo(seg(p, .72, .95)); }
        },
        done(st) { st.len = A.L; st.cutMark = 0; st.offcut = 0; },
      },
      { // 6 sand and mark the grain
        dur: 7, tools: ['sand', 'pencil'],
        cams: [[0, [0, 8, 18], [0, 2, 2]], [.55, [xN - 1, 5, 9], [xN + 1.5, 2, 2]]],
        run(p, st) {
          lift(st, p, [0, 2.4, 2], 0, .1);
          st.spin = Math.PI * 6 * ease(seg(p, .1, .55));
          const s = T.sand;
          s.visible = p > .08 && p < .58;
          s.position.set(Math.sin(seg(p, .1, .55) * Math.PI * 5) * (L / 2 - 2), 2.4 + r + .43, 2);
          st.seal = 0;
          const pe = T.pencil;
          pe.visible = p > .58 && p < .97;
          const draw = ease(seg(p, .66, .9));
          pe.position.set(wx(st, .75 + draw * 1.6), 2.4 + r + .02, 2);
          pe.rotation.set(.35, 0, -.25);
          st.grain = draw;
          lift(st, p, DEF(), .95, 1);
        },
        done(st) { st.pos = DEF(); st.grain = 1; st.spin = 0; },
      },
      { // 7 taper the nock end (short blade)
        dur: 6, tools: ['taper'],
        cams: [[0, [xN - 4.5, 4.5, 9], [xN + 1, 2, 2]]],
        run(p, st) {
          lift(st, p, [0, 2.1, 2], 0, .12);
          const t = T.taper;
          const inT = ease(seg(p, .1, .3)) - ease(seg(p, .82, .95));
          t.position.set(lerp(xN - 5, xN - .55, inT), 2.1, 2);
          t.rotation.set(0, 0, 0);
          t.visible = p > .06;
          st.spin = Math.PI * 14 * ease(seg(p, .3, .8));
          st.tn = ease(seg(p, .32, .78));
          shavings([xN, 2.1, 2], p, .32, .76, -1);
          lift(st, p, DEF(), .94, 1);
        },
        done(st) { st.pos = DEF(); st.tn = 1; st.spin = 0; },
      },
      { // 8 taper the point end (long blade)
        dur: 6, tools: ['taper'],
        cams: [[0, [xP + 4.5, 4.5, 9], [xP - 1, 2, 2]]],
        run(p, st) {
          lift(st, p, [0, 2.1, 2], 0, .12);
          const t = T.taper;
          const inT = ease(seg(p, .1, .3)) - ease(seg(p, .82, .95));
          t.position.set(lerp(xP + 5, xP + .55, inT), 2.1, 2);
          t.rotation.set(0, Math.PI, 0);
          t.visible = p > .06;
          st.spin = -Math.PI * 14 * ease(seg(p, .3, .8));
          st.tp = ease(seg(p, .32, .78));
          shavings([xP, 2.1, 2], p, .32, .76, 1);
          lift(st, p, DEF(), .94, 1);
        },
        done(st) { st.pos = DEF(); st.tp = 1; st.spin = 0; },
      },
      { // 9 stain, seal and decorate (dip + cresting)
        dur: 10, tools: ['dip'],
        cams: [[0, [6, 13, 30], [-4, 8, -1]], [.62, [-4, 5.5, 13], [-7, 2.4, 2]]],
        run(p, st) {
          const d = T.dip;
          d.position.set(-6, 0, -3);
          d.userData.liquid.material.color.set(A.crownLen ? ctx.spec.crown.color : '#d9a441');
          d.userData.liquid.material.opacity = A.crownLen ? .92 : .55;
          const depth = Math.max(A.crownLen, 8);
          const above = [-6, 14.5 + L / 2, -3];
          const into = [-6, 10.4 - depth + L / 2, -3];
          const up = ease(seg(p, 0, .15));
          st.tilt = up * Math.PI / 2 * (1 - ease(seg(p, .56, .68)));
          st.pos = lerp3(DEF(), above, up);
          if (p > .15) st.pos = lerp3(above, into, ease(seg(p, .17, .3)));
          if (p > .33) st.pos = lerp3(into, above, ease(seg(p, .33, .48)));
          if (p > .5) st.pos = lerp3(above, [0, 2.4, 2], ease(seg(p, .5, .68)));
          if (p > .3) { st.seal = 1; st.crown = 1; }
          d.visible = p < .7;
          if (p > .68) st.spin = Math.PI * 4 * ease(seg(p, .7, .95));
          st.crest = seg(p, .72, .92);
          lift(st, p, DEF(), .95, 1);
        },
        done(st) { st.pos = DEF(); st.seal = 1; st.crown = 1; st.crest = 1; st.spin = 0; st.tilt = 0; },
      },
      { // 10 glue the nock across the grain
        dur: 7, tools: ['glue'],
        cams: [[0, [xN - 3.2, 3.6, 7.5], [xN + .9, 1.6, 2]]],
        run(p, st) {
          lift(st, p, [0, 1.6, 2], 0, .1);
          const g = T.glue;
          g.visible = p > .1 && p < .45;
          g.position.set(xN + .35, 1.6 + r + .35 + (1 - ease(seg(p, .1, .2))) * 2, 2);
          g.rotation.set(0, 0, -.6);
          if (p > .2 && p < .5) st.drop = { pos: [xN + .3, 1.6 + r + .05, 2], s: ease(seg(p, .2, .35)) };
          st.nock = p > .38 ? 1 : 0;
          const slide = ease(seg(p, .42, .88));
          st.nockX = lerp(-3.5, 0, slide);
          st.nockRot = (Math.PI / 2) * (1 - ease(seg(p, .48, .8)));
          lift(st, p, DEF(), .94, 1);
        },
        done(st) { st.pos = DEF(); st.nock = 1; st.nockX = 0; st.nockRot = 0; },
      },
      { // 11 weigh and glue the points
        dur: 8, tools: ['scale', 'glue'],
        cams: [[0, [5, 7, 19], [2, 1.2, 5]], [.5, [xP + 2.5, 3.8, 8.5], [xP - 1, 1, 2]]],
        run(p, st) {
          T.scale.position.set(2, 0, 6.5);
          const onScale = [A.L / 2 + 2, 1.27 + .15 - A.r, 4.5];
          st.point = 1;
          const a = ease(seg(p, 0, .12));
          st.pointPos = lerp3([A.L / 2 + 2, 4, 4.5], onScale, a);
          setLCD(W.lcd, fmtNum(ctx.numbers.point * eo(seg(p, .1, .3)), 1) + ' gr');
          if (p > .4) st.pointPos = lerp3(onScale, [A.L + 3, .2, 0], ease(seg(p, .4, .6)));
          if (p > .7) st.pointPos = lerp3([A.L + 3, .2, 0], [A.L, 0, 0], ease(seg(p, .7, .9)));
          const g = T.glue;
          g.visible = p > .52 && p < .72;
          g.position.set(xP + .2, r + .45 + (1 - ease(seg(p, .52, .58))) * 2, 2);
          g.rotation.set(0, 0, .6);
          if (p > .56 && p < .8) st.drop = { pos: [xP - .3, r * 2 + .02, 2], s: ease(seg(p, .56, .66)) };
          T.glue.visible = T.glue.visible && p > .5;
        },
        done(st) { st.point = 1; st.pointPos = [A.L, 0, 0]; },
      },
      { // 12 fletch (jig)
        dur: 4.5 * cnt, tools: ['jig'],
        cams: [[0, [xN + 5, 7.5, 13], [xN + 4, 1.8, 2]]],
        run(p, st) {
          const y = 1.6 + r;
          st.pos = [0, y, 2];
          const j = T.jig;
          j.position.set(xN, 0, 2);
          const n = cnt, step = 2 * Math.PI / n;
          const c = Math.min(n - 1, Math.floor(p * n));
          const cc = p * n - c;
          const d = 3 * (1 - ease(seg(cc, 0, .3))) + 3 * ease(seg(cc, .62, .75));
          st.feathers = c + 1;
          st.pressIdx = c;
          st.press = cc < .3 ? 3 * (1 - ease(seg(cc, 0, .3))) : 0;
          st.spin = c * step + step * ease(seg(cc, .78, 1));
          const clamp = j.userData.clamp;
          clamp.position.set(A.rear + A.FL / 2, y + r + A.FH + .2 + d, 0);
        },
        done(st) { st.feathers = A.count; st.spin = 0; st.pressIdx = -1; },
      },
      { // 13 final finish and check
        dur: 9, tools: [],
        cams: [[0, [0, 8, 30], [0, 3.5, 1]], [.55, [5, 6.5, 25], [0, 4, 2]]],
        run(p, st) {
          st.binding = p > .1 ? 1 : 0;
          lift(st, p, [0, 4, 2], .15, .35);
          st.spin = Math.PI * 10 * ease(seg(p, .35, .6));
          st.yaw = Math.PI * 2 * ease(seg(p, .6, 1));
          st.pile = p < .2;
        },
        done(st) { st.binding = 1; },
      },
    ];
  }

  // ---------- frame ----------
  function evalStep(idx, p) {
    const st = initialState();
    for (let i = 0; i < idx; i++) STEPS[i].done(st);
    Object.values(W.tools).forEach(t => { t.visible = false; });
    STEPS[idx].tools.forEach(k => { W.tools[k].visible = true; });
    hideShavings();
    STEPS[idx].run(p, st);
    applyState(st);
  }
  function camTarget(idx, p) {
    if (STEPS[idx].cam) return STEPS[idx].cam(p);
    const keys = STEPS[idx].cams;
    let k = 0;
    while (k < keys.length - 1 && p >= keys[k + 1][0]) k++;
    if (k === keys.length - 1) return { pos: keys[k][1], tgt: keys[k][2] };
    const a = keys[k], b = keys[k + 1];
    const t = ease(seg(p, a[0], b[0]));
    return { pos: lerp3(a[1], b[1], t), tgt: lerp3(a[2], b[2], t) };
  }
  function updateCamera(idx, p, dt, snap) {
    const c = camTarget(idx, p);
    const tgt = new THREE.Vector3(...c.tgt);
    const off = new THREE.Vector3(...c.pos).sub(tgt);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), view.yaw);
    const side = new THREE.Vector3().crossVectors(off, new THREE.Vector3(0, 1, 0)).normalize();
    off.applyAxisAngle(side, view.pitch);
    off.multiplyScalar(1 / view.zoom);
    const pos = tgt.clone().add(off);
    if (snap || !view.pos) { view.pos = pos; view.tgt = tgt; }
    else {
      const k = 1 - Math.exp(-dt * 3.5);
      view.pos.lerp(pos, k);
      view.tgt.lerp(tgt, k);
    }
    W.camera.position.copy(view.pos);
    W.camera.lookAt(view.tgt);
  }
  function updateLabels() {
    const rect = ui.stage.getBoundingClientRect();
    for (const key in W.tools) {
      const t = W.tools[key];
      const lab = ui.labels[key];
      if (!lab) continue;
      if (!t.visible) { lab.hidden = true; continue; }
      const v = t.userData.anchor.clone().applyMatrix4(t.matrixWorld).project(W.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { lab.hidden = true; continue; }
      lab.hidden = false;
      lab.style.transform = `translate(${(v.x + 1) / 2 * rect.width}px, ${(1 - v.y) / 2 * rect.height}px) translate(-50%, -120%)`;
    }
  }
  function resize() {
    const w = ui.stage.clientWidth, h = ui.stage.clientHeight;
    if (!w || !h) return;
    W.renderer.setSize(w, h, false);
    W.camera.aspect = w / h;
    W.camera.fov = w / h < 1.2 ? 50 : 36;
    W.camera.updateProjectionMatrix();
  }
  function loop(now) {
    player.raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - (player.last || now)) / 1000);
    player.last = now;
    const st = STEPS[player.step];
    if (player.playing) {
      if (player.time < st.dur) player.time = Math.min(st.dur, player.time + dt);
      else {
        player.hold += dt;
        if (player.hold > 1.8) {
          if (player.step < STEPS.length - 1) goto(player.step + 1);
          else { player.playing = false; syncUI(); }
        }
      }
    }
    const p = player.time / st.dur;
    evalStep(player.step, p);
    updateCamera(player.step, p, dt, false);
    W.renderer.render(W.scene, W.camera);
    updateLabels();
    ui.progress.style.setProperty('--p', String(p));
  }

  // ---------- UI ----------
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function buildUI() {
    const root = el('div', 'tut');
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'tutTitle');
    root.innerHTML = `
      <div class="tut__box">
        <header class="tut__head">
          <h3 id="tutTitle"></h3>
          <span class="tut__note small"></span>
          <button type="button" class="iconbtn tut__close" data-tut="close">✕</button>
        </header>
        <div class="tut__stage">
          <canvas></canvas>
          <div class="tut__labels"></div>
          <div class="tut__badge"></div>
          <div class="tut__loading"></div>
          <div class="tut__hint small"></div>
        </div>
        <div class="tut__progress"><div class="tut__progress-fill"></div></div>
        <div class="tut__bar"></div>
        <div class="tut__controls">
          <button type="button" class="btn btn--ghost btn--sm" data-tut="prev">⏮</button>
          <button type="button" class="btn btn--primary btn--sm" data-tut="play">⏸</button>
          <button type="button" class="btn btn--ghost btn--sm" data-tut="next">⏭</button>
          <button type="button" class="btn btn--ghost btn--sm" data-tut="replay">↺</button>
        </div>
        <div class="tut__text"><h4></h4><p class="tut__body"></p><p class="tip"></p></div>
      </div>`;
    document.body.appendChild(root);
    ui = {
      root, canvas: root.querySelector('canvas'), stage: root.querySelector('.tut__stage'), title: root.querySelector('#tutTitle'), note: root.querySelector('.tut__note'),
      badge: root.querySelector('.tut__badge'), loading: root.querySelector('.tut__loading'), hint: root.querySelector('.tut__hint'), bar: root.querySelector('.tut__bar'),
      progress: root.querySelector('.tut__progress'), h4: root.querySelector('.tut__text h4'), body: root.querySelector('.tut__body'), tip: root.querySelector('.tut__text .tip'),
      labelsEl: root.querySelector('.tut__labels'), labels: {},
      btn: k => root.querySelector(`[data-tut="${k}"]`),
    };
    root.addEventListener('click', e => {
      if (e.target === root) return close();
      const b = e.target.closest('[data-tut]');
      if (!b) return;
      const a = b.dataset.tut;
      if (a === 'close') close();
      if (a === 'prev') goto(Math.max(0, player.step - 1));
      if (a === 'next') goto(Math.min(STEPS.length - 1, player.step + 1));
      if (a === 'replay') goto(player.step, true);
      if (a === 'play') { player.playing = !player.playing; if (player.playing && player.time >= STEPS[player.step].dur && player.step === STEPS.length - 1) goto(0, true); syncUI(); }
      if (a === 'step') goto(+b.dataset.i, true);
    });
    document.addEventListener('keydown', e => {
      if (!player.open) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') goto(Math.min(STEPS.length - 1, player.step + 1));
      if (e.key === 'ArrowLeft') goto(Math.max(0, player.step - 1));
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); player.playing = !player.playing; syncUI(); }
    });
    const c = ui.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', e => { view.drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => {
      if (!view.drag) return;
      view.yaw -= (e.clientX - view.drag.x) * .006;
      view.pitch = Math.max(-.6, Math.min(.5, view.pitch - (e.clientY - view.drag.y) * .004));
      view.drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => { view.drag = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', e => { e.preventDefault(); view.zoom = Math.max(.6, Math.min(2.5, view.zoom * (e.deltaY > 0 ? .92 : 1.08))); }, { passive: false });
    c.addEventListener('dblclick', () => { view.yaw = 0; view.pitch = 0; view.zoom = 1; });
    window.addEventListener('resize', () => { if (player.open && W) resize(); });
  }
  function syncTexts() {
    const lb = ctx.labels;
    ui.title.textContent = lb.title;
    ui.note.textContent = ctx.own ? lb.yourArrow : lb.defaultArrow;
    ui.hint.textContent = lb.hint;
    ui.loading.textContent = lb.loading;
    ui.btn('prev').setAttribute('aria-label', lb.prev);
    ui.btn('next').setAttribute('aria-label', lb.next);
    ui.btn('replay').setAttribute('aria-label', lb.replay);
    ui.btn('close').setAttribute('aria-label', lb.close);
    ui.bar.innerHTML = ctx.steps.map((s, i) => `<button type="button" data-tut="step" data-i="${i}" title="${(i + 1) + '. ' + s.title.replace(/"/g, '&quot;')}"><span>${i + 1}</span></button>`).join('');
    ui.labelsEl.innerHTML = '';
    ui.labels = {};
    for (const k in lb.tools) {
      const d = el('div', 'tut__label', lb.tools[k]);
      d.hidden = true;
      ui.labelsEl.appendChild(d);
      ui.labels[k] = d;
    }
    syncUI();
  }
  function syncUI() {
    if (!ctx) return;
    const s = ctx.steps[player.step];
    ui.badge.textContent = ctx.labels.stepOf.replace('{n}', player.step + 1).replace('{total}', ctx.steps.length);
    ui.h4.textContent = s.title;
    ui.body.textContent = s.text;
    ui.tip.textContent = s.tip || '';
    ui.tip.hidden = !s.tip;
    const pb = ui.btn('play');
    pb.textContent = player.playing ? '⏸' : '▶';
    pb.setAttribute('aria-label', player.playing ? ctx.labels.pause : ctx.labels.play);
    ui.bar.querySelectorAll('button').forEach((b, i) => {
      b.classList.toggle('done', i < player.step);
      b.setAttribute('aria-current', i === player.step ? 'step' : 'false');
    });
  }
  function goto(i, restart) {
    if (i !== player.step || restart) { player.time = 0; player.hold = 0; }
    player.step = i;
    if (restart) player.playing = true;
    syncUI();
  }

  async function open(c) {
    ctx = c;
    if (!ui) buildUI();
    ui.root.hidden = false;
    document.documentElement.classList.add('tut-open');
    player.open = true;
    syncTexts();
    ui.loading.hidden = false;
    try {
      THREE = await window.Viz3D.load();
      if (!W) buildWorld(ui.canvas);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-2').trim() || '#1b1713';
      W.scene.background = new THREE.Color(bg);
      W.scene.fog = new THREE.Fog(bg, 55, 120);
      buildArrow(c.spec);
      STEPS = makeSteps();
      if (STEPS.length !== ctx.steps.length) console.warn('tutorial: step count mismatch', STEPS.length, ctx.steps.length);
      player.step = Math.min(c.start || 0, STEPS.length - 1);
      player.time = 0; player.hold = 0; player.playing = true;
      view.yaw = 0; view.pitch = 0; view.zoom = 1; view.pos = null;
      resize();
      ui.loading.hidden = true;
      syncUI();
      cancelAnimationFrame(player.raf);
      player.last = 0;
      player.raf = requestAnimationFrame(loop);
      ui.btn('play').focus({ preventScroll: true });
    } catch (e) {
      console.error(e);
      ui.loading.textContent = ctx.labels.fail;
    }
  }
  function close() {
    if (!ui) return;
    player.open = false;
    cancelAnimationFrame(player.raf);
    ui.root.hidden = true;
    document.documentElement.classList.remove('tut-open');
    if (ctx && ctx.onClose) ctx.onClose();
  }
  /** language change while open */
  function update(c) {
    if (!player.open) return;
    ctx = Object.assign(ctx, { steps: c.steps, labels: c.labels, lang: c.lang });
    syncTexts();
  }

  /** jump to a step at progress p (0..1) and pause — used by the step bar and for testing */
  function seek(i, p) { goto(i); player.playing = false; player.time = (p || 0) * STEPS[i].dur; syncUI(); }

  window.Tutorial3D = { open, close, update, seek, isOpen: () => player.open };
})();
