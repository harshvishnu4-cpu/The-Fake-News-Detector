/* ==========================================================================
   Chunk 4 · Build Detector V1 — scene-chunk4 · step 4/7
   The device shows three empty slots; the three check cards sit opposite.
   Two input methods: tap a card then a glowing slot (select-check →
   place-check), or drag the card onto a slot (GSAP Draggable).
   Internal steps: build
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const D = FND.data;
  const icon = FND.icon;

  function cardHTML(id, used) {
    const c = D.CHECKS[id];
    return `<button type="button" class="build-card ${used ? "is-used" : ""}" data-action="select-check" data-check="${id}" data-check-card ${used ? 'aria-disabled="true"' : ""}>
      <span class="build-card__grip">${icon("grip")}</span>
      ${FND.tpl.checkIcon(id)}
      <span><span class="check-card__name">${c.name}</span><p class="check-card__q">${c.q}</p></span>
    </button>`;
  }

  const filledCount = (S) => S.slots.filter(Boolean).length;

  function render(ctx, S, opts) {
    const { root } = ctx;
    const full = filledCount(S) === 3;
    root.innerHTML = `
      <div class="cl">
        <div class="cl__device" data-in>${FND.device.detector({ id: "c4Device", version: "V1", slots: S.slots.map((id) => ({ id })) })}</div>
        <div class="cl__panel">
          <div class="panel" data-in style="overflow:visible">
            <p class="eyebrow">Step 4 / 7 · Build</p>
            <h2 class="title"><span data-title>Build Detector V1</span><span class="counter-chip ${full ? "is-done" : ""}" data-counter>${full ? "3 checks active" : `${filledCount(S)} / 3`}</span></h2>
            ${FND.tpl.devLine(FND.audio.text(full ? "build_done" : "build_intro"), "c4Caption", full ? "thumbs" : "guide")}
            <div class="build-cards">${D.V1_CHECKS.map((id) => cardHTML(id, S.slots.includes(id))).join("")}</div>
            <p class="small-note">Drag a card onto a slot — or tap a card, then tap a glowing slot.</p>
          </div>
        </div>
      </div>`;

    ctx.cta({ label: "Test Detector V1", action: "finish", disabled: !full });
    FND.hint.reset(null);
    S.selected = null;
    if (!full) setupDrag(ctx);

    if (!opts.same) {
      FND.fx.enter(root);
      FND.fx.titleIn(ctx.$("[data-title]"), { delay: 0.2 });
      if (full) FND.audio.remember("build_done");
      else FND.say("build_intro", ctx.$("#c4Caption"));
      // the empty slots breathe so they read as targets
      ctx.track(gsap.to(ctx.$$(".app-slot:not(.is-filled) .app-slot__num"), { scale: 1.15, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.2 }));
    }
  }

  /* ---------------- tap to select, tap to place ---------------- */

  function armSlots(ctx, on) {
    ctx.$$(".app-slot:not(.is-filled)").forEach((s) => s.classList.toggle("is-armed", on));
  }

  function select(ctx, id, { force = false } = {}) {
    const S = ctx.S;
    if (S.slots.includes(id)) return;
    S.selected = !force && S.selected === id ? null : id;
    ctx.$$("[data-check-card]").forEach((c) => c.classList.toggle("is-selected", c.dataset.check === S.selected));
    armSlots(ctx, !!S.selected);
  }

  function selectCheck(ctx, el) {
    if (ctx.isBusy() || el.classList.contains("is-used")) return;
    if (el._draggedAt && Date.now() - el._draggedAt < 350) return;   // the click that ends a drag
    FND.audio.sfx("tap");
    select(ctx, el.dataset.check);
    if (ctx.S.selected) FND.fx.pop(el, 1.04);
  }

  function placeCheck(ctx, el) {
    const S = ctx.S;
    const i = +el.dataset.slot;
    if (ctx.isBusy() || !S.selected || S.slots[i]) {
      if (!S.selected && !S.slots[i]) FND.fx.shake(el);
      return;
    }
    place(ctx, S.selected, i);
  }

  function place(ctx, id, i) {
    const S = ctx.S;
    const card = ctx.$(`[data-check-card][data-check="${id}"]`);
    const slotEl = ctx.$(`.app-slot[data-slot="${i}"]`);
    S.slots[i] = id;
    S.selected = null;
    ctx.save();
    ctx.busy(true);
    armSlots(ctx, false);
    ctx.$$("[data-check-card]").forEach((c) => c.classList.remove("is-selected"));

    FND.fx.flyGhost(card, slotEl, {
      html: `<div class="build-card" style="transform:none">${card.innerHTML}</div>`,
      duration: 0.6,
      arc: 0.2,
      onArrive: ctx.guard(() => {
        slotEl.outerHTML = FND.device.slot({ id }, i);
        const fresh = ctx.$(`.app-slot[data-slot="${i}"]`);
        FND.ui.hydrateIcons(fresh);
        FND.audio.sfx("snap");
        gsap.fromTo(fresh, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, .45)" });
        gsap.fromTo(fresh.querySelector(".app-slot__led"), { scale: 2.4 }, { scale: 1, duration: 0.4 });
        FND.fx.burstAt(fresh, { count: 12 });
        const n = filledCount(S);
        const counter = ctx.$("[data-counter]");
        counter.textContent = `${n} / 3`;
        FND.fx.pop(counter, 1.3);
        FND.device.setMeter(ctx.$("#c4Device"), n / 3);
        ctx.$("#c4Device [data-count]").textContent = n;
        ctx.busy(false);
        if (n === 3) complete(ctx);
        else if (n === 1) FND.devPop.say(FND.audio.text("build_placed"), { mood: "good", holdMs: 1200 });
      }),
    });
    // the card itself goes back home, greyed out
    gsap.set(card, { x: 0, y: 0 });
    card.classList.add("is-used");
    card.setAttribute("aria-disabled", "true");
  }

  /* ---------------- drag and drop (GSAP Draggable) ---------------- */

  function setupDrag(ctx) {
    if (!window.Draggable) return;
    const openSlot = (drag) => ctx.$$(".app-slot:not(.is-filled)").find((s) => drag.hitTest(s, "30%"));
    const hover = (slot) => ctx.$$(".app-slot").forEach((s) => s.classList.toggle("is-hover", s === slot));

    ctx.$$("[data-check-card]").forEach((card) => {
      if (card.classList.contains("is-used")) return;
      const [drag] = Draggable.create(card, {
        type: "x,y",
        zIndexBoost: true,
        minimumMovement: 6,
        autoScroll: 1,
        onDragStart() {
          if (ctx.isBusy()) return this.endDrag();
          card.classList.add("is-dragging");
          select(ctx, card.dataset.check, { force: true });
          FND.audio.sfx("tap");
        },
        onDrag() { hover(openSlot(this)); },
        onDragEnd() {
          card.classList.remove("is-dragging");
          card._draggedAt = Date.now();
          const slot = openSlot(this);
          hover(null);
          if (slot && !ctx.isBusy()) place(ctx, card.dataset.check, +slot.dataset.slot);
          else {
            gsap.to(card, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, .6)" });
            select(ctx, card.dataset.check, { force: true });
          }
        },
      });
      ctx.track(drag);
    });
  }

  /* ---------------- all three in: boot the detector ---------------- */

  function complete(ctx) {
    const device = ctx.$("#c4Device");
    const boot = device.querySelector("[data-boot]");
    const counter = ctx.$("[data-counter]");
    counter.textContent = "3 checks active";
    counter.classList.add("is-done");
    FND.fx.pop(counter, 1.25);
    ctx.busy(true);
    const tl = ctx.track(gsap.timeline({ onComplete: ctx.guard(() => ctx.busy(false)) }));
    tl.add(() => FND.audio.sfx("boot"))
      .to(device.querySelectorAll(".app-slot"), { backgroundColor: "rgba(33,196,109,.45)", duration: 0.15, stagger: 0.12, yoyo: true, repeat: 1 })
      .set(boot, { autoAlpha: 1 })
      .add(FND.fx.scramble(boot.querySelector("[data-boot-title]"), "FAKE NEWS DETECTOR V1", { duration: 0.8 }))
      .add(() => { boot.querySelector("small").textContent = "3 CHECKS ACTIVE"; })
      .to(boot, { autoAlpha: 0, duration: 0.5 }, "+=0.7")
      .add(() => {
        FND.fx.celebrate("small");
        FND.cta.enable(true);
      });
    FND.say("build_done", ctx.$("#c4Caption"));
    FND.ui.pose(ctx.$("#c4Caption"), "thumbs");
  }

  window.Chunk4 = FND.defineChunk({
    key: "chunk4",
    sceneId: "scene-chunk4",
    steps: ["build"],
    fresh: () => ({ step: "build", slots: [null, null, null], selected: null }),
    atEnd: (S) => S,          // coming back, the bench starts empty again
    render,
    actions: {
      "select-check": selectCheck,
      "place-check": placeCheck,
      finish: (ctx) => ctx.leave("scene-chunk5", "chunk5"),
    },
  });
})();
