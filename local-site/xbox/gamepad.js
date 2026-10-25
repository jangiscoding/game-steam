'use strict';

(() => {
  const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled])';
  let current = null;
  let previousButtons = [];
  let lastMove = 0;
  let active = false;

  function stopHaptics() {
    try {
      [...(navigator.getGamepads?.() || [])].filter(Boolean).forEach(gamepad => {
        const actuator = gamepad.vibrationActuator;
        if (actuator?.reset) actuator.reset().catch(() => {});
        else if (actuator?.playEffect) {
          actuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: 1,
            weakMagnitude: 0,
            strongMagnitude: 0
          }).catch(() => {});
        }
      });
    } catch {}
  }

  function visible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function candidates() {
    const dialog = document.querySelector('dialog[open]');
    return [...(dialog || document).querySelectorAll(FOCUSABLE)].filter(visible);
  }

  function select(element, scroll = true) {
    current?.classList.remove('gamepad-focus');
    current = element && visible(element) ? element : null;
    if (!current) return;
    current.classList.add('gamepad-focus');
    current.focus({preventScroll: true});
    if (scroll) current.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
  }

  function ensureSelection() {
    const items = candidates();
    if (!current || !items.includes(current)) {
      select(document.querySelector('.collection.active') || items[0], false);
    }
  }

  function move(dx, dy) {
    ensureSelection();
    if (!current) return;
    const from = current.getBoundingClientRect();
    const fx = from.left + from.width / 2;
    const fy = from.top + from.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const item of candidates()) {
      if (item === current) continue;
      const rect = item.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - fx;
      const y = rect.top + rect.height / 2 - fy;
      if ((dx < 0 && x >= -4) || (dx > 0 && x <= 4) || (dy < 0 && y >= -4) || (dy > 0 && y <= 4)) continue;
      const primary = dx ? Math.abs(x) : Math.abs(y);
      const secondary = dx ? Math.abs(y) : Math.abs(x);
      const score = primary + secondary * 2.5;
      if (score < bestScore) { best = item; bestScore = score; }
    }
    if (best) select(best);
  }

  function pressed(gamepad, index) {
    return Boolean(gamepad.buttons[index]?.pressed);
  }

  function edge(gamepad, index) {
    return pressed(gamepad, index) && !previousButtons[index];
  }

  function activate() {
    if (active) return;
    active = true;
    document.body.classList.add('gamepad-mode');
    ensureSelection();
  }

  function tick(now) {
    const gamepad = [...(navigator.getGamepads?.() || [])].find(Boolean);
    if (!gamepad) {
      previousButtons = [];
      requestAnimationFrame(tick);
      return;
    }
    const anyInput = gamepad.buttons.some(button => button.pressed) || gamepad.axes.some(axis => Math.abs(axis) > .55);
    if (anyInput) activate();
    if (active) {
      if (edge(gamepad, 0)) current?.click();
      if (edge(gamepad, 1)) {
        const close = document.querySelector('dialog[open] [data-close]');
        if (close) close.click();
      }
      if (edge(gamepad, 2)) document.dispatchEvent(new CustomEvent('xbox:gamepad-reset'));
      if (edge(gamepad, 3)) select(document.querySelector('#search'));
      if (edge(gamepad, 4)) document.dispatchEvent(new CustomEvent('xbox:gamepad-category', {detail: {direction: -1}}));
      if (edge(gamepad, 5)) document.dispatchEvent(new CustomEvent('xbox:gamepad-category', {detail: {direction: 1}}));

      const left = pressed(gamepad, 14) || gamepad.axes[0] < -.55;
      const right = pressed(gamepad, 15) || gamepad.axes[0] > .55;
      const up = pressed(gamepad, 12) || gamepad.axes[1] < -.55;
      const down = pressed(gamepad, 13) || gamepad.axes[1] > .55;
      if (now - lastMove > 230 && (left || right || up || down)) {
        if (left) move(-1, 0);
        else if (right) move(1, 0);
        else if (up) move(0, -1);
        else move(0, 1);
        lastMove = now;
      }
    }
    previousButtons = gamepad.buttons.map(button => button.pressed);
    requestAnimationFrame(tick);
  }

  document.addEventListener('xbox:navigation-updated', ensureSelection);
  document.addEventListener('focusin', event => {
    if (active && event.target.matches?.(FOCUSABLE)) select(event.target, false);
  });
  window.addEventListener('gamepaddisconnected', () => {
    if (![...(navigator.getGamepads?.() || [])].some(Boolean)) {
      active = false;
      current?.classList.remove('gamepad-focus');
      current = null;
      document.body.classList.remove('gamepad-mode');
    }
  });
  window.addEventListener('pagehide', stopHaptics);
  window.addEventListener('beforeunload', stopHaptics);
  stopHaptics();
  requestAnimationFrame(tick);
})();
