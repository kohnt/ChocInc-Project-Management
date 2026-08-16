/* modules/tasks.js — task CRUD */

const Tasks = {

  create(data) {
    const task = {
      id:                   generateId('task'),
      projectId:            data.projectId            || null,
      title:                data.title                || 'Untitled Task',
      description:          data.description          || '',
      status:               data.status               || 'todo',
      priority:             data.priority             || 'medium',
      assignedTo:           data.assignedTo           || [],
      startDate:            data.startDate            || null,
      dueDate:              data.dueDate              || null,
      estimatedHours:       data.estimatedHours       || null,
      completionPercentage: data.completionPercentage || 0,
      labels:               data.labels               || [],
      recurring:            data.recurring            || null,
      subtasks:             data.subtasks             || [],
      comments:             data.comments             || [],
      attachments:          data.attachments          || [],
      createdAt:            Format.timestamp(),
      createdBy:            data.createdBy            || null,
      updatedAt:            Format.timestamp(),
      updatedBy:            data.updatedBy            || null
    };
    AppState.tasks.push(task);
    App.scheduleSave();
    return task;
  },

  update(id, updates) {
    const idx = AppState.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const prev = AppState.tasks[idx];
    AppState.tasks[idx] = Object.assign({}, prev, updates, {
      updatedAt: Format.timestamp()
    });
    App.scheduleSave();
    if (updates.status === 'done' && prev.status !== 'done' && AppState.tasks[idx].recurring) {
      Tasks.spawnNextRecurrence(AppState.tasks[idx]);
      if (window.Components) Components.toast(I18n.t('toast.recur_spawned'), 'success');
    }
    return AppState.tasks[idx];
  },

  delete(id) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    App.scheduleSave();
  },

  duplicate(id) {
    const original = AppState.tasks.find(t => t.id === id);
    if (!original) return null;
    return Tasks.create({
      ...original,
      id:        undefined,
      title:     original.title + ' (copy)',
      status:    'todo',
      createdAt: undefined,
      updatedAt: undefined
    });
  },

  getAll() {
    return AppState.tasks;
  },

  getById(id) {
    return AppState.tasks.find(t => t.id === id) || null;
  },

  getByProject(projectId) {
    return AppState.tasks.filter(t => t.projectId === projectId);
  },

  getByAssignee(userId) {
    return AppState.tasks.filter(t => t.assignedTo.includes(userId));
  },

  addComment(taskId, text, authorId, authorName) {
    const task = Tasks.getById(taskId);
    if (!task) return;
    const comment = {
      id:         generateId('c'),
      author:     authorId,
      authorName: authorName || null,
      text,
      timestamp:  Format.timestamp()
    };
    task.comments.push(comment);
    Tasks.update(taskId, { comments: task.comments });
    return comment;
  },

  toggleSubtask(taskId, subtaskId) {
    const task = Tasks.getById(taskId);
    if (!task) return;
    const st = task.subtasks.find(s => s.id === subtaskId);
    if (st) {
      st.completed = !st.completed;
      const pct = Helpers.subtaskProgress(task.subtasks);
      Tasks.update(taskId, {
        subtasks: task.subtasks,
        completionPercentage: pct ? pct.pct : task.completionPercentage
      });
    }
  },

  _nextDate(dateStr, pattern) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (pattern === 'daily')   d.setDate(d.getDate() + 1);
    if (pattern === 'weekly')  d.setDate(d.getDate() + 7);
    if (pattern === 'monthly') d.setMonth(d.getMonth() + 1);
    if (pattern === '6months') d.setMonth(d.getMonth() + 6);
    if (pattern === 'yearly')  d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  },

  spawnNextRecurrence(task) {
    if (!task.recurring) return null;
    return Tasks.create({
      projectId:      task.projectId,
      title:          task.title,
      description:    task.description,
      status:         'todo',
      priority:       task.priority,
      assignedTo:     [...task.assignedTo],
      startDate:      Tasks._nextDate(task.startDate, task.recurring),
      dueDate:        Tasks._nextDate(task.dueDate, task.recurring),
      estimatedHours: task.estimatedHours,
      labels:         [...task.labels],
      recurring:      task.recurring,
      subtasks:       task.subtasks.map(s => ({ id: generateId('st'), title: s.title, completed: false })),
      createdBy:      task.createdBy
    });
  }

};
