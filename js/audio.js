/* ==========================================================================
   audio.js — Dev's narration and the game's sound effects.

   Narration: every line has a key. Dev's lines are recorded with ElevenLabs
   (voice "Bittu – Heavy Kid Cartoon Character", 4iqKdEXMW8NRF8USiS3Q, model
   eleven_multilingual_v2) as assets/audio/<key>.mp3 and play through Howler. If a
   file is missing or fails to load, Dev reads the NARRATION text with the
   browser's speech synthesis instead. With voice off (or everything muted)
   the promise still resolves after the line's length, so every screen that
   waits on narration keeps working silently.

   Change a line's words in NARRATION and its recording must be made again
   (the audio says "V one" / "V two" where the text says V1 / V2).

   Sound effects are synthesised with Tone.js — no audio files needed.
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});

  /** key → recording. Filled below from NARRATION: every line has assets/audio/<key>.mp3. */
  const AUDIO_MAP = {};

  const NARRATION = {
    dev_intro: "Hi! I'm Dev. Some messages that fly around aren't true, and they spread fast. Today you and I will build the Fake News Detector: an app that spots suspicious messages. Ready?",
    notification: "Ooh, a new message just arrived. Tap it to open it.",
    message_body: "Urgent water warning! The school water tank is contaminated. School closed for three days from tomorrow! The science test has also been postponed. Share this with all class groups immediately! What will you do? Forward it, or ignore it?",
    open_message: "A forwarded message, from an unknown number. It says: Urgent water warning! The school water tank is contaminated. School closed for three days from tomorrow! The science test has also been postponed. Share this with all class groups immediately!",
    first_decision: "So. What will you do? Forward it, or ignore it?",
    forward_feedback: "Oh no! One tap, and it jumped to six groups, and then to everyone in them. And we still don't know if it's true. Let's inspect the message.",
    ignore_feedback: "Good pause! You didn't spread it. But ignoring it doesn't tell us whether it's true. Let's inspect the message.",

    hunt_intro: "This message has three red flags. Tap each one to find it.",
    clue_source: "Red flag! It's from an unknown number. We can't tell who sent it, so we can't trust it yet. You unlocked the Source Check.",
    clue_claim: "Red flag! School closed for three days is a huge claim, with no proof and no notice from the school. You unlocked the Claim Check.",
    clue_pressure: "Red flag! Share this immediately is pressure. Fake messages rush you so you don't stop to think. You unlocked the Pressure Check.",
    wrong_clue: "Hmm, that line might be wrong too, but it isn't one of the three red flags. Look again.",
    hint_source: "Here's a clue: look at who sent the message.",
    hint_claim: "Here's a clue: find the biggest claim in the message.",
    hint_pressure: "Here's a clue: find the line that tells you to hurry.",
    all_clues: "Brilliant! You found all three red flags.",
    why_build: "Checking every message by hand takes time. What if one detector could ask the same questions, every single time? Let's build it!",

    checks_unlocked: "You unlocked three checks. Source: who sent it. Claim: is it backed up. Pressure: is it rushing you. These are the rules for our detector.",

    build_intro: "Let's build Detector V1. Drag each check into a slot, or tap a check and then tap a glowing slot.",
    build_placed: "Check installed!",
    build_done: "All three checks are active. Detector V1 is ready to test!",

    test1_intro: "Test message one. Before we scan it, would you trust it?",
    test2_intro: "Test message two. This time, predict which checks will warn.",
    test3_intro: "Test message three. Would you trust this one?",
    test_ready: "Answer locked. Now let Detector V1 decide.",
    test1_done: "All three checks warn. Detector V1 stopped this one!",
    test2_done: "Only the Claim Check warned. V1 isn't sure. It can't tell if the exam really moved.",
    test3_done: "V1 found nothing wrong. But wait: nobody checked if those bonus marks are real.",
    report: "V1 stopped one message out of three. It checks who sent it, what it claims, and how it pushes you. But it can't look for proof. Let's upgrade it.",

    upgrade_choose: "Pick the two checks that will help our detector find proof.",
    upgrade_wrong: "Careful! Anyone can make a message look nice, and lots of shares don't make it true. Pick checks that find evidence.",
    upgrade_unlocked: "Proof and Confirm! Tap each lock to unlock them.",
    upgrade_install: "Install Proof and Confirm to build Detector V2.",
    upgrade_active: "Detector V2 is online, with five checks active!",
    retest_intro: "Let's retest the bonus marks message, with all five checks this time.",
    retest_done: "Proof and Confirm both failed. So, what's your verdict?",
    retest_wrong: "Look again at Proof and Confirm. There's no evidence, and the school hasn't said anything.",
    retest_right: "Exactly! V2 caught what V1 missed.",
    v2_ready: "Detector V2 is ready! Now let's practise the steps a fact checker follows, every time.",
    order_intro: "Put the four steps in the right order. Drag them, or use the arrows.",
    order_wrong: "Not quite. Always start by reading, and only decide after you've run and reviewed the checks.",
    order_right: "Perfect: read, run, review, decide.",

    final_intro: "The final mission! Three new messages, and no help from me. Scan each one, then pick a verdict and a safe action.",
    final_scan_done: "Scan complete. Now choose your verdict and your action.",
    final_right: "Correct!",
    final_wrong: "Not quite. Look at the check results and try again.",
    results: "You did it! You solved all three messages.",
    learned: "Here's what you learned. Read carefully. Think before you share. And help others stay safe online.",
    complete: "Mission complete! You're a certified Fake News Detector builder.",
  };

  // message_body is left unrecorded on purpose: the dashboard then reads open_message +
  // first_decision, which also name the unknown sender (the first red flag).
  Object.keys(NARRATION).forEach((key) => { if (key !== "message_body") AUDIO_MAP[key] = `assets/audio/${key}.mp3`; });

  /* ---------------- narration ---------------- */

  let active = null;        // { id, finish, cancel, pauseFn, resumeFn, guard }
  let speaking = false;     // true only while Dev is audibly talking (the shell locks input then)

  function setSpeaking(on) {
    if (speaking === on) return;
    speaking = on;
    document.dispatchEvent(new CustomEvent("fnd:speaking", { detail: { on } }));
  }
  let session = 0;
  let lastKeys = [];
  let paused = false;
  const howls = {};
  const failed = new Set();
  let voice = null;

  const state = () => FND.state.get();
  const voiceAllowed = () => state().voiceOn && !state().muted && !FND.TEST_MODE;

  function estimateMs(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const ms = Math.max(1200, words * 330 + 500);
    return FND.TEST_MODE ? ms / 12 : ms;
  }

  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    const rank = (v) => {
      let r = 0;
      if (/^en[-_]IN/i.test(v.lang)) r += 6;
      else if (/^en[-_]GB/i.test(v.lang)) r += 4;
      else if (/^en/i.test(v.lang)) r += 3;
      else r -= 20;
      if (/natural|neural|google|online/i.test(v.name)) r += 2;
      return r;
    };
    return voices.slice().sort((a, b) => rank(b) - rank(a))[0];
  }
  if ("speechSynthesis" in window) {
    voice = pickVoice();
    speechSynthesis.addEventListener?.("voiceschanged", () => { voice = pickVoice(); });
  }

  function later(ms, fn) {
    // gsap.delayedCall freezes with the pause menu (gsap.exportRoot), setTimeout would not
    return window.gsap ? gsap.delayedCall(ms / 1000, fn) : { kill: clearTimeout.bind(null, setTimeout(fn, ms)) };
  }

  /** Speaks sentence by sentence (Chrome cuts long utterances short). Returns a cancel function. */
  function speak(text, onDone, onStart) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    let i = 0;
    let dead = false;
    const next = () => {
      if (dead) return;
      if (i >= sentences.length) return onDone();
      const u = new SpeechSynthesisUtterance(sentences[i++].trim());
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "en-IN";
      u.rate = 1.02;
      u.pitch = 1.15;
      u.onstart = onStart || null;
      u.onend = next;
      u.onerror = next;
      speechSynthesis.speak(u);
    };
    speechSynthesis.cancel();
    setTimeout(next, 60);
    return () => { dead = true; speechSynthesis.cancel(); };
  }

  function getHowl(key) {
    if (!window.Howl || !AUDIO_MAP[key] || failed.has(key)) return null;
    if (!howls[key]) {
      howls[key] = new Howl({
        src: [AUDIO_MAP[key]],
        preload: true,
        html5: location.protocol === "file:",      // opened straight from disk: XHR can't read the files
        onloaderror: () => failed.add(key),
      });
    }
    return howls[key];
  }

  /** Start loading every recording so lines play without a delay. */
  function preloadAll() {
    if (FND.TEST_MODE) return;
    Object.keys(AUDIO_MAP).forEach((key) => getHowl(key));
  }

  /** How long a line lasts: the recording's length once loaded, otherwise the reading estimate. */
  function durationMs(key) {
    const h = howls[key];
    if (voiceAllowed() && h && h.state() === "loaded" && h.duration()) return h.duration() * 1000;
    return estimateMs(NARRATION[key] || "");
  }

  function playOne(key, id) {
    return new Promise((resolve) => {
      if (!active || active.id !== id) return resolve();
      const text = NARRATION[key] || "";
      let settled = false;
      let guard = null;
      const done = () => {
        if (settled) return;
        settled = true;
        guard?.kill();
        resolve();
      };

      // the browser's voice, or silence for the line's length
      const speakOrHold = () => {
        if (settled || !active || active.id !== id) return;
        guard?.kill();
        if (voiceAllowed() && text && "speechSynthesis" in window) {
          const cancel = speak(text, done, () => setSpeaking(true));
          active.cancel = () => { cancel(); done(); };
          active.pauseFn = () => speechSynthesis.pause();
          active.resumeFn = () => speechSynthesis.resume();
          guard = later(estimateMs(text) * 1.9 + 3000, done);   // onend can go missing
          return;
        }
        active.cancel = done;
        active.pauseFn = active.resumeFn = null;
        guard = later(estimateMs(text), done);
      };

      const howl = voiceAllowed() ? getHowl(key) : null;
      if (!howl) return speakOrHold();

      // Dev's recording
      let gaveUp = false;
      const fallback = () => { if (gaveUp || settled) return; gaveUp = true; speakOrHold(); };
      const start = () => {
        if (gaveUp || settled || !active || active.id !== id) return;
        guard?.kill();
        const sid = howl.play();
        howl.once("play", () => setSpeaking(true), sid);
        howl.once("end", done, sid);
        howl.once("playerror", () => { howl.stop(sid); fallback(); }, sid);
        active.cancel = () => { howl.stop(sid); done(); };
        active.pauseFn = () => howl.pause(sid);
        active.resumeFn = () => howl.play(sid);
        guard = later((howl.duration() ? howl.duration() * 1000 : estimateMs(text) * 2) + 3000, done);
      };
      if (howl.state() === "loaded") return start();
      howl.once("load", start);
      howl.once("loaderror", fallback);
      active.cancel = () => { gaveUp = true; done(); };
      active.pauseFn = active.resumeFn = null;
      guard = later(6000, fallback);        // a slow connection doesn't hold the game up
    });
  }

  /**
   * Narrate one key or a list of keys in sequence.
   * Resolves { completed: true } when finished, { completed: false } if stopped.
   */
  function narrate(keys, { remember = true } = {}) {
    keys = [].concat(keys).filter((k) => k in NARRATION || AUDIO_MAP[k]);
    stop();
    if (remember && keys.length) lastKeys = keys;
    const id = ++session;
    return new Promise((resolve) => {
      active = {
        id,
        finish(completed) {
          if (!active || active.id !== id) return;
          active = null;
          setSpeaking(false);
          resolve({ completed });
        },
      };
      (async () => {
        for (const key of keys) {
          if (!active || active.id !== id) return;
          await playOne(key, id);
        }
        active?.id === id && active.finish(true);
      })();
    });
  }

  function stop() {
    if (!active) return;
    const a = active;
    try { a.cancel?.(); } catch (e) { /* ignore */ }
    a.finish(false);
  }

  function pause() {
    paused = true;
    try { active?.pauseFn?.(); } catch (e) { /* ignore */ }
  }
  function resume() {
    if (!paused) return;
    paused = false;
    try { active?.resumeFn?.(); } catch (e) { /* ignore */ }
  }

  /** Replace the "Hear again" target without speaking (used when a screen shows but narration is deferred). */
  function remember(keys) { lastKeys = [].concat(keys); }

  /* ---------------- sound effects (Tone.js) ---------------- */

  let tone = null;

  function initTone() {
    if (tone || !window.Tone) return;
    try {
      Tone.start();
      const out = new Tone.Volume(-6).toDestination();
      const poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.004, decay: 0.16, sustain: 0.04, release: 0.28 },
      }).connect(out);
      poly.volume.value = -8;
      const bell = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.01,
        modulationIndex: 9,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.7 },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
      }).connect(out);
      bell.volume.value = -14;
      const low = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.004, decay: 0.18, sustain: 0, release: 0.08 },
      }).connect(out);
      low.volume.value = -22;
      const filter = new Tone.Filter(600, "bandpass").connect(out);
      const noise = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.04, decay: 0.34, sustain: 0 } }).connect(filter);
      noise.volume.value = -16;
      const thump = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 4, envelope: { attack: 0.001, decay: 0.22, sustain: 0 } }).connect(out);
      thump.volume.value = -12;
      tone = { poly, bell, low, noise, filter, thump, last: {} };
    } catch (err) {
      tone = null;
    }
  }

  // monophonic synths throw if re-triggered at the same instant
  function at(name) {
    const now = Tone.now();
    const t = Math.max(now + 0.005, (tone.last[name] || 0) + 0.02);
    tone.last[name] = t;
    return t;
  }
  const arp = (synth, notes, step, dur = "16n") => {
    const t = Tone.now() + 0.01;
    notes.forEach((n, i) => synth.triggerAttackRelease(n, dur, t + i * step));
  };

  const SFX = {
    tap: () => tone.poly.triggerAttackRelease("A5", "64n"),
    pop: () => tone.poly.triggerAttackRelease("E6", "64n"),
    good: () => arp(tone.poly, ["C5", "E5", "G5"], 0.07),
    bad: () => arp(tone.low, ["D3", "A2"], 0.11, "16n"),
    notify: () => arp(tone.bell, ["E6", "B6"], 0.14, "8n"),
    whoosh: () => {
      tone.filter.frequency.cancelScheduledValues(Tone.now());
      tone.filter.frequency.setValueAtTime(300, Tone.now());
      tone.filter.frequency.exponentialRampToValueAtTime(3200, Tone.now() + 0.35);
      tone.noise.triggerAttackRelease(0.35, at("noise"));
    },
    scan: () => tone.poly.triggerAttackRelease("C6", "64n"),
    ok: () => arp(tone.poly, ["G5", "C6"], 0.05, "32n"),
    warn: () => arp(tone.low, ["F4", "F4"], 0.09, "32n"),
    fail: () => arp(tone.low, ["C3", "G2"], 0.1, "16n"),
    snap: () => { tone.thump.triggerAttackRelease("C3", "16n", at("thump")); tone.poly.triggerAttackRelease("G5", "64n"); },
    unlock: () => arp(tone.poly, ["C5", "E5", "G5", "C6"], 0.06),
    fanfare: () => {
      const t = Tone.now() + 0.02;
      [["C4", "E4", "G4"], ["F4", "A4", "C5"], ["G4", "B4", "D5"], ["C5", "E5", "G5", "C6"]]
        .forEach((chord, i) => tone.poly.triggerAttackRelease(chord, i === 3 ? "2n" : "8n", t + i * 0.18));
    },
    boot: () => arp(tone.bell, ["C5", "G5", "C6", "E6"], 0.09, "16n"),
  };

  function sfx(name) {
    if (state().muted || !tone || !SFX[name]) return;
    try { SFX[name](); } catch (err) { /* never let a sound break the game */ }
  }

  /** Call from any user gesture: audio contexts and speech need one. */
  function unlock() { initTone(); }

  FND.audio = {
    AUDIO_MAP,
    NARRATION,
    narrate,
    stop,
    pause,
    resume,
    remember,
    replay: () => lastKeys.length ? narrate(lastKeys) : Promise.resolve({ completed: true }),
    lastKeys: () => lastKeys.slice(),
    hasRecording: (key) => !!AUDIO_MAP[key] && !failed.has(key),
    text: (key) => NARRATION[key] || "",
    estimateMs,
    durationMs,
    preloadAll,
    isSpeaking: () => speaking,
    sfx,
    unlock,
  };
})();
