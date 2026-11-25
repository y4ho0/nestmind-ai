/**
 * NestMind 4.0 — Progressive Psychological Horror & Surveillance Canvas Engine
 * Exposes window.NestFX managing #fx-canvas (full-viewport overlay) and #cctv-canvas (.cctv-frame overlay).
 */
(function () {
  'use strict';

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Deterministic PRNG for organic corner vein topology & stable particle seeds
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CLIMAX_DURATION_MS = 1620;
  const reducedMotionQuery =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

  const state = {
    progress: 0,
    lastProgress: 0,
    act: 1,
    velocity: 0,
    measuredSpike: 0,
    pointerX: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 720,
    pointerY: typeof window !== 'undefined' ? window.innerHeight * 0.5 : 450,
    targetPointerX: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 720,
    targetPointerY: typeof window !== 'undefined' ? window.innerHeight * 0.5 : 450,
    climaxActive: false,
    climaxStartMs: 0,
    aftermathActive: false,
    pageHidden: false,
    cctvIntersecting: false,
    rafId: 0,
    lastFrameMs: 0,
    lastMicroGlitchMs: 0,
    fxCleared: false,
  };

  let fxCanvas = null;
  let fxCtx = null;
  let fxW = 0;
  let fxH = 0;
  let fxDpr = 1;

  let cctvCanvas = null;
  let cctvCtx = null;
  let cctvW = 0;
  let cctvH = 0;
  let cctvDpr = 1;
  let cctvObserver = null;

  // Pre-baked offscreen noise tile for fast 60fps grain & static blitting
  let noiseTile = null;
  let irNoiseTile = null;

  // Pre-generated organic corner vein trees & floating dust/ash motes & aftermath drips
  let veinTrees = [];
  let dustMotes = [];
  let bloodDrips = [];

  function deriveAct(p, explicitAct) {
    if (explicitAct >= 1 && explicitAct <= 5) return explicitAct | 0;
    if (p < 0.22) return 1;
    if (p < 0.44) return 2;
    if (p < 0.68) return 3;
    if (p < 0.88) return 4;
    return 5;
  }

  function buildNoiseTiles() {
    if (typeof document === 'undefined' || noiseTile) return;

    const size = 160;
    noiseTile = document.createElement('canvas');
    noiseTile.width = size;
    noiseTile.height = size;
    const nCtx = noiseTile.getContext('2d');
    const img = nCtx.createImageData(size, size);
    const data = img.data;
    const rand = mulberry32(0x9e3779b9);

    for (let i = 0; i < data.length; i += 4) {
      const v = (rand() * 255) | 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = (v * 0.96) | 0;
      data[i + 3] = rand() > 0.45 ? 190 : 75;
    }
    nCtx.putImageData(img, 0, 0);

    irNoiseTile = document.createElement('canvas');
    irNoiseTile.width = size;
    irNoiseTile.height = size;
    const irCtx = irNoiseTile.getContext('2d');
    const irImg = irCtx.createImageData(size, size);
    const irData = irImg.data;
    for (let i = 0; i < irData.length; i += 4) {
      const v = (rand() * 255) | 0;
      irData[i] = (v * 0.72) | 0;
      irData[i + 1] = v;
      irData[i + 2] = (v * 0.78) | 0;
      irData[i + 3] = rand() > 0.5 ? 165 : 55;
    }
    irCtx.putImageData(irImg, 0, 0);
  }

  function buildOrganicGeometry() {
    if (veinTrees.length > 0) return;
    const rand = mulberry32(0x4e657374);

    // 4 screen corners in normalized [0..1] coordinates with inward target vectors
    const corners = [
      { ox: 0, oy: 0, dx: 1, dy: 1 },
      { ox: 1, oy: 0, dx: -1, dy: 1 },
      { ox: 0, oy: 1, dx: 1, dy: -1 },
      { ox: 1, oy: 1, dx: -1, dy: -1 },
    ];

    corners.forEach((c) => {
      const trunkCount = 5;
      for (let t = 0; t < trunkCount; t++) {
        const spread = (t / (trunkCount - 1) - 0.5) * 1.22;
        const baseAngle = Math.atan2(c.dy, c.dx) + spread;
        const segments = 14;
        const maxReach = 0.28 + rand() * 0.23;
        const stepLen = maxReach / segments;

        const pts = [{ x: c.ox, y: c.oy }];
        let curX = c.ox;
        let curY = c.oy;
        let curAngle = baseAngle;

        for (let s = 1; s <= segments; s++) {
          curAngle += (rand() - 0.5) * 0.52;
          curX += Math.cos(curAngle) * stepLen;
          curY += Math.sin(curAngle) * stepLen;
          pts.push({ x: curX, y: curY });

          // Secondary capillary offshoots
          if (s >= 3 && s <= 11 && rand() > 0.46) {
            const subPts = [{ x: curX, y: curY }];
            let sx = curX;
            let sy = curY;
            let sAngle = curAngle + (rand() > 0.5 ? 1 : -1) * (0.42 + rand() * 0.48);
            const subSegs = 5 + ((rand() * 4) | 0);
            for (let k = 1; k <= subSegs; k++) {
              sAngle += (rand() - 0.5) * 0.48;
              sx += Math.cos(sAngle) * stepLen * 0.62;
              sy += Math.sin(sAngle) * stepLen * 0.62;
              subPts.push({ x: sx, y: sy });
            }
            veinTrees.push({
              pts: subPts,
              startThreshold: (s / segments) * 0.58,
              baseWidth: 1.4 + rand() * 1.3,
              phase: rand() * Math.PI * 2,
              isCapillary: true,
            });
          }
        }

        veinTrees.push({
          pts,
          startThreshold: rand() * 0.12,
          baseWidth: 3.4 + rand() * 3.1,
          phase: rand() * Math.PI * 2,
          isCapillary: false,
        });
      }
    });

    // Floating dust / ash motes for Acts 4–5 pointer flashlight illumination
    for (let i = 0; i < 54; i++) {
      dustMotes.push({
        x: rand(),
        y: rand(),
        vx: (rand() - 0.5) * 0.00018,
        vy: -0.00012 - rand() * 0.00026,
        r: 0.9 + rand() * 2.2,
        alpha: 0.25 + rand() * 0.65,
        twinklePhase: rand() * Math.PI * 2,
        twinkleSpeed: 0.0015 + rand() * 0.003,
      });
    }

    // Viscous top-edge blood-dark drips for post-climax aftermath
    for (let i = 0; i < 22; i++) {
      bloodDrips.push({
        x: 0.02 + (i / 21) * 0.96 + (rand() - 0.5) * 0.03,
        maxLen: 0.05 + rand() * 0.19,
        width: 3 + rand() * 8,
        speed: 0.00018 + rand() * 0.00032,
        delayMs: rand() * 900,
      });
    }
  }

  function ensureCanvases() {
    if (typeof document === 'undefined') return;

    if (!fxCanvas || !fxCanvas.isConnected) {
      fxCanvas = document.getElementById('fx-canvas');
      if (fxCanvas) {
        fxCanvas.style.pointerEvents = 'none';
        fxCtx = fxCanvas.getContext('2d', { alpha: true });
        resizeFxCanvas();
      }
    }

    if (!cctvCanvas || !cctvCanvas.isConnected) {
      cctvCanvas = document.getElementById('cctv-canvas');
      if (cctvCanvas) {
        cctvCanvas.style.pointerEvents = 'none';
        cctvCtx = cctvCanvas.getContext('2d', { alpha: true });
        resizeCctvCanvas();
        observeCctv();
      }
    }
  }

  function observeCctv() {
    if (!cctvCanvas || typeof IntersectionObserver === 'undefined') return;
    if (cctvObserver) cctvObserver.disconnect();
    const target = cctvCanvas.closest('.cctv-frame') || cctvCanvas;
    cctvObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          state.cctvIntersecting = entry.isIntersecting;
        }
        if (state.cctvIntersecting) scheduleLoop();
      },
      { rootMargin: '180px 0px' }
    );
    cctvObserver.observe(target);
  }

  function resizeFxCanvas() {
    if (!fxCanvas || !fxCtx || typeof window === 'undefined') return;
    const w = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1440);
    const h = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 900);
    // Cap DPR at 1.5 on full-viewport FX overlay for locked 60fps on Retina screens
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === fxW && h === fxH && dpr === fxDpr) return;
    fxW = w;
    fxH = h;
    fxDpr = dpr;
    fxCanvas.width = Math.round(w * dpr);
    fxCanvas.height = Math.round(h * dpr);
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.fxCleared = false;
  }

  function resizeCctvCanvas() {
    if (!cctvCanvas || !cctvCtx || typeof window === 'undefined') return;
    const host = cctvCanvas.parentElement || cctvCanvas;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width) || 640);
    const h = Math.max(1, Math.round(rect.height) || 400);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (w === cctvW && h === cctvH && dpr === cctvDpr) return;
    cctvW = w;
    cctvH = h;
    cctvDpr = dpr;
    cctvCanvas.width = Math.round(w * dpr);
    cctvCanvas.height = Math.round(h * dpr);
    cctvCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function isCctvNeeded() {
    if (!cctvCanvas) return false;
    return state.cctvIntersecting || (state.progress >= 0.34 && state.progress <= 0.76);
  }

  function isFxNeeded() {
    return state.progress >= 0.22 || state.climaxActive || state.aftermathActive;
  }

  function scheduleLoop() {
    if (state.rafId || state.pageHidden || typeof window === 'undefined') return;
    if (!isFxNeeded() && !isCctvNeeded()) {
      ensureCanvases();
      if (fxCtx && !state.fxCleared) {
        fxCtx.clearRect(0, 0, fxW, fxH);
        state.fxCleared = true;
      }
      return;
    }
    state.rafId = window.requestAnimationFrame(tick);
  }

  function drawVignette(ctx, w, h, innerRatio, outerColor) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(cx, cy);
    const grad = ctx.createRadialGradient(cx, cy, maxR * innerRatio, cx, cy, maxR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawFilmGrain(ctx, w, h, alpha, tile) {
    if (!tile || alpha <= 0.002) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const ox = -((Math.random() * tile.width) | 0);
    const oy = -((Math.random() * tile.height) | 0);
    for (let y = oy; y < h; y += tile.height) {
      for (let x = ox; x < w; x += tile.width) {
        ctx.drawImage(tile, x, y);
      }
    }
    ctx.restore();
  }

  function drawVeins(ctx, w, h, reach, nowMs, crimsonBoost) {
    if (reach <= 0.005) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.0042);

    for (let i = 0; i < veinTrees.length; i++) {
      const v = veinTrees[i];
      if (reach <= v.startThreshold) continue;
      const localReach = clamp((reach - v.startThreshold) / (1 - v.startThreshold), 0, 1);
      const pts = v.pts;
      const totalSegs = pts.length - 1;
      const exactSeg = localReach * totalSegs;
      const fullSegs = Math.floor(exactSeg);
      const frac = exactSeg - fullSegs;
      if (fullSegs === 0 && frac < 0.05) continue;

      const swayAmp = (v.isCapillary ? 2.4 : 4.2) * reach;
      const sway = Math.sin(nowMs * 0.0024 + v.phase) * swayAmp;

      // Outer dark blood-black vessel
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (let s = 1; s <= fullSegs; s++) {
        const weight = s / totalSegs;
        ctx.lineTo(pts[s].x * w + sway * weight, pts[s].y * h + sway * 0.6 * weight);
      }
      if (fullSegs < totalSegs && frac > 0) {
        const p0 = pts[fullSegs];
        const p1 = pts[fullSegs + 1];
        const weight = (fullSegs + frac) / totalSegs;
        ctx.lineTo(
          lerp(p0.x, p1.x, frac) * w + sway * weight,
          lerp(p0.y, p1.y, frac) * h + sway * 0.6 * weight
        );
      }

      const alpha = clamp(0.32 + localReach * 0.56 + crimsonBoost * 0.2, 0, 0.94);
      const rCol = Math.round(lerp(18, 125, crimsonBoost * (0.45 + 0.55 * pulse)));
      ctx.strokeStyle = `rgba(${rCol}, 3, 7, ${alpha.toFixed(3)})`;
      ctx.lineWidth = v.baseWidth * (0.45 + 0.65 * localReach);
      ctx.stroke();

      // Arterial crimson inner core in Act 5 / Climax
      if (!v.isCapillary && crimsonBoost > 0.15) {
        ctx.strokeStyle = `rgba(210, 18, 32, ${(crimsonBoost * (0.28 + 0.32 * pulse)).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.9, v.baseWidth * 0.28);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawDustMotes(ctx, w, h, dtMs, nowMs, progress) {
    const intensity = clamp((progress - 0.66) / 0.22, 0, 1);
    if (intensity <= 0.01) return;

    const px = state.pointerX;
    const py = state.pointerY;
    const beamRadius = Math.min(w, h) * 0.34;
    const isAct5 = progress >= 0.88;

    ctx.save();
    for (let i = 0; i < dustMotes.length; i++) {
      const m = dustMotes[i];
      m.x += m.vx * Math.min(dtMs, 48);
      m.y += m.vy * Math.min(dtMs, 48);
      if (m.x < -0.02) m.x = 1.02;
      if (m.x > 1.02) m.x = -0.02;
      if (m.y < -0.02) m.y = 1.02;
      if (m.y > 1.02) m.y = -0.02;

      const mx = m.x * w;
      const my = m.y * h;
      const dist = Math.hypot(mx - px, my - py);
      const spotFactor = dist < beamRadius ? Math.pow(1 - dist / beamRadius, 1.55) : 0;
      const ambientFactor = 0.09;
      const twinkle = 0.65 + 0.35 * Math.sin(nowMs * m.twinkleSpeed + m.twinklePhase);
      const a = intensity * m.alpha * twinkle * (ambientFactor + spotFactor * 0.92);
      if (a <= 0.015) continue;

      ctx.beginPath();
      ctx.arc(mx, my, m.r * (1 + spotFactor * 0.55), 0, Math.PI * 2);
      if (isAct5) {
        ctx.fillStyle = `rgba(235, 92, 92, ${a.toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(238, 220, 192, ${a.toFixed(3)})`;
      }
      ctx.fill();
    }
    ctx.restore();
  }

  function renderFxFrame(nowMs, dtMs) {
    if (!fxCtx || !fxCanvas) return;
    resizeFxCanvas();

    const p = state.progress;

    // Act 1 (< 0.22): 100% transparent pristine marketing canvas unless climax/aftermath is active
    if (p < 0.22 && !state.climaxActive && !state.aftermathActive) {
      if (!state.fxCleared) {
        fxCtx.clearRect(0, 0, fxW, fxH);
        state.fxCleared = true;
      }
      return;
    }

    fxCtx.clearRect(0, 0, fxW, fxH);
    state.fxCleared = false;

    // Smooth pointer tracking
    state.pointerX = lerp(state.pointerX, state.targetPointerX, 0.18);
    state.pointerY = lerp(state.pointerY, state.targetPointerY, 0.18);
    state.measuredSpike *= 0.84;

    // Act 2 (0.22 .. 0.44): Faint peripheral vignette & rare 1-frame micro scanline on velocity spikes
    if (p >= 0.22 && p < 0.44) {
      const t2 = clamp((p - 0.22) / 0.22, 0, 1);
      drawVignette(fxCtx, fxW, fxH, 0.62 - t2 * 0.1, `rgba(14, 19, 17, ${(t2 * 0.17).toFixed(3)})`);

      const velMag = Math.abs(state.velocity);
      const spikeTriggered = velMag > 0.014 || velMag > 8 || state.measuredSpike > 0.0055;
      if (
        !reducedMotionQuery.matches &&
        spikeTriggered &&
        nowMs - state.lastMicroGlitchMs > 420
      ) {
        state.lastMicroGlitchMs = nowMs;
        const tearY = (0.15 + Math.random() * 0.7) * fxH;
        const tearH = 1.5 + Math.random() * 3;
        fxCtx.fillStyle = 'rgba(180, 255, 230, 0.14)';
        fxCtx.fillRect(0, tearY, fxW, tearH);
        fxCtx.fillStyle = 'rgba(220, 38, 38, 0.10)';
        fxCtx.fillRect(0, tearY + 3, fxW * 0.72, 1.2);
      }
    }

    // Act 3 (0.44 .. 0.68): Film grain, surveillance vignette & horizontal VHS tracking tears
    if (p >= 0.44 && p < 0.68) {
      const t3 = clamp((p - 0.44) / 0.24, 0, 1);
      drawVignette(
        fxCtx,
        fxW,
        fxH,
        0.5 - t3 * 0.08,
        `rgba(6, 10, 9, ${(0.2 + t3 * 0.22).toFixed(3)})`
      );
      drawFilmGrain(fxCtx, fxW, fxH, 0.036 + t3 * 0.032, noiseTile);

      if (!reducedMotionQuery.matches) {
        // Rolling subtle VHS tracking bar + occasional horizontal tear
        const vhsY = ((nowMs * 0.075) % (fxH + 120)) - 60;
        const grad = fxCtx.createLinearGradient(0, vhsY - 18, 0, vhsY + 18);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, `rgba(190, 235, 215, ${(0.035 + t3 * 0.035).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        fxCtx.fillStyle = grad;
        fxCtx.fillRect(0, vhsY - 18, fxW, 36);

        if (Math.random() < 0.14 + t3 * 0.14) {
          const y = Math.random() * fxH;
          const h = 2 + Math.random() * 7;
          const shift = (Math.random() - 0.5) * 36;
          fxCtx.fillStyle = 'rgba(220, 38, 38, 0.11)';
          fxCtx.fillRect(Math.max(0, shift), y, fxW - Math.abs(shift), h * 0.55);
          fxCtx.fillStyle = 'rgba(210, 245, 230, 0.09)';
          fxCtx.fillRect(0, y + 1.5, fxW, h * 0.45);
        }
      }
    }

    // Acts 4–5 (0.68 .. 1.0): Corner dark veins, illuminated dust/ash motes, Act 5 crimson heartbeat pulses
    if (p >= 0.68) {
      const t45 = clamp((p - 0.68) / 0.3, 0, 1);
      const isAct5 = p >= 0.88;
      const t5 = isAct5 ? clamp((p - 0.88) / 0.12, 0, 1) : 0;

      // Deep claustrophobic peripheral darkness
      drawVignette(
        fxCtx,
        fxW,
        fxH,
        0.44 - t45 * 0.14,
        `rgba(4, 1, 2, ${(0.42 + t45 * 0.34).toFixed(3)})`
      );

      // Act 5 accelerating crimson heartbeat edge pulse (lub-dub wave)
      let heartbeatPulse = 0;
      if (isAct5) {
        const bpm = lerp(104, 142, t5);
        const beatPhase = ((nowMs / 1000) * (bpm / 60)) % 1;
        const lub = Math.exp(-Math.pow((beatPhase - 0.12) / 0.075, 2));
        const dub = 0.78 * Math.exp(-Math.pow((beatPhase - 0.31) / 0.09, 2));
        heartbeatPulse = clamp(lub + dub, 0, 1);

        const edgeAlpha = (0.14 + t5 * 0.24) * (0.35 + 0.65 * heartbeatPulse);
        drawVignette(fxCtx, fxW, fxH, 0.34, `rgba(148, 8, 18, ${edgeAlpha.toFixed(3)})`);
      }

      drawFilmGrain(fxCtx, fxW, fxH, 0.042 + t45 * 0.03, noiseTile);
      drawDustMotes(fxCtx, fxW, fxH, dtMs, nowMs, p);
      drawVeins(fxCtx, fxW, fxH, t45, nowMs, isAct5 ? 0.35 + t5 * 0.5 + heartbeatPulse * 0.25 : 0.12);
    }

    // Climax 1.6s Horror Burst
    if (state.climaxActive) {
      const elapsed = nowMs - state.climaxStartMs;
      if (elapsed >= CLIMAX_DURATION_MS) {
        state.climaxActive = false;
        state.aftermathActive = true;
      } else {
        const k = elapsed / CLIMAX_DURATION_MS;
        const decay = 1 - k;

        // 1. Crimson shockwave flash & expanding ring
        if (elapsed < 280 && !reducedMotionQuery.matches) {
          const flashA = Math.pow(1 - elapsed / 280, 1.8) * 0.62;
          fxCtx.fillStyle = `rgba(185, 10, 22, ${flashA.toFixed(3)})`;
          fxCtx.fillRect(0, 0, fxW, fxH);
        }

        const cx = fxW * 0.5;
        const cy = fxH * 0.5;
        const maxR = Math.hypot(cx, cy);
        const shockR = maxR * (0.08 + Math.pow(k, 0.55) * 1.08);
        fxCtx.save();
        fxCtx.beginPath();
        fxCtx.arc(cx, cy, shockR, 0, Math.PI * 2);
        fxCtx.strokeStyle = `rgba(220, 24, 38, ${(decay * 0.75).toFixed(3)})`;
        fxCtx.lineWidth = 4 + decay * 22;
        fxCtx.stroke();
        fxCtx.restore();

        // 2. Full-reach arterial veins surging across corners
        drawVeins(fxCtx, fxW, fxH, 1.0, nowMs, 0.95);

        // 3. Violent horizontal slice displacement / screen-tear + corrupted static bursts
        if (!reducedMotionQuery.matches) {
          const sliceCount = Math.round(6 + decay * 18);
          for (let i = 0; i < sliceCount; i++) {
            const sy = Math.random() * fxH;
            const sh = 3 + Math.random() * (34 * decay + 6);
            const offset = (Math.random() - 0.5) * 110 * decay;
            fxCtx.fillStyle =
              i % 3 === 0
                ? `rgba(220, 20, 36, ${(0.18 + decay * 0.28).toFixed(3)})`
                : i % 3 === 1
                ? `rgba(8, 0, 2, ${(0.35 + decay * 0.35).toFixed(3)})`
                : `rgba(255, 235, 235, ${(0.08 + decay * 0.16).toFixed(3)})`;
            fxCtx.fillRect(offset, sy, fxW, sh);
          }
          drawFilmGrain(fxCtx, fxW, fxH, 0.14 * decay + 0.05, noiseTile);
        }
      }
    }

    // Post-climax aftermath: heavy blood-dark dripping vignette (leaves center & reset button clear)
    if (state.aftermathActive && !state.climaxActive) {
      const afterElapsed = Math.max(0, nowMs - (state.climaxStartMs + CLIMAX_DURATION_MS));
      drawVignette(fxCtx, fxW, fxH, 0.36, 'rgba(32, 2, 5, 0.62)');
      drawVeins(fxCtx, fxW, fxH, 0.86, nowMs, 0.55);

      // Slow viscous blood-dark drips along top edge
      fxCtx.save();
      fxCtx.fillStyle = 'rgba(58, 3, 8, 0.78)';
      fxCtx.fillRect(0, 0, fxW, 5);
      for (let i = 0; i < bloodDrips.length; i++) {
        const d = bloodDrips[i];
        const tDrip = Math.max(0, afterElapsed - d.delayMs);
        const len = Math.min(d.maxLen * fxH, tDrip * d.speed * fxH * 0.12);
        if (len <= 1) continue;
        const dx = d.x * fxW;
        const w = d.width;
        fxCtx.beginPath();
        fxCtx.moveTo(dx - w * 0.6, 0);
        fxCtx.lineTo(dx + w * 0.6, 0);
        fxCtx.lineTo(dx + w * 0.32, len);
        fxCtx.arc(dx, len, w * 0.32, 0, Math.PI);
        fxCtx.closePath();
        fxCtx.fillStyle = 'rgba(72, 4, 10, 0.74)';
        fxCtx.fill();
      }
      fxCtx.restore();
    }
  }

  function renderCctvFrame(nowMs) {
    if (!cctvCtx || !cctvCanvas || !isCctvNeeded()) return;
    resizeCctvCanvas();

    const w = cctvW;
    const h = cctvH;
    cctvCtx.clearRect(0, 0, w, h);

    // 1. Infrared sensor noise & CRT horizontal scanlines
    drawFilmGrain(cctvCtx, w, h, 0.085, irNoiseTile);

    cctvCtx.save();
    cctvCtx.fillStyle = 'rgba(0, 12, 6, 0.18)';
    for (let y = 0; y < h; y += 3) {
      cctvCtx.fillRect(0, y, w, 1);
    }

    // Rolling IR sync bar
    const rollY = ((nowMs * 0.055) % (h + 80)) - 40;
    const rollGrad = cctvCtx.createLinearGradient(0, rollY - 22, 0, rollY + 22);
    rollGrad.addColorStop(0, 'rgba(180, 255, 200, 0)');
    rollGrad.addColorStop(0.5, 'rgba(180, 255, 205, 0.075)');
    rollGrad.addColorStop(1, 'rgba(180, 255, 200, 0)');
    cctvCtx.fillStyle = rollGrad;
    cctvCtx.fillRect(0, rollY - 22, w, 44);

    // Occasional VHS horizontal tracking glitch inside CCTV feed
    if (!reducedMotionQuery.matches && Math.random() < 0.16) {
      const gy = Math.random() * h;
      cctvCtx.fillStyle = 'rgba(210, 255, 225, 0.16)';
      cctvCtx.fillRect(0, gy, w, 1.5 + Math.random() * 3.5);
    }

    // 2. Timestamp / IR telemetry jitter readout (top-right subtle technical OSD)
    const jx = !reducedMotionQuery.matches && Math.random() < 0.22 ? (Math.random() - 0.5) * 2.6 : 0;
    const jy = !reducedMotionQuery.matches && Math.random() < 0.18 ? (Math.random() - 0.5) * 1.8 : 0;
    const msFrame = String(Math.floor((nowMs / 33.3) % 30)).padStart(2, '0');
    const fontSize = Math.max(10, Math.min(12, Math.round(w * 0.018)));
    cctvCtx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace`;
    cctvCtx.textBaseline = 'top';
    cctvCtx.textAlign = 'right';
    cctvCtx.fillStyle = 'rgba(186, 236, 204, 0.78)';
    cctvCtx.fillText(`IR-850NM · GAIN +36dB · FR:${msFrame}`, w - 14 + jx, 14 + jy);

    // 3. Jittering Red AI Bounding Box locking onto the dark hallway silhouette
    // Silhouette in cctv-hallway.jpg stands centered at ~50.8% X, 37%..61% Y down the corridor
    const approach = clamp((state.progress - 0.42) / 0.3, 0, 1);
    const scaleGrow = 1 + approach * 0.14;
    const boxJitterX = !reducedMotionQuery.matches ? (Math.random() - 0.5) * 3.0 : 0;
    const boxJitterY = !reducedMotionQuery.matches ? (Math.random() - 0.5) * 2.4 : 0;

    const bw = Math.max(54, w * 0.095 * scaleGrow);
    const bh = Math.max(96, h * 0.285 * scaleGrow);
    const bx = w * 0.508 - bw * 0.5 + boxJitterX;
    const by = h * 0.492 - bh * 0.5 + boxJitterY;

    // Subtle pulsing crimson fill & dashed lock box
    const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.009);
    cctvCtx.fillStyle = `rgba(220, 28, 38, ${(0.06 + pulse * 0.08).toFixed(3)})`;
    cctvCtx.fillRect(bx, by, bw, bh);

    cctvCtx.strokeStyle = `rgba(239, 68, 68, ${(0.55 + pulse * 0.35).toFixed(3)})`;
    cctvCtx.lineWidth = 1.25;
    cctvCtx.setLineDash([5, 4]);
    cctvCtx.strokeRect(bx, by, bw, bh);
    cctvCtx.setLineDash([]);

    // Sharp corner reticles
    const cLen = Math.max(8, Math.min(14, bw * 0.22));
    cctvCtx.strokeStyle = '#ff2e3b';
    cctvCtx.lineWidth = 2.2;
    cctvCtx.beginPath();
    // Top-left
    cctvCtx.moveTo(bx, by + cLen);
    cctvCtx.lineTo(bx, by);
    cctvCtx.lineTo(bx + cLen, by);
    // Top-right
    cctvCtx.moveTo(bx + bw - cLen, by);
    cctvCtx.lineTo(bx + bw, by);
    cctvCtx.lineTo(bx + bw, by + cLen);
    // Bottom-left
    cctvCtx.moveTo(bx, by + bh - cLen);
    cctvCtx.lineTo(bx, by + bh);
    cctvCtx.lineTo(bx + cLen, by + bh);
    // Bottom-right
    cctvCtx.moveTo(bx + bw - cLen, by + bh);
    cctvCtx.lineTo(bx + bw, by + bh);
    cctvCtx.lineTo(bx + bw, by + bh - cLen);
    cctvCtx.stroke();

    // Head-region biometric anomaly crosshair
    const headX = bx + bw * 0.5;
    const headY = by + bh * 0.15;
    cctvCtx.strokeStyle = 'rgba(255, 65, 75, 0.82)';
    cctvCtx.lineWidth = 1;
    cctvCtx.beginPath();
    cctvCtx.arc(headX, headY, Math.max(4, bw * 0.09), 0, Math.PI * 2);
    cctvCtx.moveTo(headX - 8, headY);
    cctvCtx.lineTo(headX + 8, headY);
    cctvCtx.moveTo(headX, headY - 8);
    cctvCtx.lineTo(headX, headY + 8);
    cctvCtx.stroke();

    // AI Threat Tag Pill: [UNREGISTERED HUMAN · 99.9%]
    const conf = Math.random() < 0.08 ? '99.8%' : '99.9%';
    const label = `[UNREGISTERED HUMAN · ${conf}]`;
    const tagFont = Math.max(10, Math.min(12, Math.round(w * 0.0175)));
    cctvCtx.font = `700 ${tagFont}px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace`;
    const textW = cctvCtx.measureText(label).width;
    const padX = 7;
    const pillW = textW + padX * 2;
    const pillH = tagFont + 8;
    const pillX = clamp(bx + bw * 0.5 - pillW * 0.5, 8, Math.max(8, w - pillW - 8));
    const pillY = Math.max(32, by - pillH - 6);

    cctvCtx.fillStyle = 'rgba(155, 12, 22, 0.90)';
    cctvCtx.fillRect(pillX, pillY, pillW, pillH);
    cctvCtx.strokeStyle = 'rgba(255, 95, 105, 0.85)';
    cctvCtx.lineWidth = 1;
    cctvCtx.strokeRect(pillX, pillY, pillW, pillH);

    cctvCtx.textAlign = 'left';
    cctvCtx.textBaseline = 'middle';
    cctvCtx.fillStyle = '#fff5f5';
    cctvCtx.fillText(label, pillX + padX, pillY + pillH * 0.5 + 0.5);

    cctvCtx.restore();
  }

  function tick(nowMs) {
    state.rafId = 0;
    if (state.pageHidden) return;

    ensureCanvases();
    const dtMs = state.lastFrameMs ? nowMs - state.lastFrameMs : 16.67;
    state.lastFrameMs = nowMs;

    if (isFxNeeded()) {
      renderFxFrame(nowMs, dtMs);
    } else if (fxCtx && !state.fxCleared) {
      fxCtx.clearRect(0, 0, fxW, fxH);
      state.fxCleared = true;
    }

    if (isCctvNeeded()) {
      renderCctvFrame(nowMs);
    }

    if (isFxNeeded() || isCctvNeeded()) {
      scheduleLoop();
    }
  }

  function init() {
    buildNoiseTiles();
    buildOrganicGeometry();
    ensureCanvases();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(
      'resize',
      () => {
        resizeFxCanvas();
        resizeCctvCanvas();
        if (isFxNeeded() || isCctvNeeded()) {
          const now = performance.now();
          renderFxFrame(now, 16);
          renderCctvFrame(now);
        }
      },
      { passive: true }
    );

    document.addEventListener('visibilitychange', () => {
      state.pageHidden = document.hidden;
      if (state.pageHidden && state.rafId) {
        window.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      } else if (!state.pageHidden) {
        state.lastFrameMs = 0;
        scheduleLoop();
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  }

  const NestFX = {
    init,

    setProgress(progress, act, velocity = 0) {
      init();
      const nextP = clamp(Number(progress) || 0, 0, 1);
      const delta = Math.abs(nextP - state.progress);
      state.lastProgress = state.progress;
      state.progress = nextP;
      state.act = deriveAct(nextP, Number(act));
      state.velocity = Number(velocity) || 0;
      state.measuredSpike = Math.max(state.measuredSpike, delta);

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (!isFxNeeded() && fxCtx && !state.fxCleared) {
        fxCtx.clearRect(0, 0, fxW, fxH);
        state.fxCleared = true;
      } else if (isFxNeeded()) {
        // Render immediate synchronous frame on scroll state transitions so instant programmatic jumps never show blank frames
        renderFxFrame(now, 16);
      }

      if (isCctvNeeded()) {
        renderCctvFrame(now);
      }

      scheduleLoop();
    },

    setPointer(x, y) {
      if (Number.isFinite(x)) state.targetPointerX = x;
      if (Number.isFinite(y)) state.targetPointerY = y;
      if (state.progress >= 0.66) scheduleLoop();
    },

    triggerClimax() {
      init();
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      state.climaxActive = true;
      state.aftermathActive = false;
      state.climaxStartMs = now;
      renderFxFrame(now, 16);
      scheduleLoop();
    },

    reset() {
      init();
      state.climaxActive = false;
      state.aftermathActive = false;
      state.climaxStartMs = 0;
      state.progress = 0;
      state.lastProgress = 0;
      state.act = 1;
      state.velocity = 0;
      state.measuredSpike = 0;

      if (state.rafId && typeof window !== 'undefined') {
        window.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
      if (fxCtx) {
        fxCtx.clearRect(0, 0, fxW, fxH);
        state.fxCleared = true;
      }
      if (cctvCtx) {
        cctvCtx.clearRect(0, 0, cctvW, cctvH);
      }
    },
  };

  if (typeof window !== 'undefined') {
    window.NestFX = NestFX;
  }
})();
