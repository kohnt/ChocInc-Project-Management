/* views/timeline.js — chronological task planner */

const TimelineView = {

  render() {
    const raw    = Filters.applyFilters(AppState.tasks);
    const sorted = Helpers.sortTasks(raw, 'dueDate', 'asc');

    // Group by due-date bucket
    const groups = {};
    sorted.forEach(t => {
      const key = Helpers.getDueDateGroup(t.dueDate);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    let html = '<div class="timeline-wrapper">';

    Helpers.dueDateGroupOrder.forEach(key => {
      if (!groups[key]) return;
      html += `<div class="tl-group">
        <div class="tl-group-label">${Helpers.dueDateGroupLabel(key)} <span class="tl-count">${groups[key].length}</span></div>
        <div class="tl-rows">${groups[key].map(t => this._renderRow(t)).join('')}</div>
      </div>`;
    });

    if (!sorted.length) {
      html += `<div class="empty-state"><p>${I18n.t('tl.no_tasks')}</p><button class="btn btn-primary" onclick="Components.taskForm(null)">${I18n.t('tl.create_task')}</button></div>`;
    }

    html += '</div>';
    document.getElementById('view-container').innerHTML = html;
    this._bindEvents();
  },

  _renderRow(task) {
    const project   = AppState.projects.find(p => p.id === task.projectId);
    const assignees = task.assignedTo.map(id => AppState.users.find(u => u.id === id)).filter(Boolean);
    const overdue   = Helpers.isOverdue(task.dueDate, task.status);

    return `
      <div class="tl-row ${overdue ? 'tl-overdue' : ''}" data-task-id="${task.id}">
        <div class="tl-row-left">
          ${project ? `<span class="tl-proj-dot" style="background:${project.color}" title="${Helpers.escapeHtml(project.name)}"></span>` : ''}
          <span class="tl-task-title">${Helpers.escapeHtml(task.title)}</span>
          ${task.labels.slice(0,2).map(l => `<span class="label-chip">${Helpers.escapeHtml(l)}</span>`).join('')}
        </div>
        <div class="tl-row-right">
          <div class="tl-avatars">
            ${assignees.slice(0,2).map(u => `<span class="avatar avatar-sm" style="background:${u.color}" title="${Helpers.escapeHtml(u.name)}">${Format.initials(u.name)}</span>`).join('')}
          </div>
          ${Components.statusBadge(task.status)}
          ${Components.priorityBadge(task.priority)}
          <span class="tl-due ${overdue ? 'text-danger' : ''}">${task.dueDate ? Format.shortDate(task.dueDate) : '—'}</span>
          <button class="icon-btn" onclick="Components.taskForm(Tasks.getById('${task.id}'))" title="Edit">✎</button>
        </div>
      </div>`;
  },

  _bindEvents() {
    document.querySelectorAll('.tl-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.closest('select')) return;
        Render.openDetailPanel(row.dataset.taskId);
      });
    });
  }

};
