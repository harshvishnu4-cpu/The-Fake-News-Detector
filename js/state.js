/* ==========================================================================
   state.js — the game's shared state, its persistence, and mission content.

   Nothing resumes: a refresh (like Restart) clears progress and starts from
   the landing screen. Only the sound preferences survive, in sessionStorage.
   Each chunk's init() resets that module's own state.
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});
  const params = new URLSearchParams(location.search);

  /** ?fast=1 speeds every animation up and silences narration (automated testing only). */
  FND.TEST_MODE = params.has("fast");

  const STORAGE_KEY = "truthlens-app-challenge";

  const defaults = () => ({
    currentScene: "entry",   // scene key: entry | dev-intro | dashboard | chunk2 … chunk7
    currentChunk: null,      // 2 … 7 while inside a chunk
    decision: null,          // "forward" | "ignore"
    elapsedMs: 0,
    voiceOn: !FND.TEST_MODE,
    muted: FND.TEST_MODE,
    v1Report: null,          // { stopped, unsure, passed } from Test Detector V1
    finalSolved: 0,
    firstTry: 0,
    completed: false,
  });

  let gameState = load();

  function load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return Object.assign(defaults(), raw ? JSON.parse(raw) : {});
    } catch (err) {
      return defaults();
    }
  }
  function save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); } catch (err) { /* private mode */ }
  }
  function set(patch) { Object.assign(gameState, patch); save(); return gameState; }
  /** Restart: clear progress but keep the player's sound preferences. */
  function clear() {
    const keep = { voiceOn: gameState.voiceOn, muted: gameState.muted };
    gameState = Object.assign(defaults(), keep);
    save();
    return gameState;
  }

  FND.state = { get: () => gameState, set, save, clear };
  Object.defineProperty(window, "gameState", { get: () => gameState, configurable: true });

  /* ------------------------------------------------------------------
     The five checks. V1 ships with the first three; V2 adds two more.
     ------------------------------------------------------------------ */
  const CHECKS = {
    source:   { id: "source",   name: "Source Check",   short: "Source",   icon: "source",   q: "Who sent it? Can we trust them?" },
    claim:    { id: "claim",    name: "Claim Check",    short: "Claim",    icon: "claim",    q: "Is the big claim backed up by anything?" },
    pressure: { id: "pressure", name: "Pressure Check", short: "Pressure", icon: "pressure", q: "Is it rushing you to act or share?" },
    proof:    { id: "proof",    name: "Proof Check",    short: "Proof",    icon: "proof",    q: "Is there evidence you can actually see?" },
    confirm:  { id: "confirm",  name: "Confirm Check",  short: "Confirm",  icon: "confirm",  q: "Does an official source say the same thing?" },
  };
  const V1_CHECKS = ["source", "claim", "pressure"];
  const V2_CHECKS = ["source", "claim", "pressure", "proof", "confirm"];

  /** Upgrade V1: two useful checks and two distractors. */
  const UPGRADE_CHOICES = [
    { id: "proof", correct: true, name: "Proof", icon: "proof", q: "Look for evidence you can actually see." },
    { id: "appearance", correct: false, name: "Appearance", icon: "sparkle", q: "Trust it if it looks professional.",
      why: "Anyone can make a message look neat and official." },
    { id: "confirm", correct: true, name: "Confirm", icon: "confirm", q: "Compare it with an official source." },
    { id: "popularity", correct: false, name: "Popularity", icon: "flame", q: "Trust it if lots of people shared it.",
      why: "Lots of shares only means it spread — not that it is true." },
  ];

  /* ------------------------------------------------------------------
     The forwarded message (dashboard + clue hunt).
     It carries the three red flags the hunt asks for: an unverifiable
     sender, one big claim, and a line that rushes you. It appears in four
     places in index.html (notification, chat preview, full message, spread
     card) — change it there too, and in chunk-02-investigation.js.
     ------------------------------------------------------------------ */
  const CLUES = {
    source: {
      check: "source",
      line: "Unknown number: +91 90123 45678",
      explain: "We don’t know who this is. An unknown sender can’t be trusted yet.",
      annotate: "circle",
    },
    claim: {
      check: "claim",
      line: "School closed for 3 days",
      explain: "A huge claim — with no proof and no notice from the school.",
      annotate: "box",
    },
    pressure: {
      check: "pressure",
      line: "Share this with all class groups immediately",
      explain: "Rushing you to share is a trick to stop you thinking first.",
      annotate: "underline",
    },
  };
  const CLUE_ORDER = ["source", "claim", "pressure"];

  /* ------------------------------------------------------------------
     Test Detector V1 — three test messages.
     status: ok (passes) · warn (warning) · fail (failed)
     ------------------------------------------------------------------ */
  const TEST_MESSAGES = [
    {
      id: "base-suspicious",
      title: "Test Message 1",
      chat: { name: "+91 88001 22334", sub: "Not in your contacts", avatar: "?" },
      fwd: "Forwarded",
      head: "🎁 FREE TABLETS FOR STUDENTS!",
      lines: ["Every student gets a free tablet this week.", "Tap <span class=\"msg__link\">bit.ly/free-tab-now</span> and enter your home address.", "<b>Offer ends TODAY at 6 PM — hurry!</b>"],
      time: "11:02",
      results: {
        source:   { s: "warn", why: "Unknown number with no name." },
        claim:    { s: "warn", why: "Free tablets for everyone? No proof at all." },
        pressure: { s: "warn", why: "“Ends TODAY — hurry!”" },
      },
      // where each check looks while it scans (who = sender, fwd, head, lN = line N, bubble = whole message)
      focus: { source: ["who", "fwd"], claim: ["head", "l0"], pressure: ["l2"] },
      outcome: "stopped",
    },
    {
      id: "exam-date-changed",
      title: "Test Message 2",
      chat: { name: "Riya", sub: "Classmate · 7B", avatar: "R", avatarClass: "device__avatar--friend" },
      head: "EXAM DATE CHANGED 📅",
      lines: ["Monday’s maths exam has moved to Friday.", "My brother heard it from someone in 8A."],
      time: "12:40",
      results: {
        source:   { s: "ok",   why: "Riya is a classmate you know." },
        claim:    { s: "warn", why: "Heard second-hand. No notice from the school." },
        pressure: { s: "ok",   why: "Nothing rushes you." },
      },
      // where each check looks while it scans (who = sender, fwd, head, lN = line N, bubble = whole message)
      focus: { source: ["who"], claim: ["head", "l0", "l1"], pressure: ["bubble"] },
      outcome: "unsure",
    },
    {
      id: "bonus-marks",
      title: "Test Message 3",
      chat: { name: "Class Monitor", sub: "Saved contact", avatar: "CM", avatarClass: "device__avatar--monitor" },
      head: "BONUS MARKS 🎉",
      lines: ["Ms. Rao is giving 10 bonus marks in science.", "Just fill in this form: <span class=\"msg__link\">bit.ly/bonus-7b</span>", "Last date is Friday."],
      time: "15:18",
      results: {
        source:   { s: "ok", why: "A saved contact you know." },
        claim:    { s: "ok", why: "Bonus marks sound normal for school." },
        pressure: { s: "ok", why: "No hurry words." },
      },
      // Detector V2 sees what V1 cannot — used by the retest in chunk 6
      v2: {
        proof:   { s: "fail", why: "No notice, no document — just a short link." },
        confirm: { s: "fail", why: "The school portal and Ms. Rao’s page say nothing about bonus marks." },
      },
      // where each check looks while it scans (who = sender, fwd, head, lN = line N, bubble = whole message)
      focus: { source: ["who"], claim: ["head", "l0"], pressure: ["l2"], proof: ["l1"], confirm: ["l0"] },
      outcome: "passed",
    },
  ];

  /* ------------------------------------------------------------------
     Upgrade to V2 — the four-step process, in its correct order.
     ------------------------------------------------------------------ */
  const PROCESS_STEPS = [
    { id: "read",   text: "Read the whole message",  icon: "eye" },
    { id: "run",    text: "Run the five checks",     icon: "scan" },
    { id: "review", text: "Review the results",      icon: "list" },
    { id: "decide", text: "Decide what to do",       icon: "flag" },
  ];
  const PROCESS_SHUFFLED = ["decide", "read", "review", "run"];

  /* ------------------------------------------------------------------
     Final mission — one of each verdict, so all three outcomes are practised.
     ------------------------------------------------------------------ */
  const VERDICTS = {
    verified:   { id: "verified",   label: "Verified",            icon: "check" },
    check:      { id: "check",      label: "Needs more checking", icon: "question" },
    suspicious: { id: "suspicious", label: "Suspicious",          icon: "alert" },
  };
  const ACTIONS = {
    follow: { id: "follow", label: "Follow it",      icon: "check" },
    verify: { id: "verify", label: "Verify first",   icon: "search" },
    stop:   { id: "stop",   label: "Do not share",   icon: "hand" },
  };

  const FINAL_CASES = [
    {
      id: "library-timing",
      title: "Library Timing",
      chat: { name: "School Office", sub: "Official school number ✓", avatar: "SO", avatarClass: "device__avatar--school" },
      head: "📚 LIBRARY TIMING",
      lines: ["The library will stay open until 5 PM this week for exam revision.", "Notice: <span class=\"msg__link\">school-portal › notices</span>"],
      time: "08:30",
      results: {
        source:   { s: "ok", why: "The official school office." },
        claim:    { s: "ok", why: "A small, normal claim." },
        pressure: { s: "ok", why: "No rush, no ‘share now’." },
        proof:    { s: "ok", why: "Links to the notice on the portal." },
        confirm:  { s: "ok", why: "The portal shows the same timing." },
      },
      // where each check looks while it scans (who = sender, fwd, head, lN = line N, bubble = whole message)
      focus: { source: ["who"], claim: ["head", "l0"], pressure: ["bubble"], proof: ["l1"], confirm: ["l1"] },
      verdict: "verified",
      action: "follow",
      lesson: "Every check passes and the official portal confirms it. Safe to follow.",
    },
    {
      id: "test-cancelled",
      title: "Test Cancelled",
      chat: { name: "Aman", sub: "Classmate", avatar: "A" },
      head: "TEST CANCELLED?? 😮",
      lines: ["My cousin heard tomorrow’s science test is cancelled.", "Not sure if it’s true though."],
      time: "19:05",
      results: {
        source:   { s: "warn", why: "Second-hand: a cousin heard it." },
        claim:    { s: "warn", why: "A big claim with no detail." },
        pressure: { s: "ok",   why: "It doesn’t rush you." },
        proof:    { s: "fail", why: "No notice, no screenshot, nothing." },
        confirm:  { s: "warn", why: "No official word yet — ask the teacher." },
      },
      // where each check looks while it scans (who = sender, fwd, head, lN = line N, bubble = whole message)
      focus: { source: ["who", "l0"], claim: ["head", "l0"], pressure: ["bubble"], proof: ["bubble"], confirm: ["l1"] },
      verdict: "check",
      action: "verify",
      lesson: "It might be true — but nothing confirms it yet. Check with your teacher before you believe it.",
    },
    {
      id: "free-game-coins",
      title: "Free Game Coins",
      chat: { name: "+44 7700 900123", sub: "Not in your contacts", avatar: "?" },
      fwd: "Forwarded many times",
      head: "🎮 FREE 5,000 GAME COINS!",
      lines: ["Sign in with your <b>school password</b> in the next 10 minutes!", "Then share with 5 friends to unlock more."],
      time: "21:47",
      results: {
        source:   { s: "fail", why: "Unknown international number." },
        claim:    { s: "fail", why: "Free coins for a password? Too good to be true." },
        pressure: { s: "fail", why: "“Next 10 minutes!” and “share with 5 friends”." },
        proof:    { s: "fail", why: "No proof anywhere." },
        confirm:  { s: "fail", why: "The game never asks for school passwords." },
      },
      // where each check looks while it scans (who = sender, fwd, head, lN = line N, bubble = whole message)
      focus: { source: ["who", "fwd"], claim: ["head", "l0"], pressure: ["l0", "l1"], proof: ["bubble"], confirm: ["l0"] },
      verdict: "suspicious",
      action: "stop",
      lesson: "It wants your password and pushes you to spread it. Never share it — tell a trusted adult.",
    },
  ];

  FND.data = {
    TOTAL_MISSION_STEPS: 7,
    CHECKS, V1_CHECKS, V2_CHECKS, UPGRADE_CHOICES,
    CLUES, CLUE_ORDER,
    TEST_MESSAGES,
    PROCESS_STEPS, PROCESS_SHUFFLED,
    VERDICTS, ACTIONS, FINAL_CASES,
  };
})();
