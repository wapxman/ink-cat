// INK CAT — веб-драка в духе Comix Zone (26.11). Холст 1280×720 в логических точках, страница комикса из панелей.
// Спрайты рисовал ChatGPT, их режет и упаковывает build_deploy.py: assets/manifest.json + атласы <имя>.json/.webp.
// У кадра: прямоугольник в атласе, якорь (ступни), рамка тела b и «дальняя точка» r (кулак/стопа) — по ней удар.
'use strict';
(() => {
  const W = 1280, H = 720, V = document.currentScript.src.split('v=')[1] || '1';
  const cv = document.getElementById('c'), cx = cv.getContext('2d');
  let DPR = 1, SC = 1, OX = 0, OY = 0, SW = 0, SH = 0;
  function resize() {
    SW = innerWidth; SH = innerHeight; DPR = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
    SC = Math.min(SW / W, SH / H); OX = (SW - W * SC) / 2; OY = (SH - H * SC) / 2;
  }
  addEventListener('resize', resize); resize();
  const FONT = '"Bangers", "Impact", "Arial Black", sans-serif';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- загрузка ----------
  const A = {}, BG = {};
  let MAN = null;
  const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  async function load() {
    MAN = await (await fetch('assets/manifest.json?v=' + V)).json();
    const jobs = [];
    for (const [k, f] of Object.entries(MAN.atlases || {}))
      jobs.push(fetch('assets/' + f + '?v=' + V).then(r => r.json()).then(async d => { d.img = await img('assets/' + d.image + '?v=' + V); A[k] = d; }));
    for (const [k, b] of Object.entries(MAN.bgs || {}))
      jobs.push(img('assets/' + b.image + '?v=' + V).then(i => { BG[k] = { img: i, floor: b.floor || 0.86 }; }));
    await Promise.all(jobs);
  }
  const has = (at, s) => !!(A[at] && A[at].sheets[s] && A[at].sheets[s].length);
  function frame(at, s, i) { const a = A[at]; if (!a) return null; const sh = a.sheets[s]; return sh ? sh[Math.min(i, sh.length - 1)] : null; }

  // ---------- звук (синтез, без файлов) ----------
  let AC = null;
  function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); }
  function noise(d) { const b = AC.createBuffer(1, Math.ceil(AC.sampleRate * d), AC.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; const s = AC.createBufferSource(); s.buffer = b; return s; }
  function snd(kind) {
    if (!AC) return;
    const t = AC.currentTime, g = AC.createGain(); g.connect(AC.destination);
    if (kind === 'whoosh') {
      const n = noise(0.16), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.14);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.17);
    } else if (kind === 'hit' || kind === 'heavy') {
      const big = kind === 'heavy', o = AC.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(big ? 150 : 190, t); o.frequency.exponentialRampToValueAtTime(42, t + (big ? 0.22 : 0.13));
      g.gain.setValueAtTime(big ? 0.7 : 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.26 : 0.15));
      o.connect(g); o.start(t); o.stop(t + 0.3);
      const n = noise(0.06), g2 = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = big ? 1800 : 2600;
      g2.gain.setValueAtTime(big ? 0.5 : 0.35, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      n.connect(f); f.connect(g2); g2.connect(AC.destination); n.start(t); n.stop(t + 0.08);
    } else if (kind === 'block') {
      const n = noise(0.07), f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.09);
    } else if (kind === 'land' || kind === 'jump') {
      const n = noise(0.09), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'land' ? 500 : 900;
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.11);
    } else if (kind === 'ko') {
      const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.7);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75); o.connect(g); o.start(t); o.stop(t + 0.8);
    } else if (kind === 'super') {
      const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.25);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); o.start(t); o.stop(t + 0.32);
    }
  }

  // ---------- персонажи ----------
  // f — кадры листа s; t — длительности кадров; act — какие из них бьют; alt — замена, если листа нет в атласе
  const HERO = {
    atlas: 'hero', speed: 250, jumpV: 980, hp: 120, r: 44,
    anim: {
      idle: { s: 'hero_stance', f: [0, 1, 2, 3, 2, 1], fps: 8 }, walk: { s: 'hero_walk', f: [0, 1, 2, 3, 4, 5, 6, 7], fps: 12, alt: { s: 'hero_stance', f: [0, 1, 2, 3] } },
      block: { s: 'hero_stance', f: [4] }, cblock: { s: 'hero_stance', f: [5] }, crouch: { s: 'hero_low', f: [0], alt: { s: 'hero_stance', f: [5] } },
      prep: { s: 'hero_jump', f: [0] }, rise: { s: 'hero_jump', f: [1, 2], fps: 10 }, peak: { s: 'hero_jump', f: [3] }, fall: { s: 'hero_jump', f: [4] }, land: { s: 'hero_jump', f: [5] },
      hurtHi: { s: 'hero_hurt', f: [0] }, hurtLo: { s: 'hero_hurt', f: [1] }, fly: { s: 'hero_hurt', f: [2] }, down: { s: 'hero_hurt', f: [3] }, getup: { s: 'hero_hurt', f: [4, 5], fps: 5 },
      win: { s: 'hero_win', f: [0, 1, 2, 3], fps: 2.5, alt: { s: 'hero_stance', f: [0] } }, dizzy: { s: 'hero_win', f: [4], alt: { s: 'hero_hurt', f: [3] } },
    },
    move: {
      jab:   { s: 'hero_punch', f: [0, 1], t: [0.05, 0.13], act: [1], dmg: 6, stun: 0.28, push: 40, fx: 0, next: { P: 'cross', K: 'kick' } },
      cross: { s: 'hero_punch', f: [2, 3], t: [0.06, 0.15], act: [1], dmg: 8, stun: 0.3, push: 55, fx: 1, next: { P: 'hook', K: 'kick' } },
      hook:  { s: 'hero_punch', f: [4, 5], t: [0.08, 0.24], act: [1], dmg: 13, kd: [240, -560], heavy: true, fx: 3 },
      kick:  { s: 'hero_kick', f: [0, 1, 2], t: [0.07, 0.15, 0.1], act: [1], dmg: 10, stun: 0.32, push: 95, fx: 2, next: { K: 'round', P: 'jab' } },
      round: { s: 'hero_kick', f: [3, 4, 5], t: [0.09, 0.17, 0.13], act: [1], dmg: 13, kd: [330, -430], heavy: true, fx: 4 },
      lowP:  { s: 'hero_low', f: [0, 1], t: [0.05, 0.14], act: [1], dmg: 5, stun: 0.25, push: 30, fx: 0, crouch: true, next: { P: 'lowP', K: 'sweep' } },
      sweep: { s: 'hero_low', f: [2, 3, 4, 5], t: [0.08, 0.17, 0.12, 0.1], act: [1], dmg: 9, kd: [90, -260], fx: 5, crouch: true },
      upper: { s: 'hero_upper', f: [0, 1, 2], t: [0.07, 0.16, 0.2], act: [1, 2], dmg: 14, kd: [110, -800], rise: -560, heavy: true, fx: 3, alt: { s: 'hero_punch', f: [4, 5, 5] } },
      special: { s: 'hero_upper', f: [3, 4, 5], t: [0.16, 0.24, 0.2], act: [1, 2], dmg: 24, kd: [430, -420], dash: 980, heavy: true, fx: 4, cost: 1, claws: true, alt: { s: 'hero_kick', f: [3, 4, 5] } },
      airK:  { s: 'hero_air', f: [0, 1, 2], t: [0.06, 0.45, 0.1], act: [1], dmg: 11, stun: 0.4, push: 120, fx: 2, air: true, alt: { s: 'hero_kick', f: [0, 1, 1] } },
      airP:  { s: 'hero_air', f: [3, 4, 5], t: [0.06, 0.2, 0.12], act: [1], dmg: 9, stun: 0.35, push: 60, fx: 0, air: true, alt: { s: 'hero_punch', f: [2, 3, 3] } },
    },
  };
  const EN_A = {
    atlas: 'enA', speed: 150, hp: 55, r: 46, score: 500, name: 'RIPJAW',
    anim: { idle: { s: 'enA_move', f: [0, 1], fps: 3 }, walk: { s: 'enA_move', f: [2, 3, 4, 5], fps: 8 },
            hurtHi: { s: 'enA_hurt', f: [0] }, hurtLo: { s: 'enA_hurt', f: [1] }, fly: { s: 'enA_hurt', f: [2] }, down: { s: 'enA_hurt', f: [3] },
            getup: { s: 'enA_hurt', f: [4] }, dizzy: { s: 'enA_hurt', f: [5] } },
    move: { swipe: { s: 'enA_atk', f: [0, 1, 2], t: [0.34, 0.16, 0.32], act: [1], dmg: 8, stun: 0.35, push: 70, fx: 1 },
            lunge: { s: 'enA_atk', f: [3, 4, 5], t: [0.42, 0.34, 0.3], act: [1], dmg: 11, kd: [320, -300], dash: 560, fx: 2 } },
    ai: { reach: 150, far: 420, think: [0.35, 1.0], pick: m => (m.dist > 260 ? 'lunge' : 'swipe') },
  };
  const EN_B = {
    atlas: 'enB', speed: 105, hp: 140, r: 58, score: 1200, armor: 9, name: 'GOREHOUND',
    anim: { idle: { s: 'enB_move', f: [0, 1], fps: 2.5 }, walk: { s: 'enB_move', f: [2, 3, 4, 5], fps: 6 },
            hurtHi: { s: 'enB_hurt', f: [0] }, hurtLo: { s: 'enB_hurt', f: [1] }, fly: { s: 'enB_hurt', f: [2] }, down: { s: 'enB_hurt', f: [3] },
            getup: { s: 'enB_hurt', f: [4] }, dizzy: { s: 'enB_hurt', f: [5] } },
    move: { smash: { s: 'enB_atk', f: [0, 1, 2], t: [0.55, 0.2, 0.4], act: [1], dmg: 16, kd: [380, -380], heavy: true, fx: 4 },
            charge: { s: 'enB_atk', f: [3, 4, 5], t: [0.5, 0.45, 0.35], act: [1], dmg: 14, kd: [460, -300], dash: 620, heavy: true, fx: 3 } },
    ai: { reach: 175, far: 460, think: [0.6, 1.4], pick: m => (m.dist > 300 ? 'charge' : 'smash') },
  };

  function animOf(def, key) {
    const a = def.anim[key] || def.move[key];
    if (!a) return null;
    if (has(def.atlas, a.s)) return a;
    if (a.alt && has(def.atlas, a.alt.s)) return Object.assign({}, a, a.alt);
    const idle = def.anim.idle;                      // листа ещё нет — кадр стойки, тайминги удара прежние
    return Object.assign({}, a, { s: idle.s, f: a.f.map(() => idle.f[0]) });
  }

  class Fighter {
    constructor(def, x, dir, isHero) {
      Object.assign(this, { def, x, y: 0, vx: 0, vy: 0, dir, hero: !!isHero, hp: def.hp, st: 'idle', t: 0, ft: 0, fi: 0,
                            mv: null, hitDone: new Set(), stun: 0, inv: 0, flash: 0, air: false, airUsed: false, dead: false,
                            fade: 1, think: rnd(0.4, 1), spawnT: 0, comboOpen: 0, queued: null, armorHits: 0 });
    }
    get grounded() { return this.y >= 0 && !this.air; }
    set(st) { if (this.st !== st) { this.st = st; this.t = 0; this.ft = 0; this.fi = 0; } }
    cur() {           // [лист, кадр]
      const def = this.def;
      if (this.mv) { const m = animOf(def, this.mv); return [m.s, m.f[Math.min(this.fi, m.f.length - 1)]]; }
      const a = animOf(def, this.st) || animOf(def, 'idle');
      const k = a.f.length > 1 ? Math.floor(this.t * (a.fps || 8)) % a.f.length : 0;
      return [a.s, a.f[k]];
    }
    fr() { const [s, i] = this.cur(); return frame(this.def.atlas, s, i); }
    box() {         // рамка тела в мире
      const f = this.fr(), k = A[this.def.atlas] ? A[this.def.atlas].scale : 1;
      if (!f) return [this.x - 50, this.y0() - 280, this.x + 50, this.y0()];
      let x0 = f.b[0] * k, x1 = f.b[2] * k; const w = x1 - x0; x0 += w * 0.12; x1 -= w * 0.12;
      return this.dir > 0 ? [this.x + x0, this.y0() + f.b[1] * k, this.x + x1, this.y0() + f.b[3] * k]
                          : [this.x - x1, this.y0() + f.b[1] * k, this.x - x0, this.y0() + f.b[3] * k];
    }
    reach() { const f = this.fr(), k = A[this.def.atlas] ? A[this.def.atlas].scale : 1; if (!f) return [this.x + this.dir * 110, this.y0() - 180]; return [this.x + this.dir * f.r[0] * k, this.y0() + f.r[1] * k]; }
    y0() { return G.floor + this.y; }
    start(name) {
      const m = animOf(this.def, name); if (!m) return false;
      this.mv = name; this.fi = 0; this.ft = 0; this.hitDone.clear(); this.queued = null;
      if (!m.air) this.vx = 0;                       // на земле удар с места: не скользить
      snd('whoosh');
      return true;
    }
    onFrame(m) {                                     // рывок и подъём — с первого ударного кадра, не на замахе
      if (this.fi === 1 && m.dash) this.vx = this.dir * m.dash;
      if (this.fi === 1 && m.rise) { this.vy = m.rise; this.air = true; }
    }
  }

  // ---------- игра ----------
  const G = { floor: 600, cam: 0, camTo: 0, panel: 0, panels: [], hero: null, foes: [], bag: null, fx: [], pops: [], freeze: 0,
              shake: 0, score: 0, combo: 0, comboT: 0, meter: 0, mode: 'title', modeT: 0, trans: 0, msg: '', msgT: 0, best: 0 };
  const PW = W;           // ширина панели в мире

  function stages() {
    const bgs = ['bg_roof', 'bg_alley', 'bg_subway'].filter(k => BG[k]);
    const two = A.enB ? 'B' : 'A';
    const P = [
      { bg: bgs[0] || 'bg_roof', cap: 'MEANWHILE, ON THE ROOF...', bag: !!A.bag, waves: [] },
      { bg: bgs[1] || bgs[0], cap: 'THE ALLEY. THEY WERE WAITING...', waves: [['A', 'A'], ['A']] },
      { bg: bgs[2] || bgs[0], cap: 'DOWN IN THE SUBWAY...', waves: [['A'], [two, 'A']] },
    ];
    if (!A.enA) P[1].waves = P[2].waves = [];
    return P;
  }

  function newGame(keepPanel) {
    G.panels = stages();
    G.panel = keepPanel ? G.panel : 0; G.cam = G.camTo = G.panel * PW;
    G.hero = new Fighter(HERO, G.panel * PW + 360, 1, true);
    G.foes = []; G.fx = []; G.pops = []; G.combo = 0; G.meter = keepPanel ? G.meter : 0; G.endT = 0; G.trans = 0;
    if (!keepPanel) G.score = 0;
    enterPanel(G.panel);
    G.mode = 'play'; G.modeT = 0;
  }
  function enterPanel(i) {
    const p = G.panels[i];
    G.floor = Math.round(H * (BG[p.bg] ? BG[p.bg].floor : 0.86));
    G.bag = p.bag ? { x: i * PW + 760, ang: 0, va: 0, fi: 0, ft: 0, hits: 0 } : null;
    p.wave = 0; p.spawnT = 0.6; G.msg = p.cap; G.msgT = 3.2;
  }
  function spawn(kind) {
    const def = kind === 'B' && A.enB ? EN_B : EN_A;
    const left = G.panel * PW, side = Math.random() < 0.65 ? 1 : -1;
    const x = clamp(G.hero.x + side * rnd(380, 520), left + 120, left + PW - 120);
    const f = new Fighter(def, x, x > G.hero.x ? -1 : 1, false);
    f.spawnT = 0.7; f.think = rnd(0.8, 1.4);
    G.foes.push(f);
    for (let k = 0; k < 14; k++) G.fx.push({ k: 'ink', x: x + rnd(-60, 60), y: G.floor - rnd(20, 260), vx: rnd(-200, 200), vy: rnd(-260, 40), t: 0, d: rnd(0.4, 0.8), r: rnd(6, 16) });
  }
  function panelClear() { const p = G.panels[G.panel]; return p.wave >= p.waves.length && !G.foes.some(f => !f.dead); }

  // ---------- ввод ----------
  const K = {}, PR = {};
  const keymap = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D',
                   Space: 'J', KeyJ: 'P', KeyZ: 'P', KeyK: 'K', KeyX: 'K', KeyL: 'B', KeyC: 'B', KeyI: 'S', KeyU: 'S', KeyV: 'S', Enter: 'START' };
  addEventListener('keydown', e => { const k = keymap[e.code]; if (!k) return; e.preventDefault(); if (!K[k]) PR[k] = true; K[k] = true; audio(); if (G.mode !== 'play') tapStart(); });
  addEventListener('keyup', e => { const k = keymap[e.code]; if (k) K[k] = false; });
  // экран: слева — джойстик, справа — кнопки
  // 26.11 проба на iPhone 14 Pro: кнопки были крупноваты и JUMP прилипал к краю — меньше и левее
  const BTN = [ { k: 'P', label: 'PUNCH', dx: -205, dy: -78, r: 41 }, { k: 'K', label: 'KICK', dx: -108, dy: -116, r: 41 },
                { k: 'J', label: 'JUMP', dx: -104, dy: -218, r: 35 }, { k: 'B', label: 'BLOCK', dx: -200, dy: -180, r: 33 },
                { k: 'S', label: 'SUPER', dx: -296, dy: -70, r: 31 } ];
  const touches = new Map();
  let stick = null;
  function inset() { return { l: Math.max(22, SW * 0.03), r: SW - Math.max(22, SW * 0.03), b: SH - Math.max(14, SH * 0.03) }; }
  function btnAt(x, y) {
    const s = inset(), m = Math.min(1.05, Math.max(0.75, SH / 430));
    for (const b of BTN) { const bx = s.r + b.dx * m, by = s.b + b.dy * m; if (Math.hypot(x - bx, y - by) < b.r * m * 1.25) return b.k; }
    return null;
  }
  function stickDirs() {
    K.L = K.R = K.U = K.D = false;
    if (!stick || stick.dx === undefined) return;
    const dz = 18; if (stick.dx < -dz) K.L = true; if (stick.dx > dz) K.R = true; if (stick.dy < -dz * 1.8) K.U = true; if (stick.dy > dz * 1.8) K.D = true;
  }
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); audio();
    if (G.mode !== 'play') { tapStart(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const b = btnAt(e.clientX, e.clientY);
    if (b) { touches.set(e.pointerId, { btn: b }); PR[b] = true; K[b] = true; return; }
    if (e.clientX < SW * 0.5) { stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }; touches.set(e.pointerId, { stick: true }); stickDirs(); }
  }, { passive: false });
  cv.addEventListener('pointermove', e => {
    const t = touches.get(e.pointerId); if (!t) return;
    if (t.stick && stick) { stick.dx = clamp(e.clientX - stick.x0, -70, 70); stick.dy = clamp(e.clientY - stick.y0, -70, 70); stickDirs(); }
    else if (t.btn) { const b = btnAt(e.clientX, e.clientY); if (b !== t.btn) { K[t.btn] = false; if (b) { PR[b] = true; K[b] = true; } t.btn = b; } }
  });
  function up(e) { const t = touches.get(e.pointerId); if (!t) return; if (t.stick) { stick = null; stickDirs(); } else if (t.btn) K[t.btn] = false; touches.delete(e.pointerId); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function tapStart() {
    if (G.mode === 'title' && G.loaded) newGame(false);
    else if (G.mode === 'over' && G.modeT > 1) newGame(true);
    else if (G.mode === 'end' && G.modeT > 1.5) { G.panel = 0; newGame(false); }
  }

  // ---------- логика ----------
  const DT = 1 / 60, GRAV = 2900;
  function heroControl(h, dt) {
    if (h.dead || G.mode !== 'play') return;
    if (h.stun > 0 || ['hurtHi', 'hurtLo', 'fly', 'down', 'getup'].includes(h.st) && !h.mv) return;
    const pr = k => PR[k], hold = k => K[k];
    if (h.mv) {                                   // цепочка: следующий удар, если нажат в окне
      const m = animOf(HERO, h.mv);
      if (m.next) { for (const b of ['P', 'K']) if (pr(b) && m.next[b]) h.queued = m.next[b]; }
      return;
    }
    if (!h.grounded) {
      if (!h.airUsed && pr('K')) { h.airUsed = true; h.start('airK'); }
      else if (!h.airUsed && pr('P')) { h.airUsed = true; h.start('airP'); }
      return;
    }
    if (h.st === 'prep' || h.st === 'land') return;
    const dirIn = (hold('R') ? 1 : 0) - (hold('L') ? 1 : 0);
    if (pr('S') && G.meter >= 1) { G.meter -= 1; if (dirIn) h.dir = dirIn; h.start('special'); snd('super'); G.shake = 0.25; return; }
    if (pr('P')) { if (dirIn) h.dir = dirIn; h.start(hold('D') ? 'lowP' : hold('U') ? 'upper' : 'jab'); return; }
    if (pr('K')) { if (dirIn) h.dir = dirIn; h.start(hold('D') ? 'sweep' : 'kick'); return; }
    if (pr('J')) { h.set('prep'); h.jdir = dirIn; return; }
    if (hold('B')) { h.set(hold('D') ? 'cblock' : 'block'); h.vx = 0; return; }
    if (hold('D')) { h.set('crouch'); h.vx = 0; return; }
    if (dirIn) { h.dir = dirIn; h.vx = dirIn * HERO.speed; h.set('walk'); } else { h.vx = 0; h.set('idle'); }
  }

  function foeAI(f, dt) {
    const h = G.hero;
    if (f.dead || f.spawnT > 0 || f.mv || f.stun > 0 || ['hurtHi', 'hurtLo', 'fly', 'down', 'getup', 'dizzy'].includes(f.st)) return;
    const dist = Math.abs(h.x - f.x), ai = f.def.ai;
    f.dir = h.x > f.x ? 1 : -1;
    f.think -= dt;
    // не все сразу: бьёт тот, кто ближе, остальные держат дистанцию
    const nearest = G.foes.filter(o => !o.dead).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0] === f;
    const want = nearest ? ai.reach * 0.9 : ai.reach + 140;
    if (h.dead) { f.vx = 0; f.set('idle'); return; }
    if (f.think <= 0 && nearest && dist < ai.far) {
      const name = ai.pick({ dist });
      if (name === 'swipe' || name === 'smash' ? dist < ai.reach * 1.05 : true) { f.vx = 0; f.start(name); f.think = rnd(...ai.think); return; }
    }
    if (dist > want + 20) { f.vx = f.dir * f.def.speed; f.set('walk'); }
    else if (dist < want - 60 && !nearest) { f.vx = -f.dir * f.def.speed * 0.6; f.set('walk'); }
    else { f.vx = 0; f.set('idle'); }
  }

  function stepFighter(f, dt) {
    f.t += dt; f.inv = Math.max(0, f.inv - dt); f.flash = Math.max(0, f.flash - dt * 4);
    if (f.spawnT > 0) { f.spawnT -= dt; return; }
    if (f.stun > 0) { f.stun -= dt; if (f.stun <= 0 && (f.st === 'hurtHi' || f.st === 'hurtLo')) f.set('idle'); }
    if (f.mv) {                                    // удар
      const m = animOf(f.def, f.mv);
      f.ft += dt;
      const dur = m.t[Math.min(f.fi, m.t.length - 1)];
      if (m.air && f.fi === 1 && !f.grounded && m.t[1] > 0.3) { /* удар в прыжке держится до земли */ }
      else if (f.ft >= dur) {
        f.ft -= dur; f.fi++;
        // связка: следующий удар — сразу после ударных кадров, восстановление пропускаем
        if (f.queued && f.fi > Math.max(...m.act)) { const q = f.queued; f.mv = null; f.start(q); return; }
        if (f.fi < m.f.length) f.onFrame(m);
        if (f.fi >= m.f.length) {
          f.mv = null; f.hitDone.clear();
          if (f.queued) { const q = f.queued; f.start(q); }
          else f.set(m.crouch && f.hero && K.D ? 'crouch' : 'idle');
        }
      }
      if (f.mv && m.dash && f.fi >= 2) f.vx *= 0.82;
      if (f.mv && m.act.includes(f.fi)) attack(f, m);
    }
    if (f.st === 'prep') { f.vx = 0; if (f.t > 0.07) { f.vy = -HERO.jumpV; f.vx = (f.jdir || 0) * HERO.speed * 1.15; f.air = true; f.airUsed = false; f.set('rise'); snd('jump'); } }
    if (f.st === 'land' && f.t > 0.1) f.set('idle');
    if (f.st === 'down' && f.t > (f.dead ? 99 : 0.65)) { f.set('getup'); f.inv = 0.6; }
    if (f.st === 'getup' && f.t > 0.42) { f.set(f.hero ? 'idle' : (Math.random() < 0.3 ? 'dizzy' : 'idle')); if (f.st === 'dizzy') f.stun = 0.9; }
    if (f.st === 'dizzy' && f.stun <= 0) f.set('idle');
    // физика
    if (f.air || f.y < 0) {
      f.vy += GRAV * dt; f.y += f.vy * dt; f.x += f.vx * dt;
      if (!f.mv && !['fly'].includes(f.st) && f.hero) f.set(f.vy < -250 ? 'rise' : f.vy < 150 ? 'peak' : 'fall');
      if (f.y >= 0) {
        f.y = 0; f.vy = 0; f.air = false;
        if (f.st === 'fly') { f.set('down'); f.vx = 0; G.shake = Math.max(G.shake, 0.12); snd('land'); dust(f.x, 10); }
        else if (f.mv && animOf(f.def, f.mv).air) { f.mv = null; f.set('land'); f.vx = 0; dust(f.x, 6); snd('land'); }
        else if (f.hero) { f.set('land'); f.vx = 0; dust(f.x, 5); snd('land'); }
      }
    } else {
      f.x += f.vx * dt;
      if (['hurtHi', 'hurtLo'].includes(f.st)) f.vx *= 0.86;
    }
    const left = G.panel * PW + 50, right = G.panel * PW + PW - 50;
    if (G.mode === 'play' && !(f.hero && G.trans > 0)) {
      if (f.hero && panelClear() && G.panel < G.panels.length - 1) f.x = Math.max(left, f.x);
      else f.x = clamp(f.x, left, right);
    }
  }

  function attack(f, m) {
    const [hx, hy] = f.reach(), r = f.def.r;
    const targets = f.hero ? G.foes.filter(o => !o.dead && o.spawnT <= 0) : [G.hero];
    for (const o of targets) {
      if (f.hitDone.has(o) || o.inv > 0 || o.st === 'down' || o.st === 'getup') continue;
      const [x0, y0, x1, y1] = o.box();
      const nx = clamp(hx, x0, x1), ny = clamp(hy, y0, y1);
      if ((hx - nx) ** 2 + (hy - ny) ** 2 > r * r) continue;
      f.hitDone.add(o);
      hit(f, o, m, (hx + nx) / 2, (hy + ny) / 2);
    }
    if (f.hero && G.bag && !f.hitDone.has(G.bag)) {      // груша: та же проверка, рамка — мешок
      const b = G.bag, bx = b.x + Math.sin(b.ang) * 120, by = G.floor - 250;
      if (Math.abs(hx - bx) < 70 + r && hy > by - 140 && hy < by + 140) {
        f.hitDone.add(G.bag);
        b.va += f.dir * (m.heavy ? 5.5 : 2.6) * (m.dmg / 10); b.hits++;
        land(f, m, bx - f.dir * 40, hy, false);
        popNum(bx, by - 170, m.dmg);
      }
    }
  }
  function land(f, m, x, y, blocked) {                 // общее для попадания: стоп-кадр, тряска, надпись, звук
    G.freeze = blocked ? 0.04 : m.heavy ? 0.11 : 0.065;
    G.shake = Math.max(G.shake, blocked ? 0.06 : m.heavy ? 0.22 : 0.1);
    snd(blocked ? 'block' : m.heavy ? 'heavy' : 'hit');
    if (!blocked && A.sfx && (m.heavy || Math.random() < 0.6)) {
      const n = A.sfx.sheets.sfx ? A.sfx.sheets.sfx.length : 0;
      if (n) G.pops.push({ i: (Math.min(n - 1, m.fx || 0) + (m.heavy ? 0 : Math.floor(Math.random() * 2))) % n, x: x + rnd(-30, 30), y: y - rnd(40, 90), t: 0, rot: rnd(-0.3, 0.3) });
    }
    for (let k = 0; k < (blocked ? 6 : 12); k++) {
      const a = rnd(0, Math.PI * 2), s = rnd(240, 620);
      G.fx.push({ k: blocked ? 'spark2' : 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, d: rnd(0.12, 0.25), r: rnd(3, 6) });
    }
    G.fx.push({ k: 'ring', x, y, t: 0, d: 0.18, r: m.heavy ? 90 : 55 });
  }
  function hit(f, o, m, x, y) {
    const blocking = (o.st === 'block' || o.st === 'cblock') && o.dir === -f.dir && !(m.crouch && o.st === 'block');
    if (blocking) {
      o.hp -= Math.ceil(m.dmg * 0.1); o.vx = f.dir * 140; land(f, m, x, y, true);
      if (f.hero) G.meter = Math.min(3, G.meter + 0.03);
      return;
    }
    o.hp -= m.dmg; o.flash = 1;
    land(f, m, x, y, false);
    if (f.hero) { G.score += 100 + 20 * G.combo; G.combo++; G.comboT = 1.3; G.meter = Math.min(3, G.meter + 0.08); }
    else G.meter = Math.min(3, G.meter + 0.05);
    const armored = !o.hero && o.def.armor && o.mv && m.dmg < o.def.armor && o.hp > 0;
    if (armored) return;                              // громила не вздрагивает от лёгких ударов посреди своего замаха
    o.mv = null; o.queued = null; o.dir = -f.dir;
    if (o.hp <= 0 || m.kd) {
      const kd = m.kd || [320, -420];
      o.vx = f.dir * kd[0]; o.vy = kd[1]; o.air = true; o.y = Math.min(o.y, -1); o.set('fly'); o.stun = 0;
      if (o.hp <= 0) { o.dead = true; if (o.hero) { snd('ko'); G.mode = 'over'; G.modeT = 0; } else { G.score += o.def.score; snd('ko'); } }
    } else {
      o.set(y > o.y0() - 140 ? 'hurtLo' : 'hurtHi'); o.stun = m.stun || 0.3; o.vx = f.dir * (m.push || 50) * 3.2;
      if (!o.grounded) { o.set('fly'); o.vy = -200; }
    }
  }
  function dust(x, n) { for (let k = 0; k < n; k++) G.fx.push({ k: 'dust', x: x + rnd(-40, 40), y: G.floor - 4, vx: rnd(-120, 120), vy: rnd(-90, -20), t: 0, d: rnd(0.3, 0.5), r: rnd(8, 16) }); }
  function popNum(x, y, n) { G.fx.push({ k: 'num', x, y, vx: 0, vy: -90, t: 0, d: 0.8, n }); }

  function update(dt) {
    G.modeT += dt;
    if (G.mode === 'title') return;
    if (G.freeze > 0) { G.freeze -= dt; return; }
    G.shake = Math.max(0, G.shake - dt);
    const h = G.hero, p = G.panels[G.panel];
    heroControl(h, dt);
    for (const f of G.foes) foeAI(f, dt);
    stepFighter(h, dt);
    for (const f of G.foes) stepFighter(f, dt);
    // мёртвые растворяются в чернилах
    for (const f of G.foes) if (f.dead && f.st === 'down') { f.fade -= dt * 1.2; if (f.fade < 0.6 && !f.inked) { f.inked = true; for (let k = 0; k < 18; k++) G.fx.push({ k: 'ink', x: f.x + rnd(-90, 90), y: G.floor - rnd(0, 60), vx: rnd(-150, 150), vy: rnd(-300, -60), t: 0, d: rnd(0.5, 0.9), r: rnd(5, 14) }); } }
    G.foes = G.foes.filter(f => f.fade > 0);
    // волны
    if (G.mode === 'play' && p.wave < p.waves.length && !G.foes.some(f => !f.dead)) {
      p.spawnT -= dt;
      if (p.spawnT <= 0) { for (const k of p.waves[p.wave]) spawn(k); p.wave++; p.spawnT = 1.2; }
    }
    // переход в следующую панель
    if (G.mode === 'play' && panelClear() && G.trans <= 0 && h.x > G.panel * PW + PW - 70 && !h.dead) {
      if (G.panel < G.panels.length - 1) { G.trans = 1; G.camTo = (G.panel + 1) * PW; G.panel++; enterPanel(G.panel); h.x = G.panel * PW + 90; h.vx = 0; h.set('idle'); }
      else if (G.mode !== 'end') { G.mode = 'end'; G.modeT = 0; h.set('win'); }
    }
    if (G.mode === 'play' && G.panel === G.panels.length - 1 && panelClear() && G.panels[G.panel].waves.length && G.mode !== 'end') {
      G.endT = (G.endT || 0) + dt; if (G.endT > 1.6) { G.mode = 'end'; G.modeT = 0; h.mv = null; h.vx = 0; h.set('win'); }
    }
    if (G.trans > 0) G.trans = Math.max(0, G.trans - dt * 1.4);
    G.cam += (G.camTo - G.cam) * Math.min(1, dt * 7);
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    if (G.msgT > 0) G.msgT -= dt;
    // груша
    if (G.bag) { const b = G.bag; b.va += -b.ang * 18 * dt; b.va *= Math.pow(0.35, dt); b.ang += b.va * dt; b.ang = clamp(b.ang, -0.9, 0.9); }
    for (const e of G.fx) { e.t += dt; if (e.vx !== undefined) { e.x += e.vx * dt; e.y += e.vy * dt; if (e.k === 'ink' || e.k === 'dust') e.vy += 600 * dt; } }
    G.fx = G.fx.filter(e => e.t < e.d);
    for (const q of G.pops) q.t += dt;
    G.pops = G.pops.filter(q => q.t < 0.75);
    for (const k in PR) PR[k] = false;
  }

  // ---------- рисование ----------
  function drawFighter(f) {
    const [s, i] = f.cur(), at = A[f.def.atlas], fr = at && frame(f.def.atlas, s, i);
    const x = f.x - G.cam, y = f.y0();
    // тень
    cx.save(); cx.globalAlpha = 0.33 * f.fade * clamp(1 + f.y / 400, 0.3, 1); cx.fillStyle = '#000';
    cx.beginPath(); cx.ellipse(x, G.floor + 4, 70 * clamp(1 + f.y / 500, 0.4, 1), 13, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
    if (!fr) return;
    const k = at.scale;
    let a = f.fade;
    if (f.spawnT > 0) a *= 1 - f.spawnT / 0.7;
    if (f.inv > 0 && f.hero && Math.floor(f.inv * 20) % 2) a *= 0.45;
    cx.save(); cx.translate(x, y); cx.scale(f.dir * k, k); cx.globalAlpha = a;
    cx.drawImage(at.img, fr.x, fr.y, fr.w, fr.h, -fr.ax, -fr.ay, fr.w, fr.h);
    if (f.flash > 0) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a * f.flash * 0.55; cx.drawImage(at.img, fr.x, fr.y, fr.w, fr.h, -fr.ax, -fr.ay, fr.w, fr.h); }
    cx.restore();
    if (f.mv === 'special' && f.fi >= 1) {         // когти: три белые дуги
      cx.save(); cx.strokeStyle = 'rgba(255,255,255,0.9)'; cx.lineWidth = 7; cx.lineCap = 'round';
      const [rx, ry] = f.reach();
      for (let n = -1; n <= 1; n++) { cx.beginPath(); cx.arc(rx - G.cam - f.dir * 40, ry + n * 26, 60, f.dir > 0 ? -0.9 : Math.PI - 0.9, f.dir > 0 ? 0.6 : Math.PI + 0.6); cx.stroke(); }
      cx.restore();
    }
  }
  function drawBag() {
    const b = G.bag; if (!b || !A.bag) return;
    const sh = A.bag.sheets.bag, k = A.bag.scale, x = b.x - G.cam, topY = 70;
    const fi = Math.abs(b.va) > 2.5 ? (b.va * (b.ang >= 0 ? 1 : -1) > 0 ? 2 : 3) : Math.abs(b.va) > 0.6 ? 1 : 0;
    const fr = sh[Math.min(fi, sh.length - 1)];
    const len = G.floor - 140 - topY;
    cx.save(); cx.translate(x, topY); cx.rotate(-b.ang * 0.5);
    cx.strokeStyle = '#1a1a1a'; cx.lineWidth = 6; cx.setLineDash([10, 6]); cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, len - fr.h * k + 10); cx.stroke(); cx.setLineDash([]);
    cx.translate(0, len); cx.scale(k, k);
    cx.drawImage(A.bag.img, fr.x, fr.y, fr.w, fr.h, -fr.w / 2, -fr.h, fr.w, fr.h);
    cx.restore();
  }
  function panelRect(i) { return [i * PW - G.cam + 14, 14, PW - 28, H - 28]; }
  function drawPanel(i) {
    const p = G.panels[i]; if (!p) return;
    const [x, y, w, h] = panelRect(i);
    if (x > W || x + w < 0) return;
    cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
    const bg = BG[p.bg];
    if (bg) { const s = Math.max(w / bg.img.width, h / bg.img.height); cx.drawImage(bg.img, x + (w - bg.img.width * s) / 2, y + h - bg.img.height * s, bg.img.width * s, bg.img.height * s); }
    else { cx.fillStyle = '#3a2f55'; cx.fillRect(x, y, w, h); }
    cx.restore();
    cx.lineWidth = 9; cx.strokeStyle = '#0c0b0f'; cx.strokeRect(x, y, w, h);
  }
  function caption(text, x, y) {
    cx.save(); cx.font = `30px ${FONT}`; const tw = cx.measureText(text).width;
    cx.fillStyle = '#ffe14d'; cx.strokeStyle = '#111'; cx.lineWidth = 4;
    cx.fillRect(x, y, tw + 34, 50); cx.strokeRect(x, y, tw + 34, 50);
    cx.fillStyle = '#111'; cx.fillText(text, x + 17, y + 36); cx.restore();
  }
  function bar(x, y, w, h, v, col, label, right) {
    cx.save(); cx.fillStyle = '#111'; cx.fillRect(x - 4, y - 4, w + 8, h + 8);
    cx.fillStyle = '#5a1717'; cx.fillRect(x, y, w, h);
    cx.fillStyle = col; const vw = w * clamp(v, 0, 1); cx.fillRect(right ? x + w - vw : x, y, vw, h);
    cx.fillStyle = 'rgba(255,255,255,0.35)'; cx.fillRect(right ? x + w - vw : x, y, vw, h * 0.35);
    if (label) { cx.font = `24px ${FONT}`; cx.fillStyle = '#fff'; cx.strokeStyle = '#111'; cx.lineWidth = 5; cx.textAlign = right ? 'right' : 'left';
                 const lx = right ? x + w : x; cx.strokeText(label, lx, y - 10); cx.fillText(label, lx, y - 10); }
    cx.restore();
  }
  function hud() {
    const h = G.hero;
    bar(60, 62, 380, 22, h.hp / HERO.hp, h.hp / HERO.hp > 0.35 ? '#ffd23a' : '#ff4d3a', 'INK CAT');
    for (let k = 0; k < 3; k++) { const v = clamp(G.meter - k, 0, 1); cx.fillStyle = '#111'; cx.fillRect(58 + k * 128, 94, 124, 14); cx.fillStyle = v >= 1 ? '#4ef2ff' : '#2a8fa0'; cx.fillRect(60 + k * 128, 96, 120 * v, 10); }
    const foe = G.foes.filter(f => !f.dead).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    if (foe) bar(W - 440, 62, 380, 22, foe.hp / foe.def.hp, '#ff7a2e', foe.def.name, true);
    cx.save(); cx.font = `34px ${FONT}`; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.strokeStyle = '#111'; cx.lineWidth = 6;
    const sc = String(G.score).padStart(6, '0'); cx.strokeText(sc, W / 2, 86); cx.fillText(sc, W / 2, 86);
    if (G.combo >= 2) { cx.font = `${46 + Math.min(20, G.combo * 2)}px ${FONT}`; cx.fillStyle = '#ffe14d'; const t = `${G.combo} HITS!`; cx.strokeText(t, W / 2, 150); cx.fillText(t, W / 2, 150); }
    if (G.mode === 'play' && panelClear() && G.panel < G.panels.length - 1 && Math.floor(G.modeT * 2.5) % 2) {
      cx.font = `56px ${FONT}`; cx.fillStyle = '#ffe14d'; cx.strokeText('GO →', W - 160, 250); cx.fillText('GO →', W - 160, 250);
    }
    cx.restore();
    if (G.msgT > 0 && G.mode === 'play') { cx.save(); cx.globalAlpha = clamp(G.msgT, 0, 1); caption(G.msg, 40, 128); cx.restore(); }
  }
  function drawFx() {
    for (const e of G.fx) {
      const x = e.x - G.cam, a = 1 - e.t / e.d;
      cx.save(); cx.globalAlpha = Math.max(0, a);
      if (e.k === 'spark' || e.k === 'spark2') { cx.strokeStyle = e.k === 'spark' ? '#fff6b0' : '#bfefff'; cx.lineWidth = e.r; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x, e.y); cx.lineTo(x - e.vx * 0.035, e.y - e.vy * 0.035); cx.stroke(); }
      else if (e.k === 'ring') { cx.strokeStyle = '#fff'; cx.lineWidth = 6 * a; cx.beginPath(); cx.arc(x, e.y, e.r * (0.4 + e.t / e.d), 0, Math.PI * 2); cx.stroke(); }
      else if (e.k === 'ink') { cx.fillStyle = '#0d0b10'; cx.beginPath(); cx.arc(x, e.y, e.r * (0.6 + a * 0.4), 0, Math.PI * 2); cx.fill(); }
      else if (e.k === 'dust') { cx.fillStyle = '#e8e0d0'; cx.strokeStyle = '#222'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, e.y, e.r * (1.4 - a * 0.4), 0, Math.PI * 2); cx.fill(); cx.stroke(); }
      else if (e.k === 'num') { cx.font = `40px ${FONT}`; cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.strokeStyle = '#111'; cx.lineWidth = 6; cx.strokeText(e.n, x, e.y); cx.fillText(e.n, x, e.y); }
      cx.restore();
    }
    if (A.sfx) for (const q of G.pops) {
      const fr = A.sfx.sheets.sfx[q.i]; if (!fr) continue;
      const k = A.sfx.scale * (q.t < 0.1 ? 0.5 + q.t * 7 : 1.2 - Math.min(0.2, (q.t - 0.1) * 0.4));
      cx.save(); cx.translate(q.x - G.cam, q.y); cx.rotate(q.rot); cx.scale(k, k); cx.globalAlpha = q.t > 0.55 ? 1 - (q.t - 0.55) / 0.2 : 1;
      cx.drawImage(A.sfx.img, fr.x, fr.y, fr.w, fr.h, -fr.w / 2, -fr.h / 2, fr.w, fr.h); cx.restore();
    }
  }
  function page() {           // бумага страницы с точками растра
    cx.fillStyle = '#f3ecdc'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < H; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) { cx.beginPath(); cx.arc(x, y, 1.6, 0, 6.3); cx.fill(); }
  }
  function controls() {
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
    const s = inset(), m = Math.min(1.05, Math.max(0.75, SH / 430));
    cx.save(); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // джойстик
    const jx = stick ? stick.x0 : s.l + 105 * m, jy = stick ? stick.y0 : s.b - 105 * m;
    cx.globalAlpha = 0.55; cx.fillStyle = '#111'; cx.beginPath(); cx.arc(jx, jy, 70 * m, 0, 6.3); cx.fill();
    cx.globalAlpha = 0.9; cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke();
    cx.fillStyle = '#ffe14d'; cx.beginPath(); cx.arc(jx + (stick ? stick.dx : 0) * m * 0.6, jy + (stick ? stick.dy : 0) * m * 0.6, 30 * m, 0, 6.3); cx.fill(); cx.strokeStyle = '#111'; cx.stroke();
    for (const b of BTN) {
      const bx = s.r + b.dx * m, by = s.b + b.dy * m, on = K[b.k], ready = b.k !== 'S' || G.meter >= 1;
      cx.globalAlpha = ready ? 0.85 : 0.35; cx.fillStyle = on ? '#ffe14d' : b.k === 'S' && ready ? '#4ef2ff' : '#fffdf5';
      cx.beginPath(); cx.arc(bx, by, b.r * m, 0, 6.3); cx.fill(); cx.lineWidth = 4; cx.strokeStyle = '#111'; cx.stroke();
      cx.fillStyle = '#111'; cx.font = `${Math.round(19 * m)}px ${FONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(b.label, bx, by + 1);
    }
    cx.restore();
  }
  function screen(title, sub, lines) {
    cx.save(); cx.fillStyle = 'rgba(12,10,16,0.72)'; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center'; cx.font = `110px ${FONT}`; cx.fillStyle = '#ffe14d'; cx.strokeStyle = '#111'; cx.lineWidth = 12;
    cx.strokeText(title, W / 2, 250); cx.fillText(title, W / 2, 250);
    cx.font = `40px ${FONT}`; cx.fillStyle = '#fff'; cx.lineWidth = 7; cx.strokeText(sub, W / 2, 320); cx.fillText(sub, W / 2, 320);
    cx.font = '20px system-ui, sans-serif'; cx.fillStyle = '#ddd';
    (lines || []).forEach((l, k) => cx.fillText(l, W / 2, 400 + k * 30));
    cx.restore();
  }
  function render() {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.fillStyle = '#121014'; cx.fillRect(0, 0, SW, SH);
    const sh = G.shake > 0 ? G.shake * 26 : 0;
    cx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * (OX + rnd(-sh, sh)), DPR * (OY + rnd(-sh, sh)));
    page();
    if (!G.loaded) { screen('INK CAT', G.err || 'LOADING...', []); return; }
    for (let i = Math.max(0, G.panel - 1); i <= Math.min(G.panels.length - 1, G.panel + 1); i++) drawPanel(i);
    const [px, py, pw, ph] = panelRect(G.panel);
    cx.save(); cx.beginPath(); cx.rect(Math.max(0, px - PW), py, pw + PW * 2, ph); cx.clip();
    drawBag();
    const all = [...G.foes, G.hero].filter(Boolean).sort((a, b) => (a.hero ? 1 : 0) - (b.hero ? 1 : 0));
    for (const f of all) drawFighter(f);
    drawFx();
    cx.restore();
    if (G.mode !== 'title') hud();
    if (G.mode === 'title') screen('INK CAT', 'TAP TO START', ['Телефон: слева — джойстик (вниз — присед, вверх + PUNCH — апперкот), справа — PUNCH, KICK, JUMP, BLOCK, SUPER.',
      'Клавиатура: ← → ходить, ↓ присед, Space — прыжок, J — рука, K — нога, L — блок, I — супер, ↑+J — апперкот, ↓+K — подсечка.',
      'Серии: рука ×3, нога ×2, в прыжке — рука или нога. SUPER копится от ударов.']);
    else if (G.mode === 'over') screen('K.O.!', G.modeT > 1 ? 'TAP TO CONTINUE' : '', []);
    else if (G.mode === 'end') screen('TO BE CONTINUED...', G.modeT > 1.5 ? 'SCORE ' + G.score + ' — TAP TO PLAY AGAIN' : '', []);
    controls();
  }

  // ---------- цикл ----------
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= DT) { update(DT); acc -= DT; }
    render();
    requestAnimationFrame(loop);
  }
  G.panels = [];
  load().then(() => { G.loaded = true; G.panels = stages(); G.hero = new Fighter(HERO, 360, 1, true); enterPanel(0); })
        .catch(e => { G.err = 'LOAD ERROR: ' + e; console.error(e); });
  requestAnimationFrame(loop);
  window.INKCAT = G;            // для проверок
})();
