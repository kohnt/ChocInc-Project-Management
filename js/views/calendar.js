/* views/calendar.js — monthly / weekly calendar */

const CalendarView = {

  currentDate: new Date(),
  mode: 'month', // 'month' | 'week'

  render() {
    this.mode === 'week' ? this._renderWeek() : this._renderMonth();
  },

  _renderMonth() {
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const tasks = Filters.applyFilters(AppState.tasks);

    const firstDay  = new Date(year, month, 1);
    const monthName = firstDay.toLocaleDateString(I18n.locale, { month: 'long', year: 'numeric' });

    // Grid start = Sunday before month start
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());

    let cells = '';
    const cur = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      const isCurMonth = cur.getMonth() === month;
      const isToday    = cur.toDateString() === new Date().toDateString();
      const dateStr    = Format.isoDate(cur);
      const dayTasks   = tasks.filter(t => t.dueDate === dateStr);

      cells += `
        <div class="cal-cell ${!isCurMonth ? 'other-month' : ''} ${isToday ? 'cal-today' : ''}"
             onclick="CalendarView._showDayPopup('${dateStr}')">
          <span class="cal-date">${cur.getDate()}</span>
          <div class="cal-dots">
            ${dayTasks.slice(0, 3).map(t => {
              const c = CONFIG.STATUSES[t.status]?.color || '#6B7280';
              return `<div class="cal-task-pill" style="background:${c}20;border-left:3px solid ${c}" title="${Helpers.escapeHtml(t.title)}">${Helpers.escapeHtml(t.title)}</div>`;
            }).join('')}
            ${dayTasks.length > 3 ? `<div class="cal-more">+${dayTasks.length - 3} more</div>` : ''}
          </div>
        </div>`;
      cur.setDate(cur.getDate() + 1);
    }

    document.getElementById('view-container').innerHTML = `
      <div class="calendar-wrapper">
        <div class="cal-header">
          <button class="btn btn-ghost" onclick="CalendarView.prev()">${I18n.t('cal.prev')}</button>
          <h2 class="cal-title">${monthName}</h2>
          <button class="btn btn-ghost" onclick="CalendarView.next()">${I18n.t('cal.next')}</button>
          <div class="cal-mode-toggle">
            <button class="btn btn-sm ${this.mode === 'month' ? 'btn-primary' : 'btn-ghost'}" onclick="CalendarView.setMode('month')">${I18n.t('cal.month')}</button>
            <button class="btn btn-sm ${this.mode === 'week'  ? 'btn-primary' : 'btn-ghost'}" onclick="CalendarView.setMode('week')">${I18n.t('cal.week')}</button>
          </div>
        </div>
        <div class="cal-grid">
          <div class="cal-day-headers">
            ${I18n.t('cal.days').split(',').map(d => `<div class="cal-dh">${d}</div>`).join('')}
          </div>
          <div class="cal-cells">${cells}</div>
        </div>
      </div>`;
  },

  _renderWeek() {
    const tasks    = Filters.applyFilters(AppState.tasks);
    const weekStart = new Date(this.currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekLabel = `${Format.shortDate(weekStart)} – ${Format.shortDate(new Date(weekStart.getTime() + 6 * 864e5))}`;

    let cols = '';
    for (let i = 0; i < 7; i++) {
      const d      = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const isToday  = d.toDateString() === new Date().toDateString();
      const dateStr  = Format.isoDate(d);
      const dayTasks = tasks.filter(t => t.dueDate === dateStr);
      const dayName  = d.toLocaleDateString(I18n.locale, { weekday: 'short' });

      cols += `
        <div class="week-col ${isToday ? 'week-today' : ''}">
          <div class="week-col-hdr">${dayName} <span class="week-col-date">${d.getDate()}</span></div>
          ${dayTasks.map(t => {
            const c = CONFIG.STATUSES[t.status]?.color || '#6B7280';
            return `<div class="week-task" style="border-left:3px solid ${c};background:${c}15" onclick="Render.openDetailPanel('${t.id}')">
              <div class="week-task-title">${Helpers.escapeHtml(t.title)}</div>
              ${Components.statusBadge(t.status)}
            </div>`;
          }).join('')}
          <button class="btn btn-ghost btn-sm week-add" onclick="Components.taskForm({dueDate:'${dateStr}',assignedTo:[],labels:[],subtasks:[],comments:[],attachments:[]})">${I18n.t('cal.add')}</button>
        </div>`;
    }

    document.getElementById('view-container').innerHTML = `
      <div class="calendar-wrapper">
        <div class="cal-header">
          <button class="btn btn-ghost" onclick="CalendarView.prev()">${I18n.t('cal.prev')}</button>
          <h2 class="cal-title">${weekLabel}</h2>
          <button class="btn btn-ghost" onclick="CalendarView.next()">${I18n.t('cal.next')}</button>
          <div class="cal-mode-toggle">
            <button class="btn btn-sm ${this.mode === 'month' ? 'btn-primary' : 'btn-ghost'}" onclick="CalendarView.setMode('month')">${I18n.t('cal.month')}</button>
            <button class="btn btn-sm ${this.mode === 'week'  ? 'btn-primary' : 'btn-ghost'}" onclick="CalendarView.setMode('week')">${I18n.t('cal.week')}</button>
          </div>
        </div>
        <div class="week-grid">${cols}</div>
      </div>`;
  },

  _showDayPopup(dateStr) {
    const tasks = Filters.applyFilters(AppState.tasks).filter(t => t.dueDate === dateStr);
    const label = new Date(dateStr + 'T00:00:00').toLocaleDateString(I18n.locale, { weekday: 'long', month: 'long', day: 'numeric' });
    if (!tasks.length) {
      Components.modal(label, `<div class="empty-state" style="padding:24px">
        <p>${I18n.t('cal.no_tasks')}</p>
        <button class="btn btn-primary" onclick="Components.closeModal();Components.taskForm({dueDate:'${dateStr}',assignedTo:[],labels:[],subtasks:[],comments:[],attachments:[]})">${I18n.t('cal.add_task')}</button>
      </div>`);
      return;
    }
    const body = `<div class="day-task-list">
      ${tasks.map(t => `
        <div class="day-task-item" onclick="Components.closeModal();Render.openDetailPanel('${t.id}')">
          ${Components.statusBadge(t.status)}
          ${Components.priorityBadge(t.priority)}
          <span class="day-task-title">${Helpers.escapeHtml(t.title)}</span>
        </div>`).join('')}
    </div>`;
    Components.modal(label, body);
  },

  prev() {
    if (this.mode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    else                       this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.render();
  },

  next() {
    if (this.mode === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    else                       this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.render();
  },

  setMode(m) {
    this.mode = m;
    this.render();
  }

};
