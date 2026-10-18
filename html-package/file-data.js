/* Classic scripts work from file:// without fetching local JSON or using modules. */
(() => {
  'use strict';
  const records = new Map();
  const pending = new Map();
  const extraData = new Map();
  function loadGame(id) {
    if (records.has(id)) return Promise.resolve(records.get(id));
    if (pending.has(id)) return pending.get(id);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./data/games/' + encodeURIComponent(id) + '.js', document.baseURI).href;
      script.onload = () => {
        script.remove();
        if (records.has(id)) resolve(records.get(id));
        else reject(new Error('File game không chứa dữ liệu hợp lệ. Hãy giải nén lại toàn bộ gói.'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Không đọc được file game. Hãy giữ nguyên thư mục data bên cạnh index.html.'));
      };
      document.head.append(script);
    });
    pending.set(id, promise);
    promise.finally(() => pending.delete(id)).catch(() => {});
    return promise;
  }
  window.GameArchiveFiles = {
    catalog: null,
    replaceHash(hash) {
      if (location.hash === hash) return;
      try { history.replaceState(null, '', hash); }
      catch { location.hash = hash; }
    },
    register(id, game) {
      if (!/^[a-zA-Z0-9-]+$/.test(id) || game?.id !== id) throw new Error('Invalid packaged game record');
      records.set(id, game);
    },
    registerData(path, value) { extraData.set(path, value); },
    async request(path, options) {
      if (extraData.has(path)) return {ok: true, json: async () => extraData.get(path)};
      if (path === './data/catalog.json') {
        if (!this.catalog) throw new Error('Thiếu danh sách game. Hãy giải nén đầy đủ thư mục data.');
        return {ok: true, json: async () => this.catalog};
      }
      const match = /^\.\/data\/games\/([a-zA-Z0-9-]+)\.json$/.exec(path);
      if (!match) return fetch(path, options);
      const game = await loadGame(match[1]);
      return {ok: true, json: async () => game};
    }
  };
})();
