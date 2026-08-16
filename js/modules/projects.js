/* modules/projects.js — project CRUD */

const Projects = {

  create(data) {
    const project = {
      id:          generateId('proj'),
      name:        data.name        || 'Untitled Project',
      description: data.description || '',
      teamId:      data.teamId      || null,
      status:      data.status      || 'planning',
      startDate:   data.startDate   || null,
      endDate:     data.endDate     || null,
      owner:       data.owner       || null,
      priority:    data.priority    || 'medium',
      color:       data.color       || CONFIG.PROJECT_COLORS[AppState.projects.length % CONFIG.PROJECT_COLORS.length],
      createdAt:   Format.timestamp(),
      updatedAt:   Format.timestamp()
    };
    AppState.projects.push(project);
    App.scheduleSave();
    return project;
  },

  update(id, updates) {
    const idx = AppState.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    AppState.projects[idx] = Object.assign({}, AppState.projects[idx], updates, { updatedAt: Format.timestamp() });
    App.scheduleSave();
    return AppState.projects[idx];
  },

  delete(id) {
    AppState.projects  = AppState.projects.filter(p => p.id !== id);
    AppState.tasks     = AppState.tasks.filter(t => t.projectId !== id);
    App.scheduleSave();
  },

  getAll() {
    return AppState.projects;
  },

  getById(id) {
    return AppState.projects.find(p => p.id === id) || null;
  },

  getProgress(id) {
    const tasks = AppState.tasks.filter(t => t.projectId === id);
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return Math.round(done / tasks.length * 100);
  }

};
