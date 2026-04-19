/* ══════════════════════════════════════════════════════════════════════════════
   NutriPulse — Premium Particle System v3
   ─────────────────────────────────────────────────────────────────────────────
   Features:
     • 3-layer parallax depth (background / mid / foreground)
     • Perlin-noise-based organic motion
     • Mouse repulsion with smooth easing
     • Sparkle + flash particles
     • Gradient-filled particles with soft glow
     • Subtle comet trails on foreground particles
     • Adaptive density & pause-on-hidden
   ══════════════════════════════════════════════════════════════════════════════ */

"use strict";

const NutriParticles = (() => {

  // ── CONFIG ────────────────────────────────────────────────────────────────
  const CFG = {
    baseDensity  : 180,        // particles at 1920×1080
    speedScale   : 1.0,        // global speed multiplier
    sparkle      : 1.0,        // sparkle intensity 0–2
    mouseRadius  : 160,        // px — interaction radius
    mouseForce   : 0.8,        // repulsion strength
    trailAlpha   : 0.12,       // trail opacity (foreground only)
    trailLength  : 6,          // how many trail dots
    flashChance  : 0.04,       // % of particles that flash
    layers: [
      { name: "bg",  sizeMin: 0.8, sizeMax: 1.8, speedMul: 0.3, alphaMul: 0.35, pct: 0.45 },
      { name: "mid", sizeMin: 1.4, sizeMax: 2.6, speedMul: 0.65, alphaMul: 0.6,  pct: 0.35 },
      { name: "fg",  sizeMin: 2.2, sizeMax: 3.8, speedMul: 1.0,  alphaMul: 1.0,  pct: 0.20 },
    ],
    palette: [
      { r: 0,   g: 212, b: 255 },   // neon cyan-blue   #00d4ff
      { r: 61,  g: 255, b: 216 },   // teal-cyan         #3dffd8
      { r: 140, g: 180, b: 255 },   // soft lavender-blue
      { r: 220, g: 235, b: 255 },   // cool white
      { r: 255, g: 255, b: 255 },   // pure white
      { r: 217, g: 4,   b: 41  },   // dark red accent   (rare)
      { r: 255, g: 100, b: 140 },   // soft pink accent   (rare)
    ],
    // weight distribution — first 5 are common, last 2 are rare accent
    paletteWeights: [25, 22, 20, 18, 10, 3, 2],
  };

  // ── PERLIN NOISE (simplified 2-D) ────────────────────────────────────────
  const _perm = new Uint8Array(512);
  const _grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  (function seedPerlin() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
  })();

  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _lerp(a, b, t) { return a + t * (b - a); }
  function _dot(gi, x, y) { const g = _grad[gi % 8]; return g[0] * x + g[1] * y; }

  function noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = _fade(xf), v = _fade(yf);
    const aa = _perm[_perm[X] + Y], ab = _perm[_perm[X] + Y + 1];
    const ba = _perm[_perm[X + 1] + Y], bb = _perm[_perm[X + 1] + Y + 1];
    return _lerp(
      _lerp(_dot(aa, xf, yf),     _dot(ba, xf - 1, yf), u),
      _lerp(_dot(ab, xf, yf - 1), _dot(bb, xf - 1, yf - 1), u),
      v
    );
  }

  // ── WEIGHTED RANDOM COLOR ────────────────────────────────────────────────
  let _cumWeights = null;
  function pickColor() {
    if (!_cumWeights) {
      _cumWeights = [];
      let sum = 0;
      CFG.paletteWeights.forEach(w => { sum += w; _cumWeights.push(sum); });
    }
    const total = _cumWeights[_cumWeights.length - 1];
    const r = Math.random() * total;
    for (let i = 0; i < _cumWeights.length; i++) {
      if (r < _cumWeights[i]) return CFG.palette[i];
    }
    return CFG.palette[0];
  }

  // ── STATE ────────────────────────────────────────────────────────────────
  let canvas, ctx;
  let W = 0, H = 0;
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let running = true;
  let frameId = null;
  let time = 0;

  // ── PARTICLE FACTORY ─────────────────────────────────────────────────────
  function createParticle(layer) {
    const col = pickColor();
    const isFlash = Math.random() < CFG.flashChance;
    const size = layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin);
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size,
      baseSize: size,
      // noise offset so each particle has unique organic motion
      noiseOffX: Math.random() * 1000,
      noiseOffY: Math.random() * 1000,
      // base velocity (very small drift)
      vx: (Math.random() - 0.5) * 0.4 * layer.speedMul * CFG.speedScale,
      vy: (Math.random() - 0.5) * 0.4 * layer.speedMul * CFG.speedScale,
      speedMul: layer.speedMul,
      // colour
      r: col.r, g: col.g, b: col.b,
      // alpha / sparkle
      alpha: 0.3 + Math.random() * 0.5,
      baseAlpha: layer.alphaMul,
      sparklePhase: Math.random() * Math.PI * 2,
      sparkleSpeed: (0.8 + Math.random() * 1.5) * CFG.sparkle,
      // scale pulse
      scalePhase: Math.random() * Math.PI * 2,
      scaleSpeed: 0.5 + Math.random() * 1.0,
      // flash
      isFlash,
      flashTimer: isFlash ? Math.random() * 300 : 0,
      flashCooldown: 120 + Math.random() * 300,
      flashBright: 0,
      // trail (foreground only)
      hasTrail: layer.name === "fg" && Math.random() < 0.5,
      trail: [],
      // layer ref
      layer,
    };
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    resize();

    window.addEventListener("resize", () => { resize(); rebuildParticles(); });
    window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener("mouseout", () => { mouse.x = -9999; mouse.y = -9999; });
    // Touch support
    window.addEventListener("touchmove", e => {
      if (e.touches.length) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    }, { passive: true });
    window.addEventListener("touchend", () => { mouse.x = -9999; mouse.y = -9999; });

    // Pause when tab hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { running = false; }
      else { running = true; loop(); }
    });

    rebuildParticles();
    loop();
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function adaptiveDensity() {
    const area = W * H;
    const ref = 1920 * 1080;
    // Scale density with screen area, clamp between 80–400
    const raw = Math.round(CFG.baseDensity * (area / ref));
    // Detect low-end: rough heuristic — mobile or low devicePixelRatio
    const lowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const clamped = Math.max(80, Math.min(lowEnd ? 120 : 400, raw));
    return clamped;
  }

  function rebuildParticles() {
    const count = adaptiveDensity();
    particles = [];
    CFG.layers.forEach(layer => {
      const n = Math.round(count * layer.pct);
      for (let i = 0; i < n; i++) particles.push(createParticle(layer));
    });
  }

  // ── DRAW LOOP ─────────────────────────────────────────────────────────────
  function loop() {
    if (!running) return;
    frameId = requestAnimationFrame(loop);
    time += 0.016; // ~60fps tick
    update();
    draw();
  }

  function update() {
    const noiseScale = 0.0008;
    const noiseTimeMul = 0.15;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // ── Perlin noise-driven motion ──────────────────────────────────────
      const nx = noise2D(
        (p.x + p.noiseOffX) * noiseScale,
        time * noiseTimeMul + p.noiseOffY * 0.1
      );
      const ny = noise2D(
        (p.y + p.noiseOffY) * noiseScale + 100,
        time * noiseTimeMul + p.noiseOffX * 0.1
      );

      p.vx += nx * 0.06 * p.speedMul * CFG.speedScale;
      p.vy += ny * 0.06 * p.speedMul * CFG.speedScale;

      // Damping to keep velocity in check
      p.vx *= 0.96;
      p.vy *= 0.96;

      p.x += p.vx;
      p.y += p.vy;

      // ── Mouse repulsion ────────────────────────────────────────────────
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.mouseRadius && dist > 0) {
        const force = (1 - dist / CFG.mouseRadius) * CFG.mouseForce * p.speedMul;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // ── Wrap edges ─────────────────────────────────────────────────────
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      // ── Sparkle (opacity pulse) ────────────────────────────────────────
      p.sparklePhase += p.sparkleSpeed * 0.016;
      const sparkle = 0.5 + 0.5 * Math.sin(p.sparklePhase);
      p.alpha = (0.3 + sparkle * 0.7) * p.baseAlpha;

      // ── Scale pulse ────────────────────────────────────────────────────
      p.scalePhase += p.scaleSpeed * 0.016;
      p.size = p.baseSize * (1 + 0.2 * Math.sin(p.scalePhase));

      // ── Flash ──────────────────────────────────────────────────────────
      if (p.isFlash) {
        p.flashTimer -= 1;
        if (p.flashTimer <= 0) {
          p.flashBright = 1.0;
          p.flashTimer = p.flashCooldown + Math.random() * 200;
        }
        if (p.flashBright > 0) p.flashBright *= 0.88; // quick decay
      }

      // ── Trail ──────────────────────────────────────────────────────────
      if (p.hasTrail) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > CFG.trailLength) p.trail.shift();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // ── Draw trail ────────────────────────────────────────────────────
      if (p.hasTrail && p.trail.length > 1) {
        for (let t = 0; t < p.trail.length - 1; t++) {
          const frac = t / p.trail.length;
          const a = frac * CFG.trailAlpha * p.alpha;
          const s = p.size * frac * 0.5;
          ctx.beginPath();
          ctx.arc(p.trail[t].x, p.trail[t].y, s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`;
          ctx.fill();
        }
      }

      // ── Glow layer (soft bloom) ────────────────────────────────────────
      const glowAlpha = p.alpha * 0.25 + p.flashBright * 0.5;
      const glowSize = p.size * 3.5;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${glowAlpha})`);
      grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // ── Core dot ──────────────────────────────────────────────────────
      const coreAlpha = Math.min(1, p.alpha + p.flashBright);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${coreAlpha})`;
      ctx.fill();

      // ── Sparkle cross on flash ────────────────────────────────────────
      if (p.flashBright > 0.15) {
        const arm = p.size * 4 * p.flashBright;
        ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${p.flashBright * 0.7})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x - arm, p.y);
        ctx.lineTo(p.x + arm, p.y);
        ctx.moveTo(p.x, p.y - arm);
        ctx.lineTo(p.x, p.y + arm);
        ctx.stroke();
      }
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────
  return {
    init,
    setDensity(d) { CFG.baseDensity = d; rebuildParticles(); },
    setSpeed(s) { CFG.speedScale = s; },
    setSparkle(s) { CFG.sparkle = s; },
    getConfig() { return { ...CFG }; },
  };

})();
