/* ==========================================================================
   app.js — the shell.

   Owns: scene routing (window.fndShowScene), the progress ladder mapping
   (headerProgressIndex), the persistent HUD (timer, sound menu, back tab,
   modals), the landing / Dev intro / shared transition scenes, and the
   dashboard's cinematic order (an XState machine that will not skip, repeat
   or run two stages at once — js/phone-focus.js does the moving).
   ========================================================================== */
(function () {
  "use strict";

  const FND = window.FND;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const TOTAL_MISSION_STEPS = FND.data.TOTAL_MISSION_STEPS;   // 7

  /* ---------------- scenes ---------------- */

  const SCENES = {
    entry: "scene-entry",
    "dev-intro": "scene-dev-intro",
    dashboard: "scene-dashboard",
    chunk2: "scene-chunk2",
    chunk3: "scene-chunk3",
    chunk4: "scene-chunk4",
    chunk5: "scene-chunk5",
    chunk6: "scene-chunk6",
    chunk7: "scene-chunk7",
    complete: "scene-complete",
  };
  const ORDER = ["entry", "dev-intro", "dashboard", "chunk2", "chunk3", "chunk4", "chunk5", "chunk6", "chunk7"];
  const CHUNKS = {
    chunk2: window.Chunk2, chunk3: window.Chunk3, chunk4: window.Chunk4,
    chunk5: window.Chunk5, chunk6: window.Chunk6, chunk7: window.Chunk7,
  };

  /** The ladder is a share of progress, not a screen counter. Ten scenes map onto seven stripes. */
  function headerProgressIndex(sceneKey) {
    switch (sceneKey) {
      case "entry":
      case "dev-intro":
      case "dashboard": return 1;
      case "chunk2": return 2;
      case "chunk3": return 3;
      case "chunk4": return 4;
      case "chunk5": return 5;
      case "chunk6": return 6;
      case "chunk7": return 7;
      default: return null;   // the shared transition leaves the ladder where it is
    }
  }

  /** The shared transition (scene-complete) shown when moving forward into each chunk. */
  const TRANSITIONS = {
    chunk2: { eyebrow: "Step 1 complete", title: "First Decision Made", next: "Investigate the Message" },
    chunk3: { eyebrow: "Step 2 complete", title: "Red Flags Found", next: "Unlock Your Checks" },
    chunk4: { eyebrow: "Step 3 complete", title: "Rules Ready", next: "Build Detector V1" },
    chunk5: { eyebrow: "Step 4 complete", title: "Detector V1 Built", next: "Test It on Real Messages" },
    chunk6: { eyebrow: "Step 5 complete", title: "V1 Tested", next: "Upgrade to Detector V2" },
    chunk7: { eyebrow: "Step 6 complete", title: "Detector V2 Ready", next: "The Final Mission" },
  };

  let currentKey = null;
  let currentEl = null;

  /**
   * The one way between scenes. Chunks call fndShowScene(sceneId, sceneKey).
   * opts: { direct: skip the shared transition, atEnd: land a chunk on its last step, dir: ±1 }
   */
  window.fndShowScene = function fndShowScene(sceneId, sceneKey, opts = {}) {
    sceneKey = sceneKey || Object.keys(SCENES).find((k) => SCENES[k] === sceneId);
    if (!sceneKey || !SCENES[sceneKey]) return;
    const forward = ORDER.indexOf(sceneKey) > ORDER.indexOf(currentKey);
    if (!opts.direct && forward && TRANSITIONS[sceneKey] && currentKey !== "complete") {
      playTransition(sceneKey, () => showScene(sceneKey, { ...opts, dir: 1 }));
      return;
    }
    showScene(sceneKey, opts);
  };
  const showKey = (key, opts) => window.fndShowScene(SCENES[key], key, opts);

  function showScene(key, opts = {}) {
    const next = document.getElementById(SCENES[key]);
    const prev = currentEl;
    const dir = opts.dir ?? (ORDER.indexOf(key) >= ORDER.indexOf(currentKey) ? 1 : -1);
    if (currentKey) leaveScene(currentKey);
    currentKey = key;
    currentEl = next;

    if (key !== "complete") {
      FND.state.set({ currentScene: key, currentChunk: CHUNKS[key] ? +key.slice(5) : null });
    }
    app.classList.toggle("is-pre-game", key === "entry");
    if (key === "entry") timer.pause();
    app.dataset.backdrop = key === "entry" ? "clear" : "mission";
    FND.hint.reset();
    FND.cta.idle();
    FND.devPop.hide();
    const idx = headerProgressIndex(key);
    if (idx) setLadder(idx);

    if (prev && prev !== next) {
      gsap.killTweensOf(prev);
      gsap.to(prev, {
        autoAlpha: 0, x: -50 * dir, duration: 0.35, ease: "power2.in",
        onComplete: () => { prev.classList.remove("is-active"); gsap.set(prev, { clearProps: "transform" }); },
      });
    }
    next.classList.add("is-active");
    gsap.killTweensOf(next);
    gsap.fromTo(next, { autoAlpha: 0, x: prev ? 50 * dir : 0 }, { autoAlpha: 1, x: 0, duration: 0.5, delay: prev && prev !== next ? 0.18 : 0, ease: "power3.out", clearProps: "transform" });

    enterScene(key, opts);
    nav.update();
  }

  function enterScene(key, opts) {
    if (key === "entry") return enterEntry();
    if (key === "dev-intro") return enterIntro();
    if (key === "dashboard") return enterDashboard(opts.atEnd ? "consequence" : "fresh");
    if (CHUNKS[key]) return CHUNKS[key].init({ atEnd: !!opts.atEnd });
  }

  function leaveScene(key) {
    FND.audio.stop();
    FND.fx.clearNotes();
    if (key === "entry") killLoops("entry");
    if (key === "dev-intro") killLoops("intro");
    if (key === "dashboard") leaveDashboard();
    if (key === "complete") killLoops("inter");
    CHUNKS[key]?.reset();
  }

  const loopBag = {};
  function track(bag, t) { (loopBag[bag] = loopBag[bag] || []).push(t); return t; }
  function killLoops(bag) {
    (loopBag[bag] || []).forEach((t) => {
      if (window.SplitText && t instanceof SplitText) t.revert();   // put the original text back
      else t.kill?.();
    });
    loopBag[bag] = [];
  }

  /* ---------------- 1 · Landing ---------------- */

  function enterEntry() {
    killLoops("entry");
    const thumb = $(".entry__thumb");
    const start = $("#btnStartMission");
    const tl = track("entry", gsap.timeline({ delay: 0.1 }));
    tl.fromTo(".entry__bg", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 })
      .fromTo(thumb, { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: "power2.out" }, 0)
      .fromTo(start, { autoAlpha: 0, y: 50, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.65, ease: "back.out(2)" }, "-=0.3");
    // the way in glows gently so it reads as the thing to press
    if (!FND.fx.reduced) {
      track("entry", gsap.fromTo(start.querySelector(".skai-cta__plate"),
        { filter: "drop-shadow(0 0 0px rgba(255, 210, 63, 0))" },
        { filter: "drop-shadow(0 0 16px rgba(255, 210, 63, .9))", duration: 0.9, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.2 }));
    }
  }

  $("#btnStartMission").addEventListener("click", (e) => {
    FND.audio.unlock();
    FND.audio.sfx("good");
    FND.fx.burstAt(e.currentTarget, { count: 26 });
    if (!FND.state.get().completed) timer.start();
    showKey("dev-intro");
  });

  /* ---------------- 2 · Dev intro ---------------- */

  function enterIntro() {
    killLoops("intro");
    const img = $("#introDev");
    const text = $("#introText");
    const tl = track("intro", gsap.timeline());
    tl.from(img, { autoAlpha: 0, duration: 0.6, ease: "power1.out" })     // Dev stays still: a fade, no movement
      .from(".intro__panel", { x: 80, autoAlpha: 0, duration: 0.6 }, "-=0.3")
      .add(FND.fx.titleIn($("#introHi")), "-=0.2")
      .from(".intro__plan li", { x: 30, autoAlpha: 0, stagger: 0.12, duration: 0.4 }, "-=0.1")
      .from("#btnLetsBegin", { scale: 0.5, autoAlpha: 0, duration: 0.5, ease: "back.out(2.4)" }, "-=0.1");
    if (window.SplitText) {
      const split = track("intro", new SplitText(text, { type: "words" }));
      tl.from(split.words, { autoAlpha: 0, y: 8, stagger: 0.035, duration: 0.3 }, 0.8);
    }
    FND.audio.narrate("dev_intro");
  }

  $("#btnLetsBegin").addEventListener("click", () => {
    FND.audio.sfx("tap");
    showKey("dashboard");
  });

  /* ---------------- 3 · The dashboard beat (XState) ---------------- */

  const PF = FND.phoneFocus;
  let dash = null;         // running actor

  /** Wrap a timeline factory as a cancellable promise actor. */
  const fromTimeline = (make) => XState.fromPromise(({ signal }) => new Promise((resolve) => {
    const tl = make();
    if (!tl) return resolve();
    signal?.addEventListener("abort", () => tl.kill());
    tl.eventCallback("onComplete", () => resolve());
  }));
  const hold = XState.fromPromise(({ input, signal }) => new Promise((resolve) => {
    const d = gsap.delayedCall(input.ms / 1000, resolve);      // freezes with the pause menu
    signal?.addEventListener("abort", () => d.kill());
  }));
  const narrateMessage = XState.fromPromise(async ({ signal }) => {
    const keys = FND.audio.hasRecording("message_body") ? ["message_body"] : ["open_message", "first_decision"];
    signal?.addEventListener("abort", () => FND.audio.stop());
    PF.readAlong(FND.audio.durationMs(keys[0]));
    await FND.audio.narrate(keys);
    PF.stopReadAlong();
  });

  const dashboardMachine = XState.setup({
    actors: {
      hold,
      zoom: fromTimeline(() => PF.zoomIn()),
      notify: fromTimeline(() => PF.dropNotification()),
      open: fromTimeline(() => PF.openMessage()),
      narrate: narrateMessage,
      returnPhone: fromTimeline(() => PF.returnPhone()),
    },
    guards: {
      atDecision: ({ context }) => context.mode === "decision",
      forwarded: ({ context }) => context.decision === "forward",
      ignored: ({ context }) => context.decision === "ignore",
    },
    actions: {
      waitForTap: () => {
        PF.waitForTap();
        FND.audio.remember("notification");
        setTimeout(() => $("#btnSeeFullMessage")?.focus({ preventScroll: true }), 50);
      },
      showDecision: ({ context }) => {
        PF.showDecision(context.resumed);
        FND.audio.remember("first_decision");
      },
      showSpread: ({ context }) => {
        const tl = PF.showSpread(context.resumed);
        if (context.resumed) { FND.audio.remember("forward_feedback"); return; }
        tl.eventCallback("onComplete", () => { if (currentKey === "dashboard") FND.say("forward_feedback", $("#pfSpreadText")); });
      },
      showReflect: ({ context }) => {
        PF.showReflect(context.resumed);
        if (context.resumed) { FND.audio.remember("ignore_feedback"); return; }
        FND.say("ignore_feedback", $("#pfReflectText"));
      },
      settle: () => nav.update(),
    },
  }).createMachine({
    id: "dashboard",
    context: ({ input }) => ({ decision: input.decision, mode: input.mode, resumed: false }),
    initial: "boot",
    states: {
      // fresh: the whole beat · decision: straight to "What will you do?" (Back from a consequence)
      // consequence: the choice's consequence, played from its start (Back from the clue hunt)
      boot: {
        always: [
          { guard: "atDecision", target: "decisionReady", actions: XState.assign({ resumed: true }) },
          { guard: "forwarded", target: "forwarded" },
          { guard: "ignored", target: "ignored" },
          { target: "sceneIdle" },
        ],
      },
      sceneIdle: { invoke: { src: "hold", input: { ms: 900 }, onDone: "phoneZooming" } },
      phoneZooming: { invoke: { src: "zoom", onDone: "notificationAppears" } },
      notificationAppears: { invoke: { src: "notify", onDone: "waitingForNotificationTap" } },
      waitingForNotificationTap: { entry: "waitForTap", on: { TAP: "messageOpening" } },
      messageOpening: { invoke: { src: "open", onDone: "messageNarrating" } },
      messageNarrating: { invoke: { src: "narrate", onDone: "messageComplete" } },
      messageComplete: { invoke: { src: "hold", input: { ms: 900 }, onDone: "phoneReturning" } },
      phoneReturning: { invoke: { src: "returnPhone", onDone: "decisionReady" } },
      decisionReady: {
        entry: ["showDecision", "settle"],
        on: {
          FORWARD: { target: "forwarded", actions: XState.assign({ decision: "forward" }) },
          IGNORE: { target: "ignored", actions: XState.assign({ decision: "ignore" }) },
        },
      },
      forwarded: { entry: ["showSpread", "settle"] },
      ignored: { entry: ["showReflect", "settle"] },
    },
  });

  function enterDashboard(mode = "fresh") {
    leaveDashboard();
    PF.reset();
    const scene = $("#scene-dashboard");
    if (mode !== "consequence") FND.state.set({ decision: null });   // the choice is made again
    const decision = FND.state.get().decision;
    if (mode === "consequence" && !decision) mode = "fresh";
    dash = XState.createActor(dashboardMachine, { input: { decision, mode } });
    dash.subscribe((snap) => {
      scene.dataset.stage = String(snap.value);
      nav.update();
    });
    dash.start();
  }
  function leaveDashboard() {
    if (dash) { dash.stop(); dash = null; }
    PF.killLoops();
  }
  const dashStage = () => dash?.getSnapshot().value;
  const dashSettled = () => ["decisionReady", "forwarded", "ignored"].includes(dashStage());

  const tapNotification = () => {
    if (dashStage() !== "waitingForNotificationTap") return;
    FND.audio.unlock();
    FND.audio.sfx("tap");
    dash.send({ type: "TAP" });
  };
  $("#pfNotif").addEventListener("click", tapNotification);
  $("#btnSeeFullMessage").addEventListener("click", tapNotification);

  function decide(choice) {
    if (dashStage() !== "decisionReady") return;
    FND.audio.sfx(choice === "forward" ? "whoosh" : "tap");
    FND.state.set({ decision: choice });
    dash.send({ type: choice === "forward" ? "FORWARD" : "IGNORE" });
  }
  $("#btnForward").addEventListener("click", () => decide("forward"));
  $("#btnIgnore").addEventListener("click", () => decide("ignore"));

  const inspect = () => {
    if (!["forwarded", "ignored"].includes(dashStage())) return;
    FND.audio.sfx("tap");
    showKey("chunk2");
  };
  $("#btnSpreadInspect").addEventListener("click", inspect);
  $("#btnInspect").addEventListener("click", inspect);

  /* ---------------- shared transition (scene-complete) ---------------- */

  let transitionDone = null;

  function playTransition(destKey, then) {
    const t = TRANSITIONS[destKey];
    $("#interEyebrow").textContent = t.eyebrow;
    $("#interTitle").textContent = t.title;
    $("#interNext").textContent = t.next;
    showScene("complete", { dir: 1 });
    killLoops("inter");

    let fired = false;
    transitionDone = () => {
      if (fired || currentKey !== "complete") return;
      fired = true;
      transitionDone = null;
      then();
    };
    const box = $("#interBox");
    const tl = track("inter", gsap.timeline({ delay: 0.2 }));
    tl.from(".inter__badge", { scale: 0, rotate: -120, duration: 0.7, ease: "back.out(1.8)" })
      .add(() => FND.audio.sfx("unlock"), 0.2)
      .add(FND.fx.drawIn($("#interTick"), { duration: 0.45 }), 0.55)
      .from("#interEyebrow", { y: 14, autoAlpha: 0, duration: 0.35 }, 0.6)
      .add(FND.fx.titleIn($("#interTitle")), 0.7)
      .from(".inter__next", { y: 30, autoAlpha: 0, duration: 0.45, ease: "back.out(1.7)" }, 1.1);
    track("inter", gsap.fromTo("#interDev", { y: 140, autoAlpha: 0, rotation: -8 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 0.7, ease: "back.out(1.6)", delay: 0.25 }));
    if (!FND.fx.reduced) track("inter", gsap.fromTo("#interDev .dev-figure", { y: 0 }, { y: -18, duration: 0.42, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1 }));
    track("inter", gsap.fromTo(".inter__rays", { rotation: 0, scale: 0.6, autoAlpha: 0 }, { rotation: 90, scale: 1, autoAlpha: 1, duration: 3.2, ease: "power1.out" }));
    track("inter", gsap.delayedCall(FND.TEST_MODE ? 8 : 3.2, () => transitionDone?.()));
    FND.cta.set({ label: "Continue", action: "continue", onClick: () => transitionDone?.() });
    box.onclick = () => transitionDone?.();
  }

  /* ---------------- HUD: progress ladder ---------------- */

  const ladder = $("#gameHeaderProgress");
  /* The Figma ladder (557:2746) has ten stripes; the mission has seven steps, so the
     stripes fill as a share of progress while the label reads n/7.
     Design y of each stripe's slot inside the ladder, bottom stripe first: */
  const STRIPE_TOPS = [542.5, 495.5, 448.5, 398.5, 348.5, 298.5, 248.5, 198.5, 148.5, 98.5];
  const stripesBox = ladder.querySelector(".hud-ladder__stripes");
  stripesBox.innerHTML = STRIPE_TOPS.map((y) => `<span class="stripe" style="top: calc(${y} * var(--u))"><span class="stripe__turn">` +
    '<img class="stripe__off" src="assets/skai/ladder-stripe-off.svg" width="67.8101" height="20" alt="">' +
    '<img class="stripe__on" src="assets/skai/ladder-stripe-on.svg" width="67.8101" height="20" alt="">' +
    "</span></span>").join("");
  const stripes = [...stripesBox.children];
  const litFor = (n) => Math.round((n / TOTAL_MISSION_STEPS) * stripes.length);
  let ladderValue = 0;

  function setLadder(n) {
    n = Math.max(1, Math.min(TOTAL_MISSION_STEPS, n));
    const grew = n > ladderValue;
    const lit = litFor(n);
    const wasLit = litFor(ladderValue);
    stripes.forEach((s, i) => {
      const on = i < lit;
      const was = s.classList.contains("is-on");
      const img = s.querySelector(".stripe__on");
      s.classList.toggle("is-on", on);
      if (on && !was) gsap.fromTo(img, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.45, delay: 0.3 + (i - wasLit) * 0.08, ease: "back.out(2.2)" });
      if (!on) gsap.set(img, { clearProps: "opacity,transform" });
    });
    const label = ladder.querySelector(".hud-ladder__label b");
    label.textContent = n;
    ladder.setAttribute("aria-valuenow", n);
    if (grew && ladderValue) gsap.fromTo(label, { scale: 1.8 }, { scale: 1, duration: 0.6, delay: 0.3, ease: "elastic.out(1, .4)" });
    ladderValue = n;
  }

  /* ---------------- HUD: timer (counts up, pauses with the pause menu) ---------------- */

  const timerEl = $("#gameHeaderTimer");
  const timerVal = timerEl.querySelector(".hud-timer__value");
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m >= 60
      ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  const timer = {
    base: FND.state.get().elapsedMs || 0,
    since: 0,
    running: false,
    elapsed() { return this.base + (this.running ? performance.now() - this.since : 0); },
    start() { if (this.running) return; this.since = performance.now(); this.running = true; timerEl.classList.remove("is-paused"); },
    pause() {
      if (!this.running) return;
      this.base = this.elapsed();
      this.running = false;
      FND.state.set({ elapsedMs: this.base });
    },
    reset() { this.base = 0; this.running = false; FND.state.set({ elapsedMs: 0 }); this.render(); },
    render() { timerVal.textContent = fmt(this.elapsed()); },
  };
  let lastSaved = 0;
  setInterval(() => {
    timer.render();
    if (timer.running && performance.now() - lastSaved > 1000) {
      lastSaved = performance.now();
      FND.state.get().elapsedMs = timer.elapsed();
      FND.state.save();
    }
  }, 250);
  FND.timer = timer;

  document.addEventListener("fnd:mission-complete", () => {
    timer.pause();
    FND.state.set({ completed: true });
    timer.render();
  });
  document.addEventListener("fnd:play-again", () => restart());

  /* ---------------- HUD: back tab ---------------- */

  const btnBack = $("#btnPause");

  function canGoBack() {
    if (modals.length) return false;
    const k = currentKey;
    if (!k || k === "entry" || k === "complete") return false;
    if (k === "dashboard") return dashSettled();
    return CHUNKS[k]?.canGoBack() ?? false;
  }

  function goBack() {
    if (!canGoBack()) return;
    FND.audio.sfx("tap");
    const k = currentKey;
    if (CHUNKS[k]?.back()) return;
    if (k === "dashboard" && ["forwarded", "ignored"].includes(dashStage())) return enterDashboard("decision");
    const prevKey = ORDER[ORDER.indexOf(k) - 1];
    showKey(prevKey, { direct: true, atEnd: true, dir: -1 });
  }

  const nav = {
    update() {
      const can = canGoBack();
      btnBack.disabled = !can;
      const item = $('[data-menu="back"]');
      if (item) item.disabled = !canGoBackIgnoringModal();
    },
  };
  function canGoBackIgnoringModal() {
    const saved = modals.splice(0);
    const can = canGoBack();
    modals.push(...saved);
    return can;
  }
  FND.nav = nav;
  btnBack.addEventListener("click", goBack);

  /* ---------------- HUD: sound menu ---------------- */

  const soundBtn = $("#btnHudSound");
  const soundMenu = $("#soundMenu");
  const muteItem = soundMenu.querySelector('[data-sound="mute"]');

  function reflectSound() {
    const s = FND.state.get();
    muteItem.setAttribute("aria-checked", String(!!s.muted));
    soundBtn.classList.toggle("is-muted", !!s.muted);
    const voice = $('[data-menu="voice"]');
    voice.setAttribute("aria-pressed", String(!!s.voiceOn));
    $("#voiceState").textContent = s.voiceOn ? "On" : "Off";
    try { window.Howler?.mute(!!s.muted); } catch (e) { /* ignore */ }
    try { if (window.Tone) Tone.getDestination().mute = !!s.muted; } catch (e) { /* ignore */ }
  }

  function toggleSoundMenu(open = soundMenu.hidden) {
    soundMenu.hidden = !open;
    soundBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      gsap.fromTo(soundMenu, { y: -8, autoAlpha: 0, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)" });
      soundMenu.querySelector("button").focus({ preventScroll: true });
    }
  }
  soundBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    FND.audio.unlock();
    FND.audio.sfx("tap");
    toggleSoundMenu();
  });
  soundMenu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sound]");
    if (!b) return;
    if (b.dataset.sound === "replay") {
      toggleSoundMenu(false);
      FND.audio.replay();
    } else {
      const muted = !FND.state.get().muted;
      FND.state.set({ muted });
      if (muted) FND.audio.stop();
      reflectSound();
      FND.audio.sfx("tap");
    }
  });
  document.addEventListener("click", (e) => {
    if (!soundMenu.hidden && !e.target.closest(".hud-sound")) toggleSoundMenu(false);
  });

  /* ---------------- modals: Pause, Info, Replay confirm ---------------- */

  const modals = [];
  let frozen = null;       // gsap.exportRoot() of everything playing when the pause menu opened
  let lastFocus = null;

  function freeze() {
    if (frozen) return;
    frozen = gsap.exportRoot();
    frozen.pause();
    FND.audio.pause();
    timer.pause();
    timerEl.classList.add("is-paused");
  }
  function thaw() {
    if (!frozen) return;
    frozen.resume();
    frozen = null;
    FND.audio.resume();
    timerEl.classList.remove("is-paused");
    if (!["entry"].includes(currentKey) && !FND.state.get().completed) timer.start();
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (!m || modals.includes(m)) return;
    if (!modals.length) { lastFocus = document.activeElement; freeze(); }
    modals.push(m);
    m.classList.add("is-open");
    m.style.zIndex = 100 + modals.length;
    gsap.fromTo(m.querySelector(".modal__scrim"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
    gsap.fromTo(m.querySelector(".modal__card"), { y: 40, scale: 0.92, autoAlpha: 0, rotate: -2 }, { y: 0, scale: 1, autoAlpha: 1, rotate: 0, duration: 0.45, ease: "back.out(1.6)" });
    gsap.fromTo(m.querySelector(".modal__close"), { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.4, delay: 0.15, ease: "back.out(2.4)" });
    if (id === "modalPause") {
      $("#pauseTime").textContent = fmt(timer.elapsed());
      $("#pauseStep").textContent = `${ladderValue}/${TOTAL_MISSION_STEPS}`;
      reflectSound();
    }
    nav.update();
    setTimeout(() => m.querySelector(".menu-item, .btn, button")?.focus({ preventScroll: true }), 60);
  }

  function closeModal({ all = false } = {}) {
    const list = all ? modals.splice(0) : [modals.pop()].filter(Boolean);
    list.forEach((m) => {
      gsap.to(m.querySelector(".modal__card"), { y: 30, scale: 0.95, autoAlpha: 0, duration: 0.2, ease: "power2.in" });
      gsap.to(m.querySelector(".modal__scrim"), { autoAlpha: 0, duration: 0.22, onComplete: () => m.classList.remove("is-open") });
    });
    if (!modals.length) {
      thaw();
      lastFocus?.focus?.({ preventScroll: true });
    } else {
      modals[modals.length - 1].querySelector("button")?.focus({ preventScroll: true });
    }
    nav.update();
  }

  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) { FND.audio.sfx("tap"); closeModal(); } });
  });

  $("#btnHudInfo").addEventListener("click", () => {
    FND.audio.unlock();
    FND.audio.sfx("tap");
    toggleSoundMenu(false);
    openModal("modalPause");
  });

  $("#modalPause").addEventListener("click", (e) => {
    const item = e.target.closest("[data-menu]");
    if (!item || item.disabled) return;
    FND.audio.sfx("tap");
    switch (item.dataset.menu) {
      case "back": closeModal({ all: true }); goBack(); break;
      case "voice": {
        const voiceOn = !FND.state.get().voiceOn;
        FND.state.set({ voiceOn });
        if (!voiceOn) FND.audio.stop();
        reflectSound();
        break;
      }
      case "hear": closeModal({ all: true }); FND.audio.replay(); break;
      case "info": openModal("modalInfo"); break;
      case "fullscreen":
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
        else document.exitFullscreen?.();
        break;
      case "restart": openModal("modalReplay"); break;
      case "resume": closeModal(); break;
    }
  });

  $("#btnConfirmRestart").addEventListener("click", () => restart());

  function restart() {
    closeModal({ all: true });
    FND.audio.stop();
    FND.fx.clearConfetti();
    FND.state.clear();
    timer.reset();
    ladderValue = 0;
    setLadder(1);
    showKey("entry", { direct: true, dir: -1 });
  }

  document.addEventListener("keydown", (e) => {
    FND.audio.unlock();
    if (e.key === "Escape") {
      if (!soundMenu.hidden) { toggleSoundMenu(false); soundBtn.focus(); return; }
      if (modals.length) { closeModal(); return; }
    }
  });

  /* ---------------- narration lock ----------------
     While Dev is audibly speaking, taps, drags and Enter/Space do nothing — except the
     sound menu and the Menu button (so narration can always be muted or paused) and any
     open modal. With voice off nothing is locked. */

  let narrating = false;
  const LOCK_EXEMPT = ".hud-sound, #btnHudInfo, .modal";
  document.addEventListener("fnd:speaking", (e) => {
    narrating = !!e.detail.on;
    app.classList.toggle("is-narrating", narrating);
  });
  const swallow = (e) => {
    if (!narrating || e.target.closest?.(LOCK_EXEMPT)) return;
    e.stopPropagation();
    // (touchstart is left alone so the page can still scroll; the click that follows is swallowed)
    if (e.cancelable && (e.type === "click" || e.type === "dblclick" || e.type === "mousedown")) e.preventDefault();
  };
  ["pointerdown", "mousedown", "touchstart", "click", "dblclick"].forEach((type) =>
    document.addEventListener(type, swallow, { capture: true, passive: false }));
  document.addEventListener("keydown", (e) => {
    if (narrating && (e.key === "Enter" || e.key === " ") && !e.target.closest?.(LOCK_EXEMPT)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // audio contexts and speech both need a user gesture
  const unlockOnce = () => FND.audio.unlock();
  document.addEventListener("pointerdown", unlockOnce, { capture: true, once: true });

  /* ---------------- boot ---------------- */

  FND.ui.hydrateIcons(document);
  $("#pfDevice .device__status-icons").innerHTML = FND.device.statusIcons();
  (function homeIcons() {
    const apps = [["chat", "#25d366", "Chats"], ["camera", "#ff7a59", "Camera"], ["photo", "#f5b82e", "Photos"], ["map", "#34a0ff", "Maps"],
      ["music", "#ff4f8b", "Music"], ["book", "#8a6cff", "School"], ["settings", "#8796ad", "Settings"], ["phone", "#30c07a", "Phone"]];
    const tile = ([i, c, n]) => `<span class="home__app"><i style="background:${c}">${FND.icon(i)}</i><span>${n}</span></span>`;
    $('#pfHome [data-icons="apps"]').innerHTML = apps.map(tile).join("");
    $('#pfHome [data-icons="dock"]').innerHTML = [apps[7], apps[0], apps[1], apps[5]].map(tile).join("");
  })();

  reflectSound();
  FND.audio.preloadAll();
  setLadder(1);
  timer.render();

  // a refresh always starts again from the landing screen (sound preferences are kept)
  FND.state.clear();
  timer.reset();
  showKey("entry", { direct: true });

  // exposed for anyone inspecting or changing the flow
  FND.app = { headerProgressIndex, TOTAL_MISSION_STEPS, current: () => currentKey, stage: dashStage, restart };
})();
