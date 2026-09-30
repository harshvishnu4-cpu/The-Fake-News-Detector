/* ==========================================================================
   chunk-base.js — the contract every chunk module follows.

   A chunk owns its internal steps and re-renders in place, so adding a
   screen inside a chunk needs no routing change. To the shell it exposes
   only init() / reset() (plus back() / canGoBack() for the Back tab) and it
   leaves the chunk through window.fndShowScene(sceneId, sceneKey).
   ========================================================================== */
(function () {
  "use strict";

  const FND = (window.FND = window.FND || {});

  function dispose(x) {
    try {
      if (!x) return;
      if (typeof x === "function") return x();
      if (x.kill) return x.kill();
      if (x.revert) return x.revert();
      if (x.destroy) return x.destroy();
      if (x.remove) return x.remove();
    } catch (err) { /* already gone */ }
  }

  /**
   * def: {
   *   key, sceneId, steps: [...],
   *   fresh(): initial module state (must be JSON-serialisable; has .step),
   *   atEnd(S): the last step, as it starts, for when Back re-enters this chunk from the next one,
   *   backEntries(S): the screens before that last step, each as it starts (oldest first),
   *   render(ctx, S, { back }): paint the current step,
   *   actions: { name(ctx, el, event) }   — [data-action] clicks in the scene and on the CTA
   * }
   */
  FND.defineChunk = function (def) {
    let root = null;
    let S = null;
    // Back history: the state each screen STARTED with (oldest first; the last one is the
    // screen on show). Back restores the previous screen as it began, so coming forward
    // again plays the screen from its start. Transient entries (a scan in progress) are skipped.
    let history = [];
    const clone = (x) => JSON.parse(JSON.stringify(x));
    let tracked = [];
    let busyFlag = false;
    let alive = false;

    const ctx = {
      get root() { return root; },
      get S() { return S; },
      key: def.key,
      /**
       * Move to another internal step or phase (a new screen for the Back tab).
       * renderOpts.soft asks the step to repaint in place rather than re-enter;
       * renderOpts.transient marks a screen Back should skip over (e.g. a scan running).
       */
      go(step, patch = {}, renderOpts = {}) {
        if (!alive) return;
        Object.assign(S, patch, { step });
        history.push({ state: clone(S), transient: !!renderOpts.transient });
        paint(renderOpts);
      },
      /** Re-render the current step after a state change (no history entry). */
      update(patch = {}) {
        if (!alive) return;
        Object.assign(S, patch);
        paint({ same: true });
      },
      /** Keep something to dispose when the step changes (tween, Draggable, Sortable, fn…). */
      track(x) { tracked.push(x); return x; },
      busy(on) { busyFlag = !!on; FND.nav?.update(); },
      isBusy: () => busyFlag,
      alive: () => alive,
      /** Run fn only if the chunk is still on screen (guards async callbacks). */
      guard(fn) { return (...a) => { if (alive) return fn(...a); }; },
      $(sel) { return root.querySelector(sel); },
      $$(sel) { return [...root.querySelectorAll(sel)]; },
      cta(opts) {
        FND.cta.set({ ...opts, onClick: (action) => handle(action || opts.action, null, null) });
      },
      leave(sceneId, sceneKey) {
        FND.audio.stop();
        window.fndShowScene(sceneId, sceneKey);
      },
      save() { FND.state.save(); },
    };

    function cleanup() {
      tracked.forEach(dispose);
      tracked = [];
      FND.fx.clearNotes();
    }

    function paint(opts = {}) {
      cleanup();
      busyFlag = false;
      def.render(ctx, S, opts);
      FND.ui.hydrateIcons(root);
      FND.state.save();
      FND.nav?.update();
    }

    function handle(action, el, event) {
      if (!alive || !action) return;
      const fn = def.actions?.[action];
      if (fn) fn(ctx, el, event);
    }

    function onClick(e) {
      const el = e.target.closest("[data-action]");
      if (!el || !root.contains(el) || el.disabled) return;
      handle(el.dataset.action, el, e);
    }

    const api = {
      key: def.key,
      steps: def.steps,
      init(opts = {}) {
        root = document.getElementById(def.sceneId);
        api.reset();
        alive = true;
        S = def.fresh();
        history = [];
        if (opts.atEnd && def.atEnd) {
          // land on the last screen (as it starts), with the earlier screens behind it
          S = def.atEnd(S);
          (def.backEntries?.(clone(S)) || []).forEach((state) => history.push({ state, transient: false }));
        }
        history.push({ state: clone(S), transient: false });
        root.addEventListener("click", onClick);
        paint({ entering: true });
      },
      reset() {
        alive = false;
        cleanup();
        history = [];
        busyFlag = false;
        if (root) {
          root.removeEventListener("click", onClick);
          root.innerHTML = "";
        }
        def.onReset?.(ctx);
      },
      back() {
        if (!alive || busyFlag || history.length < 2) return false;
        history.pop();                                         // the screen on show
        while (history.length > 1 && history[history.length - 1].transient) history.pop();
        S = clone(history[history.length - 1].state);          // the previous screen, from its start
        FND.audio.stop();
        paint({ back: true });
        return true;
      },
      canGoBack: () => alive && !busyFlag,
      hasHistory: () => history.length > 1,
      currentStep: () => S?.step,
    };
    return api;
  };
})();
