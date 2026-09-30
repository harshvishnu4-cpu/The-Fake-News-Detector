/* ==========================================================================
   Chunk 2 · Find the red flags — scene-chunk2 · step 2/7
   Internal steps: hunt, why-build
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const D = FND.data;
  const icon = FND.icon;

  /* The message again, this time with its three red flags (and one distractor)
     as tappable lines. Keep in step with index.html and CLUES in state.js. */
  function huntBubble(found) {
    const tap = (clue, inner, action = "find-clue") => {
      const isFound = found.includes(clue);
      return `<button type="button" class="msg__tap ${isFound ? "is-found" : ""}" data-action="${action}" data-clue="${clue}" ${isFound ? 'aria-pressed="true"' : ""}>${inner}<span class="flag">${icon("flag")}</span></button>`;
    };
    return `<div class="msg" id="c2Msg">
      <div class="msg__fwd">${icon("forward")}Forwarded many times</div>
      ${tap("source", `<span class="tap-text msg__from" style="margin:0">Unknown number: +91 90123 45678</span>`)}
      <div class="msg__head">⚠️ URGENT WATER WARNING ⚠️</div>
      <span class="msg__line">The school water tank is contaminated.</span>
      ${tap("claim", `<span class="tap-text">School closed for 3 days</span> from tomorrow!`)}
      ${tap("distractor", `<span class="tap-text">The science test has also been postponed.</span>`, "wrong-clue")}
      ${tap("pressure", `<b class="tap-text">Share this with all class groups immediately</b><b>!!</b>`)}
      <time class="msg__time">10:15</time>
    </div>`;
  }

  const HUNT_MSG = {
    chat: { name: "Class 7B Friends", sub: "38 members", avatar: "7B", avatarClass: "device__avatar--friend" },
    time: "10:15",
  };

  function notifHTML(id) {
    const clue = D.CLUES[id];
    const c = D.CHECKS[clue.check];
    return `<div class="check-notif">
      ${FND.tpl.checkIcon(c.id)}
      <span>
        <span class="check-notif__top"><span class="check-notif__name">${c.name}</span><span class="check-notif__tag">UNLOCKED ✓</span></span>
        <p class="check-notif__why">${clue.explain}</p>
      </span>
    </div>`;
  }

  const nextClue = (found) => D.CLUE_ORDER.find((id) => !found.includes(id));

  /* ---------------- hunt ---------------- */

  function renderHunt(ctx, S, opts) {
    const { root } = ctx;
    root.innerHTML = `
      <div class="cl">
        <div class="cl__device" data-in>${FND.device.chat(HUNT_MSG, { id: "c2Device", bubbleHTML: huntBubble(S.found) })}</div>
        <div class="cl__panel">
          <div class="panel" data-in>
            <p class="eyebrow">Step 2 / 7 · Investigate</p>
            <h2 class="title" data-title>Find the Red Flags</h2>
            ${FND.tpl.devLine(FND.audio.text(S.found.length === 3 ? "all_clues" : "hunt_intro"), "c2Caption", S.found.length === 3 ? "thumbs" : "guide")}
            <div class="found-count">RED FLAGS <b data-found>${S.found.length}</b>/ 3</div>
            <div class="notifs">
              ${[0, 1, 2].map((i) => {
                const id = S.found[i];
                return id
                  ? `<div class="notif-slot is-filled" data-notif="${i}">${notifHTML(id)}</div>`
                  : `<div class="notif-slot" data-notif="${i}"><span class="notif-slot__lock">${icon("lock")}</span>LOCKED CHECK</div>`;
              }).join("")}
            </div>
          </div>
        </div>
      </div>`;

    const done = S.found.length === 3;
    ctx.cta({ label: "Continue", action: "continue", disabled: !done });
    FND.hint.reset(() => `hint_${nextClue(ctx.S.found) || "pressure"}`);

    // re-draw the marks for anything already found (e.g. coming back)
    // (after the entrance settles — RoughNotation measures real rects)
    if (S.found.length) {
      ctx.track(gsap.delayedCall(0.8, ctx.guard(() => {
        S.found.forEach((id) => markFound(ctx, id, { instant: true }));
      })));
    }

    if (!opts.same) {
      FND.fx.enter(root);
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
      if (!done) FND.say("hunt_intro", ctx.$("#c2Caption"));
      else FND.audio.remember("all_clues");
    }
  }

  function markFound(ctx, id, { instant = false } = {}) {
    const btn = ctx.$(`[data-clue="${id}"]`);
    if (!btn) return;
    btn.classList.add("is-found");
    btn.setAttribute("aria-pressed", "true");
    const text = btn.querySelector(".tap-text");
    const kind = D.CLUES[id].annotate;
    ctx.track(FND.fx.annotate(text, {
      type: kind === "box" ? "box" : kind,
      color: "#f0444f",
      padding: kind === "underline" ? 2 : 5,
      duration: instant ? 1 : 700,
    }));
    const flag = btn.querySelector(".flag");
    if (instant) gsap.set(flag, { scale: 1 });
    else ctx.track(gsap.to(flag, { scale: 1, duration: 0.5, ease: "back.out(3)", delay: 0.2 }));
  }

  function findClue(ctx, el) {
    const S = ctx.S;
    const id = el.dataset.clue;
    if (S.found.includes(id) || ctx.isBusy()) return;
    S.found.push(id);
    ctx.save();

    FND.audio.sfx("good");
    FND.fx.burstAt(el, { colors: ["#f0444f", "#ffd23f", "#ffffff"], count: 16 });
    markFound(ctx, id);

    const slotIndex = S.found.length - 1;
    const slot = ctx.$(`[data-notif="${slotIndex}"]`);
    const counter = ctx.$("[data-found]");
    FND.fx.flyGhost(el, slot, {
      html: `<div class="notif-slot is-filled" style="margin:0">${notifHTML(id)}</div>`,
      duration: 0.8,
      onArrive: ctx.guard(() => {
        slot.classList.add("is-filled");
        slot.innerHTML = notifHTML(id);
        FND.ui.hydrateIcons(slot);
        FND.audio.sfx("unlock");
        gsap.fromTo(slot, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, .5)" });
        counter.textContent = S.found.length;
        FND.fx.pop(counter, 1.5);
      }),
    });

    const caption = ctx.$("#c2Caption");
    if (S.found.length < 3) {
      FND.say(`clue_${id}`, caption);
      return;
    }

    // all three: the CTA waits for Dev to finish (input is locked while he speaks)
    const keys = [`clue_${id}`, "all_clues"];
    const narration = FND.say(keys, caption);
    FND.ui.pose(caption, "thumbs");
    const waitMs = keys.reduce((s, k) => s + FND.audio.durationMs(k), 0);
    ctx.track(FND.cta.pending(waitMs));
    narration.then(ctx.guard(() => {
      FND.cta.enable(true);
      FND.fx.celebrate("small");
    }));
  }

  function wrongClue(ctx, el) {
    const S = ctx.S;
    S.wrong += 1;
    FND.audio.sfx("bad");
    el.classList.add("is-wrong");
    FND.fx.shake(el);
    setTimeout(() => el.classList.remove("is-wrong"), 700);
    const count = FND.hint.wrong();
    if (count >= 2) {
      // Dev names the next clue; the bulb now replays it
      const key = `hint_${nextClue(S.found) || "pressure"}`;
      FND.devPop.say(FND.audio.text(key), { mood: "hint", key });
    } else {
      FND.devPop.say(FND.audio.text("wrong_clue"), { mood: "bad", key: "wrong_clue" });
    }
  }

  /* ---------------- why-build ---------------- */

  function renderWhy(ctx, S, opts) {
    const { root } = ctx;
    const qs = ["Can I trust this?", "What makes it suspicious?", "What should I do next?"];
    root.innerHTML = `
      <div class="cl cl--center">
        <div class="panel panel--wide" data-in>
          <p class="eyebrow">Step 2 / 7 · A forwarded offer</p>
          <h2 class="title" data-title>Can We Check Messages Faster?</h2>
          ${FND.tpl.devLine(FND.audio.text("why_build"), "c2WhyCaption", "thinking")}
          <div class="why">
            <div class="why__kid">
              ${FND.tpl.devFigure("thinking", "Dev, wondering about a forwarded offer")}
              <div class="why__offer"><small>↪ Forwarded</small>🎁 FREE PHONE for every student! Click now &gt;&gt;</div>
              <span class="why__q why__q--1" aria-hidden="true">?</span><span class="why__q why__q--2" aria-hidden="true">?</span><span class="why__q why__q--3" aria-hidden="true">?</span>
            </div>
            <div class="why__bubbles">
              ${qs.map((q, i) => `<div class="qbubble" data-q><i>${i + 1}</i>${q}</div>`).join("")}
            </div>
            <svg class="why__arrow" viewBox="0 0 54 54" aria-hidden="true"><path data-arrow d="M6 27h36M30 14l13 13-13 13" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div class="why__detector" data-detector><span class="app-logo">${icon("lens")}</span><span>One detector<br>for every message</span></div>
          </div>
        </div>
      </div>`;

    ctx.cta({ label: "Build a detector", action: "start-build", tone: "blue" });
    FND.hint.reset(null);

    const kid = ctx.$(".why__kid");
    const offer = kid.querySelector(".why__offer");
    const marks = kid.querySelectorAll(".why__q");
    const tl = ctx.track(gsap.timeline({ delay: opts.same ? 0 : 0.35 }));
    tl.from(kid.querySelector(".dev-figure"), { y: 40, autoAlpha: 0, duration: 0.55, ease: "back.out(1.6)" })
      .fromTo(offer, { scale: 0, rotation: -20 }, { scale: 1, rotation: 6, duration: 0.45, ease: "back.out(2.4)", onStart: () => FND.audio.sfx("notify") }, "-=0.1")
      .to(offer, { rotation: 11, duration: 0.08, repeat: 5, yoyo: true, ease: "none" })
      .from(marks, { scale: 0, stagger: 0.12, duration: 0.35, ease: "back.out(3)" }, "<");
    ctx.$$("[data-q]").forEach((b, i) => {
      tl.from(b, { scale: 0, x: -40, transformOrigin: "0% 100%", autoAlpha: 0, duration: 0.45, ease: "back.out(1.8)", onStart: () => FND.audio.sfx("pop") }, i ? "+=0.25" : "+=0.1");
    });
    tl.add(FND.fx.drawIn(ctx.$("[data-arrow]"), { duration: 0.5 }))
      .from(ctx.$("[data-detector]"), { scale: 0, rotate: -20, duration: 0.6, ease: "back.out(2)", onStart: () => FND.audio.sfx("unlock") })
      .add(() => ctx.track(FND.fx.glow(ctx.$("[data-detector] .app-logo"), "rgba(249,161,27,.8)")));
    ctx.track(gsap.to(marks, { y: -6, duration: 1.2, repeat: -1, yoyo: true, stagger: 0.3, ease: "sine.inOut", delay: 2 }));

    if (!opts.same) {
      FND.fx.enter(root);
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
      FND.say("why_build", ctx.$("#c2WhyCaption"));
    }
  }

  window.Chunk2 = FND.defineChunk({
    key: "chunk2",
    sceneId: "scene-chunk2",
    steps: ["hunt", "why-build"],
    fresh: () => ({ step: "hunt", found: [], wrong: 0 }),
    atEnd: (S) => ({ ...S, step: "why-build", found: D.CLUE_ORDER.slice() }),
    backEntries: (S) => [{ ...S, step: "hunt", found: [], wrong: 0 }],
    render(ctx, S, opts) {
      if (S.step === "hunt") renderHunt(ctx, S, opts);
      else renderWhy(ctx, S, opts);
    },
    actions: {
      "find-clue": findClue,
      "wrong-clue": wrongClue,
      continue: (ctx) => { FND.audio.stop(); ctx.go("why-build"); },
      "start-build": (ctx) => ctx.leave("scene-chunk3", "chunk3"),
    },
  });
})();
