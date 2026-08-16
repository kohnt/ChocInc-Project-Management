/* views/gantt.js — SVG Gantt chart */

const GanttView = {

  zoom: 'week', // 'day' | 'week' | 'month'

  render() {
    const tasks    = Helpers.sortTasks(Filters.applyFilters(AppState.tasks), 'startDate');
    const projects = AppState.projects;

    // Build rows: project header + its tasks
    const rows = [];
    projects.forEach(proj => {
      const pTasks = tasks.filter(t => t.projectId === proj.id);
      if (!pTasks.length) return;
      rows.push({ type: 'project', project: proj });
      pTasks.forEach(t => rows.push({ type: 'task', task: t, project: proj }));
    });
    // Unassigned tasks
    const unassigned = tasks.filter(t => !projects.find(p => p.id === t.projectId));
    if (unassigned.length) {
      rows.push({ type: 'project', project: { id: null, name: I18n.t('gantt.unassigned'), color: '#9CA3AF' } });
      unassigned.forEach(t => rows.push({ type: 'task', task: t, project: null }));
    }

    if (!rows.length) {
      document.getElementById('view-container').innerHTML = `<div class="empty-state"><p>${I18n.t('gantt.no_tasks')}</p><button class="btn btn-primary" onclick="Components.taskForm(null)">${I18n.t('gantt.create_task')}</button></div>`;
      return;
    }

    // Date range
    const dated = tasks.filter(t => t.startDate || t.dueDate);
    let minDate = dated.length ? new Date(Math.min(...dated.map(t => new Date(t.startDate || t.dueDate)))) : new Date();
    let maxDate = dated.length ? new Date(Math.max(...dated.map(t => new Date(t.dueDate    || t.startDate)))) : new Date();
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const totalDays = Math.ceil((maxDate - minDate) / 864e5);
    const dayW      = this.zoom === 'day' ? 40 : this.zoom === 'week' ? 20 : 8;
    const totalW    = totalDays * dayW;
    const rowH      = 38;
    const hdrH      = 56;
    const leftW     = 240;
    const svgH      = rows.length * rowH + hdrH;

    document.getElementById('view-container').innerHTML = `
      <div class="gantt-wrapper">
        <div class="gantt-toolbar">
          <span class="gantt-zoom-label">${I18n.t('gantt.zoom')}</span>
          ${['day','week','month'].map(z => `<button class="btn btn-sm ${this.zoom === z ? 'btn-primary' : 'btn-ghost'}" onclick="GanttView.setZoom('${z}')">${I18n.t('gantt.' + z)}</button>`).join('')}
        </div>
        <div class="gantt-scroll">
          <div class="gantt-inner">
            <div class="gantt-left" style="width:${leftW}px;min-width:${leftW}px">
              ${this._leftPanel(rows, rowH, hdrH)}
            </div>
            <div class="gantt-right">
              <svg width="${totalW}" height="${svgH}" class="gantt-svg">
                ${this._buildSVG(rows, minDate, totalDays, dayW, rowH, hdrH, totalW, svgH)}
              </svg>
            </div>
          </div>
        </div>
      </div>`;
  },

  _leftPanel(rows, rowH, hdrH) {
    let html = `<div class="gantt-lhdr" style="height:${hdrH}px">${I18n.t('gantt.task_project')}</div>`;
    rows.forEach(row => {
      if (row.type === 'project') {
        html += `<div class="gantt-proj-row" style="height:${rowH}px">
          <span class="gantt-proj-dot" style="background:${row.project.color}"></span>
          <strong>${Helpers.escapeHtml(row.project.name)}</strong>
        </div>`;
      } else {
        html += `<div class="gantt-task-row" style="height:${rowH}px" onclick="Render.openDetailPanel('${row.task.id}')" title="${Helpers.escapeHtml(row.task.title)}">
          <span class="gantt-task-name">${Helpers.escapeHtml(row.task.title)}</span>
        </div>`;
      }
    });
    return html;
  },

  _buildSVG(rows, minDate, totalDays, dayW, rowH, hdrH, totalW, totalH) {
    let s = '';

    // Header background
    s += `<rect x="0" y="0" width="${totalW}" height="${hdrH}" fill="#F9FAFB"/>`;

    // Date columns + labels
    const cur = new Date(minDate);
    let lastMonth = -1;
    for (let i = 0; i < totalDays; i++) {
      const x = i * dayW;
      // Month boundary
      if (cur.getMonth() !== lastMonth) {
        lastMonth = cur.getMonth();
        const ml = cur.toLocaleDateString(I18n.locale, { month: 'short', year: 'numeric' });
        s += `<text x="${x+3}" y="18" font-size="11" font-weight="600" fill="#374151">${ml}</text>`;
        s += `<line x1="${x}" y1="0" x2="${x}" y2="${totalH}" stroke="#E5E7EB" stroke-width="1"/>`;
      }
      // Day label
      if (this.zoom === 'day' || (this.zoom === 'week' && cur.getDay() === 1)) {
        s += `<text x="${x+2}" y="40" font-size="10" fill="#6B7280">${cur.getDate()}</text>`;
      }
      // Weekend shading
      if ((cur.getDay() === 0 || cur.getDay() === 6) && this.zoom !== 'month') {
        s += `<rect x="${x}" y="${hdrH}" width="${dayW}" height="${totalH - hdrH}" fill="#F3F4F6" opacity="0.6"/>`;
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Header bottom line
    s += `<line x1="0" y1="${hdrH}" x2="${totalW}" y2="${hdrH}" stroke="#D1D5DB" stroke-width="1"/>`;

    // Row lines
    for (let i = 0; i <= rows.length; i++) {
      const y = hdrH + i * rowH;
      s += `<line x1="0" y1="${y}" x2="${totalW}" y2="${y}" stroke="#F3F4F6" stroke-width="1"/>`;
    }

    // Today line
    const todayOff = Math.ceil((new Date() - minDate) / 864e5) * dayW;
    if (todayOff >= 0 && todayOff <= totalW) {
      s += `<line x1="${todayOff}" y1="0" x2="${todayOff}" y2="${totalH}" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,3"/>`;
      s += `<text x="${todayOff+2}" y="12" font-size="9" fill="#EF4444" font-weight="600">${I18n.t('gantt.today')}</text>`;
    }

    // Task bars
    rows.forEach((row, i) => {
      const y = hdrH + i * rowH;
      if (row.type === 'project') {
        s += `<rect x="0" y="${y}" width="${totalW}" height="${rowH}" fill="${row.project.color}10"/>`;
        return;
      }
      const t = row.task;
      if (!t.startDate && !t.dueDate) return;
      const startD  = new Date(t.startDate || t.dueDate);
      const endD    = new Date(t.dueDate   || t.startDate);
      const startX  = Math.round((startD - minDate) / 864e5) * dayW;
      const endX    = Math.round((endD   - minDate) / 864e5) * dayW + dayW;
      const barW    = Math.max(endX - startX, dayW);
      const barY    = y + 7;
      const barH    = rowH - 14;
      const color   = CONFIG.STATUSES[t.status]?.color || '#6B7280';
      const projCol = row.project?.color || '#6B7280';

      s += `<rect x="${startX}" y="${barY}" width="${barW}" height="${barH}" rx="4" fill="${color}" opacity="0.82" style="cursor:pointer" onclick="Render.openDetailPanel('${t.id}')"/>`;

      // Progress overlay
      if (t.completionPercentage > 0) {
        const fillW = Math.round(barW * t.completionPercentage / 100);
        s += `<rect x="${startX}" y="${barY + barH - 4}" width="${fillW}" height="4" rx="2" fill="white" opacity="0.5"/>`;
      }

      // Label
      if (barW > 50) {
        const label = t.title.length > 20 ? t.title.slice(0, 19) + '…' : t.title;
        s += `<text x="${startX + 6}" y="${barY + barH/2 + 4}" font-size="11" fill="white" font-weight="500" pointer-events="none">${Helpers.escapeHtml(label)}</text>`;
      }
    });

    return s;
  },

  setZoom(z) {
    this.zoom = z;
    this.render();
  }

};
