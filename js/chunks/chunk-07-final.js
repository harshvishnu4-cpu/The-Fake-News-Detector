/* ==========================================================================
   Chunk 7 · Final mission — scene-chunk7 · step 7/7
   Internal steps: intro, case (×3), results, learned, complete
   Per case: scan → pick-verdict + pick-action → submit → next
   Three messages, no help: the hint bulb stays off in this chunk.
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const D = FND.data;
  const icon = FND.icon;

  const caseAt = (i) => D.FINAL_CASES[i];
  const STAMP = { verified: ["VERIFIED", "ok"], check: ["CHECK FIRST", "warn"], suspicious: ["SUSPICIOUS", "fail"] };

  /* ---------------- intro ---------------- */

  function renderIntro(ctx, S, opts) {
    ctx.root.innerHTML = `
      <div class="cl cl--hero">
        ${FND.tpl.heroFigure("guide", "Dev, introducing the final mission")}
        <div class="cl__panel">
        <div class="panel panel--narrow" data-in>
          <p class="eyebrow">Step 7 / 7 · No help</p>
          <h2 class="title title--xl" data-title>Final Mission</h2>
          ${FND.tpl.devLine(FND.audio.text("final_intro"), "c7Caption")}
          <div class="metrics">
            <div class="metric"><b>3</b><span>new messages</span></div>
            <div class="metric"><b>5</b><span>checks in V2</span></div>
            <div class="metric"><b>0</b><span>hints</span></div>
          </div>
          <div class="five-icons">${D.V2_CHECKS.map((id) => FND.tpl.checkIcon(id)).join("")}</div>
        </div>
        </div>
      </div>`;
    ctx.track(FND.fx.devIn(ctx.root));
    ctx.cta({ label: "Begin final mission", action: "begin" });
    ctx.track(gsap.from(ctx.$$(".metric, .five-icons .check-ico"), { scale: 0, stagger: 0.08, duration: 0.45, delay: 0.5, ease: "back.out(2.4)" }));
    if (!opts.same) {
      FND.fx.enter(ctx.root);
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.15 });
      FND.say("final_intro", ctx.$("#c7Caption"));
    }
  }

  /* ---------------- case ---------------- */

  function renderCase(ctx, S, opts) {
    const c = caseAt(S.index);
    ctx.root.innerHTML = `
      <div class="cl">
        <div class="cl__device" data-in>${FND.device.chat(c, { id: "c7Device" })}</div>
        <div class="cl__panel">
          <div class="panel" data-in>
            <p class="eyebrow">Final mission · Message ${S.index + 1} / 3</p>
            <h2 class="title" data-title>${c.title}</h2>
            <div class="case-grid">
              <div class="check-rows" data-rows>${D.V2_CHECKS.map((id) => S.phase === "scan" ? FND.tpl.checkRow(id) : FND.tpl.checkRow(id, c.results[id].s, c.results[id].why)).join("")}</div>
              <div class="case-choices" data-choose>
                ${S.phase === "scan" ? '<p class="scan-first">Scan the message first.</p>' : ""}
                <p class="group-label">Verdict</p>
                <div class="options options--stack">
                  ${Object.values(D.VERDICTS).map((v) => FND.tpl.option({ value: v.id, label: v.label, iconName: v.icon, action: "pick-verdict", selected: S.verdict === v.id, disabled: S.phase === "scan" })).join("")}
                </div>
                <p class="group-label">Action</p>
                <div class="options options--stack">
                  ${Object.values(D.ACTIONS).map((a) => FND.tpl.option({ value: a.id, label: a.label, iconName: a.icon, action: "pick-action", selected: S.action === a.id, disabled: S.phase === "scan" })).join("")}
                </div>
              </div>
            </div>
            <div data-feedback></div>
          </div>
        </div>
      </div>`;
    FND.hint.reset(null, { enabled: false });
    if (!opts.same) {
      FND.fx.enter(ctx.root);
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
    }
    if (S.phase === "scan") ctx.cta({ label: "Scan with V2", action: "scan", tone: "blue" });
    else if (S.phase === "choose") ctx.cta({ label: "Submit", action: "submit", disabled: !(S.verdict && S.action) });
    else showResult(ctx, { instant: true });
  }

  function scan(ctx) {
    const S = ctx.S;
    if (ctx.isBusy() || S.phase !== "scan") return;
    const c = caseAt(S.index);
    const dev = ctx.$("#c7Device");
    ctx.busy(true);
    FND.cta.set({ label: "Scanning…", action: "", disabled: true, tone: "blue" });
    const tl = ctx.track(gsap.timeline({
      onComplete: ctx.guard(() => {
        ctx.busy(false);
        S.phase = "choose";
        ctx.save();
        const box = ctx.$("[data-choose]");
        box.querySelector(".scan-first")?.remove();
        const opts = [...box.querySelectorAll(".option")];
        opts.forEach((b) => { b.disabled = false; });
        gsap.fromTo(opts, { scale: 0.92 }, { scale: 1, stagger: 0.04, duration: 0.4, ease: "back.out(2.4)" });
        ctx.cta({ label: "Submit", action: "submit", disabled: true });
        FND.audio.narrate("final_scan_done");
      }),
    }));
    // each check lights up the part of the message it is reading, then shows its result there
    tl.add(FND.device.scan(dev, { passes: 5, duration: 0.75 }), 0);
    D.V2_CHECKS.forEach((id, i) => {
      const row = ctx.$(`[data-row="${id}"]`);
      const status = row.querySelector(".check-row__status");
      const res = c.results[id];
      const at = 0.25 + i * 0.8;
      tl.add(() => { row.dataset.status = "scanning"; FND.device.focus(dev, c.focus[id], id); FND.audio.sfx("scan"); }, at)
        .add(() => {
          row.dataset.status = res.s;
          row.querySelector(".check-row__why").textContent = res.why;
          FND.device.focusResult(dev, res.s);
          FND.audio.sfx(res.s === "ok" ? "ok" : "warn");
        }, at + 0.5)
        .add(FND.fx.scramble(status, FND.tpl.statusLabel(res.s), { duration: 0.25 }), at + 0.5);
    });
    tl.add(() => FND.device.unfocus(dev), "+=0.3");
  }

  function pick(ctx, el, field, action) {
    const S = ctx.S;
    if (S.phase !== "choose") return;
    FND.audio.sfx("tap");
    S[field] = el.dataset.value;
    ctx.$$(`[data-action="${action}"]`).forEach((b) => {
      b.classList.toggle("is-selected", b === el);
      b.classList.remove("is-wrong", "is-correct");
      b.setAttribute("aria-pressed", b === el);
    });
    FND.fx.pop(el, 1.03);
    ctx.$("[data-feedback]").innerHTML = "";
    FND.cta.enable(!!(S.verdict && S.action));
    ctx.save();
  }

  function submit(ctx) {
    const S = ctx.S;
    if (S.phase !== "choose" || !S.verdict || !S.action) return;
    const c = caseAt(S.index);
    S.attempts[S.index] += 1;
    const vOk = S.verdict === c.verdict;
    const aOk = S.action === c.action;
    const vEl = ctx.$(`[data-action="pick-verdict"][data-value="${S.verdict}"]`);
    const aEl = ctx.$(`[data-action="pick-action"][data-value="${S.action}"]`);
    vEl.classList.add(vOk ? "is-correct" : "is-wrong");
    aEl.classList.add(aOk ? "is-correct" : "is-wrong");

    if (vOk && aOk) {
      if (S.attempts[S.index] === 1) S.firstTry[S.index] = true;
      S.phase = "result";
      ctx.save();
      FND.audio.sfx("good");
      showResult(ctx);
      return;
    }
    ctx.save();
    FND.audio.sfx("bad");
    [!vOk && vEl, !aOk && aEl].filter(Boolean).forEach((el) => FND.fx.shake(el));
    const part = !vOk && !aOk ? "verdict and your action" : !vOk ? "verdict" : "action";
    ctx.$("[data-feedback]").innerHTML = `<div class="banner banner--fail">${icon("x")}Not quite — rethink your ${part}.</div>`;
    FND.ui.hydrateIcons(ctx.$("[data-feedback]"));
    FND.audio.narrate("final_wrong");
  }

  function showResult(ctx, { instant = false } = {}) {
    const S = ctx.S;
    const c = caseAt(S.index);
    const [text, kind] = STAMP[c.verdict];
    ctx.$$(".option").forEach((b) => { b.disabled = !b.classList.contains("is-selected"); });
    ctx.$(`[data-action="pick-verdict"][data-value="${c.verdict}"]`)?.classList.add("is-correct", "is-selected");
    ctx.$(`[data-action="pick-action"][data-value="${c.action}"]`)?.classList.add("is-correct", "is-selected");
    const fb = ctx.$("[data-feedback]");
    fb.innerHTML = `<div class="banner banner--ok">${icon("check")}<span>${S.firstTry[S.index] ? "Correct first try! " : "Correct! "}${c.lesson}</span></div>`;
    FND.ui.hydrateIcons(fb);
    FND.device.stamp(ctx.$("#c7Device"), text, kind);
    if (!instant) {
      gsap.from(fb.firstChild, { scale: 0.85, autoAlpha: 0, duration: 0.45, ease: "back.out(2)" });
      FND.fx.burstAt(ctx.$("#c7Device .device__stamp"), { count: 24 });
      FND.audio.narrate("final_right");
    }
    ctx.cta({ label: S.index < 2 ? "Next message" : "See results", action: "next" });
  }

  /* ---------------- results ---------------- */

  function renderResults(ctx, S, opts) {
    const first = S.firstTry.filter(Boolean).length;
    FND.state.set({ finalSolved: 3, firstTry: first });
    ctx.root.innerHTML = `
      <div class="cl cl--hero">
        ${FND.tpl.heroFigure("thumbs", "Dev giving you a thumbs up")}
        <div class="cl__panel">
        <div class="panel panel--narrow" data-in style="text-align:center">
          <svg class="trophy" viewBox="0 0 140 140" aria-hidden="true">
            <path data-draw d="M44 26h52v30a26 26 0 0 1-52 0z" fill="#f9a11b" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
            <path data-draw d="M44 34H28a16 16 0 0 0 19 22M96 34h16a16 16 0 0 1-19 22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
            <path d="M62 82h16v18H62z" fill="#ffd23f"/>
            <rect x="44" y="100" width="52" height="16" rx="5" fill="#0c2d8f" stroke="#fff" stroke-width="4"/>
            <path d="M70 36l5 10 11 1.5-8 7.5 2 11-10-5.3-10 5.3 2-11-8-7.5 11-1.5z" fill="#fff"/>
          </svg>
          <p class="eyebrow">Final mission results</p>
          <h2 class="title title--xl" data-title>You Did It!</h2>
          ${FND.tpl.devLine(FND.audio.text("results"), "c7Caption", "thumbs")}
          <div class="metrics">
            <div class="metric"><b data-count="3">0</b><span>of 3 solved</span></div>
            <div class="metric"><b data-count="${first}">0</b><span>first try</span></div>
            <div class="metric"><b data-count="5">0</b><span>checks used</span></div>
          </div>
          <div class="five-icons">${D.V2_CHECKS.map((id) => FND.tpl.checkIcon(id)).join("")}</div>
        </div>
        </div>
      </div>`;
    ctx.track(FND.fx.devIn(ctx.root));
    ctx.cta({ label: "Review what I learned", action: "review-learning" });
    const tl = ctx.track(gsap.timeline({ delay: 0.3 }));
    tl.from(ctx.$(".trophy"), { scale: 0, rotate: -30, duration: 0.7, ease: "back.out(2)" })
      .add(FND.fx.drawIn(ctx.$$("[data-draw]")[1], { duration: 0.5 }), "-=0.2");
    ctx.$$("[data-count]").forEach((b, i) => tl.add(FND.fx.countTo(b, +b.dataset.count, { duration: 0.7 }), 0.5 + i * 0.15));
    tl.from(ctx.$$(".five-icons .check-ico"), { y: 20, autoAlpha: 0, stagger: 0.08, duration: 0.4 }, 0.8);
    if (!opts.same && !opts.back) { FND.fx.celebrate("small"); FND.audio.sfx("fanfare"); }
    if (!opts.same) {
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.3 });
      FND.say("results", ctx.$("#c7Caption"));
    }
  }

  /* ---------------- learned: the promise ---------------- */

  const HABITS = [
    { icon: "eye", title: "Read carefully", text: "Read the whole message before reacting to it." },
    { icon: "brain", title: "Think before sharing", text: "Run the checks. If you can’t verify it, don’t forward it." },
    { icon: "heart", title: "Help others stay safe online", text: "Tell friends and family when a message looks fake." },
  ];

  function renderLearned(ctx, S, opts) {
    ctx.root.innerHTML = `
      <div class="cl cl--center">
        <div class="panel panel--wide" data-in style="max-width:820px">
          <p class="eyebrow">Your fact-checking habits</p>
          <h2 class="title title--xl" data-title>What I Learned</h2>
          ${FND.tpl.devLine(FND.audio.text("learned"), "c7Caption", "thumbs")}
          <ul class="promise-list">
            ${HABITS.map((h) => `<li class="promise" data-promise><span class="promise__ico">${icon(h.icon)}</span><span><b data-mark>${h.title}</b><p>${h.text}</p></span></li>`).join("")}
          </ul>
        </div>
      </div>`;
    ctx.cta({ label: "I promise!", action: "finish-learning", tone: "green" });
    const items = ctx.$$("[data-promise]");
    const tl = ctx.track(gsap.timeline({ delay: 0.5 }));
    items.forEach((li, i) => {
      tl.from(li, { x: -40, autoAlpha: 0, duration: 0.45, ease: "back.out(1.6)", onStart: () => FND.audio.sfx("pop") }, i * 0.9)
        .add(() => ctx.track(FND.fx.annotate(li.querySelector("[data-mark]"), { type: "highlight", color: "rgba(255,210,63,.6)", iterations: 1, multiline: true, duration: 600 })), i * 0.9 + 0.4);
    });
    if (!opts.same) {
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
      FND.say("learned", ctx.$("#c7Caption"));
    }
  }

  /* ---------------- complete ---------------- */

  function renderComplete(ctx, S, opts) {
    const gs = FND.state.get();
    const solved = gs.finalSolved || 3;
    const time = document.querySelector("#gameHeaderTimer .hud-timer__value")?.textContent || "";
    ctx.root.innerHTML = `
      <div class="cl cl--hero">
        ${FND.tpl.heroFigure("happy", "Dev, jumping for joy")}
        <div class="cl__panel">
        <div class="panel cert" data-in>
          <svg class="cert__seal" viewBox="0 0 150 150" aria-hidden="true">
            <circle cx="75" cy="75" r="64" fill="#0c2d8f" stroke="#f9a11b" stroke-width="8"/>
            <circle cx="75" cy="75" r="52" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 6" data-ring/>
            <path data-star d="M75 38l10.5 21.5 23.5 3.4-17 16.6 4 23.5-21-11-21 11 4-23.5-17-16.6 23.5-3.4z" fill="#ffd23f" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
          </svg>
          <p class="eyebrow">${solved} messages solved</p>
          <h2 class="title title--xl" data-title>Mission Complete</h2>
          <span class="cert__name">Certified Fake News Detector Builder</span>
          ${FND.tpl.devLine(FND.audio.text("complete"), "c7Caption", "happy")}
          <div class="metrics">
            <div class="metric"><b>${solved}/3</b><span>messages solved</span></div>
            <div class="metric"><b>${gs.firstTry}/3</b><span>first try</span></div>
            <div class="metric"><b>${time}</b><span>mission time</span></div>
          </div>
        </div>
        </div>
      </div>`;
    ctx.track(FND.fx.devIn(ctx.root));
    ctx.cta({ label: "Play again", action: "play-again" });
    const seal = ctx.$(".cert__seal");
    ctx.track(gsap.from(seal, { scale: 0, rotate: -180, duration: 0.9, ease: "back.out(1.7)", delay: 0.3 }));
    ctx.track(gsap.to(seal.querySelector("[data-ring]"), { rotation: 360, transformOrigin: "50% 50%", duration: 16, repeat: -1, ease: "none" }));
    ctx.track(gsap.from(ctx.$(".cert__name"), { scale: 0, duration: 0.6, delay: 0.9, ease: "back.out(2.5)" }));
    if (!opts.back) {
      FND.fx.celebrate("big");
      FND.audio.sfx("fanfare");
      document.dispatchEvent(new CustomEvent("fnd:mission-complete"));
    }
    if (!opts.same) {
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.4 });
      FND.say("complete", ctx.$("#c7Caption"));
    }
  }

  /* ---------------- module ---------------- */

  window.Chunk7 = FND.defineChunk({
    key: "chunk7",
    sceneId: "scene-chunk7",
    steps: ["intro", "case", "results", "learned", "complete"],
    fresh: () => ({ step: "intro", index: 0, phase: "scan", verdict: null, action: null, attempts: [0, 0, 0], firstTry: [false, false, false] }),
    render(ctx, S, opts) {
      FND.hint.reset(null, { enabled: false });
      ({ intro: renderIntro, case: renderCase, results: renderResults, learned: renderLearned, complete: renderComplete })[S.step](ctx, S, opts);
    },
    actions: {
      begin: (ctx) => ctx.go("case", { index: 0, phase: "scan", verdict: null, action: null }),
      scan,
      "pick-verdict": (ctx, el) => pick(ctx, el, "verdict", "pick-verdict"),
      "pick-action": (ctx, el) => pick(ctx, el, "action", "pick-action"),
      submit,
      next: (ctx) => {
        const S = ctx.S;
        if (S.index < 2) ctx.go("case", { index: S.index + 1, phase: "scan", verdict: null, action: null });
        else ctx.go("results");
      },
      "review-learning": (ctx) => ctx.go("learned"),
      "finish-learning": (ctx) => ctx.go("complete"),
      "play-again": () => document.dispatchEvent(new CustomEvent("fnd:play-again")),
    },
  });
})();
