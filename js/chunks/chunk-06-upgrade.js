/* ==========================================================================
   Chunk 6 · Upgrade to V2 — scene-chunk6 · step 6/7
   Internal steps: choose, unlocked, upgrade, retest, ready, order
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const D = FND.data;
  const icon = FND.icon;
  const NEW = ["proof", "confirm"];
  const RETEST = () => D.TEST_MESSAGES.find((m) => m.id === "bonus-marks");

  function panelHead(ctx, eyebrow, title, captionKey, id, pose = "guide") {
    return `<p class="eyebrow">${eyebrow}</p>
      <h2 class="title" data-title>${title}</h2>
      ${FND.tpl.devLine(FND.audio.text(captionKey), id, pose)}`;
  }
  function intro(ctx, opts, key, id) {
    if (opts.same) return;
    FND.fx.enter(ctx.root);
    FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
    FND.say(key, ctx.$("#" + id));
  }

  /* ---------------- choose: pick exactly 2 of 4 ---------------- */

  function renderChoose(ctx, S, opts) {
    ctx.root.innerHTML = `
      <div class="cl cl--center">
        <div class="panel panel--wide" data-in>
          ${panelHead(ctx, "Step 6 / 7 · Upgrade", "Upgrade V1", "upgrade_choose", "c6Caption", "thinking")}
          <p class="group-label">Pick exactly 2 checks to add <span data-picked>(${S.picks.length}/2)</span></p>
          <div class="pick-grid">
            ${D.UPGRADE_CHOICES.map((c) => {
              const on = S.picks.includes(c.id);
              return `<button type="button" class="pick ${on ? "is-selected" : ""}" data-action="pick-check" data-value="${c.id}" aria-pressed="${on}">
                ${FND.tpl.checkIcon(c.id, c.icon)}
                <span><span class="check-card__name">${c.name}</span><p class="check-card__q">${c.q}</p></span>
                <span class="option__tick">${icon("check")}</span>
              </button>`;
            }).join("")}
          </div>
        </div>
      </div>`;
    ctx.cta({ label: "Check my picks", action: "check-missing", disabled: S.picks.length !== 2 });
    FND.hint.reset("upgrade_wrong");
    if (!opts.same) {
      ctx.track(gsap.from(ctx.$$(".pick"), { y: 30, autoAlpha: 0, stagger: 0.1, duration: 0.5, delay: 0.4, ease: "back.out(1.6)" }));
    }
    intro(ctx, opts, "upgrade_choose", "c6Caption");
  }

  function pickCheck(ctx, el) {
    const S = ctx.S;
    const id = el.dataset.value;
    const i = S.picks.indexOf(id);
    if (i >= 0) S.picks.splice(i, 1);
    else if (S.picks.length < 2) S.picks.push(id);
    else { FND.fx.shake(ctx.$(".pick-grid")); FND.devPop.say("Only two! Tap one to swap it out.", { mood: "hint", holdMs: 1600 }); return; }
    FND.audio.sfx("tap");
    ctx.$$(".pick").forEach((p) => {
      const on = S.picks.includes(p.dataset.value);
      p.classList.toggle("is-selected", on);
      p.classList.remove("is-wrong");
      p.setAttribute("aria-pressed", on);
    });
    FND.fx.pop(el, 1.03);
    ctx.$("[data-picked]").textContent = `(${S.picks.length}/2)`;
    FND.cta.enable(S.picks.length === 2);
    ctx.save();
  }

  function checkMissing(ctx) {
    const S = ctx.S;
    const wrong = S.picks.filter((id) => !D.UPGRADE_CHOICES.find((c) => c.id === id).correct);
    if (!wrong.length) {
      FND.audio.sfx("good");
      ctx.$$(".pick.is-selected").forEach((p) => FND.fx.burstAt(p, { count: 14 }));
      ctx.go("unlocked");
      return;
    }
    FND.audio.sfx("bad");
    FND.hint.wrong();
    wrong.forEach((id) => {
      const el = ctx.$(`.pick[data-value="${id}"]`);
      el.classList.add("is-wrong");
      FND.fx.shake(el);
    });
    const why = wrong.map((id) => D.UPGRADE_CHOICES.find((c) => c.id === id).why).join(" ");
    FND.devPop.say(`Careful! ${why} Pick checks that find evidence.`, { mood: "bad", key: "upgrade_wrong" });
  }

  /* ---------------- unlocked: tap each lock ---------------- */

  function renderUnlocked(ctx, S, opts) {
    ctx.root.innerHTML = `
      <div class="cl cl--center">
        <div class="panel panel--wide" data-in>
          ${panelHead(ctx, "Step 6 / 7 · Smart picks", "2 New Checks Unlocked", "upgrade_unlocked", "c6Caption", "happy")}
          <div class="locked-grid">
            ${NEW.map((id) => {
              const c = D.CHECKS[id];
              const open = S.unlocked.includes(id);
              return `<button type="button" class="locked" data-action="unlock-missing" data-value="${id}" aria-label="Unlock ${c.name}" ${open ? 'data-open="1"' : ""}>
                <span class="locked__face locked__front">
                  <svg class="locked__padlock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path class="shackle" d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor"/><circle cx="12" cy="15.5" r="1.5" fill="#12296b" stroke="none"/></svg>
                  TAP TO UNLOCK
                </span>
                <span class="locked__face locked__back check-card" style="display:flex">
                  ${FND.tpl.checkIcon(id)}
                  <span class="check-card__name">${c.name}</span>
                  <p class="check-card__q">${c.q}</p>
                </span>
              </button>`;
            }).join("")}
          </div>
        </div>
      </div>`;
    const done = S.unlocked.length === 2;
    ctx.cta({ label: "Go upgrade", action: "go-upgrade", disabled: !done });
    FND.hint.reset(null);
    ctx.$$(".locked[data-open]").forEach((b) => gsap.set(b, { rotateY: 180 }));
    ctx.$$(".locked:not([data-open]) .locked__padlock").forEach((p, i) => {
      ctx.track(gsap.to(p, { rotation: 8, duration: 0.12, repeat: 3, yoyo: true, repeatDelay: 1.6, delay: 1 + i * 0.4, ease: "none" }));
    });
    intro(ctx, opts, "upgrade_unlocked", "c6Caption");
  }

  function unlockMissing(ctx, el) {
    const S = ctx.S;
    const id = el.dataset.value;
    if (S.unlocked.includes(id) || el.dataset.busy) return;
    el.dataset.busy = "1";
    S.unlocked.push(id);
    ctx.save();
    const shackle = el.querySelector(".shackle");
    const tl = ctx.track(gsap.timeline());
    tl.to(el.querySelector(".locked__padlock"), { rotation: 0, scale: 1.1, duration: 0.15 })
      .to(shackle, { y: -4, duration: 0.2, ease: "back.out(3)", onStart: () => FND.audio.sfx("unlock") })
      .to(el, { rotateY: 180, duration: 0.7, ease: "back.out(1.2)" }, "+=0.05")
      .add(() => {
        el.dataset.open = "1";
        FND.fx.burstAt(el, { count: 22 });
        if (S.unlocked.length === 2) { FND.cta.enable(true); FND.fx.celebrate("small"); }
      });
  }

  /* ---------------- upgrade: install Proof + Confirm ---------------- */

  function renderUpgrade(ctx, S, opts) {
    const slots = [...D.V1_CHECKS.map((id) => ({ id })), ...NEW.map((id) => ({ id: S.installed.includes(id) ? id : null, isNew: true }))];
    ctx.root.innerHTML = `
      <div class="cl">
        <div class="cl__device" data-in>${FND.device.detector({ id: "c6Device", version: "V1", slots, label: "Upgrade bench" })}</div>
        <div class="cl__panel">
          <div class="panel" data-in>
            ${panelHead(ctx, "Step 6 / 7 · Upgrade bench", "Upgrade to V2", "upgrade_install", "c6Caption")}
            <div class="install-list">
              ${NEW.map((id) => {
                const c = D.CHECKS[id];
                const done = S.installed.includes(id);
                return `<div class="install" data-install="${id}">
                  ${FND.tpl.checkIcon(id)}
                  <span><span class="check-row__name">${c.name}</span><span class="check-row__why">${c.q}</span></span>
                  <button type="button" class="btn ${done ? "btn--green" : ""}" data-action="add" data-value="${id}" ${done ? "disabled" : ""}>${done ? "Installed" : "Install"}</button>
                  <span class="install__bar"><i style="${done ? "transform:scaleX(1)" : ""}"></i></span>
                </div>`;
              }).join("")}
            </div>
          </div>
        </div>
      </div>`;
    ctx.cta({ label: "Activate V2", action: "activate", disabled: S.installed.length < 2, tone: "green" });
    FND.hint.reset(null);
    intro(ctx, opts, "upgrade_install", "c6Caption");
  }

  function add(ctx, el) {
    const S = ctx.S;
    const id = el.dataset.value;
    if (S.installed.includes(id) || ctx.isBusy()) return;
    ctx.busy(true);
    FND.audio.sfx("tap");
    el.disabled = true;
    el.textContent = "Installing…";
    const row = ctx.$(`[data-install="${id}"]`);
    const slotIndex = 3 + NEW.indexOf(id);
    const slotEl = ctx.$(`.app-slot[data-slot="${slotIndex}"]`);
    const tl = ctx.track(gsap.timeline());
    tl.to(row.querySelector(".install__bar i"), { scaleX: 1, duration: 0.9, ease: "power1.inOut" })
      .add(() => {
        FND.fx.flyGhost(row.querySelector(".check-ico"), slotEl, {
          html: row.querySelector(".check-ico").outerHTML,
          duration: 0.55,
          onArrive: ctx.guard(() => {
            S.installed.push(id);
            ctx.save();
            slotEl.outerHTML = FND.device.slot({ id, isNew: true }, slotIndex);
            const fresh = ctx.$(`.app-slot[data-slot="${slotIndex}"]`);
            FND.ui.hydrateIcons(fresh);
            gsap.fromTo(fresh, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: "elastic.out(1,.45)" });
            FND.fx.burstAt(fresh, { count: 12 });
            FND.audio.sfx("snap");
            el.textContent = "Installed";
            el.classList.add("btn--green");
            const dev = ctx.$("#c6Device");
            dev.querySelector("[data-count]").textContent = 3 + S.installed.length;
            FND.device.setMeter(dev, (3 + S.installed.length) / 5);
            ctx.busy(false);
            if (S.installed.length === 2) FND.cta.enable(true);
          }),
        });
      });
  }

  function activate(ctx) {
    if (ctx.isBusy()) return;
    const dev = ctx.$("#c6Device");
    const boot = dev.querySelector("[data-boot]");
    const ver = dev.querySelector("[data-ver]");
    ctx.busy(true);
    FND.cta.enable(false);
    FND.say("upgrade_active", ctx.$("#c6Caption"));
    FND.ui.pose(ctx.$("#c6Caption"), "happy");
    const tl = ctx.track(gsap.timeline({ onComplete: ctx.guard(() => { ctx.busy(false); ctx.go("retest"); }) }));
    tl.add(() => FND.audio.sfx("boot"))
      .to(dev, { keyframes: { scale: [1, 0.97, 1.03, 1] }, duration: 0.5 })
      .to(dev.querySelectorAll(".app-slot"), { backgroundColor: "rgba(249,161,27,.4)", duration: 0.12, stagger: 0.08, yoyo: true, repeat: 1 }, "<")
      .set(boot, { autoAlpha: 1 })
      .add(FND.fx.scramble(boot.querySelector("[data-boot-title]"), "FAKE NEWS DETECTOR V2", { duration: 0.8 }))
      .add(() => { boot.querySelector("small").textContent = "5 CHECKS ACTIVE"; })
      .add(FND.fx.scramble(ver, "V2", { duration: 0.5 }), "<")
      .add(() => { ver.classList.add("is-v2"); FND.fx.celebrate("side"); })
      .to(boot, { autoAlpha: 0, duration: 0.4 }, "+=0.9")
      .to({}, { duration: 0.5 });
  }

  /* ---------------- retest: the same message, five checks ---------------- */

  function renderRetest(ctx, S, opts) {
    const m = RETEST();
    const results = { ...m.results, ...m.v2 };
    ctx.root.innerHTML = `
      <div class="cl">
        <div class="cl__device" data-in>${FND.device.chat(m, { id: "c6Chat" })}</div>
        <div class="cl__panel">
          <div class="panel" data-in>
            ${panelHead(ctx, "Step 6 / 7 · V2 retest", "Retest the Same Message", S.scanned ? "retest_done" : "retest_intro", "c6Caption", S.verdictOk ? "thumbs" : "thinking")}
            <div class="case-grid">
              <div class="check-rows">${D.V2_CHECKS.map((id) => S.scanned ? FND.tpl.checkRow(id, results[id].s, results[id].why) : FND.tpl.checkRow(id)).join("")}</div>
              <div data-verdict>
                <p class="group-label">Your verdict</p>
                ${S.scanned ? "" : '<p class="scan-first">Scan the message first.</p>'}
                <div class="options options--stack">
                  ${Object.values(D.VERDICTS).map((v) => FND.tpl.option({ value: v.id, label: v.label, iconName: v.icon, action: "pick-verdict", selected: S.verdict === v.id, disabled: !S.scanned })).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    if (S.verdictOk) {
      ctx.cta({ label: "Continue", action: "to-ready" });
      FND.device.stamp(ctx.$("#c6Chat"), "SUSPICIOUS", "fail");
    } else if (S.scanned) ctx.cta({ label: "Check verdict", action: "check-verdict", disabled: !S.verdict });
    else ctx.cta({ label: "Scan all 5 checks", action: "scan-all", tone: "blue" });
    FND.hint.reset("retest_wrong");
    intro(ctx, opts, S.scanned ? (S.verdictOk ? "retest_right" : "retest_done") : "retest_intro", "c6Caption");
  }

  function scanAll(ctx) {
    const S = ctx.S;
    if (ctx.isBusy() || S.scanned) return;
    const m = RETEST();
    const results = { ...m.results, ...m.v2 };
    const dev = ctx.$("#c6Chat");
    ctx.busy(true);
    FND.cta.set({ label: "Scanning…", action: "", disabled: true, tone: "blue" });
    const tl = ctx.track(gsap.timeline({
      onComplete: ctx.guard(() => {
        S.scanned = true;
        ctx.save();
        ctx.busy(false);
        const box = ctx.$("[data-verdict]");
        box.querySelector(".scan-first")?.remove();
        const opts = [...box.querySelectorAll(".option")];
        opts.forEach((b) => { b.disabled = false; });
        gsap.fromTo(opts, { scale: 0.92 }, { scale: 1, duration: 0.45, stagger: 0.06, ease: "back.out(2.4)" });
        ctx.cta({ label: "Check verdict", action: "check-verdict", disabled: true });
        FND.say("retest_done", ctx.$("#c6Caption"));
      }),
    }));
    // each check lights up the part of the message it is reading, then shows its result there
    tl.add(FND.device.scan(dev, { passes: 5, duration: 0.85 }), 0);
    D.V2_CHECKS.forEach((id, i) => {
      const row = ctx.$(`[data-row="${id}"]`);
      const status = row.querySelector(".check-row__status");
      const res = results[id];
      const at = 0.3 + i * 0.9;
      tl.add(() => { row.dataset.status = "scanning"; FND.device.focus(dev, m.focus[id], id); FND.audio.sfx("scan"); }, at)
        .add(() => {
          row.dataset.status = res.s;
          row.querySelector(".check-row__why").textContent = res.why;
          FND.device.focusResult(dev, res.s);
          FND.audio.sfx(res.s === "ok" ? "ok" : "fail");
          if (NEW.includes(id)) FND.fx.shake(row);
        }, at + 0.55)
        .add(FND.fx.scramble(status, FND.tpl.statusLabel(res.s), { duration: 0.3 }), at + 0.55);
    });
    tl.add(() => FND.device.unfocus(dev), "+=0.35");
  }

  function pickVerdict(ctx, el) {
    const S = ctx.S;
    if (!S.scanned || S.verdictOk) return;
    FND.audio.sfx("tap");
    S.verdict = el.dataset.value;
    ctx.$$('[data-action="pick-verdict"]').forEach((b) => {
      b.classList.toggle("is-selected", b === el);
      b.classList.remove("is-wrong");
      b.setAttribute("aria-pressed", b === el);
    });
    FND.cta.enable(true);
    ctx.save();
  }

  function checkVerdict(ctx) {
    const S = ctx.S;
    if (!S.verdict) return;
    const el = ctx.$(`[data-action="pick-verdict"][data-value="${S.verdict}"]`);
    if (S.verdict === "suspicious") {
      S.verdictOk = true;
      ctx.save();
      el.classList.add("is-correct");
      FND.audio.sfx("good");
      FND.fx.burstAt(el, { count: 20 });
      FND.device.stamp(ctx.$("#c6Chat"), "SUSPICIOUS", "fail");
      FND.say("retest_right", ctx.$("#c6Caption"));
      FND.ui.pose(ctx.$("#c6Caption"), "thumbs");
      ctx.cta({ label: "Continue", action: "to-ready" });
      return;
    }
    FND.audio.sfx("bad");
    el.classList.add("is-wrong");
    FND.fx.shake(el);
    FND.hint.wrong();
    FND.devPop.say(FND.audio.text("retest_wrong"), { mood: "bad", key: "retest_wrong" });
  }

  /* ---------------- ready: V2 online ---------------- */

  function renderReady(ctx, S, opts) {
    ctx.root.innerHTML = `
      <div class="cl cl--hero">
        ${FND.tpl.heroFigure("happy", "Dev, jumping for joy")}
        <div class="cl__panel">
        <div class="panel panel--narrow" data-in style="text-align:center">
          ${panelHead(ctx, "Step 6 / 7 · Powered up", "Detector V2 Ready", "v2_ready", "c6Caption", "happy")}
          <div class="v2-hero" data-hero>
            <div class="v2-hero__orbit"></div>
            <div class="v2-hero__core">V2</div>
            ${D.V2_CHECKS.map((id) => FND.tpl.checkIcon(id)).join("")}
          </div>
          <div class="banner banner--ok" style="justify-content:center">${icon("check")}5 checks active</div>
        </div>
        </div>
      </div>`;
    ctx.track(FND.fx.devIn(ctx.root));
    ctx.cta({ label: "Practise the steps", action: "practice-process" });
    FND.hint.reset(null);

    const hero = ctx.$("[data-hero]");
    const r = hero.offsetWidth * 0.44;
    const c = hero.offsetWidth / 2;
    const path = `M${c},${c - r} a${r},${r} 0 1,1 -0.01,0 z`;
    const icons = [...hero.querySelectorAll(".check-ico")];
    icons.forEach((el, i) => {
      if (window.MotionPathPlugin) {
        const t = ctx.track(gsap.to(el, { motionPath: { path, start: i / 5, end: i / 5 + 1 }, duration: 12, repeat: -1, ease: "none" }));
        t.progress(0);
      }
    });
    ctx.track(gsap.from(icons, { scale: 0, duration: 0.5, stagger: 0.1, ease: "back.out(3)", delay: 0.5 }));
    ctx.track(gsap.from(hero.querySelector(".v2-hero__core"), { scale: 0, rotate: -90, duration: 0.8, ease: "back.out(1.8)", delay: 0.3 }));
    ctx.track(gsap.to(hero.querySelector(".v2-hero__orbit"), { rotation: 360, duration: 30, repeat: -1, ease: "none" }));
    if (!opts.same && !opts.back) { FND.fx.celebrate("side"); FND.audio.sfx("fanfare"); }
    intro(ctx, opts, "v2_ready", "c6Caption");
  }

  /* ---------------- order: read → run → review → decide ---------------- */

  const STEP = (id) => D.PROCESS_STEPS.find((s) => s.id === id);
  const RIGHT = D.PROCESS_STEPS.map((s) => s.id);

  function itemHTML(id, i, n) {
    const s = STEP(id);
    return `<li class="order-item" data-id="${id}">
      <span class="order-item__grip">${icon("grip")}</span>
      <span class="order-item__num">${i + 1}</span>
      <span>${s.text}</span>
      <span class="order-item__btns">
        <button type="button" data-action="move-process" data-dir="-1" aria-label="Move “${s.text}” up" ${i === 0 ? "disabled" : ""}>${icon("chev-up")}</button>
        <button type="button" data-action="move-process" data-dir="1" aria-label="Move “${s.text}” down" ${i === n - 1 ? "disabled" : ""}>${icon("chev-down")}</button>
      </span>
    </li>`;
  }

  function renderOrder(ctx, S, opts) {
    ctx.root.innerHTML = `
      <div class="cl cl--center">
        <div class="panel panel--narrow" data-in>
          ${panelHead(ctx, "Step 6 / 7 · The process", "Put the Steps in Order", S.orderOk ? "order_right" : "order_intro", "c6Caption", S.orderOk ? "thumbs" : "thinking")}
          <ol class="order-list" data-order>${S.order.map((id, i) => itemHTML(id, i, S.order.length)).join("")}</ol>
        </div>
      </div>`;
    FND.hint.reset("order_wrong");
    if (S.orderOk) {
      ctx.$$(".order-item").forEach((li) => li.classList.add("is-right"));
      ctx.cta({ label: "Start final mission", action: "finish" });
    } else {
      ctx.cta({ label: "Check order", action: "check-process" });
      if (window.Sortable) {
        ctx.track(Sortable.create(ctx.$("[data-order]"), {
          animation: 220,
          easing: "cubic-bezier(.2,.9,.25,1)",
          filter: "button",
          preventOnFilter: false,
          onStart: () => FND.audio.sfx("tap"),
          onEnd: () => { readOrder(ctx); FND.audio.sfx("snap"); },
        }));
      }
    }
    if (!opts.same) ctx.track(gsap.from(ctx.$$(".order-item"), { x: -30, autoAlpha: 0, stagger: 0.08, duration: 0.45, delay: 0.4 }));
    intro(ctx, opts, S.orderOk ? "order_right" : "order_intro", "c6Caption");
  }

  /** Sync state + numbering + arrow buttons from the DOM order. */
  function readOrder(ctx) {
    const S = ctx.S;
    const items = ctx.$$(".order-item");
    S.order = items.map((li) => li.dataset.id);
    items.forEach((li, i) => {
      li.classList.remove("is-right", "is-wrong");
      li.querySelector(".order-item__num").textContent = i + 1;
      const [up, down] = li.querySelectorAll("[data-action='move-process']");
      up.disabled = i === 0;
      down.disabled = i === items.length - 1;
    });
    ctx.save();
  }

  function moveProcess(ctx, el) {
    const S = ctx.S;
    if (S.orderOk) return;
    const li = el.closest(".order-item");
    const list = ctx.$("[data-order]");
    const dir = +el.dataset.dir;
    const sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!sib) return;
    const state = window.Flip ? Flip.getState(ctx.$$(".order-item")) : null;
    if (dir < 0) list.insertBefore(li, sib); else list.insertBefore(sib, li);
    readOrder(ctx);
    FND.audio.sfx("tap");
    if (state) Flip.from(state, { duration: 0.4, ease: "power2.inOut" });
    el.focus();
  }

  function checkProcess(ctx) {
    const S = ctx.S;
    const items = ctx.$$(".order-item");
    const ok = S.order.join() === RIGHT.join();
    items.forEach((li, i) => {
      const right = li.dataset.id === RIGHT[i];
      li.classList.toggle("is-right", right);
      li.classList.toggle("is-wrong", !right);
      if (!right) FND.fx.shake(li);
    });
    if (!ok) {
      FND.audio.sfx("bad");
      FND.hint.wrong();
      FND.devPop.say(FND.audio.text("order_wrong"), { mood: "bad", key: "order_wrong" });
      return;
    }
    S.orderOk = true;
    ctx.save();
    FND.audio.sfx("good");
    ctx.track(gsap.fromTo(items, { scale: 1 }, { scale: 1.04, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.08 }));
    items.forEach((li) => FND.fx.burstAt(li.querySelector(".order-item__num"), { count: 8 }));
    FND.say("order_right", ctx.$("#c6Caption"));
    FND.ui.pose(ctx.$("#c6Caption"), "thumbs");
    ctx.cta({ label: "Start final mission", action: "finish" });
  }

  /* ---------------- module ---------------- */

  window.Chunk6 = FND.defineChunk({
    key: "chunk6",
    sceneId: "scene-chunk6",
    steps: ["choose", "unlocked", "upgrade", "retest", "ready", "order"],
    fresh: () => ({
      step: "choose", picks: [], unlocked: [], installed: [],
      scanned: false, verdict: null, verdictOk: false,
      order: D.PROCESS_SHUFFLED.slice(), orderOk: false,
    }),
    // coming back: the ordering screen starts shuffled again, with everything before it done
    atEnd: (S) => ({
      ...S, step: "order", picks: NEW.slice(), unlocked: NEW.slice(), installed: NEW.slice(),
      scanned: true, verdict: "suspicious", verdictOk: true,
    }),
    backEntries: (S) => {
      const base = { ...S, picks: [], unlocked: [], installed: [], scanned: false, verdict: null, verdictOk: false };
      return [
        { ...base, step: "choose" },
        { ...base, step: "unlocked", picks: NEW.slice() },
        { ...base, step: "upgrade", picks: NEW.slice(), unlocked: NEW.slice() },
        { ...base, step: "retest", picks: NEW.slice(), unlocked: NEW.slice(), installed: NEW.slice() },
        { ...base, step: "ready", picks: NEW.slice(), unlocked: NEW.slice(), installed: NEW.slice(), scanned: true, verdict: "suspicious", verdictOk: true },
      ];
    },
    render(ctx, S, opts) {
      ({ choose: renderChoose, unlocked: renderUnlocked, upgrade: renderUpgrade, retest: renderRetest, ready: renderReady, order: renderOrder })[S.step](ctx, S, opts);
    },
    actions: {
      "pick-check": pickCheck,
      "check-missing": checkMissing,
      "unlock-missing": unlockMissing,
      "go-upgrade": (ctx) => ctx.go("upgrade"),
      add,
      activate,
      "scan-all": scanAll,
      "pick-verdict": pickVerdict,
      "check-verdict": checkVerdict,
      "to-ready": (ctx) => ctx.go("ready"),
      "practice-process": (ctx) => ctx.go("order"),
      "move-process": moveProcess,
      "check-process": checkProcess,
      finish: (ctx) => ctx.leave("scene-chunk7", "chunk7"),
    },
  });
})();
