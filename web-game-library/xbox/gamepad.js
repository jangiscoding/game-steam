'use strict';

(() => {
  const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled])';
  const THRESHOLD = .55;
  let current = null;
  let previousButtons = [];
  let lastMove = 0;
  let active = false;
  let controllerIndex = null;
  let returnGameId = null;
  let keyboard = null;
  let filterFocusTimer = null;

  const bar = document.createElement('div');
  bar.className = 'gamepad-bar';
  bar.hidden = true;
  bar.innerHTML = '<span class="gamepad-connected">⊞ Tay cầm đã kết nối</span><span><b>✥</b> Di chuyển</span><span><b class="pad-a">A</b> Chọn</span><span><b class="pad-b">B</b> Quay lại</span><span><b class="pad-x">X</b> Thích</span><span><b class="pad-menu">☰</b> Xóa lọc</span><span><b>LB / RB</b> Đổi nhóm</span><span><b class="pad-y">Y</b> Tìm kiếm</span><span><b>RS</b> Cuộn</span><span><b>LT / RT</b> Cuộn trang</span><span><b>LT+RT</b> Bộ lọc</span><span><b>⧉</b> Steam</span>';
  document.body.append(bar);

  function buildKeyboard() {
    if (keyboard) return keyboard;
    keyboard = document.createElement('dialog');
    keyboard.className = 'gamepad-keyboard';
    const keys = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'Ă', 'Â', 'Đ', 'Ê', 'Ô', 'Ơ', 'Ư'];
    keyboard.innerHTML = `<div class="keyboard-head"><strong>TÌM KIẾM GAME</strong><button data-close aria-label="Đóng">×</button></div><div class="keyboard-value">Nhập tên game…</div><div class="keyboard-keys">${keys.map(key => `<button data-key="${key}">${key}</button>`).join('')}</div><div class="keyboard-actions"><button data-key=" ">DẤU CÁCH</button><button data-keyboard-action="backspace">⌫ XÓA</button><button data-keyboard-action="clear">XÓA HẾT</button><button class="keyboard-done" data-keyboard-action="done">XONG</button></div>`;
    keyboard.addEventListener('click', event => {
      if (event.target.closest('[data-close]')) { closeKeyboard(); return; }
      const key = event.target.closest('[data-key]');
      const action = event.target.closest('[data-keyboard-action]')?.dataset.keyboardAction;
      const search = document.querySelector('#search');
      if (!search) return;
      if (key) search.value += key.dataset.key;
      else if (action === 'backspace') search.value = search.value.slice(0, -1);
      else if (action === 'clear') search.value = '';
      else if (action === 'done') { closeKeyboard(); return; }
      search.dispatchEvent(new Event('input', {bubbles: true}));
      keyboard.querySelector('.keyboard-value').textContent = search.value || 'Nhập tên game…';
    });
    document.body.append(keyboard);
    return keyboard;
  }

  function openKeyboard() {
    if (document.querySelector('#detail[open]')) return;
    const dialog = buildKeyboard();
    dialog.querySelector('.keyboard-value').textContent = document.querySelector('#search')?.value || 'Nhập tên game…';
    if (!dialog.open) dialog.showModal();
    setTimeout(() => select(dialog.querySelector('[data-key]')), 0);
  }

  function closeKeyboard() {
    if (!keyboard?.open) return;
    keyboard.close();
    setTimeout(() => select(document.querySelector('#search')), 0);
  }

  function stopHaptics() {
    try {
      [...(navigator.getGamepads?.() || [])].filter(Boolean).forEach(gamepad => {
        const actuator = gamepad.vibrationActuator;
        if (actuator?.reset) Promise.resolve(actuator.reset()).catch(() => {});
        else if (actuator?.playEffect) {
          Promise.resolve(actuator.playEffect('dual-rumble', {startDelay: 0, duration: 1, weakMagnitude: 0, strongMagnitude: 0})).catch(() => {});
        }
      });
    } catch {}
  }

  function visible(element) {
    if (!element || element.closest('[hidden],[inert],.gamepad-bar')) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function candidates() {
    const dialog = document.querySelector('#xbox-lightbox[open]') || document.querySelector('dialog[open]');
    return [...(dialog || document).querySelectorAll(FOCUSABLE)]
      .filter(element => visible(element) && !element.classList.contains('favorite-button'));
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
    if (!active) return;
    const items = candidates();
    if (!current || !items.includes(current)) {
      const dialog = document.querySelector('#xbox-lightbox[open]') || document.querySelector('dialog[open]');
      select(dialog?.querySelector('.lightbox-back-btn') || dialog?.querySelector('.store-button') || (!dialog ? document.querySelector('.collection.active') : null) || items[0], false);
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
    return Boolean(gamepad.buttons[index]?.pressed || gamepad.buttons[index]?.value > .5);
  }

  function edge(gamepad, index) {
    return pressed(gamepad, index) && !previousButtons[index];
  }

  function activateMode() {
    if (active) return;
    active = true;
    document.body.classList.add('gamepad-mode');
    ensureSelection();
  }

  function focusedGameId() {
    return current?.closest('[data-game]')?.dataset.game ||
      document.querySelector('dialog[open] [data-detail-favorite]')?.dataset.detailFavorite || null;
  }

  function switchToSteam() {
    stopHaptics();
    window.location.href = '../?from=xbox';
  }

  function pageScroll(direction) {
    if (keyboard?.open) return;
    const target = document.querySelector('#detail[open]');
    if (direction === 0) {
      if (target) {
        target.scrollTop = 0;
        target.scrollTo({top: 0, behavior: 'smooth'});
      } else {
        const filter = document.querySelector('#search');
        const top = filter ? Math.max(0, filter.getBoundingClientRect().top + window.scrollY - 140) : 0;
        window.scrollTo({top, behavior: 'smooth'});
        clearTimeout(filterFocusTimer);
        filterFocusTimer = setTimeout(() => select(filter, false), 700);
      }
      return;
    }
    const amount = direction * (target?.clientHeight || window.innerHeight) * .82;
    if (target) target.scrollBy({top: amount, behavior: 'smooth'});
    else window.scrollBy({top: amount, behavior: 'smooth'});
  }

  function tick(now) {
    const pads = [...(navigator.getGamepads?.() || [])];
    const gamepad = pads.find(item => item?.connected && item.index === controllerIndex) || pads.find(item => item?.connected);
    if (!gamepad) {
      controllerIndex = null;
      previousButtons = [];
      bar.hidden = true;
      document.body.classList.remove('gamepad-connected');
      requestAnimationFrame(tick);
      return;
    }
    bar.hidden = false;
    document.body.classList.add('gamepad-connected');
    if (controllerIndex !== gamepad.index) {
      controllerIndex = gamepad.index;
      previousButtons = gamepad.buttons.map(button => button.pressed || button.value > .5);
      requestAnimationFrame(tick);
      return;
    }

    const anyInput = gamepad.buttons.some(button => button.pressed) || gamepad.axes.some(axis => Math.abs(axis) > THRESHOLD);
    if (anyInput) activateMode();
    if (active) {
      const lightbox = document.querySelector('#xbox-lightbox[open]');
      const triggerChord = pressed(gamepad, 6) && pressed(gamepad, 7);
      const triggerChordStarted = triggerChord && !(previousButtons[6] && previousButtons[7]);
      if (triggerChordStarted) pageScroll(0);
      if (edge(gamepad, 8)) { switchToSteam(); return; }
      if (edge(gamepad, 0)) {
        const id = current?.dataset.game;
        if (id) returnGameId = id;
        current?.click();
      }
      if (edge(gamepad, 1)) {
        if (keyboard?.open) { closeKeyboard(); }
        else if (lightbox) { window.__xboxLightbox?.close(); }
        else {
        const close = document.querySelector('dialog[open] [data-close]');
        if (close) {
          close.click();
          setTimeout(() => select(document.querySelector(`[data-game="${returnGameId}"]`) || document.querySelector('[data-game]')), 30);
        }
        }
      }
      if (edge(gamepad, 2)) {
        const id = focusedGameId();
        if (id) document.dispatchEvent(new CustomEvent('xbox:gamepad-favorite', {detail: {id}}));
      }
      if (edge(gamepad, 3)) openKeyboard();
      if (edge(gamepad, 4)) {if(lightbox)window.__xboxLightbox?.previous();else document.dispatchEvent(new CustomEvent('xbox:gamepad-category', {detail: {direction: -1}}));}
      if (edge(gamepad, 5)) {if(lightbox)window.__xboxLightbox?.next();else document.dispatchEvent(new CustomEvent('xbox:gamepad-category', {detail: {direction: 1}}));}
      if (edge(gamepad, 9) || edge(gamepad, 10)) {
        if (!document.querySelector('#detail[open]')) {
          if (keyboard?.open) closeKeyboard();
          document.dispatchEvent(new CustomEvent('xbox:gamepad-reset'));
        }
      }
      const ltDown = edge(gamepad, 6), rtDown = edge(gamepad, 7);
      if (!triggerChord && ltDown) pageScroll(-1);
      else if (!triggerChord && rtDown) pageScroll(1);

      const left = pressed(gamepad, 14) || gamepad.axes[0] < -THRESHOLD;
      const right = pressed(gamepad, 15) || gamepad.axes[0] > THRESHOLD;
      const up = pressed(gamepad, 12) || gamepad.axes[1] < -THRESHOLD;
      const down = pressed(gamepad, 13) || gamepad.axes[1] > THRESHOLD;
      if (now - lastMove > 180 && (left || right || up || down)) {
        if (left) move(-1, 0);
        else if (right) move(1, 0);
        else if (up) move(0, -1);
        else move(0, 1);
        lastMove = now;
      }

      const scroll = gamepad.axes[3] || 0;
      if (Math.abs(scroll) > .2 && !triggerChord) {
        const amount = Math.sign(scroll) * ((Math.abs(scroll) - .2) / .8) * 16;
        const dialog = document.querySelector('#xbox-lightbox[open]') || document.querySelector('dialog[open]');
        if (dialog) dialog.scrollBy(0, amount); else window.scrollBy(0, amount);
      }
    }
    previousButtons = gamepad.buttons.map(button => button.pressed || button.value > .5);
    requestAnimationFrame(tick);
  }

  document.addEventListener('xbox:navigation-updated', ensureSelection);
  document.addEventListener('xbox:focus-primary', () => {
    if (active) select(document.querySelector('dialog[open] .store-button'));
  });
  document.addEventListener('xbox:focus-game', event => {
    if (active) select(document.querySelector(`[data-game="${event.detail.id}"]`));
  });
  document.addEventListener('focusin', event => {
    if (active && event.target.matches?.(FOCUSABLE)) select(event.target, false);
  });
  window.addEventListener('gamepaddisconnected', () => {
    if (![...(navigator.getGamepads?.() || [])].some(gamepad => gamepad?.connected)) {
      active = false;
      current?.classList.remove('gamepad-focus');
      current = null;
      bar.hidden = true;
      document.body.classList.remove('gamepad-mode', 'gamepad-connected');
    }
  });
  window.addEventListener('pagehide', stopHaptics);
  window.addEventListener('beforeunload', stopHaptics);
  stopHaptics();
  requestAnimationFrame(tick);
})();
