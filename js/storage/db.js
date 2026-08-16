/* storage/db.js — IndexedDB persistence layer */

const DB = (() => {
  let _db = null;

  const STORES = ['projects','tasks','teams','users','metadata'];

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects'))  db.createObjectStore('projects',  { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tasks'))     db.createObjectStore('tasks',     { keyPath: 'id' });
        if (!db.objectStoreNames.contains('teams'))     db.createObjectStore('teams',     { keyPath: 'id' });
        if (!db.objectStoreNames.contains('users'))     db.createObjectStore('users',     { keyPath: 'id' });
        if (!db.objectStoreNames.contains('metadata'))  db.createObjectStore('metadata',  { keyPath: 'key' });
      };

      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  function tx(storeName, mode = 'readonly') {
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  function getAll(storeName) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function putAll(storeName, items) {
    return new Promise((resolve, reject) => {
      const store = tx(storeName, 'readwrite');
      let count = items.length;
      if (count === 0) { resolve(); return; }
      items.forEach(item => {
        const req = store.put(item);
        req.onsuccess = () => { if (--count === 0) resolve(); };
        req.onerror   = () => reject(req.error);
      });
    });
  }

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  return {
    async init() {
      try {
        await open();
        return true;
      } catch (err) {
        console.warn('IndexedDB unavailable:', err);
        return false;
      }
    },

    async load() {
      if (!_db) return null;
      try {
        const [projects, tasks, teams, users, metaArr] = await Promise.all(
          STORES.map(s => getAll(s))
        );
        const meta = {};
        metaArr.forEach(m => { meta[m.key] = m.value; });
        return { projects, tasks, teams, users, workspace: meta.workspace || {}, settings: meta.settings || {} };
      } catch (err) {
        console.warn('DB load error:', err);
        return null;
      }
    },

    async saveAll() {
      if (!_db) return;
      const s = AppState;
      try {
        await Promise.all([
          clearStore('projects').then(() => putAll('projects', s.projects)),
          clearStore('tasks').then(()    => putAll('tasks',    s.tasks)),
          clearStore('teams').then(()    => putAll('teams',    s.teams)),
          clearStore('users').then(()    => putAll('users',    s.users)),
          clearStore('metadata').then(() => putAll('metadata', [
            { key: 'workspace', value: s.workspace },
            { key: 'settings',  value: s.settings  }
          ]))
        ]);
      } catch (err) {
        console.warn('DB save error:', err);
      }
    },

    exportJSON() {
      const data = {
        version:   '1.0',
        exportedAt: Format.timestamp(),
        workspace: AppState.workspace,
        teams:     AppState.teams,
        users:     AppState.users,
        projects:  AppState.projects,
        tasks:     AppState.tasks,
        settings:  AppState.settings
      };
      const json  = JSON.stringify(data, null, 2);
      const blob  = new Blob([json], { type: 'application/json' });
      const url   = URL.createObjectURL(blob);
      const date  = new Date().toISOString().split('T')[0];
      const a     = document.createElement('a');
      a.href      = url;
      a.download  = `projectflow_export_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Components.toast(I18n.t('toast.export_done'), 'success');
    },

    async importJSON(file) {
      if (file.size > 50 * 1024 * 1024) {
        Components.toast(I18n.t('toast.file_too_large'), 'error');
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.projects || !data.tasks) throw new Error('Invalid format');

        const pCount = data.projects.length;
        const tCount = data.tasks.length;

        AppState.workspace = data.workspace || AppState.workspace;
        AppState.teams     = data.teams     || AppState.teams;
        AppState.users     = data.users     || AppState.users;
        AppState.projects  = data.projects;
        AppState.tasks     = data.tasks;
        AppState.settings  = Object.assign({}, AppState.settings, data.settings || {});

        await DB.saveAll();
        Render.refreshAll();
        Components.toast(I18n.t('toast.import_success', { p: pCount, t: tCount }), 'success');
      } catch (err) {
        Components.toast(I18n.t('toast.invalid_format'), 'error');
      }
    },

    async clearAll() {
      for (const s of STORES) await clearStore(s);
    }
  };
})();
