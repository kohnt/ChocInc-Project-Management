/* utils/helpers.js — small reusable utility functions */

const Helpers = {

  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  isOverdue(dueDate, status) {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  },

  daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  getDueDateGroup(dueDate) {
    if (!dueDate) return 'no_date';
    const days = Helpers.daysUntil(dueDate);
    if (days < 0)  return 'overdue';
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days <= 7)  return 'this_week';
    if (days <= 14) return 'next_week';
    return 'later';
  },

  dueDateGroupLabel(key) {
    return I18n.t('dategroup.' + key, {}, key);
  },

  dueDateGroupOrder: ['overdue','today','tomorrow','this_week','next_week','later','no_date'],

  sortTasks(tasks, field = 'dueDate', dir = 'asc') {
    return [...tasks].sort((a, b) => {
      let va = a[field], vb = b[field];
      if (field === 'priority') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        va = order[va] ?? 99;
        vb = order[vb] ?? 99;
      }
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  },

  subtaskProgress(subtasks) {
    if (!subtasks || subtasks.length === 0) return null;
    const done = subtasks.filter(s => s.completed).length;
    return { done, total: subtasks.length, pct: Math.round(done / subtasks.length * 100) };
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

};
