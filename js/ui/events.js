/* ui/events.js — global event listeners */

const Events = {

  _searchDebounce: null,

  init() {
    this._bindSidebar();
    this._bindTopBar();
    this._bindFilterBar();
    this._bindImportExport();
    this._bindKeyboard();
    this._bindGlobal();
  },

  _bindSidebar() {
    // Sidebar toggle — persist state to localStorage
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const app       = document.getElementById('app');
      const collapsed = app.classList.toggle('sidebar-collapsed');
      localStorage.setItem('pf_sidebar_collapsed', collapsed ? '1' : '0');
    });

    // Mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('mobile-open');
    });

    // View switcher
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => Render.switchView(btn.dataset.view));
    });

    // New project
    document.getElementById('new-project-btn').addEventListener('click', () => Components.projectForm());

    // New member
    document.getElementById('new-member-btn').addEventListener('click', () => Components.memberForm());

    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => Components.settingsModal());

    // Generate PDF report
    document.getElementById('report-btn').addEventListener('click', () => Report.showOptions());

    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      const next = (AppState.settings.theme || 'light') === 'dark' ? 'light' : 'dark';
      App.setSetting('theme', next);
    });

    // Close detail panel
    document.getElementById('close-detail-btn').addEventListener('click', () => Render.closeDetailPanel());
  },

  _bindTopBar() {
    // New task
    document.getElementById('new-task-btn').addEventListener('click', () => Components.taskForm(null));

    // Search
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');

    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();
      searchClear.classList.toggle('hidden', !val);
      clearTimeout(this._searchDebounce);
      this._searchDebounce = setTimeout(() => {
        Filters.set('searchTerm', val);
        Render.refreshView();
      }, CONFIG.SEARCH_DELAY);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      Filters.set('searchTerm', '');
      Render.refreshView();
    });
  },

  _bindFilterBar() {
    document.getElementById('filter-project').addEventListener('change', e => {
      Filters.set('projectId', e.target.value);
      AppState.ui.selectedFilters = Filters.get();
      Render.refreshView();
      Render.renderSidebar();
    });

    document.getElementById('filter-status').addEventListener('change', e => {
      Filters.set('status', e.target.value);
      Render.refreshView();
    });

    document.getElementById('filter-priority').addEventListener('change', e => {
      Filters.set('priority', e.target.value);
      Render.refreshView();
    });

    document.getElementById('filter-assignee').addEventListener('change', e => {
      Filters.set('assignedTo', e.target.value);
      Render.refreshView();
    });

    document.getElementById('clear-filters-btn').addEventListener('click', () => {
      Filters.clear();
      AppState.ui.selectedFilters = Filters.get();
      document.getElementById('filter-project').value  = '';
      document.getElementById('filter-status').value   = '';
      document.getElementById('filter-priority').value = '';
      document.getElementById('filter-assignee').value = '';
      document.getElementById('search-input').value    = '';
      document.getElementById('search-clear').classList.add('hidden');
      Render.refreshView();
      Render.renderSidebar();
      Components.toast(I18n.t('toast.filters_cleared'), 'info');
    });
  },

  _bindImportExport() {
    document.getElementById('export-btn').addEventListener('click', () => DB.exportJSON());

    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('file-import').click();
    });

    document.getElementById('file-import').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await DB.importJSON(file);
        e.target.value = ''; // reset so same file can be re-imported
      }
    });
  },

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        Components.closeModal();
        Render.closeDetailPanel();
        document.getElementById('context-menu').classList.add('hidden');
      }

      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'k': e.preventDefault(); Components.taskForm(null); break;
          case 'e': e.preventDefault(); DB.exportJSON(); break;
          case 'i': e.preventDefault(); document.getElementById('file-import').click(); break;
          case 'f': e.preventDefault(); document.getElementById('search-input').focus(); break;
        }
      }

      // Number keys 1-6 switch views
      const viewKeys = ['1','2','3','4','5','6'];
      const viewNames = Object.keys(CONFIG.VIEWS);
      if (viewKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
        const idx = viewKeys.indexOf(e.key);
        if (viewNames[idx]) Render.switchView(viewNames[idx]);
      }
    });
  },

  _bindGlobal() {
    // Close context menu on any click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) {
        document.getElementById('context-menu').classList.add('hidden');
      }
    });

    // Close mobile sidebar on outside click
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !e.target.closest('#mobile-menu-btn')) {
        sidebar.classList.remove('mobile-open');
      }
    });
  },

  filterByProject(projectId) {
    const sel = document.getElementById('filter-project');
    if (sel.value === projectId) {
      // Toggle off
      sel.value = '';
      Filters.set('projectId', null);
    } else {
      sel.value = projectId;
      Filters.set('projectId', projectId);
    }
    AppState.ui.selectedFilters = Filters.get();
    Render.refreshView();
    Render.renderSidebar();
  }

};
