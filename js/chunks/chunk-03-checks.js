/* ==========================================================================
   Chunk 3 · Three checks unlocked — scene-chunk3 · step 3/7
   The three red flags, restated as the detector's rules.
   Internal steps: rules
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const D = FND.data;
  const icon = FND.icon;

  function render(ctx, S, opts) {
    const { root } = ctx;
    const cards = D.V1_CHECKS.map((id) => {
      const c = D.CHECKS[id];
      const clue = D.CLUES[id];
      return `<div class="check-card" data-card>
        ${FND.tpl.checkIcon(id)}
        <span class="check-card__name">${c.name}</span>
        <p class="check-card__q">${c.q}</p>
        <span class="found-chip">${icon("flag")}Found: “${clue.line}”</span>
      </div>`;
    }).join("");

    root.innerHTML = `
      <div class="cl cl--center">
        <div class="panel panel--wide" data-in>
          <p class="eyebrow">Step 3 / 7 · Detector rules</p>
          <h2 class="title title--xl" data-title>3 Checks Unlocked</h2>
          ${FND.tpl.devLine(FND.audio.text("checks_unlocked"), "c3Caption", "happy")}
          <div class="unlock-grid">${cards}</div>
        </div>
      </div>`;

    ctx.cta({ label: "Build Detector V1", action: "finish", disabled: !opts.back });
    FND.hint.reset(null);

    const cardEls = ctx.$$("[data-card]");
    const tl = ctx.track(gsap.timeline({ delay: 0.45 }));
    tl.from(cardEls, {
      rotateY: -100,
      autoAlpha: 0,
      z: -120,
      transformOrigin: "50% 50% -40px",
      duration: 0.8,
      stagger: 0.22,
      ease: "back.out(1.4)",
      onStart: () => FND.audio.sfx("whoosh"),
    });
    cardEls.forEach((card, i) => {
      tl.from(card.querySelector(".check-ico"), { scale: 0, rotate: -45, duration: 0.5, ease: "back.out(3)", onStart: () => FND.audio.sfx("unlock") }, 0.5 + i * 0.22)
        .from(card.querySelector(".found-chip"), { y: 12, autoAlpha: 0, duration: 0.35 }, 0.75 + i * 0.22);
    });
    tl.add(() => { FND.cta.enable(true); FND.fx.celebrate("small"); });

    // gentle idle float once they've landed
    tl.add(() => {
      ctx.track(gsap.to(cardEls, { y: -6, duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.3 } }));
    });

    if (!opts.same) {
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.15 });
      FND.say("checks_unlocked", ctx.$("#c3Caption"));
    }
  }

  window.Chunk3 = FND.defineChunk({
    key: "chunk3",
    sceneId: "scene-chunk3",
    steps: ["rules"],
    fresh: () => ({ step: "rules" }),
    atEnd: (S) => S,
    render,
    actions: {
      finish: (ctx) => ctx.leave("scene-chunk4", "chunk4"),
    },
  });
})();
