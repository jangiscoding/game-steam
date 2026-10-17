/* Xbox / standard Gamepad API navigation. No controller data leaves the browser. */
(() => {
  'use strict';
  const AXIS_THRESHOLD = 0.55;
  const FIRST_REPEAT_MS = 330;
  const REPEAT_MS = 140;
  const ACTIONABLE = 'button:not(:disabled),a[href],input:not([type="hidden"]),select,summary,[tabindex="0"]';
  let controllerIndex = null, frame = null, previousButtons = [], heldDirection = null;
  let nextMoveAt = 0, gamepadMode = false, lastFocused = null;
  let returnFocus = null;
  let keyboard = null, keyboardTarget = null, selectedBeforeKeyboard = null;
  const bar = document.createElement('div');
  bar.className = 'gamepad-bar';
  bar.hidden = true;
  bar.setAttribute('aria-label', 'Hướng dẫn điều khiển tay cầm');
  bar.innerHTML = '<span class="gamepad-connected">⊞ Tay cầm đã kết nối</span><span><b>✥</b> Di chuyển</span><span><b class="pad-a">A</b> Chọn</span><span><b class="pad-b">B</b> Quay lại</span><span><b>LB / RB</b> Đổi nhóm</span><span><b>Y</b> Tìm kiếm</span><span><b>RS</b> Cuộn</span>';
  document.body.append(bar);
  const status = document.createElement('div');
  status.className = 'gamepad-announcement'; status.setAttribute('role', 'status');
  document.body.append(status);
  function announce(message) { status.textContent = message; }
  function currentDialog() { return [...document.querySelectorAll('dialog[open]')].at(-1); }
  function scope() { return currentDialog() || document; }
  function candidates() {
    return [...scope().querySelectorAll(ACTIONABLE)].filter(element => {
      if (element.closest('[hidden],.gamepad-bar,[inert]') || element.getAttribute('aria-hidden') === 'true') return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
  }
  function focus(element) {
    if (!element) return;
    document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
    element.classList.add('gamepad-focus');
    element.focus({preventScroll: true});
    element.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
    lastFocused = element;
  }
  function enableMode() {
    gamepadMode = true; document.body.classList.add('gamepad-mode');
    if (!candidates().includes(document.activeElement)) {
      focus(currentDialog()?.querySelector(ACTIONABLE) || document.querySelector('.game-open') || candidates()[0]);
    } else focus(document.activeElement);
  }
  function move(direction) {
    const elements = candidates();
    if (!elements.length) return;
    if (!elements.includes(document.activeElement)) { focus(elements[0]); return; }
    const active = document.activeElement;
    if (active.tagName === 'SELECT' && ['up', 'down'].includes(direction)) {
      active.selectedIndex = Math.min(active.options.length - 1, Math.max(0, active.selectedIndex + (direction === 'down' ? 1 : -1)));
      active.dispatchEvent(new Event('change', {bubbles: true})); return;
    }
    const from = active.getBoundingClientRect();
    const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
    let best = null, bestScore = Infinity;
    for (const element of elements) {
      if (element === active) continue;
      const rect = element.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - fx, dy = rect.top + rect.height / 2 - fy;
      const primary = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
      if (primary <= 4) continue;
      const cross = ['left', 'right'].includes(direction) ? Math.abs(dy) : Math.abs(dx);
      const score = primary + cross * 3;
      if (score < bestScore) { best = element; bestScore = score; }
    }
    focus(best);
  }
  function closeKeyboard() {
    if (!keyboard?.open) return;
    keyboard.close(); keyboardTarget = null;
    focus(selectedBeforeKeyboard?.isConnected ? selectedBeforeKeyboard : document.querySelector('.game-open'));
  }
  function openKeyboard(target) {
    if (!target) return;
    if (!keyboard) {
      keyboard = document.createElement('dialog'); keyboard.className = 'gamepad-keyboard';
      keyboard.setAttribute('aria-label', 'Nhập tên game bằng tay cầm');
      keyboard.innerHTML = '<div class="keyboard-head"><strong>Tìm game bằng tay cầm</strong><button type="button" data-key="close" aria-label="Đóng bàn phím">×</button></div><p class="keyboard-value" aria-live="polite"></p><p class="keyboard-tip">D-pad chọn phím · A nhập · X xóa ký tự · B đóng</p><div class="keyboard-keys">' +
        [...'1234567890QWERTYUIOPASDFGHJKLZXCVBNM'].map(key => '<button type="button" data-key="'+key.toLowerCase()+'">'+key+'</button>').join('') +
        '</div><div class="keyboard-actions"><button type="button" data-key="space">Dấu cách</button><button type="button" data-key="backspace">⌫ Xóa</button><button type="button" data-key="clear">Xóa hết</button><button type="button" class="primary" data-key="done">Xem kết quả</button></div>';
      document.body.append(keyboard);
      keyboard.addEventListener('click', event => {
        const key = event.target.closest('[data-key]')?.dataset.key;
        if (!key) return;
        if (key === 'close' || key === 'done') { closeKeyboard(); if (key === 'done') focus(document.querySelector('.game-open')); return; }
        editSearch(key);
      });
      keyboard.addEventListener('cancel', event => { event.preventDefault(); closeKeyboard(); });
    }
    selectedBeforeKeyboard = document.activeElement; keyboardTarget = target;
    keyboard.showModal(); keyboard.querySelector('.keyboard-value').textContent = target.value || 'Nhập tên game…';
    focus(keyboard.querySelector('[data-key="q"]'));
  }
  function editSearch(key) {
    if (!keyboardTarget) return;
    if (key === 'backspace') keyboardTarget.value = [...keyboardTarget.value].slice(0, -1).join('');
    else if (key === 'clear') keyboardTarget.value = '';
    else if (keyboardTarget.value.length < 150) keyboardTarget.value += key === 'space' ? ' ' : key;
    keyboardTarget.dispatchEvent(new Event('input', {bubbles: true}));
    keyboard.querySelector('.keyboard-value').textContent = keyboardTarget.value || 'Nhập tên game…';
  }
  function activate() {
    const element = document.activeElement;
    if (!candidates().includes(element)) return;
    if (element.matches('input[type="search"],input[type="text"]')) { openKeyboard(element); return; }
    if (element.tagName === 'SELECT') {
      element.selectedIndex = (element.selectedIndex + 1) % element.options.length;
      element.dispatchEvent(new Event('change', {bubbles: true})); return;
    }
    if (element.classList.contains('game-open')) returnFocus = element;
    element.click();
  }
  function back() {
    if (keyboard?.open) { closeKeyboard(); return; }
    const detail = document.querySelector('#detail[open]');
    if (detail) { detail.querySelector('[data-close]')?.click(); focus(returnFocus?.isConnected ? returnFocus : document.querySelector('.game-open')); return; }
    document.activeElement?.blur(); focus(document.querySelector('.game-open') || candidates()[0]);
  }
  function changeCollection(direction) {
    if (currentDialog()) return;
    document.dispatchEvent(new CustomEvent('archive:gamepad-category', {detail: {direction}}));
    focus(document.querySelector('.game-open') || candidates()[0]);
  }
  function press(pad, index) { return Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > .5); }
  function poll(time) {
    frame = null;
    if (document.hidden) return;
    let pads;
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch { return; }
    const pad = pads.find(p => p?.connected && p.mapping === 'standard' && p.index === controllerIndex) || pads.find(p => p?.connected && p.mapping === 'standard');
    if (!pad) {
      if (controllerIndex !== null) announce('Tay cầm đã ngắt kết nối.');
      controllerIndex = null; bar.hidden = true; previousButtons = []; heldDirection = null;
      document.body.classList.remove('gamepad-mode','gamepad-connected'); gamepadMode = false;
      document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
      if (keyboard?.open) closeKeyboard();
    } else {
      if (controllerIndex !== pad.index) { announce('Tay cầm đã kết nối. Nhấn A hoặc D-pad để điều khiển.'); previousButtons = pad.buttons.map(b => b.pressed || b.value > .5); }
      controllerIndex = pad.index; bar.hidden = false; document.body.classList.add('gamepad-connected');
      let direction = null;
      if (press(pad,12) || pad.axes[1] < -AXIS_THRESHOLD) direction = 'up';
      else if (press(pad,13) || pad.axes[1] > AXIS_THRESHOLD) direction = 'down';
      else if (press(pad,14) || pad.axes[0] < -AXIS_THRESHOLD) direction = 'left';
      else if (press(pad,15) || pad.axes[0] > AXIS_THRESHOLD) direction = 'right';
      const down = index => press(pad,index) && !previousButtons[index];
      if (direction) {
        if (!gamepadMode) enableMode();
        if (direction !== heldDirection || time >= nextMoveAt) {
          move(direction); nextMoveAt = time + (direction !== heldDirection ? FIRST_REPEAT_MS : REPEAT_MS);
        }
      }
      heldDirection = direction;
      if ([0,1,2,3,4,5].some(down)) {
        if (!gamepadMode) enableMode();
        if (down(0)) activate();
        if (down(1)) back();
        if (down(2) && keyboard?.open) editSearch('backspace');
        if (down(3) && !document.querySelector('#detail[open]')) openKeyboard(document.querySelector('#search'));
        if (down(4)) changeCollection(-1);
        if (down(5)) changeCollection(1);
      }
      const scroll = pad.axes[3] || 0;
      if (Math.abs(scroll) > .2) {
        const amount = Math.sign(scroll) * ((Math.abs(scroll) - .2) / .8) * 15;
        const description = document.querySelector('#detail[open] .description-text');
        if (description && document.activeElement?.closest('.description-text')) description.scrollBy(0,amount);
        else if (currentDialog()) currentDialog().scrollBy(0,amount);
        else window.scrollBy(0,amount);
      }
      previousButtons = pad.buttons.map(b => b.pressed || b.value > .5);
    }
    frame = requestAnimationFrame(poll);
  }
  function start() { if (frame === null && !document.hidden) frame = requestAnimationFrame(poll); }
  window.addEventListener('gamepadconnected', start);
  window.addEventListener('gamepaddisconnected', start);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame !== null) { cancelAnimationFrame(frame); frame = null; previousButtons = []; heldDirection = null; controllerIndex = null; }
    else start();
  });
  function leaveMode() { gamepadMode = false; document.body.classList.remove('gamepad-mode'); document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus')); }
  document.addEventListener('pointerdown', leaveMode);
  document.addEventListener('keydown', leaveMode);
  new MutationObserver(() => {
    if (!gamepadMode || !bar.isConnected) return;
    if (!candidates().includes(document.activeElement)) focus(currentDialog()?.querySelector(ACTIONABLE) || document.querySelector('.game-open') || candidates()[0]);
  }).observe(document.querySelector('main'), {childList: true, subtree: true});
  new MutationObserver(() => {
    if (gamepadMode && document.querySelector('#detail[open]')) focus(document.querySelector('#detail [data-close]'));
  }).observe(document.querySelector('#detail-inner'), {childList: true});
  if (navigator.getGamepads) start();
})();
