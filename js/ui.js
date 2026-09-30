/* ==========================================================================
   ui.js — the shared kit chunks build with: icons, HUD primary action,
   hint bulb, Dev's captions, and small HTML templates.
   (Scene changes still go only through window.fndShowScene.)
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------------- Icons (24 × 24, stroke = currentColor) ---------------- */

  const P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    alert: '<path d="M12 7.5v6"/><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none"/><path d="M10.3 3.8 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/>',
    question: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.4"/><circle cx="12" cy="17.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9.5"/>',
    source: '<circle cx="9.5" cy="8" r="3.6"/><path d="M3 20c.6-3.6 3.2-6 6.5-6 1.3 0 2.4.3 3.4.9"/><circle cx="17" cy="16" r="3"/><path d="M19.2 18.2 21.5 20.5"/>',
    claim: '<path d="M4 10v4l3 .5 9 4.5V5L7 9.5z"/><path d="M7 14.5l1.2 4.5h3"/><path d="M19 9.5a3.5 3.5 0 0 1 0 5"/>',
    pressure: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.8 1.8"/><path d="M9.5 2.5h5M12 2.5V6"/><path d="M19.5 5.5l1.5 1.5"/>',
    proof: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.8 14.2l2.2 2.2 4.2-4.4"/>',
    confirm: '<path d="M12 2.8 4.5 5.8v5.4c0 4.8 3.2 8.4 7.5 10 4.3-1.6 7.5-5.2 7.5-10V5.8z"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    flame: '<path d="M12 21.5c3.9 0 6.5-2.6 6.5-6.2 0-3.9-3-6.1-4-9.8-.2-.8-1.2-1-1.6-.3-.8 1.3-1 3-1.9 4-.8-.8-1.2-2-1.4-2.9-.2-.7-1.1-.9-1.5-.2C6.8 8.2 5.5 10.9 5.5 14.3c0 4.3 2.7 7.2 6.5 7.2z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none"/>',
    unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8 10.5V7.8a4 4 0 0 1 7.7-1.5"/>',
    forward: '<path d="M14 5l7 7-7 7"/><path d="M21 12H10.5A6.5 6.5 0 0 0 4 18.5V20"/>',
    hand: '<path d="M8 13V5.8a1.6 1.6 0 1 1 3.2 0V11"/><path d="M11.2 10.5V4.3a1.6 1.6 0 1 1 3.2 0v6.2"/><path d="M14.4 10.8V6a1.6 1.6 0 1 1 3.2 0v7.5a7 7 0 0 1-7 7h-.6a6.4 6.4 0 0 1-5.4-3L2.8 14a1.7 1.7 0 0 1 2.8-1.9L8 15"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    scan: '<path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16"/><path d="M3.5 12h17"/>',
    grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    brain: '<path d="M9 4.5a3 3 0 0 0-3 3v.3A3.2 3.2 0 0 0 4 13a3.3 3.3 0 0 0 2 4.7A3 3 0 0 0 12 19V6a2.5 2.5 0 0 0-3-1.5z"/><path d="M15 4.5a3 3 0 0 1 3 3v.3a3.2 3.2 0 0 1 2 5.2 3.3 3.3 0 0 1-2 4.7A3 3 0 0 1 12 19"/>',
    heart: '<path d="M12 20.5s-8-4.6-8-10.4A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4z"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4 6.5l.9.9L6.6 5.6M4 12l.9.9 1.7-1.8M4 17.5l.9.9 1.7-1.8"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4.5h11l-2 4 2 4H5"/>',
    "chev-left": '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    "chev-right": '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    "chev-up": '<path d="M5.5 14.5 12 8l6.5 6.5"/>',
    "chev-down": '<path d="M5.5 9.5 12 16l6.5-6.5"/>',
    dots: '<circle cx="12" cy="5.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.5" fill="currentColor" stroke="none"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5"/>',
    chat: '<path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z" fill="currentColor" stroke="none"/>',
    tap: '<path d="M9 11.5V5a2 2 0 1 1 4 0v5.5"/><path d="M13 10.5a2 2 0 1 1 4 0v1a2 2 0 1 1 4 0V15a6.5 6.5 0 0 1-6.5 6.5h-1.6a5.6 5.6 0 0 1-4.7-2.6L5 14.5a1.8 1.8 0 0 1 3-2L9 14"/>',
    voice: '<path d="M4 9.5v5h3.5l4.5 3.8V5.7L7.5 9.5z"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18.3 6.2a8.2 8.2 0 0 1 0 11.6"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.7" r="1.1" fill="currentColor" stroke="none"/>',
    fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    restart: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    lens: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M7.6 10.8l2 2 3.6-4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.5a3 3 0 0 0 3.6 4M16 5.5h3.5a3 3 0 0 1-3.6 4"/><path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/>',
    photo: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.6 6.6l1.7 1.7M17.7 15.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.6 17.4l1.7-1.7M17.7 8.3l1.7-1.7"/>',
    phone: '<path d="M5 4h3.5l1.8 4.5-2.2 1.4a11 11 0 0 0 6 6l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.6 15.5a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/>',
    battery: '<rect x="2.5" y="7" width="17" height="10" rx="2.5"/><path d="M22 10.5v3"/><rect x="4.5" y="9" width="10" height="6" rx="1" fill="currentColor" stroke="none"/>',
    signal: '<path d="M4 19v-3M9 19v-6M14 19V9M19 19V5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  };

  function icon(name, cls = "") {
    const body = P[name] || P.question;
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /** Fill any static [data-icon="name"] placeholders. */
  function hydrateIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
      if (el.dataset.iconDone) return;
      el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
      el.dataset.iconDone = "1";
    });
  }

  /* ---------------- HUD primary action (#btnHeaderNext) ---------------- */

  const ctaWrap = $("#hudCta");
  const ctaBtn = $("#btnHeaderNext");
  const ctaLabel = ctaBtn.querySelector(".cta__label");
  const ctaBar = ctaBtn.querySelector(".cta__progress i");
  let ctaHandler = null;
  let ctaIdle = true;
  let chevTl = null;

  function chevrons(on) {
    if (!window.gsap) return;
    chevTl?.kill();
    if (!on) return;
    // the two Figma chevrons (Rectangle 14 / 137) pulse towards the action
    const chev = gsap.utils.toArray(".rail-chev").reverse();
    chevTl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 })
      .to(chev, { opacity: 0.35, duration: 0.3, stagger: 0.15, ease: "sine.inOut" })
      .to(chev, { opacity: 1, duration: 0.3, stagger: 0.15, ease: "sine.inOut" }, 0.3);
  }

  const cta = {
    /**
     * Configure the one centred CTA.
     * { label, action, onClick, disabled, tone: "orange" | "blue" | "green" }
     */
    set({ label, action = "", onClick, disabled = false, tone = "orange" }) {
      const wasIdle = ctaIdle;
      const relabel = ctaLabel.textContent !== label;
      ctaHandler = onClick || null;
      ctaBtn.dataset.action = action;
      ctaBtn.dataset.tone = tone;
      ctaBtn.disabled = !!disabled;
      ctaBtn.classList.remove("is-pending");
      ctaLabel.textContent = label;
      ctaBtn.dataset.len = label.length > 19 ? "xl" : label.length > 14 ? "l" : "";
      ctaBtn.setAttribute("aria-label", label);
      ctaIdle = false;
      ctaWrap.classList.remove("is-idle");
      if (!window.gsap) return;
      if (wasIdle) {
        gsap.killTweensOf(ctaBtn);
        gsap.fromTo(ctaBtn, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)" });
        // the rails draw out from the action towards both edges
        gsap.fromTo(".hud-cta__rails", { clipPath: "inset(0% 50% 0% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.out", clearProps: "clipPath" });
        chevrons(true);
      } else if (relabel) {
        gsap.fromTo(ctaLabel, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
      }
    },
    enable(on = true) {
      const was = ctaBtn.disabled;
      ctaBtn.disabled = !on;
      ctaBtn.classList.remove("is-pending");
      if (on && was && window.gsap) gsap.fromTo(ctaBtn, { scale: 0.92 }, { scale: 1, duration: 0.45, ease: "elastic.out(1, .5)" });
    },
    /** Disabled CTA with a progress bar (e.g. waiting on narration). Returns the bar tween. */
    pending(durationMs) {
      ctaBtn.disabled = true;
      ctaBtn.classList.add("is-pending");
      if (!window.gsap) return null;
      return gsap.fromTo(ctaBar, { scaleX: 0 }, { scaleX: 1, duration: durationMs / 1000, ease: "none" });
    },
    idle() {
      ctaHandler = null;
      ctaBtn.dataset.action = "";
      if (ctaIdle) return;
      ctaIdle = true;
      chevrons(false);
      if (window.gsap) {
        gsap.to(ctaBtn, { y: 60, opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => { if (ctaIdle) ctaWrap.classList.add("is-idle"); } });
      } else ctaWrap.classList.add("is-idle");
    },
    isIdle: () => ctaIdle,
    click() { if (!ctaBtn.disabled && ctaHandler) ctaHandler(ctaBtn.dataset.action); },
  };
  ctaBtn.addEventListener("click", () => {
    FND.audio.sfx("tap");
    cta.click();
  });

  /* ---------------- Hint bulb: hidden until two wrong attempts ---------------- */

  const hintBtn = $("#btnHudHint");
  let wrongCount = 0;
  let hintGuide = null;       // () => narration key to replay
  let hintEnabled = true;
  let hintPulse = null;

  const hint = {
    /** Reset for a new screen. guide: function returning the narration key for Dev's guidance. */
    reset(guide = null, { enabled = true } = {}) {
      wrongCount = 0;
      hintGuide = guide;
      hintEnabled = enabled;
      hint.hide();
    },
    /** Register a wrong attempt; reveals the bulb on the second. Returns the running count. */
    wrong() {
      wrongCount += 1;
      if (wrongCount >= 2 && hintEnabled && hintGuide) hint.show();
      return wrongCount;
    },
    count: () => wrongCount,
    show() {
      if (!hintBtn.hidden) return;
      hintBtn.hidden = false;
      if (!window.gsap) return;
      gsap.fromTo(hintBtn, { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2)" });
      hintPulse?.kill();
      hintPulse = gsap.fromTo(hintBtn.querySelector(".hud-hint__bulb"),
        { filter: "drop-shadow(0 0 0px rgba(255, 230, 90, 0))" },
        { filter: "drop-shadow(0 0 10px rgba(255, 230, 90, .95))", duration: 0.7, repeat: -1, yoyo: true, ease: "sine.inOut" });
    },
    hide() {
      hintPulse?.kill();
      hintBtn.hidden = true;
    },
    play() {
      const key = typeof hintGuide === "function" ? hintGuide() : hintGuide;
      if (!key) return;
      devPop.say(FND.audio.text(key), { mood: "hint", key });
    },
  };
  hintBtn.addEventListener("click", () => { FND.audio.sfx("pop"); hint.play(); });

  /* ---------------- Dev's poses ----------------
     assets/dev-guide.png (presenting), dev-thinking.png, dev-happy.png (jumping),
     dev-thumbs-up.png. The same four drive the small avatar beside every line. */

  const POSES = {
    guide:    { file: "dev-guide.png",     cls: "" },
    thinking: { file: "dev-thinking.png",  cls: "dev-avatar--thinking" },
    happy:    { file: "dev-happy.png",     cls: "dev-avatar--happy" },
    thumbs:   { file: "dev-thumbs-up.png", cls: "dev-avatar--thumbs" },
  };
  const POSE_CLASSES = Object.values(POSES).map((p) => p.cls).filter(Boolean);
  const MOOD_POSE = { good: "thumbs", bad: "thinking", hint: "thinking", info: "guide" };

  /** Switch the avatar in a Dev line (pass the line, its caption, or the avatar itself). */
  function pose(el, name = "guide") {
    const avatar = el?.classList?.contains("dev-avatar") ? el : (el?.closest?.(".dev-line, .dev-pop") || el)?.querySelector?.(".dev-avatar");
    if (!avatar || avatar.dataset.pose === name) return;
    avatar.classList.remove(...POSE_CLASSES);
    if (POSES[name]?.cls) avatar.classList.add(POSES[name].cls);
    avatar.dataset.pose = name;
    if (window.gsap) gsap.fromTo(avatar, { scale: 0.7, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.6)" });
  }

  /* ---------------- Dev pop: transient speech bubble ---------------- */

  const popEl = $("#devPop");
  const popText = $("#devPopText");
  let popTl = null;

  const devPop = {
    /** Show Dev saying text; narrates `key` if given. Hides itself afterwards. */
    say(text, { mood = "info", key = null, holdMs } = {}) {
      popEl.dataset.mood = mood;
      pose(popEl.querySelector(".dev-avatar"), MOOD_POSE[mood] || "guide");
      popText.textContent = text;
      const narration = key ? FND.audio.narrate(key, { remember: false }) : null;
      const hold = holdMs ?? Math.max(2600, (key ? FND.audio.durationMs(key) : FND.audio.estimateMs(text)) + 600);
      if (!window.gsap) { popEl.style.visibility = "visible"; return narration; }
      popTl?.kill();
      popTl = gsap.timeline()
        .set(popEl, { visibility: "visible" })
        .fromTo(popEl, { y: 30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.8)" })
        .to(popEl, { y: 16, opacity: 0, duration: 0.3, ease: "power2.in" }, `+=${hold / 1000}`)
        .set(popEl, { visibility: "hidden" });
      return narration;
    },
    hide() {
      popTl?.kill();
      if (window.gsap) gsap.set(popEl, { visibility: "hidden", opacity: 0 });
    },
  };

  /* ---------------- Dev's captions inside panels ---------------- */

  /**
   * Narrate a key (or keys) and type its text into a caption element.
   * Returns the narration promise.
   */
  function say(keys, captionEl, { text } = {}) {
    keys = [].concat(keys);
    const caption = text ?? keys.map((k) => FND.audio.text(k)).join(" ");
    if (captionEl) typeInto(captionEl, caption);
    return FND.audio.narrate(keys);
  }

  function typeInto(el, text) {
    if (!el) return;
    if (!window.gsap || !window.TextPlugin) { el.textContent = text; return; }
    gsap.killTweensOf(el);
    el.textContent = "";
    gsap.to(el, { duration: Math.min(2.2, 0.018 * text.length + 0.2), text: { value: text }, ease: "none" });
  }

  /* ---------------- Templates ---------------- */

  const tpl = {
    devLine(text = "", id = "", poseName = "guide") {
      return `<div class="dev-line"><span class="dev-avatar ${POSES[poseName]?.cls || ""}" data-pose="${poseName}" aria-hidden="true"></span><p class="dev-line__text" ${id ? `id="${id}"` : ""} aria-live="polite">${text}</p></div>`;
    },
    /** Full-length Dev in the figure column of a .cl--hero layout. */
    heroFigure(poseName = "guide", alt = "Dev, your Fake News Detector guide") {
      return `<div class="cl__figure" data-pose="${poseName}">${tpl.devFigure(poseName, alt)}</div>`;
    },
    /** A full-length Dev in one of the four poses. */
    devFigure(poseName = "guide", alt = "Dev, your Fake News Detector guide") {
      return `<img class="dev-figure" src="assets/${POSES[poseName].file}" width="1024" height="1536" alt="${alt}">`;
    },
    checkIcon(id, iconName) {
      return `<span class="check-ico" data-check-id="${id}">${icon(iconName || FND.data.CHECKS[id]?.icon || id)}</span>`;
    },
    checkRow(id, status = "idle", why = "") {
      const c = FND.data.CHECKS[id];
      const label = { idle: "—", scanning: "SCANNING", ok: "PASS", warn: "WARNING", fail: "FAIL" }[status] || "—";
      return `<div class="check-row" data-row="${id}" data-status="${status}">
        ${tpl.checkIcon(id)}
        <span><span class="check-row__name">${c.name}</span><span class="check-row__why">${why}</span></span>
        <span class="check-row__status">${label}</span>
      </div>`;
    },
    option({ value, label, sub = "", iconName = "", action, selected = false, extra = "", disabled = false }) {
      return `<button type="button" class="option ${selected ? "is-selected" : ""}" data-action="${action}" data-value="${value}" aria-pressed="${selected}" ${disabled ? "disabled" : ""}>
        ${iconName ? `<span class="option__icon">${icon(iconName)}</span>` : ""}
        <span class="option__text">${label}${sub ? `<small>${sub}</small>` : ""}</span>
        ${extra}
        <span class="option__tick">${icon("check")}</span>
      </button>`;
    },
    statusLabel(s) { return { ok: "PASS", warn: "WARNING", fail: "FAIL" }[s] || "—"; },
  };

  FND.ui = { icon, hydrateIcons, typeInto, pose };
  FND.icon = icon;
  FND.cta = cta;
  FND.hint = hint;
  FND.devPop = devPop;
  FND.say = say;
  FND.tpl = tpl;
})();
