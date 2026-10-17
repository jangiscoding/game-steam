/* Xbox / standard Gamepad API navigation with sound synth, haptics, and console-grade spatial grid navigation. No controller data leaves the browser. */
(() => {
  'use strict';
  const AXIS_THRESHOLD = 0.55;
  const FIRST_REPEAT_MS = 280;
  const REPEAT_MS = 120;
  const ACTIONABLE = 'button:not(:disabled),a[href],input:not([type="hidden"]),select,summary,[tabindex="0"]';

  let controllerIndex = null, frame = null, previousButtons = [], heldDirection = null;
  let nextMoveAt = 0, gamepadMode = false, lastFocused = null, lastFocusedGameId = null;
  let returnFocus = null;
  let keyboard = null, keyboardTarget = null, selectedBeforeKeyboard = null;
  let audioCtx = null;

  /* --- Web Audio API Synthesizer (Instant, 0 assets) --- */
  function getAudio() {
    try {
      if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch {
      return null;
    }
  }

  function playSound(type) {
    try {
      const ctx = getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.032);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
        osc.start(now);
        osc.stop(now + 0.032);
      } else if (type === 'boundary') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.038);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
        osc.start(now);
        osc.stop(now + 0.038);
      } else if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(820, now + 0.065);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.start(now);
        osc.stop(now + 0.065);
      } else if (type === 'back') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.048);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
        osc.start(now);
        osc.stop(now + 0.048);
      } else if (type === 'toggle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.048);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
        osc.start(now);
        osc.stop(now + 0.048);
      }
    } catch {}
  }

  /* --- Gamepad Dual-Rumble Haptics --- */
  function playHaptic(type = 'light') {
    try {
      const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
      const pad = pads.find(p => p?.connected && p.mapping === 'standard' && p.index === controllerIndex) || pads.find(p => p?.connected && p.mapping === 'standard');
      if (!pad?.vibrationActuator?.playEffect) return;
      if (type === 'light') {
        pad.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: 22,
          weakMagnitude: 0.22,
          strongMagnitude: 0.06
        }).catch(() => {});
      } else if (type === 'medium') {
        pad.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: 45,
          weakMagnitude: 0.45,
          strongMagnitude: 0.18
        }).catch(() => {});
      } else if (type === 'boundary') {
        pad.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: 32,
          weakMagnitude: 0.1,
          strongMagnitude: 0.35
        }).catch(() => {});
      }
    } catch {}
  }

  /* --- Controller HUD Bar --- */
  const bar = document.createElement('div');
  bar.className = 'gamepad-bar';
  bar.hidden = true;
  bar.setAttribute('aria-label', 'Hướng dẫn điều khiển tay cầm');
  bar.innerHTML = '<span class="gamepad-connected">⊞ Tay cầm đã kết nối</span><span><b>✥</b> Di chuyển</span><span><b class="pad-a">A</b> Chọn</span><span><b class="pad-b">B</b> Quay lại</span><span><b class="pad-x">X</b> Thích</span><span><b>LB / RB</b> Đổi nhóm</span><span><b class="pad-y">Y</b> Tìm kiếm</span><span><b>RS</b> Cuộn</span>';
  document.body.append(bar);

  const status = document.createElement('div');
  status.className = 'gamepad-announcement';
  status.setAttribute('role', 'status');
  document.body.append(status);
  function announce(message) { status.textContent = message; }

  function currentDialog() { return [...document.querySelectorAll('dialog[open]')].at(-1); }
  function welcomeScreen() { return document.querySelector('#welcome-screen:not(.is-leaving)'); }

  function isElementVisible(element) {
    if (element.closest('[hidden],[inert]') || element.getAttribute('aria-hidden') === 'true') return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function candidates() {
    const dialog = currentDialog();
    if (dialog) return [...dialog.querySelectorAll(ACTIONABLE)].filter(isElementVisible);
    const welcome = welcomeScreen();
    if (welcome) return [...welcome.querySelectorAll(ACTIONABLE)].filter(isElementVisible);

    const openPicker = document.querySelector('#tag-picker[open], #genre-picker[open]');
    if (openPicker) {
      return [...openPicker.querySelectorAll('input[type="search"], .tag-option, select, button, summary')].filter(isElementVisible);
    }

    return [...document.querySelectorAll(ACTIONABLE)].filter(element => {
      if (element.closest('[hidden],.gamepad-bar,[inert]')) return false;
      // Exclude favorite button from D-pad grid traversal (X button toggles favorite)
      if (element.classList.contains('favorite-button')) return false;
      // In closed pickers or general candidates, exclude input checkboxes that are inside .tag-option
      if (element.matches('input[type="checkbox"]') && element.closest('.tag-option')) return false;
      return isElementVisible(element);
    });
  }

  function focus(element) {
    if (!element) return;
    for (const sel of ['#tag-picker', '#genre-picker']) {
      const picker = document.querySelector(sel);
      if (picker?.open && !picker.contains(element)) picker.open = false;
    }
    document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
    element.classList.add('gamepad-focus');
    element.focus({preventScroll: true});
    element.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'smooth'});
    lastFocused = element;
    if (element.classList.contains('game-open') && element.dataset.game) {
      lastFocusedGameId = element.dataset.game;
    }
  }

  function enableMode() {
    gamepadMode = true;
    document.body.classList.add('gamepad-mode');
    getAudio();
    if (!candidates().includes(document.activeElement)) {
      focus(
        currentDialog()?.querySelector(ACTIONABLE) ||
        welcomeScreen()?.querySelector(ACTIONABLE) ||
        (lastFocusedGameId && document.querySelector(`.game-open[data-game="${lastFocusedGameId}"]`)) ||
        document.querySelector('.game-open') ||
        candidates()[0]
      );
    } else {
      focus(document.activeElement);
    }
  }

  /* --- Navigation in Open Picker / Dropdown --- */
  function navigateInPicker(picker, direction) {
    const summary = picker.querySelector('summary');
    const items = [...picker.querySelectorAll('input[type="search"], .tag-option, select, button')].filter(el => {
      return isElementVisible(el);
    });
    const active = document.activeElement;

    if (active === summary) {
      if (direction === 'down') {
        if (items.length) {
          focus(items[0]);
          playSound('move');
          playHaptic('light');
        }
      } else if (direction === 'up') {
        picker.open = false;
        focus(document.querySelector('.chip:last-of-type') || document.querySelector('#search'));
        playSound('move');
        playHaptic('light');
      } else if (direction === 'left' || direction === 'right') {
        picker.open = false;
        generalSpatialMove(direction);
      }
      return;
    }

    const index = items.indexOf(active);
    if (index === -1) {
      if (items.length) focus(items[0]);
      return;
    }

    if (direction === 'down') {
      if (index + 1 < items.length) {
        focus(items[index + 1]);
        items[index + 1].scrollIntoView({block: 'nearest', behavior: 'smooth'});
        playSound('move');
        playHaptic('light');
      } else {
        playSound('boundary');
        playHaptic('boundary');
      }
    } else if (direction === 'up') {
      if (index > 0) {
        focus(items[index - 1]);
        items[index - 1].scrollIntoView({block: 'nearest', behavior: 'smooth'});
        playSound('move');
        playHaptic('light');
      } else {
        focus(summary);
        playSound('move');
        playHaptic('light');
      }
    } else if (direction === 'left' || direction === 'right') {
      playSound('boundary');
      playHaptic('boundary');
    }
  }

  /* --- Navigation inside Game Grid --- */
  function goToGridIndex(targetIndex) {
    const filtered = window.__archive?.getFiltered ? window.__archive.getFiltered() : [];
    if (targetIndex < 0 || targetIndex >= filtered.length) return;
    const targetGame = filtered[targetIndex];
    lastFocusedGameId = targetGame.id;

    if (window.__archive?.scrollToGameIndex) {
      window.__archive.scrollToGameIndex(targetIndex);
    }

    let targetCard = document.querySelector(`.game-open[data-game="${targetGame.id}"]`);
    if (targetCard) {
      focus(targetCard);
      playSound('move');
      playHaptic('light');
    } else {
      if (window.__archive?.renderGames) {
        window.__archive.renderGames(true);
        targetCard = document.querySelector(`.game-open[data-game="${targetGame.id}"]`);
        if (targetCard) {
          focus(targetCard);
          playSound('move');
          playHaptic('light');
        }
      }
    }
  }

  function navigateInGrid(active, direction) {
    const gameId = active.dataset.game;
    const filtered = window.__archive?.getFiltered ? window.__archive.getFiltered() : [];
    const columns = window.__archive?.getColumns ? window.__archive.getColumns() : 4;
    const currIndex = filtered.findIndex(g => g.id === gameId);

    if (currIndex === -1) {
      generalSpatialMove(direction);
      return;
    }

    const col = currIndex % columns;

    if (direction === 'right') {
      if (currIndex + 1 < filtered.length) {
        goToGridIndex(currIndex + 1);
      } else {
        playSound('boundary');
        playHaptic('boundary');
      }
    } else if (direction === 'left') {
      if (col > 0) {
        goToGridIndex(currIndex - 1);
      } else {
        // Leftmost column: handoff smoothly to sidebar
        const activeCollection = document.querySelector('#collections .collection.selected') || document.querySelector('#collections .collection');
        if (activeCollection) {
          focus(activeCollection);
          playSound('move');
          playHaptic('light');
        }
      }
    } else if (direction === 'down') {
      const nextRowIndex = currIndex + columns;
      if (nextRowIndex < filtered.length) {
        goToGridIndex(nextRowIndex);
      } else if (currIndex < filtered.length - 1) {
        goToGridIndex(filtered.length - 1);
      } else {
        playSound('boundary');
        playHaptic('boundary');
      }
    } else if (direction === 'up') {
      const prevRowIndex = currIndex - columns;
      if (prevRowIndex >= 0) {
        goToGridIndex(prevRowIndex);
      } else {
        // Top row of games: handoff upwards to the filter toolbar
        let target = document.querySelector('#search');
        if (col === 0) target = document.querySelector('#search');
        else if (col === 1) target = document.querySelector('#tag-picker summary') || document.querySelector('#controller');
        else if (col === 2) target = document.querySelector('#controller') || document.querySelector('#sort');
        else if (col === 3) target = document.querySelector('#sort') || document.querySelector('#reset');
        else target = document.querySelector('#reset') || document.querySelector('#sort');

        if (target) {
          focus(target);
          playSound('move');
          playHaptic('light');
        }
      }
    }
  }

  /* --- Navigation in Left Sidebar (#collections) --- */
  function navigateInSidebar(active, direction) {
    const collections = [...document.querySelectorAll('#collections .collection')];
    const index = collections.indexOf(active);

    if (direction === 'down') {
      if (index + 1 < collections.length) {
        focus(collections[index + 1]);
        playSound('move');
        playHaptic('light');
      } else {
        playSound('boundary');
        playHaptic('boundary');
      }
    } else if (direction === 'up') {
      if (index > 0) {
        focus(collections[index - 1]);
        playSound('move');
        playHaptic('light');
      } else {
        const chip = document.querySelector('.genre-chips .chip') || document.querySelector('#search');
        if (chip) {
          focus(chip);
          playSound('move');
          playHaptic('light');
        }
      }
    } else if (direction === 'right') {
      const firstGame = (lastFocusedGameId && document.querySelector(`.game-open[data-game="${lastFocusedGameId}"]`)) ||
        document.querySelector('#game-grid .game-open') ||
        document.querySelector('#search');
      if (firstGame) {
        focus(firstGame);
        playSound('move');
        playHaptic('light');
      }
    } else if (direction === 'left') {
      playSound('boundary');
      playHaptic('boundary');
    }
  }

  /* --- Navigation in Filter Toolbar --- */
  function navigateInToolbar(active, direction) {
    if (direction === 'down') {
      if (active.closest('.genre-chips')) {
        const search = document.querySelector('#search');
        if (search) {
          focus(search);
          playSound('move');
          playHaptic('light');
          return;
        }
      }
      const filtered = window.__archive?.getFiltered ? window.__archive.getFiltered() : [];
      if (filtered.length) {
        const columns = window.__archive?.getColumns ? window.__archive.getColumns() : 4;
        let targetCol = 0;
        if (active.id === 'search') targetCol = 0;
        else if (active.closest('#tag-picker')) targetCol = Math.min(columns - 1, 1);
        else if (active.id === 'controller') targetCol = Math.min(columns - 1, 2);
        else if (active.id === 'sort') targetCol = Math.min(columns - 1, 3);
        else if (active.id === 'reset') targetCol = Math.min(columns - 1, 4);

        goToGridIndex(targetCol);
        return;
      }
    }

    if (direction === 'up') {
      if (active.closest('.filterbar')) {
        const chip = document.querySelector('.genre-chips .chip') || document.querySelector('.brand');
        if (chip) {
          focus(chip);
          playSound('move');
          playHaptic('light');
          return;
        }
      }
    }

    if (direction === 'left') {
      if (active.id === 'search' || active.closest('.genre-chips')) {
        const activeCollection = document.querySelector('#collections .collection.selected') || document.querySelector('#collections .collection');
        if (activeCollection) {
          focus(activeCollection);
          playSound('move');
          playHaptic('light');
          return;
        }
      }
    }

    generalSpatialMove(direction);
  }

  /* --- General Spatial Move --- */
  function generalSpatialMove(direction) {
    const elements = candidates();
    if (!elements.length) return;
    const active = document.activeElement;
    if (!elements.includes(active)) {
      focus(elements[0]);
      playSound('move');
      playHaptic('light');
      return;
    }

    if (active.tagName === 'SELECT' && ['up', 'down'].includes(direction)) {
      const nextIdx = Math.min(active.options.length - 1, Math.max(0, active.selectedIndex + (direction === 'down' ? 1 : -1)));
      if (nextIdx !== active.selectedIndex) {
        active.selectedIndex = nextIdx;
        active.dispatchEvent(new Event('change', {bubbles: true}));
        playSound('move');
        playHaptic('light');
      }
      return;
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
      const score = primary + cross * 2.5;
      if (score < bestScore) {
        best = element;
        bestScore = score;
      }
    }

    if (best) {
      focus(best);
      playSound('move');
      playHaptic('light');
    } else {
      playSound('boundary');
      playHaptic('boundary');
    }
  }

  /* --- Dialog Navigation --- */
  function navigateWithin(container, direction) {
    const elements = [...container.querySelectorAll(ACTIONABLE)].filter(isElementVisible);
    if (!elements.length) return;
    const active = document.activeElement;
    if (!elements.includes(active)) {
      focus(elements[0]);
      playSound('move');
      playHaptic('light');
      return;
    }

    const from = active.getBoundingClientRect();
    const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
    let best = null, bestScore = Infinity;
    for (const element of elements) {
      if (element === active) continue;
      const rect = element.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - fx, dy = rect.top + rect.height / 2 - fy;
      const primary = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
      if (primary <= 3) continue;
      const cross = ['left', 'right'].includes(direction) ? Math.abs(dy) : Math.abs(dx);
      const score = primary + cross * 2.5;
      if (score < bestScore) {
        best = element;
        bestScore = score;
      }
    }
    if (best) {
      focus(best);
      playSound('move');
      playHaptic('light');
    } else {
      playSound('boundary');
      playHaptic('boundary');
    }
  }

  function move(direction) {
    if (keyboard?.open) {
      navigateWithin(keyboard, direction);
      return;
    }
    const detail = document.querySelector('#detail[open]');
    if (detail) {
      navigateWithin(detail, direction);
      return;
    }
    const welcome = welcomeScreen();
    if (welcome) {
      navigateWithin(welcome, direction);
      return;
    }

    const openPicker = document.querySelector('#tag-picker[open], #genre-picker[open]');
    if (openPicker) {
      navigateInPicker(openPicker, direction);
      return;
    }

    const active = document.activeElement;
    if (active?.classList.contains('game-open')) {
      navigateInGrid(active, direction);
      return;
    }
    if (active?.classList.contains('collection')) {
      navigateInSidebar(active, direction);
      return;
    }
    if (active?.closest('.filterbar, .genre-filter-section, .results-line')) {
      navigateInToolbar(active, direction);
      return;
    }

    generalSpatialMove(direction);
  }

  /* --- Keyboard dialog for search --- */
  function closeKeyboard() {
    if (!keyboard?.open) return;
    keyboard.close();
    keyboardTarget = null;
    focus(selectedBeforeKeyboard?.isConnected ? selectedBeforeKeyboard : document.querySelector('.game-open'));
  }

  function openKeyboard(target) {
    if (!target) return;
    if (!keyboard) {
      keyboard = document.createElement('dialog');
      keyboard.className = 'gamepad-keyboard';
      keyboard.setAttribute('aria-label', 'Nhập tên game bằng tay cầm');
      keyboard.innerHTML = '<div class="keyboard-head"><strong>Tìm game bằng tay cầm</strong><button type="button" data-key="close" aria-label="Đóng bàn phím">×</button></div><p class="keyboard-value" aria-live="polite"></p><p class="keyboard-tip">D-pad chọn phím · A nhập · X xóa ký tự · B đóng</p><div class="keyboard-keys">' +
        [...'1234567890QWERTYUIOPASDFGHJKLZXCVBNM'].map(key => '<button type="button" data-key="'+key.toLowerCase()+'">'+key+'</button>').join('') +
        '</div><div class="keyboard-actions"><button type="button" data-key="space">Dấu cách</button><button type="button" data-key="backspace">⌫ Xóa</button><button type="button" data-key="clear">Xóa hết</button><button type="button" class="primary" data-key="done">Xem kết quả</button></div>';
      document.body.append(keyboard);
      keyboard.addEventListener('click', event => {
        const key = event.target.closest('[data-key]')?.dataset.key;
        if (!key) return;
        if (key === 'close' || key === 'done') {
          closeKeyboard();
          if (key === 'done') focus(document.querySelector('.game-open'));
          return;
        }
        editSearch(key);
      });
      keyboard.addEventListener('cancel', event => {
        event.preventDefault();
        closeKeyboard();
      });
    }
    selectedBeforeKeyboard = document.activeElement;
    keyboardTarget = target;
    keyboard.showModal();
    keyboard.querySelector('.keyboard-value').textContent = target.value || 'Nhập tên game…';
    focus(keyboard.querySelector('[data-key="q"]'));
  }

  function editSearch(key) {
    if (!keyboardTarget) return;
    if (key === 'backspace') keyboardTarget.value = [...keyboardTarget.value].slice(0, -1).join('');
    else if (key === 'clear') keyboardTarget.value = '';
    else if (keyboardTarget.value.length < 150) keyboardTarget.value += key === 'space' ? ' ' : key;
    keyboardTarget.dispatchEvent(new Event('input', {bubbles: true}));
    keyboard.querySelector('.keyboard-value').textContent = keyboardTarget.value || 'Nhập tên game…';
    playSound('toggle');
    playHaptic('light');
  }

  /* --- Action Handlers (A, B, X, Y) --- */
  function activate() {
    const element = document.activeElement;
    if (!element) return;

    if (element.matches('input[type="search"], input[type="text"]')) {
      playSound('select');
      playHaptic('medium');
      openKeyboard(element);
      return;
    }

    if (element.classList.contains('tag-option') || element.closest('.tag-option')) {
      const opt = element.classList.contains('tag-option') ? element : element.closest('.tag-option');
      const cb = opt.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', {bubbles: true}));
        playSound('toggle');
        playHaptic('medium');
        return;
      }
    }

    if (element.matches('input[type="checkbox"]')) {
      element.checked = !element.checked;
      element.dispatchEvent(new Event('change', {bubbles: true}));
      playSound('toggle');
      playHaptic('medium');
      return;
    }

    if (element.tagName === 'SUMMARY') {
      const details = element.closest('details');
      const wasOpen = details?.open;
      element.click();
      playSound('select');
      playHaptic('medium');
      if (!wasOpen) {
        setTimeout(() => {
          if (details?.open) {
            const first = details.querySelector('input[type="search"], .tag-option, input[type="checkbox"]');
            if (first) {
              focus(first);
              playSound('move');
              playHaptic('light');
            }
          }
        }, 40);
      }
      return;
    }

    if (element.tagName === 'SELECT') {
      element.selectedIndex = (element.selectedIndex + 1) % element.options.length;
      element.dispatchEvent(new Event('change', {bubbles: true}));
      playSound('move');
      playHaptic('light');
      return;
    }

    if (element.classList.contains('game-open')) {
      returnFocus = element;
      playSound('select');
      playHaptic('medium');
      element.click();
      return;
    }

    playSound('select');
    playHaptic('medium');
    element.click();
  }

  function back() {
    if (keyboard?.open) {
      closeKeyboard();
      playSound('back');
      playHaptic('light');
      return;
    }
    if (welcomeScreen()) {
      welcomeScreen().querySelector('#welcome-skip')?.click();
      playSound('back');
      playHaptic('light');
      return;
    }
    const openPicker = document.querySelector('#tag-picker[open], #genre-picker[open]');
    if (openPicker) {
      openPicker.open = false;
      const summary = openPicker.querySelector('summary');
      if (summary) focus(summary);
      playSound('back');
      playHaptic('light');
      return;
    }
    const detail = document.querySelector('#detail[open]');
    if (detail) {
      detail.querySelector('[data-close]')?.click();
      const target = returnFocus?.isConnected ? returnFocus : (lastFocusedGameId ? document.querySelector(`.game-open[data-game="${lastFocusedGameId}"]`) : null);
      focus(target || document.querySelector('.game-open') || candidates()[0]);
      playSound('back');
      playHaptic('light');
      return;
    }
    playSound('boundary');
    playHaptic('boundary');
  }

  function toggleFavorite() {
    if (keyboard?.open) {
      editSearch('backspace');
      return;
    }
    const activeCard = document.activeElement?.closest('.game-card');
    if (activeCard) {
      const fav = activeCard.querySelector('.favorite-button');
      if (fav) {
        fav.click();
        playSound('toggle');
        playHaptic('medium');
      }
    }
  }

  function changeCollection(direction) {
    if (currentDialog() || welcomeScreen()) return;
    document.dispatchEvent(new CustomEvent('archive:gamepad-category', {detail: {direction}}));
    playSound('move');
    playHaptic('light');
    setTimeout(() => {
      const firstGame = (lastFocusedGameId && document.querySelector(`.game-open[data-game="${lastFocusedGameId}"]`)) ||
        document.querySelector('.game-open') ||
        candidates()[0];
      focus(firstGame);
    }, 50);
  }

  function press(pad, index) {
    return Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > 0.5);
  }

  function poll(time) {
    frame = null;
    if (document.hidden) return;
    let pads;
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch { return; }
    const pad = pads.find(p => p?.connected && p.mapping === 'standard' && p.index === controllerIndex) || pads.find(p => p?.connected && p.mapping === 'standard');

    if (!pad) {
      if (controllerIndex !== null) announce('Tay cầm đã ngắt kết nối.');
      controllerIndex = null;
      bar.hidden = true;
      previousButtons = [];
      heldDirection = null;
      document.body.classList.remove('gamepad-mode', 'gamepad-connected');
      gamepadMode = false;
      document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
      if (keyboard?.open) closeKeyboard();
    } else {
      if (controllerIndex !== pad.index) {
        announce('Tay cầm đã kết nối. Dùng D-pad hoặc cần gạt để điều khiển.');
        previousButtons = pad.buttons.map(b => b.pressed || b.value > 0.5);
      }
      controllerIndex = pad.index;
      bar.hidden = false;
      document.body.classList.add('gamepad-connected');

      let direction = null;
      if (press(pad, 12) || pad.axes[1] < -AXIS_THRESHOLD) direction = 'up';
      else if (press(pad, 13) || pad.axes[1] > AXIS_THRESHOLD) direction = 'down';
      else if (press(pad, 14) || pad.axes[0] < -AXIS_THRESHOLD) direction = 'left';
      else if (press(pad, 15) || pad.axes[0] > AXIS_THRESHOLD) direction = 'right';

      const down = index => press(pad, index) && !previousButtons[index];

      if (direction) {
        if (!gamepadMode) enableMode();
        if (direction !== heldDirection || time >= nextMoveAt) {
          move(direction);
          nextMoveAt = time + (direction !== heldDirection ? FIRST_REPEAT_MS : REPEAT_MS);
        }
      }
      heldDirection = direction;

      if ([0, 1, 2, 3, 4, 5].some(down)) {
        if (!gamepadMode) enableMode();
        if (down(0)) activate();
        if (down(1)) back();
        if (down(2)) toggleFavorite();
        if (down(3) && !document.querySelector('#detail[open]') && !welcomeScreen()) openKeyboard(document.querySelector('#search'));
        if (down(4)) changeCollection(-1);
        if (down(5)) changeCollection(1);
      }

      const scroll = pad.axes[3] || 0;
      if (Math.abs(scroll) > 0.2 && !welcomeScreen()) {
        const amount = Math.sign(scroll) * ((Math.abs(scroll) - 0.2) / 0.8) * 16;
        const description = document.querySelector('#detail[open] .description-text');
        if (description && document.activeElement?.closest('.description-text')) {
          description.scrollBy(0, amount);
        } else if (currentDialog()) {
          currentDialog().scrollBy(0, amount);
        } else {
          window.scrollBy(0, amount);
        }
      }
      previousButtons = pad.buttons.map(b => b.pressed || b.value > 0.5);
    }
    frame = requestAnimationFrame(poll);
  }

  function start() {
    if (frame === null && !document.hidden) frame = requestAnimationFrame(poll);
  }

  window.addEventListener('gamepadconnected', start);
  window.addEventListener('gamepaddisconnected', start);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      previousButtons = [];
      heldDirection = null;
      controllerIndex = null;
    } else {
      start();
    }
  });

  function leaveMode() {
    gamepadMode = false;
    document.body.classList.remove('gamepad-mode');
    document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
  }
  document.addEventListener('pointerdown', leaveMode);
  document.addEventListener('keydown', e => {
    if (!['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    leaveMode();
  });

  /* Listen for virtual grid renders to restore focus safely without jumping to top */
  document.addEventListener('archive:rendered', () => {
    if (!gamepadMode || currentDialog() || keyboard?.open) return;
    if (lastFocusedGameId) {
      const match = document.querySelector(`.game-open[data-game="${lastFocusedGameId}"]`);
      if (match && document.activeElement !== match) {
        focus(match);
      }
    }
  });

  new MutationObserver(() => {
    if (!gamepadMode || !bar.isConnected) return;
    if (currentDialog() || keyboard?.open) return;
    if (lastFocusedGameId) {
      const match = document.querySelector(`.game-open[data-game="${lastFocusedGameId}"]`);
      if (match) {
        if (document.activeElement !== match) focus(match);
        return;
      }
    }
    if (document.activeElement && candidates().includes(document.activeElement)) return;
    const firstGame = document.querySelector('#game-grid .game-open');
    if (firstGame) focus(firstGame);
    else focus(candidates()[0]);
  }).observe(document.querySelector('main'), {childList: true, subtree: true});

  new MutationObserver(() => {
    if (gamepadMode && document.querySelector('#detail[open]')) {
      focus(document.querySelector('#detail [data-close]'));
      playSound('select');
      playHaptic('medium');
    }
  }).observe(document.querySelector('#detail-inner'), {childList: true});

  if (navigator.getGamepads) start();
})();
