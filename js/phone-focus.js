/* ==========================================================================
   phone-focus.js — the dashboard camera (GSAP).

   Poses the phone rig for each stage of the beat. js/app.js owns the order
   (an XState machine); this file only knows how each stage *moves*.

   · zoom  — phone about twice the stage height, top half in frame, so
             roughly half of it is cropped by the stage edges. Never wider
             than 82% of the stage (that would crop all four sides and take
             the notification with it).
   · open  — pulled back so the whole phone (and so the whole message) is in
             frame, never below the phone's resting size.
   · aside — resting size, beside the decision panel.
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});
  const $ = (s, r = document) => r.querySelector(s);

  let scene, rig, device, notif, tapcue, home, chat, list, msg, decision, spread, reflect;
  let pose = "rest";
  let loops = [];      // repeating idle animations
  let beats = [];      // stage timelines still in flight
  const beat = (tl) => { beats.push(tl); return tl; };
  const app = () => document.getElementById("app");

  function refs() {
    scene = $("#scene-dashboard");
    rig = $("#pfRig");
    device = $("#pfDevice");
    notif = $("#pfNotif");
    tapcue = $("#pfTapCue");
    home = $("#pfHome");
    chat = $("#pfChat");
    list = $("#pfList");
    msg = $("#pfMsg");
    decision = $("#pfDecision");
    spread = $("#pfSpread");
    reflect = $("#pfReflect");
  }

  const narrow = () => FND.layout.stacked();

  /** Camera pose → { x, y, scale } in stage pixels (rig is centred with x/yPercent -50). */
  function poseFor(name) {
    const W = scene.clientWidth, H = scene.clientHeight;
    const rw = rig.offsetWidth, rh = rig.offsetHeight;
    switch (name) {
      case "zoom": {
        const s = Math.max(1, Math.min((2 * H) / rh, (0.82 * W) / rw));
        return { x: W / 2, y: H * 0.05 + (rh * s) / 2, scale: s };
      }
      case "open": {
        const s = Math.max(1, Math.min((0.96 * H) / rh, (0.82 * W) / rw));
        return { x: W / 2, y: H / 2, scale: s };
      }
      case "aside": {
        if (narrow()) {
          const panelH = decision.offsetHeight || 260;
          const s = Math.min(1, Math.max(0.45, (H - panelH - 20) / rh));
          return { x: W / 2, y: 8 + (rh * s) / 2, scale: s };
        }
        return { x: W * 0.26, y: H / 2, scale: 1 };
      }
      default:
        return { x: W / 2, y: H / 2, scale: 1 };
    }
  }

  function place(name) {
    pose = name;
    gsap.set(rig, { xPercent: -50, yPercent: -50, ...poseFor(name) });
  }
  function moveTo(name, duration = 1.2, ease = "camera") {
    pose = name;
    return gsap.to(rig, { ...poseFor(name), duration, ease });
  }

  function setBackdrop(mode) { app().dataset.backdrop = mode; }

  function killLoops() { loops.forEach((t) => t.kill()); loops = []; }

  /** Put the whole scene back to its resting, pre-beat look. */
  function reset() {
    refs();
    killLoops();
    beats.forEach((t) => t.kill());
    beats = [];
    gsap.killTweensOf([rig, notif, tapcue, home, chat, list, msg, decision, spread, reflect]);
    // anything a .from() may have left half-way
    gsap.set([
      "#pfCard", ".pf-spread__title", ".pf-spread__foot > *", ".pf-reflect__dev img", "#pfReflect .panel",
      "#pfReflect .banner", "#pfReflect .btn", "#pfDecision .pf-choice", msg,
    ], { clearProps: "all" });
    device.classList.add("is-home");
    gsap.set([notif, tapcue, chat, list, decision, spread, reflect], { autoAlpha: 0, clearProps: "transform" });
    gsap.set([home, rig], { autoAlpha: 1 });
    msg.querySelectorAll(".msg__line").forEach((l) => l.classList.remove("is-reading"));
    spread.querySelector("#pfSpreadSvg").innerHTML = "";
    const date = new Date();
    $("#pfDate").textContent = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    place("rest");
  }

  /* ---------------- the stages ---------------- */

  function zoomIn() {
    setBackdrop("focus");
    return beat(gsap.timeline().add(moveTo("zoom", 1.5)));
  }

  function dropNotification() {
    FND.audio.sfx("notify");
    const tl = beat(gsap.timeline());
    tl.fromTo(notif, { autoAlpha: 0, yPercent: -140 }, { autoAlpha: 1, yPercent: 0, duration: 0.7, ease: "drop" })
      .to(rig, { keyframes: { rotation: [0, -1.4, 1.4, -1, 1, 0] }, duration: 0.5, ease: "none" }, 0.1)
      .fromTo(tapcue, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.55);
    return tl;
  }

  /** Waiting for the tap: notification glows, the cue bobs. */
  function waitForTap() {
    killLoops();
    loops.push(
      gsap.fromTo(notif, { boxShadow: "0 0 0 0 rgba(249,161,27,.9), 0 2cqw 6cqw rgba(0,0,0,.3)" },
        { boxShadow: "0 0 0 16px rgba(249,161,27,0), 0 2cqw 6cqw rgba(0,0,0,.3)", duration: 1.1, repeat: -1, ease: "power1.out" }),
      gsap.to(tapcue, { y: -6, duration: 0.55, repeat: -1, yoyo: true, ease: "sine.inOut" }),
    );
  }

  function openMessage() {
    killLoops();
    FND.audio.sfx("whoosh");
    const tl = beat(gsap.timeline());
    tl.to(tapcue, { autoAlpha: 0, duration: 0.2 })
      .to(notif, { scale: 1.05, duration: 0.12 }, 0)
      .to(notif, { autoAlpha: 0, yPercent: -30, duration: 0.3 }, 0.12)
      .add(() => device.classList.remove("is-home"), 0.2)
      .to(home, { autoAlpha: 0, duration: 0.45 }, 0.2)
      .set(chat, { autoAlpha: 1 }, 0.2)
      .fromTo(msg, { scale: 0.55, autoAlpha: 0, y: -30 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.7, ease: "back.out(1.5)" }, 0.35)
      .add(moveTo("open", 1.1), 0.1);
    return tl;
  }

  /** Walk a highlight down the message lines over roughly `ms`. */
  function readAlong(ms) {
    const lines = [...msg.querySelectorAll(".msg__from, .msg__head, .msg__line")];
    const step = ms / 1000 / (lines.length + 0.5);
    const tl = beat(gsap.timeline());
    lines.forEach((l, i) => {
      tl.add(() => { lines.forEach((x) => x.classList.remove("is-reading")); l.classList.add("is-reading"); }, i * step);
    });
    tl.add(() => lines.forEach((x) => x.classList.remove("is-reading")), lines.length * step);
    loops.push(tl);
    return tl;
  }
  function stopReadAlong() {
    killLoops();
    msg.querySelectorAll(".is-reading").forEach((x) => x.classList.remove("is-reading"));
  }

  function returnPhone() {
    stopReadAlong();
    const tl = beat(gsap.timeline());
    tl.to(msg, { scale: 0.7, autoAlpha: 0, duration: 0.4, ease: "power2.in" })
      .set(chat, { autoAlpha: 0 })
      .fromTo(list, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 })
      .add(() => setBackdrop("mission"), 0.2)
      .add(moveTo("aside", 1.2), 0.25);
    return tl;
  }

  function showDecision(instant = false) {
    if (instant) {
      device.classList.remove("is-home");
      gsap.set([home, chat, notif, tapcue], { autoAlpha: 0 });
      gsap.set(list, { autoAlpha: 1 });
      setBackdrop("mission");
    }
    gsap.set(decision, { autoAlpha: 1 });
    if (instant) place("aside");
    const tl = beat(gsap.timeline());
    tl.from(decision, { x: narrow() ? 0 : 60, y: narrow() ? 40 : 0, autoAlpha: 0, duration: 0.6 })
      .from(decision.querySelectorAll(".pf-choice"), { scale: 0.6, autoAlpha: 0, stagger: 0.12, duration: 0.5, ease: "back.out(2)" }, 0.25);
    if (!instant) FND.fx.titleIn(decision.querySelector(".title"));
    if (instant) { place("aside"); tl.progress(1); }
    return tl;
  }

  /* ---------------- consequences ---------------- */

  const GROUPS = [
    { name: "Class 7A", n: 38 }, { name: "Football", n: 22 }, { name: "Family", n: 16 },
    { name: "Tuition", n: 30 }, { name: "Neighbours", n: 27 }, { name: "Class 8B", n: 41 },
  ];

  function buildSpread() {
    const svg = $("#pfSpreadSvg");
    const box = $("#pfSpreadMap").getBoundingClientRect();
    const W = Math.max(280, box.width), H = Math.max(220, box.height);
    const cx = W / 2, cy = H / 2;
    const R1 = Math.min(W * 0.34, H * 0.36);
    const R2 = Math.min(W, H) * 0.12;
    const NS = "http://www.w3.org/2000/svg";
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const gLinks = document.createElementNS(NS, "g");
    const gNodes = document.createElementNS(NS, "g");
    const gPackets = document.createElementNS(NS, "g");
    svg.append(gLinks, gPackets, gNodes);
    const out = { links1: [], links2: [], groups: [], people: [], packets1: [], packets2: [] };

    GROUPS.forEach((g, i) => {
      const a = (i / GROUPS.length) * Math.PI * 2 - Math.PI / 2 + 0.3;
      const gx = cx + Math.cos(a) * R1 * 1.25, gy = cy + Math.sin(a) * R1;
      const l = document.createElementNS(NS, "path");
      l.setAttribute("d", `M${cx},${cy} Q${(cx + gx) / 2 + Math.sin(a) * 30},${(cy + gy) / 2 - Math.cos(a) * 30} ${gx},${gy}`);
      l.setAttribute("class", "link");
      gLinks.appendChild(l);
      out.links1.push(l);

      const p = document.createElementNS(NS, "circle");
      p.setAttribute("r", 6);
      p.setAttribute("class", "packet");
      gPackets.appendChild(p);
      out.packets1.push({ el: p, path: l });

      for (let k = 0; k < 4; k++) {
        const b = a + (k - 1.5) * 0.42;
        const px = gx + Math.cos(b) * R2 * 1.5, py = gy + Math.sin(b) * R2;
        const l2 = document.createElementNS(NS, "path");
        l2.setAttribute("d", `M${gx},${gy} L${px},${py}`);
        l2.setAttribute("class", "link link--2");
        gLinks.appendChild(l2);
        out.links2.push(l2);
        const pk = document.createElementNS(NS, "circle");
        pk.setAttribute("r", 3.5);
        pk.setAttribute("class", "packet");
        gPackets.appendChild(pk);
        out.packets2.push({ el: pk, path: l2 });
        const person = document.createElementNS(NS, "g");
        person.setAttribute("class", "person");
        person.innerHTML = `<circle cx="${px}" cy="${py}" r="7"/>`;
        gNodes.appendChild(person);
        out.people.push(person);
      }

      const node = document.createElementNS(NS, "g");
      node.setAttribute("class", "node");
      node.innerHTML = `<circle cx="${gx}" cy="${gy}" r="22"/><text x="${gx}" y="${gy}">${g.n}</text><text class="label" x="${gx}" y="${gy + 36}">${g.name}</text>`;
      gNodes.appendChild(node);
      out.groups.push(node);
    });
    return out;
  }

  function showSpread(instant = false) {
    killLoops();
    setBackdrop("spread");
    const count = $("#pfCount");
    const total = GROUPS.reduce((s, g) => s + g.n, 0);
    const card = $("#pfCard");
    const foot = spread.querySelector(".pf-spread__foot");
    const title = spread.querySelector(".pf-spread__title");
    count.textContent = "1";

    // geometry needs the container visible to be measured
    gsap.set(spread, { autoAlpha: 1 });
    const parts = buildSpread();
    const packets = [...parts.packets1, ...parts.packets2].map((p) => p.el);
    gsap.set(packets, { autoAlpha: 0 });

    const tl = beat(gsap.timeline());
    tl.to([rig, decision], { autoAlpha: 0, scale: 0.8, duration: 0.35, ease: "power2.in" }, 0)
      .addLabel("card", 0.25)
      .from(card, { scale: 0, rotate: -12, duration: 0.5, ease: "back.out(2)" }, "card")
      .add(() => FND.audio.sfx("whoosh"), "card+=0.4")
      .addLabel("wave1", "card+=0.55")
      .from(parts.links1, { drawSVG: "0%", duration: 0.6, stagger: 0.08, ease: "power2.out" }, "wave1");
    parts.packets1.forEach(({ el, path }, i) => {
      const at = `wave1+=${(i * 0.08).toFixed(2)}`;
      tl.set(el, { autoAlpha: 1 }, at)
        .to(el, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, duration: 0.7, ease: "power1.inOut" }, at);
    });
    tl.addLabel("groups", "wave1+=0.9")
      .from(parts.groups, { scale: 0, transformOrigin: "50% 50%", duration: 0.45, stagger: 0.07, ease: "back.out(2.2)" }, "groups")
      .add(() => FND.fx.countTo(count, 6, { duration: 0.4, from: 1 }), "groups")
      .addLabel("wave2", "groups+=0.55")
      .from(parts.links2, { drawSVG: "0%", duration: 0.45, stagger: 0.015 }, "wave2");
    parts.packets2.forEach(({ el, path }, i) => {
      const at = `wave2+=${(i * 0.015).toFixed(3)}`;
      tl.set(el, { autoAlpha: 1 }, at)
        .to(el, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, duration: 0.5, ease: "power1.in" }, at);
    });
    tl.addLabel("people", "wave2+=0.7")
      .from(parts.people, { scale: 0, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.012, ease: "back.out(3)" }, "people")
      .add(() => {
        parts.people.forEach((p) => p.classList.add("is-hit"));
        FND.fx.countTo(count, total, { duration: 1.2, from: 6 });
        FND.audio.sfx("warn");
      }, "people")
      .to(packets, { autoAlpha: 0, duration: 0.3 }, "people+=0.3")
      .fromTo(title, { autoAlpha: 0, scale: 1.4 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, "people+=0.2")
      .add(() => FND.fx.shake(title), "people+=0.7")
      .from(foot.children, { autoAlpha: 0, y: 20, stagger: 0.12, duration: 0.45 }, "people+=0.8")
      // idle life: the network keeps pulsing
      .add(() => {
        loops.push(gsap.to(parts.groups.map((g) => g.querySelector("circle")),
          { attr: { r: 25 }, duration: 0.8, repeat: -1, yoyo: true, stagger: 0.15, ease: "sine.inOut" }));
      });
    if (instant) { tl.progress(1); count.textContent = String(total); }
    return tl;
  }

  function showReflect(instant = false) {
    killLoops();
    setBackdrop("mission");
    const tl = beat(gsap.timeline());
    tl.to([rig, decision], { autoAlpha: 0, x: "-=40", duration: 0.35, ease: "power2.in" })
      .set(reflect, { autoAlpha: 1 })
      .from(reflect.querySelector(".pf-reflect__dev img"), { x: -120, autoAlpha: 0, duration: 0.7, ease: "back.out(1.4)" })
      .from(reflect.querySelector(".panel"), { x: 80, autoAlpha: 0, duration: 0.6 }, "<0.1")
      .from(reflect.querySelectorAll(".banner, .btn"), { scale: 0.7, autoAlpha: 0, stagger: 0.15, duration: 0.45, ease: "back.out(2)" }, "-=0.2");
    if (instant) tl.progress(1);
    else FND.fx.titleIn(reflect.querySelector(".title"), { delay: 0.5 });
    return tl;
  }

  function onResize() {
    if (!scene || !scene.classList.contains("is-active")) return;
    if (gsap.getTweensOf(rig).length) return;
    place(pose);
  }
  window.addEventListener("resize", () => requestAnimationFrame(onResize));

  FND.phoneFocus = {
    reset, zoomIn, dropNotification, waitForTap, openMessage, readAlong, stopReadAlong,
    returnPhone, showDecision, showSpread, showReflect, killLoops,
    place, setBackdrop,
  };
})();
