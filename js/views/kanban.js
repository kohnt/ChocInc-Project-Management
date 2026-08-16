/* views/kanban.js — Kanban board with drag-and-drop */

const KanbanView = {

  _dragTaskId: null,

  render() {
    const tasks   = Filters.applyFilters(AppState.tasks);
    const columns = CONFIG.KANBAN_COLUMNS.map(status => ({
      status,
      cfg:   CONFIG.STATUSES[status],
      tasks: tasks.filter(t => t.status === status)
    }));

    document.getElementById('view-container').innerHTML = `
      <div class="kanban-board">
        ${columns.map(col => this._renderColumn(col)).join('')}
      </div>`;

    this._bindEvents();
  },

  _renderColumn({ status, cfg, tasks }) {
    return `
      <div class="kanban-column" data-status="${status}">
        <div class="kanban-col-header">
          <span class="col-dot" style="background:${cfg.color}"></span>
          <span class="col-title">${I18n.translateStatus(status)}</span>
          <span class="col-count">${tasks.length}</span>
          <button class="icon-btn" onclick="KanbanView.quickAdd('${status}')" title="Add task">+</button>
        </div>
        <div class="kanban-cards drop-zone" data-status="${status}">
          ${tasks.map(t => this._renderCard(t)).join('')}
          <div class="drop-placeholder hidden"></div>
        </div>
      </div>`;
  },

  _renderCard(task) {
    const project   = AppState.projects.find(p => p.id === task.projectId);
    const assignees = task.assignedTo.map(id => AppState.users.find(u => u.id === id)).filter(Boolean);
    const priCfg    = CONFIG.PRIORITIES[task.priority] || CONFIG.PRIORITIES.medium;
    const overdue   = Helpers.isOverdue(task.dueDate, task.status);
    const stProg    = Helpers.subtaskProgress(task.subtasks);

    return `
      <div class="kanban-card ${overdue ? 'is-overdue' : ''}"
           draggable="true"
           data-task-id="${task.id}">
        ${project ? `<div class="card-project-tag" style="border-left:3px solid ${project.color}">${Helpers.escapeHtml(project.name)}</div>` : ''}
        <div class="card-title">${Helpers.escapeHtml(task.title)}</div>
        ${task.labels.length ? `<div class="card-labels">${task.labels.slice(0,3).map(l => `<span class="label-chip">${Helpers.escapeHtml(l)}</span>`).join('')}</div>` : ''}
        ${stProg ? `
          <div class="card-subtask-bar">
            <div class="subtask-bar-fill" style="width:${stProg.pct}%"></div>
          </div>
          <span class="subtask-frac">${stProg.done}/${stProg.total}</span>` : ''}
        <div class="card-footer">
          <span class="priority-pip" style="background:${priCfg.color}" title="${priCfg.label}"></span>
          ${task.recurring ? `<span class="card-recur-icon" title="${I18n.t('task.recurring_' + task.recurring)}">↻</span>` : ''}
          ${task.dueDate ? `<span class="card-due ${overdue ? 'text-danger' : ''}">${Format.relativeDate(task.dueDate)}</span>` : ''}
          <div class="card-avatars">
            ${assignees.slice(0,3).map(u => `<span class="avatar avatar-sm" style="background:${u.color}" title="${Helpers.escapeHtml(u.name)}">${Format.initials(u.name)}</span>`).join('')}
          </div>
        </div>
      </div>`;
  },

  _bindEvents() {
    // Card drag
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        this._dragTaskId = card.dataset.taskId;
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));
      });
      card.addEventListener('click', () => Render.openDetailPanel(card.dataset.taskId));
      card.addEventListener('contextmenu', e => { e.preventDefault(); this._contextMenu(e, card.dataset.taskId); });
    });

    // Drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', e => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
      });
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (!this._dragTaskId) return;
        const newStatus = zone.dataset.status;
        Tasks.update(this._dragTaskId, { status: newStatus });
        this._dragTaskId = null;
        this.render();
        Components.toast(I18n.t('toast.moved_to', { status: I18n.translateStatus(newStatus) }), 'success');
      });
    });
  },

  quickAdd(status) {
    const task = { status };
    Components.taskForm({ status, assignedTo: [], labels: [], subtasks: [], comments: [], attachments: [] });
    // pre-select status after form renders
    setTimeout(() => {
      const sel = document.querySelector('#task-form [name="status"]');
      if (sel) sel.value = status;
    }, 50);
  },

  _contextMenu(e, taskId) {
    const menu  = document.getElementById('context-menu');
    const items = document.getElementById('context-menu-items');
    items.innerHTML = `
      <div class="ctx-item" onclick="Render.openDetailPanel('${taskId}');KanbanView._closeCtx()">${I18n.t('ctx.open_detail')}</div>
      <div class="ctx-item" onclick="Components.taskForm(Tasks.getById('${taskId}'));KanbanView._closeCtx()">${I18n.t('ctx.edit')}</div>
      <div class="ctx-item" onclick="Tasks.duplicate('${taskId}');KanbanView.render();KanbanView._closeCtx()">${I18n.t('ctx.duplicate')}</div>
      <div class="ctx-item danger" onclick="Components.deleteTask('${taskId}');KanbanView._closeCtx()">${I18n.t('ctx.delete')}</div>`;
    menu.style.top  = e.clientY + 'px';
    menu.style.left = e.clientX + 'px';
    menu.classList.remove('hidden');

    setTimeout(() => document.addEventListener('click', this._closeCtx, { once: true }), 0);
  },

  _closeCtx() {
    document.getElementById('context-menu').classList.add('hidden');
  }

};
