/* ==========================================================================
   device.js — markup for the one handset (css/one-device.css).
   Chat mode for every message, detector mode for the build benches.
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});
  const icon = (n) => FND.icon(n);

  function statusIcons() {
    return `${icon("signal")}${icon("wifi")}${icon("battery")}`;
  }

  function status(time = "10:15") {
    return `<div class="device__status"><span>${time}</span><span class="device__status-icons">${statusIcons()}</span></div>`;
  }

  function frame(screenInner, { id = "", cls = "" } = {}) {
    return `<div class="device ${cls}" ${id ? `id="${id}"` : ""}>
      <div class="device__chassis">
        <div class="device__notch"></div>
        <div class="device__screen">${screenInner}</div>
      </div>
      <i class="device__side device__side--power"></i><i class="device__side device__side--vol"></i>
    </div>`;
  }

  /** A single message bubble from the content model in state.js. */
  function bubble(msg, { id = "" } = {}) {
    return `<div class="msg" ${id ? `id="${id}"` : ""}>
      ${msg.fwd ? `<div class="msg__fwd">${icon("forward")}${msg.fwd}</div>` : ""}
      ${msg.from ? `<div class="msg__from">${msg.from}</div>` : ""}
      <div class="msg__head">${msg.head}</div>
      ${msg.lines.map((l) => `<span class="msg__line">${l}</span>`).join("")}
      <time class="msg__time">${msg.time}</time>
    </div>`;
  }

  /**
   * Chat-mode device.
   * opts.bubbleHTML replaces the default bubble (the clue hunt uses tappable lines).
   */
  function chat(msg, { id = "", bubbleHTML, bubbleId = "", time } = {}) {
    const c = msg.chat;
    const inner = `
      ${status(time || msg.time)}
      <div class="device__header">${icon("chev-left")}
        <span class="device__avatar ${c.avatarClass || ""}">${c.avatar}</span>
        <span class="device__who"><b>${c.name}</b><small>${c.sub}</small></span>
        ${icon("dots")}
      </div>
      <div class="device__body">
        <span class="device__day">TODAY</span>
        ${bubbleHTML || bubble(msg, { id: bubbleId })}
      </div>
      <div class="device__input"><span>Message</span><i>${icon("mic")}</i></div>
      <div class="device__scan"></div>
      <div class="device__stamp"></div>`;
    return frame(inner, { id });
  }

  /**
   * Detector-mode device.
   * slots: [{ id: checkId|null, isNew?: bool }]
   */
  function detector({ id = "", version = "V1", slots = [], label = "Detector slots" } = {}) {
    const C = FND.data.CHECKS;
    const filled = slots.filter((s) => s.id).length;
    const inner = `
      <div class="device__app">
        ${status("10:15")}
        <div class="app-head">
          <span class="app-logo">${icon("lens")}</span>
          <span class="app-name">FAKE NEWS<small>DETECTOR</small></span>
          <span class="app-ver ${version === "V2" ? "is-v2" : ""}" data-ver>${version}</span>
        </div>
        <div class="app-label">${label}</div>
        <div class="app-slots">
          ${slots.map((s, i) => slot(s, i, C)).join("")}
        </div>
        <div class="app-foot">
          <span><b data-count>${filled}</b> / ${slots.length} checks active</span>
          <svg class="app-power" viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="14"/><circle class="meter" cx="18" cy="18" r="14" data-meter style="stroke-dasharray:87.96;stroke-dashoffset:${(87.96 * (1 - filled / Math.max(1, slots.length))).toFixed(2)}"/></svg>
        </div>
        <div class="app-boot" data-boot><span><span data-boot-title>FAKE NEWS DETECTOR</span><small>BOOTING…</small></span></div>
      </div>`;
    return frame(inner, { id });
  }

  function slot(s, i, C = FND.data.CHECKS) {
    const c = s.id ? C[s.id] : null;
    const cls = ["app-slot", c ? "is-filled" : "", s.isNew ? "is-new" : ""].join(" ");
    return `<button type="button" class="${cls}" data-action="place-check" data-slot="${i}" ${c ? `data-check="${c.id}"` : ""} aria-label="${c ? c.name : `Empty slot ${i + 1}`}">
      ${c ? FND.tpl.checkIcon(c.id) : `<span class="app-slot__num">${i + 1}</span>`}
      <span>${c ? c.short.toUpperCase() + " CHECK" : `EMPTY SLOT ${i + 1}`}</span>
      <span class="app-slot__led"></span>
    </button>`;
  }

  /** Scan beam across a chat device, then stamp a verdict. Returns a GSAP timeline. */
  function scan(deviceEl, { passes = 2, duration = 1.1 } = {}) {
    if (!window.gsap || !deviceEl) return null;
    const beam = deviceEl.querySelector(".device__scan");
    const screen = deviceEl.querySelector(".device__screen");
    const h = screen.getBoundingClientRect().height;
    return gsap.timeline()
      .set(beam, { opacity: 1, y: -60 })
      .to(beam, { y: h, duration, ease: "sine.inOut", repeat: passes - 1, yoyo: true })
      .to(beam, { opacity: 0, duration: 0.2 });
  }

  function stamp(deviceEl, text, kind = "fail") {
    const el = deviceEl?.querySelector(".device__stamp");
    if (!el) return null;
    el.className = `device__stamp device__stamp--${kind}`;
    el.textContent = text;
    if (!window.gsap) { el.style.opacity = 1; return null; }
    return gsap.fromTo(el, { opacity: 0, scale: 2.4, rotate: -24 }, { opacity: 1, scale: 1, rotate: -10, duration: 0.45, ease: "snap" });
  }
  function clearStamp(deviceEl) {
    const el = deviceEl?.querySelector(".device__stamp");
    if (el) { el.style.opacity = 0; el.textContent = ""; }
  }

  function setMeter(deviceEl, fraction) {
    const m = deviceEl?.querySelector("[data-meter]");
    if (!m) return;
    const len = 87.96;   // 2π × r14, matches the inline dasharray
    if (window.gsap) gsap.to(m, { strokeDashoffset: len * (1 - fraction), duration: 0.6, ease: "power2.out" });
    else m.style.strokeDashoffset = len * (1 - fraction);
  }

  /* ---------------- scan focus: light up what a check is reading ---------------- */

  const PART = { who: ".device__who", fwd: ".msg__fwd", from: ".msg__from", head: ".msg__head", bubble: ".msg" };
  const STATUS_WORD = { ok: "PASS", warn: "WARNING", fail: "FAIL" };

  function partsOf(deviceEl, parts = []) {
    const lines = deviceEl.querySelectorAll(".msg .msg__line");
    return parts.flatMap((p) => (/^l\d+$/.test(p) ?[lines[+p.slice(1)]] : [...deviceEl.querySelectorAll(PART[p] || p)])).filter(Boolean);
  }

  /** Highlight the parts of the message a check is reading, with a tag naming the check. */
  function focus(deviceEl, parts, checkId) {
    if (!deviceEl) return;
    unfocus(deviceEl);
    const els = partsOf(deviceEl, parts);
    if (!els.length) return;
    const screen = deviceEl.querySelector(".device__screen");
    deviceEl.dataset.focusCheck = checkId;
    els.forEach((el) => el.classList.add("scan-focus"));
    // inside the bubble, everything the check is NOT reading steps back
    if (els.some((el) => el.closest(".msg") && !el.classList.contains("msg"))) deviceEl.classList.add("is-focus-in-msg");

    let tag = screen.querySelector(".scan-tag");
    if (!tag) {
      tag = document.createElement("span");
      tag.className = "scan-tag";
      screen.appendChild(tag);
    }
    const c = FND.data.CHECKS[checkId];
    tag.dataset.status = "scanning";
    tag.innerHTML = `${FND.icon(c.icon)}<span>${c.short} check</span>`;
    // pin the tag just above the first thing being read (or inside the top of the bubble)
    const sr = screen.getBoundingClientRect();
    const r = els[0].getBoundingClientRect();
    const k = sr.width / 100;                                    // 1cqw of the device
    // above the first thing being read; below it when that would run into the status bar
    const above = r.top - sr.top - 8.5 * k;
    const top = above >= 12 * k ? above : r.bottom - sr.top + 2.2 * k;
    tag.style.left = `${Math.min(Math.max(2 * k, r.left - sr.left), sr.width - 50 * k)}px`;
    tag.style.top = `${top}px`;
    if (window.gsap) {
      gsap.killTweensOf(tag);
      gsap.fromTo(tag, { autoAlpha: 0, scale: 0.6, y: 6 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.28, ease: "back.out(2.6)" });
    }
  }

  /** Colour the highlighted parts with the check's result. */
  function focusResult(deviceEl, status) {
    if (!deviceEl) return;
    deviceEl.querySelectorAll(".scan-focus").forEach((el) => { el.dataset.status = status; });
    const tag = deviceEl.querySelector(".scan-tag");
    if (!tag) return;
    tag.dataset.status = status;
    tag.querySelector("span").textContent += ` · ${STATUS_WORD[status] || ""}`;
    if (window.gsap) gsap.fromTo(tag, { scale: 1.2 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
  }

  function unfocus(deviceEl) {
    if (!deviceEl) return;
    deviceEl.querySelectorAll(".scan-focus").forEach((el) => { el.classList.remove("scan-focus"); delete el.dataset.status; });
    deviceEl.classList.remove("is-focus-in-msg");
    delete deviceEl.dataset.focusCheck;
    const tag = deviceEl.querySelector(".scan-tag");
    if (tag) { if (window.gsap) gsap.killTweensOf(tag); tag.style.visibility = "hidden"; tag.style.opacity = 0; }
  }

  FND.device = { chat, bubble, detector, slot, status, statusIcons, scan, stamp, clearStamp, setMeter, frame, focus, focusResult, unfocus };
})();
