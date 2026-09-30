/* ==========================================================================
   Chunk 5 · Test Detector V1 — scene-chunk5 · step 5/7
   Internal steps: test (three messages), report

   Message 1 · base-suspicious   choose → ready → running → done
   Message 2 · exam-date-changed predict-checks → quick-running → done
   Message 3 · bonus-marks       choose → ready → running → done
   Per-message actions: predict → to-run → run (or run-quick) → next
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const D = FND.data;
  const icon = FND.icon;

  const TRUST = [
    { value: "trust", label: "Trust it", sub: "Looks fine to me", icon: "check" },
    { value: "distrust", label: "Don’t trust it", sub: "Something feels off", icon: "x" },
    { value: "unsure", label: "Not sure", sub: "I’d need to check", icon: "question" },
  ];
  const trustLabel = (v) => TRUST.find((t) => t.value === v)?.label || "";

  const OUTCOME = {
    stopped: { banner: "fail", stamp: "fail", stampText: "STOPPED", text: "V1 stopped it — every check warns." },
    unsure: { banner: "warn", stamp: "warn", stampText: "NOT SURE", text: "V1 isn’t sure — only one warning." },
    passed: { banner: "ok", stamp: "ok", stampText: "LOOKS OK?", text: "V1 says it looks OK… but is it true?" },
  };

  const msgAt = (i) => D.TEST_MESSAGES[i];
  const warnsIn = (m) => D.V1_CHECKS.filter((id) => m.results[id].s !== "ok");

  /* ---------------- rendering ---------------- */

  function render(ctx, S, opts) {
    if (S.step === "report") return renderReport(ctx, S, opts);
    // a new phase of the same message repaints only the panel's phase area
    if (opts.soft && ctx.root.dataset.index === String(S.index) && ctx.$("#c5Device")) {
      return paintPhase(ctx);
    }
    ctx.root.dataset.index = S.index;
    const m = msgAt(S.index);
    const fresh = !opts.same;
    ctx.root.innerHTML = `
      <div class="cl">
        <div class="cl__device" data-in>${FND.device.chat(m, { id: "c5Device" })}</div>
        <div class="cl__panel">
          <div class="panel" data-in>
            <p class="eyebrow">Step 5 / 7 · Test message ${S.index + 1} / 3</p>
            <h2 class="title" data-title>${m.title}</h2>
            ${FND.tpl.devLine("", "c5Caption")}
            <div data-phase></div>
          </div>
        </div>
      </div>`;
    FND.hint.reset(null);
    if (fresh) {
      FND.fx.enter(ctx.root);
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
    }
    paintPhase(ctx, { narrate: fresh });
  }

  /** Paint only the phase area (keeps the device & title still between phases). */
  function paintPhase(ctx, { narrate = true } = {}) {
    const S = ctx.S;
    const m = msgAt(S.index);
    const box = ctx.$("[data-phase]");
    const caption = ctx.$("#c5Caption");
    const r = S.results[S.index] || {};
    let html = "";
    let key = null;

    switch (S.phase) {
      case "choose":
        key = `test${S.index + 1}_intro`;
        html = `<p class="group-label">Would you trust it?</p>
          <div class="options options--stack">
            ${TRUST.map((t) => FND.tpl.option({ value: t.value, label: t.label, sub: t.sub, iconName: t.icon, action: "predict", selected: r.answer === t.value })).join("")}
          </div>`;
        ctx.cta({ label: "Lock answer", action: "to-run", disabled: !r.answer });
        break;

      case "ready":
        key = "test_ready";
        html = `<div class="answer-chip">${icon("lock")}You said: ${trustLabel(r.answer)}</div>
          <div class="check-rows">${D.V1_CHECKS.map((id) => FND.tpl.checkRow(id)).join("")}</div>`;
        ctx.cta({ label: "Run detector", action: "run", tone: "blue" });
        break;

      case "predict-checks":
        key = "test2_intro";
        html = `<p class="group-label">Which checks will warn?</p>
          <div class="options options--stack">
            ${D.V1_CHECKS.map((id) => {
              const on = (r.predicted || []).includes(id);
              return `<button type="button" class="option ${on ? "is-selected" : ""}" data-action="predict-warning" data-value="${id}" aria-pressed="${on}">
                ${FND.tpl.checkIcon(id)}
                <span class="option__text">${D.CHECKS[id].name}<small>${D.CHECKS[id].q}</small></span>
                <span class="predict-flag">${on ? "WILL WARN" : "WON’T WARN"}</span>
              </button>`;
            }).join("")}
          </div>
          <p class="small-note">Tap every check you think will warn.</p>`;
        ctx.cta({ label: "Run quick scan", action: "run-quick", tone: "blue" });
        break;

      case "running":
      case "quick-running":
        html = `<div class="check-rows">${D.V1_CHECKS.map((id) => FND.tpl.checkRow(id)).join("")}</div>`;
        FND.cta.set({ label: "Scanning…", action: "", disabled: true, tone: "blue" });
        break;

      case "done":
        key = `test${S.index + 1}_done`;
        html = doneHTML(m, r);
        ctx.cta({ label: S.index < 2 ? "Next message" : "See the report", action: "next" });
        break;
    }

    box.innerHTML = html;
    FND.ui.hydrateIcons(box);
    gsap.from(box.children, { y: 16, autoAlpha: 0, duration: 0.4, stagger: 0.06, clearProps: "all" });

    // Dev weighs the message up while you decide, and reacts to V1's result
    FND.ui.pose(caption, S.phase === "done" ? (m.outcome === "stopped" ? "thumbs" : "thinking")
      : (S.phase === "choose" || S.phase === "predict-checks") ? "thinking" : "guide");

    if (S.phase === "done") {
      const dev = ctx.$("#c5Device");
      FND.device.stamp(dev, OUTCOME[m.outcome].stampText, OUTCOME[m.outcome].stamp);
    }
    if (key) {
      if (narrate) FND.say(key, caption);
      else { FND.ui.typeInto(caption, FND.audio.text(key)); FND.audio.remember(key); }
    }
    if (S.phase === "running" || S.phase === "quick-running") runScan(ctx);
  }

  function doneHTML(m, r) {
    const o = OUTCOME[m.outcome];
    const rows = D.V1_CHECKS.map((id) => {
      const res = m.results[id];
      let extra = "";
      if (r.predicted) {
        const said = r.predicted.includes(id);
        const hit = said === (res.s !== "ok");
        extra = ` <span class="compare ${hit ? "compare--hit" : "compare--miss"}">${hit ? "✓ you got it" : "✗ you predicted " + (said ? "warn" : "pass")}</span>`;
      }
      return FND.tpl.checkRow(id, res.s, res.why + extra);
    }).join("");

    let compare = "";
    if (r.predicted) {
      const hits = D.V1_CHECKS.filter((id) => r.predicted.includes(id) === (m.results[id].s !== "ok")).length;
      compare = `<div class="answer-chip">${icon("star")}You predicted ${hits} of 3 correctly</div>`;
    } else if (r.answer) {
      const agree = { stopped: "distrust", unsure: "unsure", passed: "trust" }[m.outcome] === r.answer;
      compare = `<div class="answer-chip">${icon(agree ? "check" : "question")}You said “${trustLabel(r.answer)}” — ${agree ? "V1 agrees." : "V1 disagrees."}</div>`;
    }
    return `<div class="check-rows">${rows}</div>
      <div class="banner banner--${o.banner}">${icon(o.banner === "ok" ? "question" : "alert")}${o.text}</div>
      ${compare}`;
  }

  /* ---------------- the scan ---------------- */

  function runScan(ctx) {
    const S = ctx.S;
    const m = msgAt(S.index);
    const quick = S.phase === "quick-running";
    const device = ctx.$("#c5Device");
    ctx.busy(true);
    FND.device.clearStamp(device);
    const tl = ctx.track(gsap.timeline({
      onComplete: ctx.guard(() => {
        ctx.busy(false);
        S.phase = "done";
        paintPhase(ctx);
      }),
    }));
    // each check lights up the part of the message it is reading, then shows its result there
    const step = quick ? 0.75 : 1;
    const read = quick ? 0.45 : 0.62;
    tl.add(FND.device.scan(device, { passes: 3, duration: quick ? 0.7 : 0.95 }), 0);
    D.V1_CHECKS.forEach((id, i) => {
      const row = ctx.$(`[data-row="${id}"]`);
      const status = row.querySelector(".check-row__status");
      const res = m.results[id];
      const at = 0.3 + i * step;
      tl.add(() => { row.dataset.status = "scanning"; FND.device.focus(device, m.focus[id], id); FND.audio.sfx("scan"); }, at)
        .add(FND.fx.scramble(status, "SCANNING", { duration: 0.3 }), at)
        .add(() => {
          row.dataset.status = res.s;
          row.querySelector(".check-row__why").textContent = res.why;
          FND.device.focusResult(device, res.s);
          FND.audio.sfx(res.s === "ok" ? "ok" : "warn");
        }, at + read)
        .add(FND.fx.scramble(status, FND.tpl.statusLabel(res.s), { duration: 0.3 }), at + read)
        .from(row, { x: 10, duration: 0.25, immediateRender: false }, at + read);
    });
    tl.add(() => FND.device.unfocus(device), `+=${step - read}`)
      .to({}, { duration: 0.3 });
  }

  /* ---------------- report ---------------- */

  function renderReport(ctx, S, opts) {
    const counts = { stopped: 0, unsure: 0, passed: 0 };
    D.TEST_MESSAGES.forEach((m) => counts[m.outcome]++);
    FND.state.set({ v1Report: counts });
    const pill = { stopped: ["fail", "STOPPED"], unsure: ["warn", "NOT SURE"], passed: ["ok", "LET THROUGH"] };

    ctx.root.innerHTML = `
      <div class="cl cl--hero">
        ${FND.tpl.heroFigure("thinking", "Dev, thinking about what V1 missed")}
        <div class="cl__panel">
        <div class="panel panel--wide" data-in>
          <p class="eyebrow">Step 5 / 7 · Results</p>
          <h2 class="title" data-title>V1 Test Report</h2>
          ${FND.tpl.devLine(FND.audio.text("report"), "c5ReportCaption", "thinking")}
          <div class="report-grid">
          <div class="metrics">
            <div class="metric"><b data-count="${counts.stopped}">0</b><span>of 3 stopped</span></div>
            <div class="metric"><b data-count="${counts.unsure}">0</b><span>not sure</span></div>
            <div class="metric"><b data-count="${counts.passed}">0</b><span>let through</span></div>
          </div>
          <div class="report-list">
            ${D.TEST_MESSAGES.map((m) => `<div class="report-row">
              <span><b>${m.head}</b><small>${warnsIn(m).length} of 3 checks warned</small></span>
              <span class="pill pill--${pill[m.outcome][0]}">${pill[m.outcome][1]}</span>
            </div>`).join("")}
          </div>
          </div>
          <div class="banner banner--warn">${icon("alert")}V1 can’t verify everything — it has no way to look for proof.</div>
        </div>
        </div>
      </div>`;
    ctx.track(FND.fx.devIn(ctx.root));
    ctx.cta({ label: "Upgrade the detector", action: "upgrade" });
    FND.hint.reset(null);

    const tl = ctx.track(gsap.timeline({ delay: 0.4 }));
    ctx.$$("[data-count]").forEach((b, i) => tl.add(FND.fx.countTo(b, +b.dataset.count, { duration: 0.7 }), i * 0.2));
    tl.from(ctx.$$(".report-row"), { x: -30, autoAlpha: 0, stagger: 0.12, duration: 0.4 }, 0.3)
      .from(ctx.$(".banner"), { scale: 0.8, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" }, "+=0.1")
      .add(() => FND.fx.shake(ctx.$(".banner")));

    if (!opts.same) {
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.15 });
      FND.say("report", ctx.$("#c5ReportCaption"));
    }
  }

  /* ---------------- actions ---------------- */

  function result(ctx) {
    const S = ctx.S;
    S.results[S.index] = S.results[S.index] || {};
    return S.results[S.index];
  }

  const actions = {
    predict(ctx, el) {
      if (ctx.S.phase !== "choose") return;
      FND.audio.sfx("tap");
      result(ctx).answer = el.dataset.value;
      ctx.$$('[data-action="predict"]').forEach((b) => {
        const on = b === el;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", on);
      });
      FND.fx.pop(el, 1.03);
      FND.cta.enable(true);
      ctx.save();
    },
    "to-run"(ctx) {
      if (!result(ctx).answer) return;
      ctx.go("test", { phase: "ready" }, { soft: true });
    },
    run(ctx) { ctx.go("test", { phase: "running" }, { soft: true, transient: true }); },
    "predict-warning"(ctx, el) {
      if (ctx.S.phase !== "predict-checks") return;
      FND.audio.sfx("tap");
      const r = result(ctx);
      r.predicted = r.predicted || [];
      const id = el.dataset.value;
      const i = r.predicted.indexOf(id);
      if (i >= 0) r.predicted.splice(i, 1); else r.predicted.push(id);
      const on = r.predicted.includes(id);
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-pressed", on);
      el.querySelector(".predict-flag").textContent = on ? "WILL WARN" : "WON’T WARN";
      FND.fx.pop(el, 1.03);
      ctx.save();
    },
    "run-quick"(ctx) {
      result(ctx).predicted = result(ctx).predicted || [];
      ctx.go("test", { phase: "quick-running" }, { soft: true, transient: true });
    },
    next(ctx) {
      const S = ctx.S;
      if (S.index < 2) {
        const index = S.index + 1;
        ctx.go("test", { index, phase: index === 1 ? "predict-checks" : "choose" });
      } else ctx.go("report");
    },
    upgrade(ctx) { ctx.leave("scene-chunk6", "chunk6"); },
  };

  window.Chunk5 = FND.defineChunk({
    key: "chunk5",
    sceneId: "scene-chunk5",
    steps: ["test", "report"],
    fresh: () => ({ step: "test", index: 0, phase: "choose", results: [] }),
    atEnd: (S) => ({
      ...S,
      step: "report",
      index: 2,
      phase: "done",
      results: [{ answer: "distrust" }, { predicted: ["claim"] }, { answer: "trust" }],
    }),
    // each test message as it starts, oldest first
    backEntries: (S) => [
      { ...S, step: "test", index: 0, phase: "choose", results: [] },
      { ...S, step: "test", index: 1, phase: "predict-checks", results: [{ answer: "distrust" }] },
      { ...S, step: "test", index: 2, phase: "choose", results: [{ answer: "distrust" }, { predicted: ["claim"] }] },
    ],
    render,
    actions,
  });
})();
