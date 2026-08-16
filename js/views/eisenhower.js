/* views/eisenhower.js — 2×2 Eisenhower Matrix */

const EisenhowerView = {

  _dragTaskId: null,

  _QUADRANTS: [
    {
      id:      'do-first',
      label:   'Do First',
      emoji:   '🟢',
      sub:     'Urgent & Important',
      action:  'Do these right away',
      examples:'Critical deadlines · Emergency fixes · Urgent client issues · Health emergencies',
      accent:  '#059669',
      bg:      'rgba(16,185,129,0.07)',
      hdrBg:   'rgba(16,185,129,0.14)',
      border:  'rgba(16,185,129,0.35)',
    },
    {
      id:      'schedule',
      label:   'Schedule',
      emoji:   '🔵',
      sub:     'Important, Not Urgent',
      action:  'Block time on your calendar',
      examples:'Strategic planning · Skill development · Relationship building · Long-term goals',
      accent:  '#2563EB',
      bg:      'rgba(37,99,235,0.07)',
      hdrBg:   'rgba(37,99,235,0.14)',
      border:  'rgba(37,99,235,0.35)',
    },
    {
      id:      'delegate',
      label:   'Delegate',
      emoji:   '🟡',
      sub:     'Urgent, Not Important',
      action:  'Assign to someone else',
      examples:'Routine replies · Meeting scheduling · Minor logistics · Admin tasks',
      accent:  '#D97706',
      bg:      'rgba(217,119,6,0.07)',
      hdrBg:   'rgba(217,119,6,0.14)',
      border:  'rgba(217,119,6,0.35)',
    },
    {
      id:      'eliminate',
      label:   'Eliminate',
      emoji:   '🔴',
      sub:     'Not Urgent & Not Important',
      action:  'Drop these entirely',
      examples:'Mindless browsing · Unnecessary meetings · Low-value busy work · Distractions',
      accent:  '#DC2626',
      bg:      'rgba(220,38,38,0.07)',
      hdrBg:   'rgba(220,38,38,0.14)',
      border:  'rgba(220,38,38,0.35)',
    },
  ],

  render() {
    const tasks   = Filters.applyFilters(AppState.tasks);
    const grouped = { 'do-first': [], schedule: [], delegate: [], eliminate: [] };
    tasks.forEach(t => { const q = this._quadrant(t); grouped[q].push(t); });

    document.getElementById('view-container').innerHTML = `
      <div class="eis-wrapper">

        <div class="eis-intro">
          <div class="eis-intro-body">
            <span class="eis-intro-icon">⊟</span>
            <div class="eis-intro-copy">
              ${I18n.t('eisenhower.intro')}
              <span class="eis-intro-hint">${I18n.t('eisenhower.drag_hint')}</span>
            </div>
          </div>
          <div class="eis-intro-legend">
            ${this._QUADRANTS.map(q => `
              <span class="eis-leg-chip" style="color:${q.accent};background:${q.hdrBg};border-color:${q.border}">
                ${q.emoji} ${I18n.t('eisenhower.' + q.id.replace(/-/g,'_') + '.label')}
              </span>`).join('')}
          </div>
        </div>

        <div class="eis-top-row">
          <div class="eis-corner"></div>
          <div class="eis-x-axis">
            <span class="eis-ax-edge">${I18n.t('eisenhower.urgent_right')}</span>
            <span class="eis-ax-title">${I18n.t('eisenhower.urgency')}</span>
            <span class="eis-ax-edge">${I18n.t('eisenhower.not_urgent')}</span>
          </div>
        </div>

        <div class="eis-main-row">
          <div class="eis-y-axis">
            <span class="eis-ay-edge">${I18n.t('eisenhower.important_up')}</span>
            <span class="eis-ay-title">${I18n.t('eisenhower.importance')}</span>
            <span class="eis-ay-edge">${I18n.t('eisenhower.not_important')}</span>
          </div>
          <div class="eis-grid">
            ${this._QUADRANTS.map(q => this._renderQuadrant(q, grouped[q.id])).join('')}
          </div>
        </div>

      </div>`;

    this._bindEvents();
  },

  _quadrant(task) {
    const daysLeft    = Helpers.daysUntil(task.dueDate);
    const isUrgent    = daysLeft !== null && daysLeft <= 7;
    const isImportant = task.priority === 'critical' || task.priority === 'high';
    if  (isUrgent  && isImportant)  return 'do-first';
    if  (!isUrgent && isImportant)  return 'schedule';
    if  (isUrgent  && !isImportant) return 'delegate';
    return 'eliminate';
  },

  _renderQuadrant(q, tasks) {
    const emptyHtml = `
      <div class="eis-empty">
        <div class="eis-empty-emoji">${q.emoji}</div>
        <p class="eis-empty-action" style="color:${q.accent}">${I18n.t('eisenhower.' + q.id.replace(/-/g,'_') + '.action')}</p>
        <p class="eis-empty-eg">${I18n.t('eisenhower.' + q.id.replace(/-/g,'_') + '.examples')}</p>
      </div>`;

    return `
      <div class="eis-quadrant" data-quadrant="${q.id}"
           style="background:${q.bg};border:2px solid ${q.border}">
        <div class="eis-q-header" style="background:${q.hdrBg};border-bottom:1px solid ${q.border}">
          <span class="eis-q-emoji">${q.emoji}</span>
          <div class="eis-q-htext">
            <span class="eis-q-label" style="color:${q.accent}">${I18n.t('eisenhower.' + q.id.replace(/-/g,'_') + '.label')}</span>
            <span class="eis-q-sub">${I18n.t('eisenhower.' + q.id.replace(/-/g,'_') + '.sub')}</span>
          </div>
          <span class="eis-q-count" style="background:${q.accent}">${tasks.length}</span>
        </div>
        <div class="eis-q-action-row" style="color:${q.accent};border-bottom:1px solid ${q.border}">
          <span class="eis-q-action-arrow">&#8594;</span> ${I18n.t('eisenhower.' + q.id.replace(/-/g,'_') + '.action')}
        </div>
        <div class="eis-tasks drop-zone" data-quadrant="${q.id}">
          ${tasks.length ? tasks.map(t => this._renderTask(t, q)).join('') : emptyHtml}
        </div>
      </div>`;
  },

  _renderTask(task, q) {
    const overdue   = Helpers.isOverdue(task.dueDate, task.status);
    const daysLeft  = Helpers.daysUntil(task.dueDate);
    const project   = AppState.projects.find(p => p.id === task.projectId);
    const assignees = task.assignedTo.map(id => AppState.users.find(u => u.id === id)).filter(Boolean);
    const dueCls    = overdue ? 'eis-due-overdue' : (daysLeft !== null && daysLeft <= 3 ? 'eis-due-soon' : '');

    return `
      <div class="eis-task" draggable="true" data-task-id="${task.id}"
           style="border-left:3px solid ${q.accent}">
        ${project ? `<div class="eis-proj-tag" style="color:${project.color}">${Helpers.escapeHtml(project.name)}</div>` : ''}
        <div class="eis-task-title ${overdue ? 'text-danger' : ''}">${Helpers.escapeHtml(task.title)}</div>
        <div class="eis-task-footer">
          ${Components.statusBadge(task.status)}
          <span class="eis-footer-spacer"></span>
          ${assignees.length ? `<div class="eis-task-assignees">${assignees.slice(0, 3).map(u => Teams.getUserAvatar(u, 'sm')).join('')}</div>` : ''}
          ${task.dueDate ? `<span class="eis-due ${dueCls}">${Format.relativeDate(task.dueDate)}</span>` : ''}
        </div>
      </div>`;
  },

  _bindEvents() {
    document.querySelectorAll('.eis-task').forEach(el => {
      el.addEventListener('dragstart', e => {
        this._dragTaskId = el.dataset.taskId;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => el.classList.add('dragging'), 0);
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));
      });
      el.addEventListener('click', () => Render.openDetailPanel(el.dataset.taskId));
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (!this._dragTaskId) return;
        const qId = zone.dataset.quadrant;
        const priorityMap = { 'do-first': 'critical', schedule: 'high', delegate: 'medium', eliminate: 'low' };
        Tasks.update(this._dragTaskId, { priority: priorityMap[qId] });
        const qLabel = I18n.t('eisenhower.' + qId.replace(/-/g,'_') + '.label');
        this._dragTaskId = null;
        this.render();
        Components.toast(I18n.t('toast.moved_quadrant', { quadrant: qLabel }), 'success');
      });
    });
  }

};
