/* ui/render.js — DOM rendering orchestration */

const Render = {

  _saveTimer: null,

  switchView(viewName) {
    AppState.ui.currentView = viewName;

    // Nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // View title
    document.getElementById('view-title').textContent = I18n.t('view.' + viewName, {}, viewName);

    // Close detail panel when switching views
    this.closeDetailPanel();

    this.refreshView();
  },

  refreshView() {
    const v = AppState.ui.currentView;
    const views = { kanban: KanbanView, gantt: GanttView, calendar: CalendarView, timeline: TimelineView, eisenhower: EisenhowerView, dashboard: DashboardView };
    const view = views[v];
    if (view) view.render();
  },

  refreshAll() {
    this.renderSidebar();
    this.renderFilterBar();
    this.refreshView();
  },

  renderSidebar() {
    // Projects
    const projHtml = AppState.projects.map(p => {
      const pct  = Projects.getProgress(p.id);
      const isActive = AppState.ui.selectedFilters && AppState.ui.selectedFilters.projectId === p.id;
      return `
        <div class="sidebar-proj ${isActive ? 'active' : ''}" onclick="Events.filterByProject('${p.id}')">
          <span class="sb-proj-dot" style="background:${p.color}"></span>
          <span class="sb-proj-name">${Helpers.escapeHtml(p.name)}</span>
          <span class="sb-proj-pct">${pct}%</span>
          <button class="icon-btn" onclick="event.stopPropagation();Components.projectForm(Projects.getById('${p.id}'))" title="Edit">✎</button>
        </div>`;
    }).join('');
    document.getElementById('sidebar-projects').innerHTML = projHtml || `<p class="sb-empty">${I18n.t('sidebar.no_projects')}</p>`;

    // Team members
    const teamHtml = AppState.users.map(u => `
      <div class="sidebar-member" onclick="Components.memberForm(Teams.getUserById('${u.id}'))">
        ${Teams.getUserAvatar(u, 'sm')}
        <span class="sb-member-name">${Helpers.escapeHtml(u.name)}</span>
        <span class="sb-member-role">${Helpers.escapeHtml(u.role || '')}</span>
      </div>`).join('');
    document.getElementById('sidebar-team').innerHTML = teamHtml || `<p class="sb-empty">${I18n.t('sidebar.no_members')}</p>`;

    // Update filter selects
    this.renderFilterBar();

    // Sync sidebar profile display
    const prof   = (AppState.settings && AppState.settings.profile) || {};
    const nameEl = document.getElementById('sb-profile-name');
    const desgEl = document.getElementById('sb-profile-desg');
    const avEl   = document.getElementById('sb-profile-avatar');
    if (nameEl) nameEl.textContent = prof.name || I18n.t('sidebar.set_profile');
    if (desgEl) desgEl.textContent = prof.designation || I18n.t('sidebar.click_settings');
    if (avEl) {
      if (prof.avatar) {
        avEl.innerHTML = `<img src="${prof.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        avEl.textContent = prof.name ? Format.initials(prof.name) : '?';
      }
    }
  },

  renderFilterBar() {
    const projectSel = document.getElementById('filter-project');
    if (projectSel) {
      const cur = projectSel.value;
      projectSel.innerHTML = `<option value="">${I18n.t('filter.all_projects')}</option>` +
        AppState.projects.map(p => `<option value="${p.id}" ${cur === p.id ? 'selected' : ''}>${Helpers.escapeHtml(p.name)}</option>`).join('');
    }
    const assigneeSel = document.getElementById('filter-assignee');
    if (assigneeSel) {
      const cur = assigneeSel.value;
      assigneeSel.innerHTML = `<option value="">${I18n.t('filter.all_members')}</option>` +
        AppState.users.map(u => `<option value="${u.id}" ${cur === u.id ? 'selected' : ''}>${Helpers.escapeHtml(u.name)}</option>`).join('');
    }
  },

  openDetailPanel(taskId) {
    const task = Tasks.getById(taskId);
    if (!task) return;
    AppState.ui.detailTaskId = taskId;
    document.getElementById('app').classList.add('detail-open');

    const project   = AppState.projects.find(p => p.id === task.projectId);
    const assignees = task.assignedTo.map(id => AppState.users.find(u => u.id === id)).filter(Boolean);
    const stProg    = Helpers.subtaskProgress(task.subtasks);
    const overdue   = Helpers.isOverdue(task.dueDate, task.status);

    const html = `
      <div class="detail-inner">
        ${project ? `<div class="detail-project-tag" style="border-left:3px solid ${project.color}">${Helpers.escapeHtml(project.name)}</div>` : ''}
        <h2 class="detail-title">${Helpers.escapeHtml(task.title)}</h2>

        <div class="detail-badges">
          ${Components.statusBadge(task.status)}
          ${Components.priorityBadge(task.priority)}
          ${overdue ? `<span class="badge text-danger">${I18n.t('detail.overdue')}</span>` : ''}
          ${task.recurring ? `<span class="badge badge-recur">↻ ${I18n.t('task.recurring_' + task.recurring)}</span>` : ''}
        </div>

        ${task.description ? `<p class="detail-desc">${Helpers.escapeHtml(task.description)}</p>` : ''}

        <div class="detail-meta">
          <div class="meta-row">
            <span class="meta-label">${I18n.t('detail.start')}</span>
            <span>${task.startDate ? Format.date(task.startDate) : '—'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">${I18n.t('detail.due')}</span>
            <span class="${overdue ? 'text-danger' : ''}">${task.dueDate ? Format.date(task.dueDate) : '—'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">${I18n.t('detail.estimate')}</span>
            <span>${Format.hours(task.estimatedHours)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">${I18n.t('detail.progress')}</span>
            <span>${Components.progressRing(task.completionPercentage || 0, 32)}</span>
          </div>
          ${task.recurring ? `
          <div class="meta-row">
            <span class="meta-label">${I18n.t('detail.recurring')}</span>
            <span>↻ ${I18n.t('task.recurring_' + task.recurring)}</span>
          </div>` : ''}
        </div>

        <div class="detail-section">
          <div class="detail-section-title">${I18n.t('detail.assignees')}</div>
          <div class="detail-assignees">
            ${assignees.map(u => `<div class="detail-assignee">${Teams.getUserAvatar(u, 'sm')}<span>${Helpers.escapeHtml(u.name)}</span></div>`).join('')}
            ${!assignees.length ? `<span class="text-muted">${I18n.t('detail.unassigned')}</span>` : ''}
          </div>
        </div>

        ${task.labels.length ? `
          <div class="detail-section">
            <div class="detail-section-title">${I18n.t('detail.labels')}</div>
            <div>${task.labels.map(l => `<span class="label-chip">${Helpers.escapeHtml(l)}</span>`).join('')}</div>
          </div>` : ''}

        ${task.subtasks.length ? `
          <div class="detail-section">
            <div class="detail-section-title">${I18n.t('detail.subtasks')} ${stProg ? `(${stProg.done}/${stProg.total})` : ''}</div>
            ${task.subtasks.map(s => `
              <div class="detail-subtask">
                <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="Tasks.toggleSubtask('${task.id}','${s.id}');Render.openDetailPanel('${task.id}')">
                <span class="${s.completed ? 'line-through' : ''}">${Helpers.escapeHtml(s.title)}</span>
              </div>`).join('')}
          </div>` : ''}

        ${task.comments.length ? `
          <div class="detail-section">
            <div class="detail-section-title">${I18n.t('detail.comments')}</div>
            ${task.comments.map(c => {
              const u           = AppState.users.find(u => u.id === c.author);
              const displayName = u ? Helpers.escapeHtml(u.name) : (c.authorName ? Helpers.escapeHtml(c.authorName) : I18n.t('detail.unknown'));
              return `<div class="detail-comment">
                ${Teams.getUserAvatar(u, 'sm')}
                <div class="comment-body-sm">
                  <span class="cmt-author">${displayName}</span>
                  <p>${Helpers.escapeHtml(c.text)}</p>
                  <span class="cmt-time">${Format.date(c.timestamp)}</span>
                </div>
              </div>`;
            }).join('')}
          </div>` : ''}

        <div class="detail-actions">
          <button class="btn btn-primary btn-full" onclick="Components.taskForm(Tasks.getById('${task.id}'))">${I18n.t('detail.edit_task')}</button>
          <button class="btn btn-ghost btn-full" onclick="Tasks.duplicate('${task.id}');Render.refreshView();Components.toast(I18n.t('toast.task_duplicated'),'success')">${I18n.t('detail.duplicate')}</button>
          <button class="btn btn-danger btn-full" onclick="Components.deleteTask('${task.id}')">${I18n.t('detail.delete')}</button>
        </div>

        <div class="detail-footer">
          <span>${I18n.t('detail.created')} ${Format.date(task.createdAt)}</span>
          <span>${I18n.t('detail.updated')} ${Format.date(task.updatedAt)}</span>
        </div>
      </div>`;

    document.getElementById('detail-content').innerHTML = html;
    document.getElementById('detail-panel').classList.remove('hidden');
  },

  closeDetailPanel() {
    document.getElementById('detail-panel').classList.add('hidden');
    document.getElementById('app').classList.remove('detail-open');
    AppState.ui.detailTaskId = null;
  },

  showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    el.classList.remove('hidden');
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => el.classList.add('hidden'), 2500);
  }

};
