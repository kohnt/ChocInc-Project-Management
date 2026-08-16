/* app.js — entry point: initialization and auto-save orchestration */

window.AppState = {
  workspace: {},
  projects:  [],
  tasks:     [],
  teams:     [],
  users:     [],
  settings:  { autoSave: true, theme: 'light', defaultView: 'kanban', profile: { name: '', designation: '' } },
  ui: {
    currentView:     'kanban',
    detailTaskId:    null,
    selectedFilters: {},
    sidebarOpen:     true
  }
};

const App = {

  _saveTimer: null,

  async init() {
    // Init IndexedDB
    const dbOk = await DB.init();

    if (dbOk) {
      const stored = await DB.load();
      if (stored && stored.projects && stored.projects.length > 0) {
        // Restore from IndexedDB
        AppState.workspace = stored.workspace  || SAMPLE_DATA.workspace;
        AppState.projects  = stored.projects   || [];
        AppState.tasks     = stored.tasks      || [];
        AppState.teams     = stored.teams      || [];
        AppState.users     = stored.users      || [];
        AppState.settings  = Object.assign({}, SAMPLE_DATA.settings, stored.settings || {});
      } else {
        // First launch — seed with sample data
        App._loadSampleData();
        await DB.saveAll();
      }
    } else {
      // No IndexedDB — try localStorage fallback
      const raw = localStorage.getItem('pf_data');
      if (raw) {
        try {
          const d = JSON.parse(raw);
          AppState.workspace = d.workspace || SAMPLE_DATA.workspace;
          AppState.projects  = d.projects  || [];
          AppState.tasks     = d.tasks     || [];
          AppState.teams     = d.teams     || [];
          AppState.users     = d.users     || [];
        } catch (_) { App._loadSampleData(); }
      } else {
        App._loadSampleData();
      }
    }

    // Set default view
    AppState.ui.currentView = AppState.settings.defaultView || 'kanban';

    // Apply saved language (must happen before first render)
    I18n.load();
    I18n.applyStaticTranslations();

    // Apply saved theme
    App.applyTheme(AppState.settings.theme || 'light');

    // Restore sidebar collapsed state
    if (localStorage.getItem('pf_sidebar_collapsed') === '1') {
      document.getElementById('app').classList.add('sidebar-collapsed');
    }

    // Render UI
    Render.renderSidebar();
    Render.switchView(AppState.ui.currentView);
    Events.init();

    // Announce to user
    if (!dbOk) {
      Components.toast(I18n.t('toast.db_unavailable'), 'warning');
    }
  },

  _loadSampleData() {
    AppState.workspace = SAMPLE_DATA.workspace;
    AppState.projects  = SAMPLE_DATA.projects.map(p => ({ ...p }));
    AppState.tasks     = SAMPLE_DATA.tasks.map(t => ({ ...t }));
    AppState.teams     = SAMPLE_DATA.teams.map(t => ({ ...t }));
    AppState.users     = SAMPLE_DATA.users.map(u => ({ ...u }));
    AppState.settings  = { ...SAMPLE_DATA.settings };
  },

  scheduleSave() {
    if (!AppState.settings.autoSave) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(async () => {
      await DB.saveAll();
      // localStorage fallback
      try {
        localStorage.setItem('pf_data', JSON.stringify({
          workspace: AppState.workspace,
          projects:  AppState.projects,
          tasks:     AppState.tasks,
          teams:     AppState.teams,
          users:     AppState.users
        }));
      } catch (_) {}
      Render.showSaveIndicator();
    }, CONFIG.AUTOSAVE_DELAY);
  },

  setSetting(key, value) {
    AppState.settings[key] = value;
    if (key === 'theme') App.applyTheme(value);
    this.scheduleSave();
  },

  applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : '';
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = isDark
      ? `&#9728; <span id="theme-toggle-text">${I18n.t('sidebar.light_mode')}</span>`
      : `&#127769; <span id="theme-toggle-text">${I18n.t('sidebar.dark_mode')}</span>`;
  }

};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
