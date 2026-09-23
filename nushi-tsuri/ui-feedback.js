/* Short, gesture-driven UI sounds. No timers, assets or saved game state. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShuUiFeedback = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tones = Object.freeze({
    select: Object.freeze({ frequency: 660, end: 780, duration: .045, volume: .10 }),
    confirm: Object.freeze({ frequency: 780, end: 1170, duration: .075, volume: .13 }),
    back: Object.freeze({ frequency: 620, end: 390, duration: .065, volume: .10 }),
  });

  // Reuse the game's already-unlocked context and master gain. A suspended
  // context never queues an old click to sound when the app returns.
  function createPlayer({ audio }) {
    let voice = null;
    function stop() {
      if (!voice) return;
      const old = voice;
      voice = null;
      try { old.source.stop(); } catch (_) {}
      old.cleanup();
    }
    function play(kind) {
      const tone = tones[kind], current = audio();
      if (!tone || !current?.context || current.context.state !== 'running' || !current.destination) return false;
      stop();
      let source, gain;
      const cleanup = () => {
        try { source?.disconnect(); } catch (_) {}
        try { gain?.disconnect(); } catch (_) {}
      };
      try {
        const { context, destination } = current, time = context.currentTime;
        source = context.createOscillator();
        gain = context.createGain();
        source.type = 'triangle';
        source.frequency.setValueAtTime(tone.frequency, time);
        source.frequency.exponentialRampToValueAtTime(tone.end, time + tone.duration);
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(tone.volume, time + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, time + tone.duration);
        source.connect(gain);
        gain.connect(destination);
        const playing = { source, cleanup };
        voice = playing;
        source.onended = () => { cleanup(); if (voice === playing) voice = null; };
        source.start(time);
        source.stop(time + tone.duration + .01);
        return true;
      } catch (_) {
        try { source?.stop(); } catch (_) {}
        cleanup();
        voice = null;
        return false;
      }
    }
    return { play, stop };
  }

  const holdControls = '[data-move], #pull';
  const controls = 'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"]';
  const backControls = '[data-close], .close, #back, #wait, #fieldMenuClose, #rivalGuideBack, [data-pet-action="close"], [data-tournament-action="close"], [data-tournament-action="finish"], [data-capsule-action="close"]';
  const selections = '[aria-pressed], [role="tab"], [data-move], [data-dog], [data-avatar], [data-field-menu-target], [data-fishdex-filter], [data-inventory-tab], [data-bait-count], [data-bait-count-step], [data-location-count], [data-location-count-step], [data-pick-bait], [data-pick-rod], [data-equip-hand], [data-equip-vehicle]';
  function kindFor(control) {
    const explicit = control.getAttribute('data-ui-sound');
    if (explicit === 'none' || control.id === 'soundToggle') return null;
    if (tones[explicit]) return explicit;
    if (control.id === 'menu' && control.getAttribute('aria-expanded') === 'true') return 'back';
    if (control.matches(backControls)) return 'back';
    if (control.matches(selections)) return 'select';
    return 'confirm';
  }
  function usable(control) {
    return control?.isConnected && !control.matches(':disabled') &&
      !control.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]');
  }
  function create({ document: doc, enabled, play, stop = () => {}, now = () => doc.defaultView.performance.now() }) {
    const win = doc.defaultView, listeners = [];
    let lastAt = -Infinity, repeatingActivation = false, disposed = false;
    function cue(kind, event) {
      if (disposed || !tones[kind] || event?.repeat || doc.hidden || !enabled()) return false;
      const time = now();
      if (time - lastAt < 65) return false;
      try {
        if (play(kind) === false) return false;
        lastAt = time;
        return true;
      } catch (_) { return false; }
    }
    function listen(target, type, callback) {
      target.addEventListener(type, callback, true);
      listeners.push(() => target.removeEventListener(type, callback, true));
    }
    function input(event) {
      if (event.button > 0 || event.isPrimary === false) return;
      const control = event.target?.closest?.(controls);
      if (!usable(control)) return;
      const held = control.matches(holdControls);
      if (event.type === 'pointerdown' && !held) return;
      // Movement and reeling are handled on press, including touch. Their
      // compatibility click must not add another sound on release.
      if (event.type === 'click' && ((held && event.detail > 0) || (!event.detail && repeatingActivation))) return;
      cue(kindFor(control), event);
    }
    listen(doc, 'pointerdown', input);
    listen(doc, 'click', input);
    listen(doc, 'change', event => {
      const control = event.target;
      if (usable(control) && control.matches('select, input[type="range"], input[type="checkbox"], input[type="radio"]')) cue('select', event);
    });
    listen(doc, 'keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') repeatingActivation = event.repeat;
    });
    listen(doc, 'keyup', event => {
      if (event.key === 'Enter' || event.key === ' ') repeatingActivation = false;
    });
    function reset() { repeatingActivation = false; lastAt = -Infinity; stop(); }
    listen(win, 'blur', reset);
    listen(win, 'pagehide', reset);
    listen(doc, 'visibilitychange', () => { if (doc.hidden) reset(); });
    return { cue, stop: reset, dispose() { reset(); disposed = true; listeners.splice(0).forEach(remove => remove()); } };
  }
  return { tones, createPlayer, create, kindFor };
});
