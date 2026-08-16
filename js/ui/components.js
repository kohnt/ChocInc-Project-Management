/* ui/components.js — reusable UI blocks: modals, toasts, forms, badges */

const Components = {

  /* ── Toast notifications ─────────────────────────────── */
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const id = generateId('toast');
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = id;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-msg">${Helpers.escapeHtml(message)}</span><button class="toast-close" onclick="Components.dismissToast('${id}')">✕</button>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    if (duration) setTimeout(() => Components.dismissToast(id), duration);
  },

  dismissToast(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  },

  /* ── Modal system ────────────────────────────────────── */
  modal(title, bodyHtml, options = {}) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
    if (options.onOpen) options.onOpen();
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
  },

  handleOverlayClick(e) {
    if (e.target.id === 'modal-overlay') Components.closeModal();
  },

  /* ── Confirm dialog ──────────────────────────────────── */
  confirm(message, onConfirm, onCancel) {
    const body = `
      <div class="confirm-body">
        <p>${Helpers.escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="Components.closeModal()">${I18n.t('btn.cancel')}</button>
          <button class="btn btn-danger" id="confirm-ok-btn">${I18n.t('btn.confirm')}</button>
        </div>
      </div>`;
    Components.modal(I18n.t('modal.confirm'), body);
    document.getElementById('confirm-ok-btn').onclick = () => {
      Components.closeModal();
      if (onConfirm) onConfirm();
    };
  },

  /* ── Task create / edit form ─────────────────────────── */
  taskForm(task = null) {
    const isEdit = !!task;
    const projects = AppState.projects;
    const users    = AppState.users;

    const projectOpts = projects.map(p =>
      `<option value="${p.id}" ${task && task.projectId === p.id ? 'selected' : ''}>${Helpers.escapeHtml(p.name)}</option>`
    ).join('');

    const userOpts = users.map(u =>
      `<option value="${u.id}" ${task && task.assignedTo.includes(u.id) ? 'selected' : ''}>${Helpers.escapeHtml(u.name)}${u.role ? ` (${Helpers.escapeHtml(u.role)})` : ''}</option>`
    ).join('');

    const statusOpts = Object.entries(CONFIG.STATUSES).map(([k]) =>
      `<option value="${k}" ${task && task.status === k ? 'selected' : ''}>${I18n.translateStatus(k)}</option>`
    ).join('');

    const priorityOpts = Object.entries(CONFIG.PRIORITIES).map(([k]) =>
      `<option value="${k}" ${task && task.priority === k ? 'selected' : ''}>${I18n.translatePriority(k)}</option>`
    ).join('');

    const subtaskHtml = (task && task.subtasks.length)
      ? task.subtasks.map(s => `
          <div class="subtask-item" data-id="${s.id}">
            <input type="checkbox" class="subtask-cb" ${s.completed ? 'checked' : ''} onchange="Components._toggleSubtaskCb(this)">
            <input type="text" class="subtask-title-input" value="${Helpers.escapeHtml(s.title)}">
            <button class="icon-btn danger-hover" onclick="this.closest('.subtask-item').remove()">✕</button>
          </div>`).join('')
      : '';

    const commentHtml = (task && task.comments.length)
      ? task.comments.map(c => {
          const u           = AppState.users.find(u => u.id === c.author);
          const displayName = u ? Helpers.escapeHtml(u.name) : (c.authorName ? Helpers.escapeHtml(c.authorName) : I18n.t('detail.unknown'));
          return `<div class="comment-item">
            ${Teams.getUserAvatar(u, 'sm')}
            <div class="comment-body">
              <strong>${displayName}</strong>
              <span class="comment-time">${Format.date(c.timestamp)}</span>
              <p>${Helpers.escapeHtml(c.text)}</p>
            </div>
          </div>`;
        }).join('')
      : '';

    const body = `
      <form id="task-form" class="task-form" onsubmit="Components.submitTaskForm(event, ${isEdit ? `'${task.id}'` : 'null'})">
        <div class="form-row">
          <div class="form-group full">
            <label>${I18n.t('task.title_label')}</label>
            <input type="text" name="title" class="form-input" required placeholder="${I18n.t('task.title_ph')}" value="${isEdit ? Helpers.escapeHtml(task.title) : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full">
            <label>${I18n.t('task.description')}</label>
            <textarea name="description" class="form-input" rows="3" placeholder="${I18n.t('task.desc_ph')}">${isEdit ? Helpers.escapeHtml(task.description) : ''}</textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('task.project')}</label>
            <select name="projectId" class="form-input">${projectOpts}</select>
          </div>
          <div class="form-group">
            <label>${I18n.t('task.status')}</label>
            <select name="status" class="form-input">${statusOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('task.priority')}</label>
            <select name="priority" class="form-input">${priorityOpts}</select>
          </div>
          <div class="form-group">
            <label>${I18n.t('task.assigned_to')}</label>
            <select name="assignedTo" class="form-input" multiple size="3">${userOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('task.start_date')}</label>
            <input type="date" name="startDate" class="form-input" value="${isEdit && task.startDate ? task.startDate : ''}">
          </div>
          <div class="form-group">
            <label>${I18n.t('task.due_date')}</label>
            <input type="date" name="dueDate" class="form-input" value="${isEdit && task.dueDate ? task.dueDate : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('task.est_hours')}</label>
            <input type="number" name="estimatedHours" class="form-input" min="0" step="0.5" value="${isEdit && task.estimatedHours ? task.estimatedHours : ''}">
          </div>
          <div class="form-group">
            <label>${I18n.t('task.labels')}</label>
            <input type="text" name="labels" class="form-input" placeholder="${I18n.t('task.labels_ph')}" value="${isEdit ? task.labels.join(', ') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('task.recurring')}</label>
            <select name="recurring" class="form-input">
              <option value="" ${!task || !task.recurring ? 'selected' : ''}>${I18n.t('task.recurring_none')}</option>
              <option value="daily"   ${isEdit && task.recurring === 'daily'   ? 'selected' : ''}>${I18n.t('task.recurring_daily')}</option>
              <option value="weekly"  ${isEdit && task.recurring === 'weekly'  ? 'selected' : ''}>${I18n.t('task.recurring_weekly')}</option>
              <option value="monthly" ${isEdit && task.recurring === 'monthly' ? 'selected' : ''}>${I18n.t('task.recurring_monthly')}</option>
              <option value="6months" ${isEdit && task.recurring === '6months' ? 'selected' : ''}>${I18n.t('task.recurring_6months')}</option>
              <option value="yearly"  ${isEdit && task.recurring === 'yearly'  ? 'selected' : ''}>${I18n.t('task.recurring_yearly')}</option>
            </select>
            <p class="form-hint">${I18n.t('task.recurring_hint')}</p>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-header">
            <label>${I18n.t('task.subtasks')}</label>
            <button type="button" class="btn btn-ghost btn-sm" onclick="Components._addSubtaskRow()">${I18n.t('btn.add')}</button>
          </div>
          <div id="subtasks-list">${subtaskHtml}</div>
        </div>

        ${isEdit ? `
        <div class="form-section">
          <label>${I18n.t('task.comments')}</label>
          <div class="comments-list">${commentHtml}</div>
          <div class="comment-input-row">
            <input type="text" id="new-comment-input" class="form-input" placeholder="${I18n.t('task.comment_ph')}">
            <button type="button" class="btn btn-ghost btn-sm" onclick="Components._submitComment('${task.id}')">${I18n.t('btn.post')}</button>
          </div>
        </div>` : ''}

        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn btn-danger" onclick="Components.deleteTask('${task.id}')">${I18n.t('btn.delete')}</button>` : ''}
          <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">${I18n.t('btn.cancel')}</button>
          <button type="submit" class="btn btn-primary">${isEdit ? I18n.t('btn.save_changes') : I18n.t('btn.create_task')}</button>
        </div>
      </form>`;

    Components.modal(isEdit ? I18n.t('modal.edit_task') : I18n.t('modal.new_task'), body);
  },

  submitTaskForm(e, taskId) {
    e.preventDefault();
    const form = e.target;
    const fd   = new FormData(form);

    const subtasks = [...document.querySelectorAll('#subtasks-list .subtask-item')].map(el => ({
      id:        el.dataset.id || generateId('st'),
      title:     el.querySelector('.subtask-title-input').value.trim(),
      completed: el.querySelector('.subtask-cb').checked
    })).filter(s => s.title);

    const assignedTo = [...form.querySelector('[name="assignedTo"]').selectedOptions].map(o => o.value);
    const labels     = (fd.get('labels') || '').split(',').map(s => s.trim()).filter(Boolean);

    const data = {
      projectId:      fd.get('projectId'),
      title:          fd.get('title'),
      description:    fd.get('description'),
      status:         fd.get('status'),
      priority:       fd.get('priority'),
      assignedTo,
      startDate:      fd.get('startDate') || null,
      dueDate:        fd.get('dueDate')   || null,
      estimatedHours: fd.get('estimatedHours') ? Number(fd.get('estimatedHours')) : null,
      labels,
      recurring:      fd.get('recurring') || null,
      subtasks
    };

    if (taskId) {
      Tasks.update(taskId, data);
      Components.toast(I18n.t('toast.task_updated'), 'success');
    } else {
      Tasks.create(data);
      Components.toast(I18n.t('toast.task_created'), 'success');
    }

    Components.closeModal();
    Render.refreshView();
    Render.renderSidebar();
  },

  deleteTask(taskId) {
    Components.confirm(I18n.t('confirm.delete_task'), () => {
      Tasks.delete(taskId);
      Components.closeModal();
      if (!document.getElementById('detail-panel').classList.contains('hidden')) {
        Render.closeDetailPanel();
      }
      Render.refreshView();
      Components.toast(I18n.t('toast.task_deleted'), 'info');
    });
  },

  _addSubtaskRow() {
    const list = document.getElementById('subtasks-list');
    const div  = document.createElement('div');
    div.className = 'subtask-item';
    div.dataset.id = generateId('st');
    div.innerHTML  = `
      <input type="checkbox" class="subtask-cb">
      <input type="text" class="subtask-title-input" placeholder="${I18n.t('task.subtask_ph')}">
      <button class="icon-btn danger-hover" type="button" onclick="this.closest('.subtask-item').remove()">✕</button>`;
    list.appendChild(div);
    div.querySelector('.subtask-title-input').focus();
  },

  _toggleSubtaskCb(cb) {
    const item = cb.closest('.subtask-item');
    item.querySelector('.subtask-title-input').style.textDecoration = cb.checked ? 'line-through' : '';
  },

  _submitComment(taskId) {
    const input   = document.getElementById('new-comment-input');
    const text    = (input.value || '').trim();
    if (!text) return;
    const profile = AppState.settings.profile || {};
    if (!profile.name) {
      Components.toast(I18n.t('toast.comment_no_profile'), 'warning');
      return;
    }
    const matched = AppState.users.find(u => u.name.toLowerCase() === profile.name.toLowerCase());
    Tasks.addComment(taskId, text, matched ? matched.id : null, profile.name);
    input.value = '';
    Components.toast(I18n.t('toast.comment_added'), 'success');
    Render.openDetailPanel(taskId);
  },

  /* ── Project form ────────────────────────────────────── */
  projectForm(project = null) {
    const isEdit   = !!project;
    const teamOpts = AppState.teams.map(t =>
      `<option value="${t.id}" ${project && project.teamId === t.id ? 'selected' : ''}>${Helpers.escapeHtml(t.name)}</option>`
    ).join('');
    const userOpts = AppState.users.map(u =>
      `<option value="${u.id}" ${project && project.owner === u.id ? 'selected' : ''}>${Helpers.escapeHtml(u.name)}</option>`
    ).join('');
    const colorDots = CONFIG.PROJECT_COLORS.map(c =>
      `<span class="color-dot ${project && project.color === c ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="Components._selectColor(this)"></span>`
    ).join('');

    const body = `
      <form id="project-form" onsubmit="Components.submitProjectForm(event, ${isEdit ? `'${project.id}'` : 'null'})">
        <input type="hidden" id="project-color-val" name="color" value="${isEdit ? project.color : CONFIG.PROJECT_COLORS[0]}">
        <div class="form-group full">
          <label>${I18n.t('project.name_label')}</label>
          <input type="text" name="name" class="form-input" required value="${isEdit ? Helpers.escapeHtml(project.name) : ''}">
        </div>
        <div class="form-group full">
          <label>${I18n.t('project.description')}</label>
          <textarea name="description" class="form-input" rows="2">${isEdit ? Helpers.escapeHtml(project.description) : ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('project.team')}</label>
            <select name="teamId" class="form-input"><option value="">${I18n.t('project.none')}</option>${teamOpts}</select>
          </div>
          <div class="form-group">
            <label>${I18n.t('project.owner')}</label>
            <select name="owner" class="form-input"><option value="">${I18n.t('project.none')}</option>${userOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${I18n.t('project.start_date')}</label>
            <input type="date" name="startDate" class="form-input" value="${isEdit && project.startDate ? project.startDate : ''}">
          </div>
          <div class="form-group">
            <label>${I18n.t('project.end_date')}</label>
            <input type="date" name="endDate" class="form-input" value="${isEdit && project.endDate ? project.endDate : ''}">
          </div>
        </div>
        <div class="form-group full">
          <label>${I18n.t('project.color')}</label>
          <div class="color-picker">${colorDots}</div>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn btn-danger" onclick="Components.deleteProject('${project.id}')">${I18n.t('btn.delete')}</button>` : ''}
          <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">${I18n.t('btn.cancel')}</button>
          <button type="submit" class="btn btn-primary">${isEdit ? I18n.t('btn.save') : I18n.t('btn.create_project')}</button>
        </div>
      </form>`;

    Components.modal(isEdit ? I18n.t('modal.edit_project') : I18n.t('modal.new_project'), body);
  },

  submitProjectForm(e, projectId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name:        fd.get('name'),
      description: fd.get('description'),
      teamId:      fd.get('teamId')  || null,
      owner:       fd.get('owner')   || null,
      startDate:   fd.get('startDate') || null,
      endDate:     fd.get('endDate')   || null,
      color:       fd.get('color')
    };
    if (projectId) {
      Projects.update(projectId, data);
      Components.toast(I18n.t('toast.project_updated'), 'success');
    } else {
      Projects.create(data);
      Components.toast(I18n.t('toast.project_created'), 'success');
    }
    Components.closeModal();
    Render.refreshAll();
  },

  deleteProject(projectId) {
    const taskCount = AppState.tasks.filter(t => t.projectId === projectId).length;
    Components.confirm(
      I18n.t('confirm.delete_project', { count: taskCount }),
      () => {
        Projects.delete(projectId);
        Components.closeModal();
        Render.refreshAll();
        Components.toast(I18n.t('toast.project_deleted'), 'info');
      }
    );
  },

  _selectColor(el) {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('project-color-val').value = el.dataset.color;
  },

  /* ── Team member form ───────────────────────────────── */
  memberForm(user = null) {
    const isEdit   = !!user;
    const colorDots = CONFIG.PROJECT_COLORS.map(c =>
      `<span class="color-dot ${user && user.color === c ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="Components._selectMemberColor(this)"></span>`
    ).join('');

    const body = `
      <form id="member-form" onsubmit="Components.submitMemberForm(event, ${isEdit ? `'${user.id}'` : 'null'})">
        <input type="hidden" id="member-color-val" name="color" value="${isEdit ? user.color : CONFIG.PROJECT_COLORS[0]}">
        <input type="hidden" id="member-avatar-val" name="avatar" value="${isEdit && user.avatar ? user.avatar : ''}">
        <div class="form-group full" style="display:flex;align-items:center;gap:16px;margin-bottom:4px">
          <div class="avatar-upload-circle" onclick="document.getElementById('member-avatar-input').click()" title="${I18n.t('member.click_photo')}">
            <div class="avatar avatar-lg" id="member-avatar-preview" style="background:${isEdit ? user.color : CONFIG.PROJECT_COLORS[0]}">
              ${isEdit && user.avatar ? `<img src="${user.avatar}" class="avatar-img-fill">` : (isEdit ? Format.initials(user.name) : '?')}
            </div>
            <div class="avatar-upload-overlay">📷</div>
          </div>
          <input type="file" id="member-avatar-input" accept="image/*" style="display:none" onchange="Components._handleMemberAvatarUpload(this)">
          <div>
            <div style="font-weight:600;font-size:0.87rem;color:var(--text-2)">${isEdit ? Helpers.escapeHtml(user.name) : I18n.t('member.new_member')}</div>
            <div style="font-size:0.78rem;color:var(--text-3);margin-top:2px">${I18n.t('member.click_photo')}</div>
          </div>
        </div>
        <div class="form-group full">
          <label>${I18n.t('member.name_label')}</label>
          <input type="text" name="name" class="form-input" required value="${isEdit ? Helpers.escapeHtml(user.name) : ''}">
        </div>
        <div class="form-group full">
          <label>${I18n.t('member.email')}</label>
          <input type="email" name="email" class="form-input" value="${isEdit ? Helpers.escapeHtml(user.email) : ''}">
        </div>
        <div class="form-group full">
          <label>${I18n.t('member.role')}</label>
          <input type="text" name="role" class="form-input" placeholder="${I18n.t('member.role_ph')}" value="${isEdit ? Helpers.escapeHtml(user.role) : ''}">
        </div>
        <div class="form-group full">
          <label>${I18n.t('member.avatar_color')}</label>
          <div class="color-picker">${colorDots}</div>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn btn-danger" onclick="Components.deleteMember('${user.id}')">${I18n.t('btn.remove')}</button>` : ''}
          <button type="button" class="btn btn-ghost" onclick="Components.closeModal()">${I18n.t('btn.cancel')}</button>
          <button type="submit" class="btn btn-primary">${isEdit ? I18n.t('btn.save') : I18n.t('btn.add_member')}</button>
        </div>
      </form>`;
    Components.modal(isEdit ? I18n.t('modal.edit_member') : I18n.t('modal.add_member'), body);
  },

  submitMemberForm(e, userId) {
    e.preventDefault();
    const fd        = new FormData(e.target);
    const avatarVal = fd.get('avatar') || '';
    const data      = { name: fd.get('name'), email: fd.get('email'), role: fd.get('role'), color: fd.get('color') };
    if (avatarVal) data.avatar = avatarVal;
    if (userId) {
      Teams.updateUser(userId, data);
      Components.toast(I18n.t('toast.member_updated'), 'success');
    } else {
      Teams.createUser(data);
      Components.toast(I18n.t('toast.member_added'), 'success');
    }
    Components.closeModal();
    Render.renderSidebar();
  },

  deleteMember(userId) {
    Components.confirm(I18n.t('confirm.remove_member'), () => {
      Teams.deleteUser(userId);
      Components.closeModal();
      Render.renderSidebar();
      Components.toast(I18n.t('toast.member_removed'), 'info');
    });
  },

  _selectMemberColor(el) {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('member-color-val').value = el.dataset.color;
  },

  /* ── Settings modal ─────────────────────────────────── */
  settingsModal() {
    const s       = AppState.settings;
    const profile = s.profile || {};
    const initials = profile.name ? Format.initials(profile.name) : '?';
    const curLang  = s.language || 'en';

    const body = `
      <div class="settings-form">

        <div class="settings-section">
          <h3>${I18n.t('settings.my_profile')}</h3>
          <p class="settings-note">${I18n.t('settings.profile_note')}</p>
          <div class="profile-preview-row">
            <div class="avatar-upload-circle" onclick="document.getElementById('profile-avatar-input').click()" title="${I18n.t('member.click_photo')}">
              <div class="avatar avatar-lg profile-preview-av" id="profile-preview-av" style="background:#4A90E2">
                ${profile.avatar ? `<img src="${profile.avatar}" class="avatar-img-fill">` : initials}
              </div>
              <div class="avatar-upload-overlay">📷</div>
            </div>
            <input type="file" id="profile-avatar-input" accept="image/*" style="display:none" onchange="Components._handleProfileAvatarUpload(this)">
            <div class="profile-preview-info">
              <div class="profile-preview-name" id="profile-preview-name">${profile.name ? Helpers.escapeHtml(profile.name) : I18n.t('settings.no_name')}</div>
              <div class="profile-preview-desg" id="profile-preview-desg">${profile.designation ? Helpers.escapeHtml(profile.designation) : I18n.t('settings.add_name')}</div>
            </div>
          </div>
          <div class="form-row" style="margin-top:14px">
            <div class="form-group">
              <label>${I18n.t('settings.your_name')}</label>
              <input type="text" id="profile-name-inp" class="form-input" placeholder="${I18n.t('settings.name_ph')}"
                value="${Helpers.escapeHtml(profile.name || '')}"
                oninput="Components._liveProfilePreview()">
            </div>
            <div class="form-group">
              <label>${I18n.t('settings.designation')}</label>
              <input type="text" id="profile-desg-inp" class="form-input" placeholder="${I18n.t('settings.designation_ph')}"
                value="${Helpers.escapeHtml(profile.designation || '')}"
                oninput="Components._liveProfilePreview()">
            </div>
          </div>
          <div class="modal-actions" style="margin-top:0">
            <button class="btn btn-primary btn-sm" onclick="Components.saveProfile()">${I18n.t('btn.save_profile')}</button>
          </div>
        </div>

        <div class="settings-section">
          <h3>${I18n.t('settings.general')}</h3>
          <label class="toggle-row">
            <span>${I18n.t('settings.theme')}</span>
            <select id="setting-theme" class="form-input" onchange="App.setSetting('theme', this.value)">
              <option value="light" ${s.theme !== 'dark' ? 'selected' : ''}>${I18n.t('settings.theme_light')}</option>
              <option value="dark"  ${s.theme === 'dark'  ? 'selected' : ''}>${I18n.t('settings.theme_dark')}</option>
            </select>
          </label>
          <label class="toggle-row">
            <span>${I18n.t('settings.autosave')}</span>
            <input type="checkbox" id="setting-autosave" ${s.autoSave ? 'checked' : ''} onchange="App.setSetting('autoSave', this.checked)">
          </label>
          <label class="toggle-row">
            <span>${I18n.t('settings.default_view')}</span>
            <select id="setting-defaultview" class="form-input" onchange="App.setSetting('defaultView', this.value)">
              ${Object.keys(CONFIG.VIEWS).map(k => `<option value="${k}" ${s.defaultView === k ? 'selected' : ''}>${I18n.t('view.' + k)}</option>`).join('')}
            </select>
          </label>
          <label class="toggle-row">
            <span>${I18n.t('settings.language')}</span>
            <select id="setting-language" class="form-input" onchange="I18n.setLanguage(this.value)">
              <option value="en" ${curLang === 'en' ? 'selected' : ''}>English</option>
              <option value="fr" ${curLang === 'fr' ? 'selected' : ''}>Français</option>
              <option value="es" ${curLang === 'es' ? 'selected' : ''}>Español</option>
              <option value="de" ${curLang === 'de' ? 'selected' : ''}>Deutsch</option>
            </select>
          </label>
          <p class="settings-note" style="margin-top:8px">&#9432; ${I18n.t('settings.save_note')}</p>
        </div>

        <div class="settings-section">
          <h3>${I18n.t('settings.report_bug')}</h3>
          <p class="settings-note">${I18n.t('settings.report_bug_desc')}</p>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLScmrpIDhQIQmS7ZqZQdctcBr4JRG0MVhxFtRoOXq2_ni1PVPQ/viewform?usp=header"
             target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="display:inline-block;margin-top:4px">
            ${I18n.t('settings.report_bug_btn')}
          </a>
        </div>

        <div class="settings-section danger-zone">
          <h3>${I18n.t('settings.danger_zone')}</h3>
          <button class="btn btn-danger" onclick="Components.confirmClearAll()">${I18n.t('settings.clear_all')}</button>
        </div>
      </div>`;
    Components.modal(I18n.t('modal.settings'), body);
  },

  saveProfile() {
    const name = (document.getElementById('profile-name-inp').value || '').trim();
    const desg = (document.getElementById('profile-desg-inp').value || '').trim();
    if (!name) { Components.toast(I18n.t('toast.enter_name'), 'warning'); return; }
    if (!AppState.settings.profile) AppState.settings.profile = {};
    AppState.settings.profile.name        = name;
    AppState.settings.profile.designation = desg;
    if (Components._pendingProfileAvatar) {
      AppState.settings.profile.avatar = Components._pendingProfileAvatar;
      Components._pendingProfileAvatar  = null;
    }
    App.scheduleSave();
    Render.renderSidebar();
    Components.toast(I18n.t('toast.profile_saved'), 'success');
  },

  _liveProfilePreview() {
    const name = (document.getElementById('profile-name-inp').value || '').trim();
    const desg = (document.getElementById('profile-desg-inp').value || '').trim();
    const av   = document.getElementById('profile-preview-av');
    const nm   = document.getElementById('profile-preview-name');
    const dg   = document.getElementById('profile-preview-desg');
    if (av && !Components._pendingProfileAvatar && !av.querySelector('img')) {
      av.textContent = name ? Format.initials(name) : '?';
    }
    if (nm) nm.textContent = name || I18n.t('settings.no_name');
    if (dg) dg.textContent = desg || I18n.t('settings.add_name');
  },

  _pendingProfileAvatar: null,

  _resizeImage(file, maxSize, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const scale  = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  _handleProfileAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    Components._resizeImage(file, 200, function(dataUrl) {
      Components._pendingProfileAvatar = dataUrl;
      const av = document.getElementById('profile-preview-av');
      if (av) av.innerHTML = `<img src="${dataUrl}" class="avatar-img-fill">`;
    });
    input.value = '';
  },

  _handleMemberAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    Components._resizeImage(file, 200, function(dataUrl) {
      const hidden = document.getElementById('member-avatar-val');
      if (hidden) hidden.value = dataUrl;
      const av = document.getElementById('member-avatar-preview');
      if (av) av.innerHTML = `<img src="${dataUrl}" class="avatar-img-fill">`;
    });
    input.value = '';
  },

  confirmClearAll() {
    Components.confirm(I18n.t('confirm.clear_all'), async () => {
      await DB.clearAll();
      AppState.projects = [];
      AppState.tasks    = [];
      AppState.teams    = [];
      AppState.users    = [];
      Components.closeModal();
      Render.refreshAll();
      Components.toast(I18n.t('toast.all_cleared'), 'info');
    });
  },

  /* ── Badges & atoms ─────────────────────────────────── */
  statusBadge(status) {
    const cfg = CONFIG.STATUSES[status] || { color: '#6B7280', bg: '#F3F4F6' };
    const label = I18n.translateStatus(status) || cfg.label || status;
    return `<span class="badge" style="color:${cfg.color};background:${cfg.bg}">${label}</span>`;
  },

  priorityBadge(priority) {
    const cfg = CONFIG.PRIORITIES[priority] || { color: '#6B7280', bg: '#F3F4F6' };
    const label = I18n.translatePriority(priority) || cfg.label || priority;
    return `<span class="badge" style="color:${cfg.color};background:${cfg.bg}">${label}</span>`;
  },

  progressRing(pct, size = 36) {
    const r = (size - 4) / 2;
    const circ = 2 * Math.PI * r;
    const fill = circ - (pct / 100) * circ;
    return `<svg width="${size}" height="${size}" class="progress-ring">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#E5E7EB" stroke-width="3"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#3B82F6" stroke-width="3"
              stroke-dasharray="${circ}" stroke-dashoffset="${fill}"
              transform="rotate(-90 ${size/2} ${size/2})"/>
      <text x="50%" y="54%" text-anchor="middle" font-size="${size < 32 ? 9 : 10}" fill="#374151">${pct}%</text>
    </svg>`;
  }

};
