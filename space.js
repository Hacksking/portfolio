/*
 * space.js
 * Optimized HTML5 canvas space animation:
 * - Twinkling stars
 * - Central black hole
 * - Big Bang explosion with subtle hero text shake
 * - Meteors with trails (fixed and optimized)
 * - Random lightning streaks
 *
 * Usage: include <script src="hub/space.js"></script> after the canvas element in your HTML.
 * The canvas must have id="space" (this file will create one if not present).
 * If you have a hero text element, give it id="hero" to receive the subtle shake on the big bang.
 */
(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    maxStars: 250,
    maxMeteors: 6,
    meteorSpawnInterval: 800, // ms average between spawns
    maxMeteorTrail: 8,
    maxParticles: 180, // for big bang
    lightningChancePerSecond: 0.6,
    starTwinkleSpeed: 0.0025, // affects twinkle frequency
    bgColor: '#000010',
    useDevicePixelRatio: true,
    // timeScale < 1 slows animation, >1 speeds up. Default 0.75 for a slightly slower feel.
    timeScale: 0.75,
  };

  // Utility helpers
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }
  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // Create or find canvas
  const canvasId = 'space';
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    // append to body if not present; user can place manually in HTML for layout control
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');

  // High-DPI support
  let DPR = CONFIG.useDevicePixelRatio ? Math.max(1, window.devicePixelRatio || 1) : 1;

  // Resize handling
  let width = 0, height = 0, cx = 0, cy = 0;
  function resize() {
    DPR = CONFIG.useDevicePixelRatio ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const rect = canvas.getBoundingClientRect();
    // If canvas not styled, fallback to window size
    const cssW = rect.width || window.innerWidth;
    const cssH = rect.height || window.innerHeight;
    width = Math.max(1, Math.floor(cssW));
    height = Math.max(1, Math.floor(cssH));
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = width / 2;
    cy = height / 2;
    // precompute gradients that depend on size
    blackHoleGradient = createBlackHoleGradient();
  }

  window.addEventListener('resize', resize, { passive: true });

  // Visibility handling to avoid background CPU work
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) {
      lastTime = performance.now();
      rAF = requestAnimationFrame(loop);
    }
  });

  // Star system
  const stars = [];
  function initStars() {
    stars.length = 0;
    for (let i = 0; i < CONFIG.maxStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.4 + 0.2,
        baseAlpha: Math.random() * 0.8 + 0.2,
        twinklePhase: Math.random() * Math.PI * 2,
        // store a base twinkle speed; drawing will apply global timeScale
        twinkleSpeed: (Math.random() * 0.8 + 0.2) * CONFIG.starTwinkleSpeed,
      });
    }
  }

  // Black hole
  let blackHoleGradient = null;
  function createBlackHoleGradient() {
    const r = Math.min(width, height) * 0.12;
    const g = ctx.createRadialGradient(cx, cy, r * 0.06, cx, cy, r);
    g.addColorStop(0, 'rgba(20,20,40,0.9)');
    g.addColorStop(0.5, 'rgba(10,10,30,0.95)');
    g.addColorStop(0.9, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0.0)');
    return g;
  }

  // Big Bang explosion particles (pool)
  const particles = [];
  let bigBangTime = -Infinity;
  function triggerBigBang() {
    bigBangTime = performance.now();
    particles.length = 0;
    const count = Math.min(CONFIG.maxParticles, 140);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(80, 480);
      particles.push({
        x: cx,
        y: cy,
        // apply global timeScale so explosion is slower if desired
        vx: Math.cos(angle) * speed * CONFIG.timeScale,
        vy: Math.sin(angle) * speed * CONFIG.timeScale,
        life: rand(700, 1400),
        age: 0,
        size: Math.random() * 2.5 + 0.6,
        color: `hsl(${randInt(20,60)},100%,${randInt(50,70)}%)`,
      });
    }
    pulseHero();
  }

  // Hero text shake
  const heroEl = document.getElementById('hero');
  let heroShakeUntil = 0;
  function pulseHero() {
    if (!heroEl) return;
    heroShakeUntil = performance.now() + 900; // shake for 900ms
    heroEl.style.willChange = 'transform';
  }

  // Meteor system (pooled)
  const meteors = [];
  const meteorPool = [];
  function createMeteor() {
    if (meteors.length >= CONFIG.maxMeteors) return;
    let m = meteorPool.pop();
    if (!m) {
      m = {
        x: 0, y: 0, vx: 0, vy: 0, life: 0, age: 0, trail: [], size: 2, hue: 40,
      };
    }
    // spawn from above or sides
    const side = Math.random();
    if (side < 0.6) {
      m.x = rand(-width * 0.2, width * 1.2);
      m.y = -20; // drop from top
      const angle = rand(Math.PI * 0.15, Math.PI * 0.35);
      const dir = Math.random() < 0.5 ? 1 : -1;
      // slower initial velocities when timeScale < 1
      m.vx = Math.cos(angle) * 900 * dir * CONFIG.timeScale;
      m.vy = Math.sin(angle) * 900 * CONFIG.timeScale;
    } else {
      // side spawn
      const topOrBottom = Math.random() < 0.5;
      if (topOrBottom) {
        m.x = -30; m.y = rand(0, height);
        m.vx = rand(600, 1100) * CONFIG.timeScale; m.vy = rand(-200, 200) * CONFIG.timeScale;
      } else {
        m.x = width + 30; m.y = rand(0, height);
        m.vx = -rand(600, 1100) * CONFIG.timeScale; m.vy = rand(-200, 200) * CONFIG.timeScale;
      }
    }
    m.life = rand(900, 2200);
    m.age = 0;
    m.size = rand(1, 2.6);
    m.hue = randInt(20, 45);
    // clear and prime trail with current position
    m.trail.length = 0;
    m.trail.push({x: m.x, y: m.y});
    meteors.push(m);
  }

  // Lightning shots
  const lightnings = [];
  function spawnLightning() {
    const startX = rand(0, width);
    const startY = rand(0, height * 0.2);
    const endY = rand(height * 0.2, height * 0.8);
    const segments = randInt(4, 8);
    const points = [{x: startX, y: startY}];
    let lastX = startX;
    let lastY = startY;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = lastX + rand(-80, 80);
      const py = lastY + (endY - startY) / segments + rand(-20, 40);
      points.push({x: px, y: py});
      lastX = px; lastY = py;
    }
    lightnings.push({points, age: 0, life: rand(120, 260), alpha: 1});
    if (lightnings.length > 6) lightnings.shift();
  }

  // Timing & loop
  let lastTime = performance.now();
  let rAF = 0;

  // Spawn timers
  let lastMeteorSpawn = 0;

  // initialize everything
  function init() {
    resize();
    initStars();
    // seed a few meteors
    for (let i = 0; i < 2; i++) createMeteor();
    // trigger initial big bang
    setTimeout(triggerBigBang, 800);
    // animation start
    lastTime = performance.now();
    rAF = requestAnimationFrame(loop);
  }

  // Draw functions
  function drawBackground() {
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  function drawStars(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0, L = stars.length; i < L; i++) {
      const s = stars[i];
      // twinkle alpha with sine
      // apply global timeScale to twinkle speed for a slower/faster twinkle
      const a = s.baseAlpha + Math.sin(t * s.twinkleSpeed * CONFIG.timeScale + s.twinklePhase) * 0.35;
      ctx.globalAlpha = clamp(a, 0.05, 1);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBlackHole() {
    ctx.save();
    ctx.translate(cx, cy);
    // small rotating accretion effect
    const r = Math.min(width, height) * 0.12;
    ctx.globalCompositeOperation = 'source-over';
    // glow
    ctx.fillStyle = blackHoleGradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // event horizon
    ctx.globalCompositeOperation = 'xor';
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles(dt) {
    if (!particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      // simple Euler integrator
  // scale physics by global timeScale for slower/faster motion
  p.vy += 600 * (dt / 1000) * 0.45 * CONFIG.timeScale; // gravity-ish
  p.x += p.vx * (dt / 1000) * CONFIG.timeScale;
  p.y += p.vy * (dt / 1000) * CONFIG.timeScale;
      const alpha = 1 - t;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t) + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMeteors(dt) {
    if (!meteors.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.age += dt;
      // integrate
  // apply gravity and integrate scaled by timeScale
  m.vy += 300 * (dt / 1000) * CONFIG.timeScale; // some gravity pull
  m.x += m.vx * (dt / 1000) * CONFIG.timeScale;
  m.y += m.vy * (dt / 1000) * CONFIG.timeScale;
      // push trail point occasionally (throttle pushes for performance)
      const last = m.trail[m.trail.length - 1];
      const dx = m.x - last.x;
      const dy = m.y - last.y;
      if (dx * dx + dy * dy > 16) {
        m.trail.push({x: m.x, y: m.y});
        if (m.trail.length > CONFIG.maxMeteorTrail) m.trail.shift();
      } else {
        // update last to current to smooth minor movement
        last.x = m.x; last.y = m.y;
      }

      // draw trail as multiple segments fading out
      for (let j = 0; j < m.trail.length - 1; j++) {
        const p0 = m.trail[j];
        const p1 = m.trail[j + 1];
        const alpha = (j / m.trail.length) * 0.65;
        const grd = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
        grd.addColorStop(0, `rgba(${200},${120},${40},${alpha})`);
        grd.addColorStop(1, 'rgba(255,255,255,0.01)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1 + (m.size * (1 - j / m.trail.length) * 1.8);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // head glow
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,${randInt(200,255)},${randInt(160,230)},0.95)`;
      ctx.arc(m.x, m.y, m.size * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // remove when off-screen or life over
      if (m.age > m.life || m.x < -200 || m.x > width + 200 || m.y > height + 200) {
        meteors.splice(i, 1);
        meteorPool.push(m);
      }
    }
    ctx.restore();
  }

  function drawLightning(dt) {
    if (!lightnings.length) return;
    ctx.save();
    ctx.lineWidth = 2.2;
    for (let i = lightnings.length - 1; i >= 0; i--) {
      const L = lightnings[i];
      L.age += dt;
      const alpha = clamp(1 - L.age / L.life, 0, 1);
      ctx.strokeStyle = `rgba(200,230,255,${alpha})`;
      ctx.beginPath();
      const pts = L.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
      ctx.stroke();
      // faint glow
      ctx.strokeStyle = `rgba(180,210,255,${alpha * 0.25})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
      ctx.stroke();

      if (L.age > L.life) lightnings.splice(i, 1);
    }
    ctx.restore();
  }

  // Main loop
  function loop(now) {
    if (!running) return;
    rAF = requestAnimationFrame(loop);
    const dt = now - lastTime;
    // clamp dt to avoid jump when tab hidden or system sleep
    const clampedDt = Math.min(dt, 48);
    lastTime = now;

    // timers for meteor spawn
    if (now - lastMeteorSpawn > rand(200, CONFIG.meteorSpawnInterval)) {
      createMeteor();
      lastMeteorSpawn = now;
    }

    // lightning spawn probabilistic
    if (Math.random() < CONFIG.lightningChancePerSecond * (clampedDt / 1000)) {
      spawnLightning();
    }

    // update hero shake
    if (heroEl) {
      if (now < heroShakeUntil) {
        const mag = (heroShakeUntil - now) / 300; // decay
        const tx = rand(-3, 3) * mag;
        const ty = rand(-2, 2) * mag;
        heroEl.style.transform = `translate(${tx}px, ${ty}px)`;
      } else {
        heroEl.style.transform = '';
      }
    }

    // paint
    drawBackground();
    drawStars(now);
    drawBlackHole();
    drawParticles(clampedDt);
    drawMeteors(clampedDt);
    drawLightning(clampedDt);

    // Big bang lifetime management: if there is a very recent big bang, spawn some trails with each frame
    if (now - bigBangTime < 1200) {
      // occasional small flare particles to extend the effect
      if (Math.random() < 0.2) {
        particles.push({
          x: cx + rand(-20, 20), y: cy + rand(-20, 20),
          vx: rand(-160, 160) * CONFIG.timeScale, vy: rand(-180, 180) * CONFIG.timeScale,
          life: rand(200, 900), age: 0, size: rand(0.6, 1.6),
          color: `hsl(${randInt(20,50)}, 100%, ${randInt(60,80)}%)`,
        });
        if (particles.length > CONFIG.maxParticles) particles.shift();
      }
    }
  }

  // Hook to allow manual trigger for big bang
  window.spaceTriggerBigBang = triggerBigBang;

  // Start
  init();

  // Mark todos done
  // (We update the todo list programmatically at the end of edits in the agent; human sees this file added.)
})();
