/* ==========================================================================
   fx.js — GSAP setup and the effects every scene shares.

   GSAP core + CustomEase, SplitText, ScrambleText, DrawSVG, MotionPath,
   Flip, Draggable, TextPlugin, Physics2D · canvas-confetti ·
   RoughNotation (hand-drawn red-flag marks).
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});
  const hasGsap = !!window.gsap;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (hasGsap) {
    const plugins = ["CustomEase", "Draggable", "Flip", "MotionPathPlugin", "SplitText",
      "ScrambleTextPlugin", "DrawSVGPlugin", "TextPlugin", "Physics2DPlugin"].map((n) => window[n]).filter(Boolean);
    gsap.registerPlugin(...plugins);
    gsap.defaults({ ease: "power3.out", duration: 0.5 });
    if (window.CustomEase) {
      CustomEase.create("camera", "0.62,0,0.22,1");
      CustomEase.create("drop", "M0,0 C0.14,0 0.24,1.18 0.5,1.08 0.7,1 0.8,0.98 1,1");
      CustomEase.create("snap", "0.2,1.5,0.4,1");
    }
    if (FND.TEST_MODE) gsap.globalTimeline.timeScale(8);
  }

  const layer = () => document.getElementById("fxLayer");
  const splits = new WeakMap();

  /** Split a heading into characters and bounce them in. */
  function titleIn(el, { delay = 0, type = "chars" } = {}) {
    if (!hasGsap || !el) return null;
    if (!window.SplitText || reduced) return gsap.from(el, { opacity: 0, y: 20, duration: 0.5, delay });
    splits.get(el)?.revert();
    const split = new SplitText(el, { type: type === "chars" ? "words,chars" : "words", wordsClass: "split-w" });
    splits.set(el, split);
    const targets = type === "chars" ? split.chars : split.words;
    return gsap.from(targets, {
      opacity: 0,
      y: 34,
      rotateX: -80,
      transformOrigin: "50% 100%",
      duration: 0.55,
      ease: "back.out(2)",
      stagger: type === "chars" ? 0.022 : 0.06,
      delay,
      onComplete: () => split.revert(),
    });
  }

  /** Stagger in every [data-in] inside root. */
  function enter(root, { delay = 0.05, stagger = 0.07 } = {}) {
    if (!hasGsap || !root) return null;
    const items = root.querySelectorAll("[data-in]");
    if (!items.length) return null;
    return gsap.from(items, {
      opacity: 0,
      y: reduced ? 0 : 26,
      scale: reduced ? 1 : 0.97,
      duration: 0.55,
      stagger,
      delay,
      ease: "power3.out",
      clearProps: "transform,opacity",
    });
  }

  function pop(el, scale = 1.12) {
    if (!hasGsap || !el) return null;
    return gsap.fromTo(el, { scale: 1 }, { scale, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" });
  }

  function shake(el) {
    if (!hasGsap || !el) return null;
    return gsap.fromTo(el, { x: 0 }, {
      keyframes: { x: [0, -10, 9, -7, 5, -2, 0] },
      duration: 0.45,
      ease: "power1.inOut",
      clearProps: "x",
    });
  }

  function glow(el, color = "rgba(255,210,63,.85)") {
    if (!hasGsap || !el) return null;
    return gsap.fromTo(el, { boxShadow: `0 0 0 0 ${color}` }, {
      boxShadow: `0 0 0 14px rgba(255,210,63,0)`,
      duration: 1.1, repeat: -1, ease: "power1.out",
    });
  }

  /** Physics2D spark burst at a client point. */
  function burst(x, y, { colors = ["#f9a11b", "#ffd23f", "#38d3ff", "#ffffff"], count = 18, spread = 360, velocity = 320 } = {}) {
    if (!hasGsap || reduced || !window.Physics2DPlugin) return;
    const host = layer();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("i");
      s.className = "fx-spark";
      s.style.background = colors[i % colors.length];
      host.appendChild(s);
      gsap.set(s, { x, y, rotate: gsap.utils.random(0, 360), scale: gsap.utils.random(0.6, 1.3) });
      gsap.to(s, {
        duration: gsap.utils.random(0.7, 1.2),
        physics2D: {
          velocity: gsap.utils.random(velocity * 0.5, velocity),
          angle: spread === 360 ? gsap.utils.random(0, 360) : gsap.utils.random(-90 - spread / 2, -90 + spread / 2),
          gravity: 700,
        },
        rotate: "+=" + gsap.utils.random(-360, 360),
        opacity: 0,
        ease: "none",
        onComplete: () => s.remove(),
      });
    }
  }
  function burstAt(el, opts) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, opts);
  }

  /* ---------------- canvas-confetti ---------------- */

  let shooter = null;
  function confettiShooter() {
    if (!window.confetti) return null;
    if (!shooter) shooter = confetti.create(document.getElementById("fxCanvas"), { resize: true, useWorker: true });
    return shooter;
  }
  const SKAI_COLORS = ["#f9a11b", "#ffd23f", "#38d3ff", "#21c46d", "#ffffff", "#2f47a3"];

  function celebrate(level = "small") {
    const fire = confettiShooter();
    if (!fire || reduced) return;
    if (level === "small") {
      fire({ particleCount: 70, spread: 70, origin: { y: 0.65 }, colors: SKAI_COLORS, scalar: 0.9 });
    } else if (level === "side") {
      fire({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: SKAI_COLORS });
      fire({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: SKAI_COLORS });
    } else {
      const end = Date.now() + (FND.TEST_MODE ? 300 : 2600);
      (function frame() {
        fire({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: SKAI_COLORS });
        fire({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: SKAI_COLORS });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      setTimeout(() => fire({ particleCount: 160, spread: 120, startVelocity: 45, origin: { y: 0.45 }, colors: SKAI_COLORS, shapes: ["star", "circle"] }), 400);
    }
  }
  function clearConfetti() { shooter?.reset(); }

  /* ---------------- MotionPath: fly a ghost from one element to another ---------------- */

  function flyGhost(fromEl, toEl, { html, className = "", duration = 0.85, arc = 0.35, onArrive } = {}) {
    if (!hasGsap || !fromEl || !toEl) { onArrive?.(); return null; }
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "fx-ghost " + className;
    ghost.innerHTML = html ?? fromEl.outerHTML;
    document.body.appendChild(ghost);
    const w = Math.min(a.width, 320);
    gsap.set(ghost, { left: 0, top: 0, width: w, x: a.left, y: a.top, transformOrigin: "50% 50%" });
    const sx = a.left, sy = a.top;
    const ex = b.left + (b.width - w) / 2, ey = b.top + (b.height - a.height) / 2;
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - Math.abs(ex - sx) * arc - 40;
    const tl = gsap.timeline({ onComplete: () => { ghost.remove(); onArrive?.(); } });
    if (window.MotionPathPlugin) {
      tl.to(ghost, { duration, ease: "power2.inOut", motionPath: { path: [{ x: sx, y: sy }, { x: mx, y: my }, { x: ex, y: ey }], curviness: 1.2 } });
    } else {
      tl.to(ghost, { x: ex, y: ey, duration, ease: "power2.inOut" });
    }
    tl.fromTo(ghost, { scale: 1, rotate: 0 }, { scale: 0.92, rotate: -4, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0);
    return tl;
  }

  /* ---------------- counters, scramble, draw ---------------- */

  function countTo(el, to, { duration = 1, from = 0, decimals = 0 } = {}) {
    if (!el) return null;
    if (!hasGsap) { el.textContent = to; return null; }
    const o = { v: from };
    return gsap.to(o, { v: to, duration, ease: "power2.out", onUpdate: () => { el.textContent = o.v.toFixed(decimals); } });
  }

  function scramble(el, text, { duration = 0.6, chars = "01!?#<>/" } = {}) {
    if (!el) return null;
    if (!hasGsap || !window.ScrambleTextPlugin) { el.textContent = text; return null; }
    return gsap.to(el, { duration, scrambleText: { text, chars, speed: 0.6 } });
  }

  function drawIn(path, { duration = 0.6, delay = 0 } = {}) {
    if (!hasGsap || !path) return null;
    if (!window.DrawSVGPlugin) return gsap.from(path, { opacity: 0, duration, delay });
    return gsap.fromTo(path, { drawSVG: "0%" }, { drawSVG: "100%", duration, delay, ease: "power2.inOut" });
  }

  /* ---------------- RoughNotation (hand-drawn marks) ---------------- */

  const notes = new Set();
  function annotate(el, { type = "circle", color = "#f0444f", strokeWidth = 2.6, padding = 4, multiline = true, iterations = 2, duration = 700 } = {}) {
    if (!el || !window.RoughNotation) return null;
    const a = RoughNotation.annotate(el, { type, color, strokeWidth, padding, multiline, iterations, animationDuration: FND.TEST_MODE ? 60 : duration });
    a.show();
    notes.add(a);
    return a;
  }
  function clearNotes() {
    notes.forEach((a) => { try { a.remove(); } catch (e) { /* element gone */ } });
    notes.clear();
  }

  /** Bring in the full-length Dev of a .cl--hero screen, then keep him moving a little. */
  function devIn(root) {
    const box = root?.querySelector(".cl__figure");
    const fig = box?.querySelector(".dev-figure");
    if (!hasGsap || !fig) return null;
    const jumpy = box.dataset.pose === "happy";
    const tl = gsap.timeline();
    tl.from(fig, { x: -90, y: jumpy ? 60 : 0, autoAlpha: 0, rotate: -6, duration: 0.8, ease: "back.out(1.4)", delay: 0.15 });
    if (!reduced) {
      tl.to(fig, jumpy
        ? { y: -16, duration: 0.42, repeat: -1, yoyo: true, ease: "sine.inOut" }
        : { rotate: 1.6, y: -6, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
    return tl;
  }

  /** Layout modes, matching the media queries in the stylesheets. */
  const mq = (q) => window.matchMedia?.(q) || { matches: false };
  FND.layout = {
    stacked: () => mq("(orientation: portrait) and (max-width: 1100px)").matches,
    compact: () => mq("(orientation: landscape) and (max-height: 540px)").matches,
  };

  FND.fx = {
    reduced,
    devIn,
    titleIn, enter, pop, shake, glow,
    burst, burstAt, celebrate, clearConfetti,
    flyGhost, countTo, scramble, drawIn,
    annotate, clearNotes,
  };
})();
