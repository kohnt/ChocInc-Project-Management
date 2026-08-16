/* modules/filters.js — filtering and search logic */

const Filters = {

  _filters: {
    projectId:  null,
    assignedTo: null,
    status:     null,
    priority:   null,
    searchTerm: '',
    dueDateRange: { start: null, end: null }
  },

  set(key, value) {
    this._filters[key] = value || null;
  },

  clear() {
    this._filters = {
      projectId:  null,
      assignedTo: null,
      status:     null,
      priority:   null,
      searchTerm: '',
      dueDateRange: { start: null, end: null }
    };
  },

  get() {
    return { ...this._filters };
  },

  hasActive() {
    const f = this._filters;
    return !!(f.projectId || f.assignedTo || f.status || f.priority || f.searchTerm);
  },

  applyFilters(tasks) {
    const f = this._filters;
    return tasks.filter(task => {
      if (f.projectId  && task.projectId !== f.projectId)          return false;
      if (f.status     && task.status    !== f.status)             return false;
      if (f.priority   && task.priority  !== f.priority)           return false;
      if (f.assignedTo && !task.assignedTo.includes(f.assignedTo)) return false;

      if (f.dueDateRange.start && task.dueDate) {
        if (new Date(task.dueDate) < new Date(f.dueDateRange.start)) return false;
      }
      if (f.dueDateRange.end && task.dueDate) {
        if (new Date(task.dueDate) > new Date(f.dueDateRange.end))   return false;
      }

      if (f.searchTerm) {
        const term  = f.searchTerm.toLowerCase();
        const title = (task.title       || '').toLowerCase();
        const desc  = (task.description || '').toLowerCase();
        const lbls  = (task.labels      || []).join(' ').toLowerCase();
        if (!title.includes(term) && !desc.includes(term) && !lbls.includes(term)) return false;
      }

      return true;
    });
  }

};
