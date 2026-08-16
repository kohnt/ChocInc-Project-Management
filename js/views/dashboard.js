/* views/dashboard.js — analytics dashboard with SVG charts */

const DashboardView = {

  render() {
    const tasks    = Filters.applyFilters(AppState.tasks);
    const projects = AppState.projects;
    const users    = AppState.users;
    const now      = new Date();

    const done     = tasks.filter(t => t.status === 'done');
    const open     = tasks.filter(t => t.status !== 'done');
    const overdue  = tasks.filter(t => Helpers.isOverdue(t.dueDate, t.status));
    const thisWeek = tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const e = new Date(now); e.setDate(e.getDate() + 7);
      return d >= now && d <= e;
    });
    const compPct = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

    document.getElementById('view-container').innerHTML = `
      <div class="dash-wrapper">
        <div id="dash-tooltip" class="dash-tooltip hidden"></div>

        <div class="kpi-grid">
          ${this._kpi('📁', 'all',      I18n.t('dash.projects'),      projects.length,  '#4A90E2')}
          ${this._kpi('📋', 'open',     I18n.t('dash.open_tasks'),    open.length,      '#F59E0B')}
          ${this._kpi('✅', 'done',     I18n.t('dash.complete'),      compPct + '%',    '#10B981')}
          ${this._kpi('⚠️', 'overdue',  I18n.t('dash.overdue'),       overdue.length,   '#EF4444')}
          ${this._kpi('📅', 'thisWeek', I18n.t('dash.due_this_week'), thisWeek.length,  '#8B5CF6')}
          ${this._kpi('👥', 'team',     I18n.t('dash.team_members'),  users.length,     '#3B82F6')}
        </div>

        <div class="charts-row">
          <div class="chart-card">
            <h3 class="chart-title">${I18n.t('dash.status_breakdown')}</h3>
            ${this._statusDonut(tasks)}
          </div>
          <div class="chart-card">
            <h3 class="chart-title">${I18n.t('dash.priority_dist')}</h3>
            ${this._priorityBar(tasks)}
          </div>
          <div class="chart-card">
            <h3 class="chart-title">${I18n.t('dash.team_workload')}</h3>
            ${this._workloadBar(tasks, users)}
          </div>
        </div>

        <div class="charts-row">
          <div class="chart-card chart-wide">
            <h3 class="chart-title">${I18n.t('dash.project_progress')}</h3>
            ${this._projectProgress(projects, tasks)}
          </div>
          <div class="chart-card">
            <h3 class="chart-title">${I18n.t('dash.completion_trend')}</h3>
            ${this._trendLine(tasks)}
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">${I18n.t('dash.bottlenecks')}</h3>
          ${this._bottlenecks(tasks)}
        </div>
      </div>`;

    this._bindChartEvents();
    this._animateProgressBars();
  },

  _kpi(icon, key, label, value, color) {
    return `
      <div class="kpi-card" data-kpi="${key}" onclick="DashboardView._kpiClick('${key}')" title="Click to explore ${label}">
        <div class="kpi-accent-bar" style="background:${color}"></div>
        <div class="kpi-main">
          <div class="kpi-value" style="color:${color}">${value}</div>
          <div class="kpi-label">${label}</div>
        </div>
        <div class="kpi-badge" style="background:${color}1a; color:${color}">${icon}</div>
      </div>`;
  },

  _kpiClick(key) {
    switch (key) {
      case 'open':
        Render.switchView('kanban');
        Components.toast(I18n.t('toast.showing_kanban'), 'info');
        break;
      case 'done':
        Filters.set('status', 'done');
        document.getElementById('filter-status').value = 'done';
        Render.switchView('timeline');
        Components.toast(I18n.t('toast.filtered_done'), 'success');
        break;
      case 'overdue':
        Render.switchView('timeline');
        Components.toast(I18n.t('toast.timeline_overdue'), 'warning');
        break;
      case 'thisWeek':
        Render.switchView('calendar');
        Components.toast(I18n.t('toast.showing_calendar'), 'info');
        break;
      default:
        break;
    }
  },

  _statusDonut(tasks) {
    if (!tasks.length) return '<div class="empty-chart">No data</div>';
    const segments = Object.entries(CONFIG.STATUSES).map(([k, v]) => ({
      key: k, label: v.label, color: v.color,
      count: tasks.filter(t => t.status === k).length
    })).filter(s => s.count > 0);

    const total = tasks.length;
    const cx = 80, cy = 80, R = 64, r = 40;
    let angle = -Math.PI / 2;
    let paths = '';
    let legend = '';

    segments.forEach(({ key, label, color, count }) => {
      const pct   = Math.round(count / total * 100);
      const sweep = (count / total) * 2 * Math.PI;
      const a2    = angle + sweep;
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
      const x2 = cx + R * Math.cos(a2),    y2 = cy + R * Math.sin(a2);
      const i1 = cx + r * Math.cos(angle), j1 = cy + r * Math.sin(angle);
      const i2 = cx + r * Math.cos(a2),    j2 = cy + r * Math.sin(a2);
      const lg = sweep > Math.PI ? 1 : 0;
      paths += `<path class="donut-seg"
        d="M ${i1} ${j1} L ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${i2} ${j2} A ${r} ${r} 0 ${lg} 0 ${i1} ${j1}"
        fill="${color}" stroke="white" stroke-width="2.5"
        data-label="${label}" data-count="${count}" data-pct="${pct}" data-status="${key}">
        <title>${label}: ${count} tasks (${pct}%)</title>
      </path>`;
      legend += `<div class="legend-row" onclick="DashboardView._filterStatus('${key}')">
        <span class="legend-dot" style="background:${color}"></span>
        <span class="legend-name">${label}</span>
        <strong class="legend-count">${count}</strong>
        <span class="legend-pct">${pct}%</span>
      </div>`;
      angle = a2;
    });

    return `<div class="donut-wrap">
      <div class="donut-svg-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160" class="donut-svg">
          ${paths}
          <text x="80" y="74" text-anchor="middle" font-size="24" font-weight="800" fill="#111">${total}</text>
          <text x="80" y="91" text-anchor="middle" font-size="10" fill="#9CA3AF" letter-spacing="0.5">${I18n.t('dash.tasks_label')}</text>
        </svg>
      </div>
      <div class="donut-legend">${legend}</div>
    </div>`;
  },

  _filterStatus(status) {
    Filters.set('status', status);
    document.getElementById('filter-status').value = status;
    Render.switchView('timeline');
    Components.toast(I18n.t('toast.filtered_status', { label: I18n.translateStatus(status) }), 'info');
  },

  _priorityBar(tasks) {
    if (!tasks.length) return '<div class="empty-chart">No data</div>';
    const data = Object.entries(CONFIG.PRIORITIES).map(([k, v]) => ({
      key: k, label: v.label, color: v.color,
      count: tasks.filter(t => t.priority === k).length
    }));
    const max = Math.max(...data.map(d => d.count), 1);
    const bW = 44, gap = 14, svgW = data.length * (bW + gap) + gap, svgH = 150;
    const maxH = svgH - 48;

    let bars = '';
    data.forEach(({ key, label, color, count }, i) => {
      const x   = gap + i * (bW + gap);
      const h   = Math.round((count / max) * maxH);
      const y   = svgH - 30 - h;
      const pct = Math.round(count / (tasks.length || 1) * 100);
      bars += `
        <g class="bar-group" data-label="${label}" data-count="${count}" data-pct="${pct}"
           onclick="DashboardView._filterPriority('${key}')" style="cursor:pointer" role="button">
          <rect x="${x}" y="${svgH - 30 - maxH}" width="${bW}" height="${maxH}" fill="#F3F4F6" rx="6"/>
          <rect class="pri-bar" x="${x}" y="${y}" width="${bW}" height="${Math.max(h, 2)}" fill="${color}" rx="6">
            <title>${label}: ${count} tasks (${pct}%)</title>
          </rect>
          <text x="${x + bW/2}" y="${y - 5}" text-anchor="middle" font-size="13" font-weight="700" fill="${color}">${count}</text>
          <text x="${x + bW/2}" y="${svgH - 8}" text-anchor="middle" font-size="10" fill="#9CA3AF">${label}</text>
        </g>`;
    });
    return `<svg width="${svgW}" height="${svgH}" style="max-width:100%">${bars}</svg>`;
  },

  _filterPriority(priority) {
    Filters.set('priority', priority);
    document.getElementById('filter-priority').value = priority;
    Render.switchView('timeline');
    Components.toast(I18n.t('toast.filtered_priority', { label: I18n.translatePriority(priority) }), 'info');
  },

  _workloadBar(tasks, users) {
    if (!users.length) return '<div class="empty-chart">No team members</div>';
    const data = users.map(u => ({
      id:    u.id,
      name:  u.name.split(' ')[0],
      color: u.color,
      total: tasks.filter(t => t.assignedTo.includes(u.id)).length,
      done:  tasks.filter(t => t.assignedTo.includes(u.id) && t.status === 'done').length
    })).sort((a, b) => b.total - a.total);

    const max    = Math.max(...data.map(d => d.total), 1);
    const bH = 22, gap = 10, lblW = 64, barMaxW = 180;
    const svgH   = data.length * (bH + gap) + 10;

    let bars = '';
    data.forEach(({ id, name, color, total, done }, i) => {
      const y  = 5 + i * (bH + gap);
      const tW = Math.round((total / max) * barMaxW);
      const dW = total ? Math.round((done / total) * tW) : 0;
      bars += `
        <g class="wl-group" data-label="${name}" data-total="${total}" data-done="${done}"
           onclick="DashboardView._filterAssignee('${id}')" style="cursor:pointer">
          <text x="0" y="${y + bH - 6}" font-size="12" fill="#374151">${name}</text>
          <rect x="${lblW}" y="${y}" width="${barMaxW}" height="${bH}" fill="#F3F4F6" rx="4"/>
          <rect x="${lblW}" y="${y}" width="${Math.max(tW, total ? 4 : 0)}" height="${bH}" fill="${color}" rx="4" opacity="0.2"/>
          <rect class="wl-bar" x="${lblW}" y="${y}" width="${Math.max(dW, 0)}" height="${bH}" fill="${color}" rx="4" opacity="0.85">
            <title>${name}: ${done} done, ${total - done} open (${total} total)</title>
          </rect>
          <text x="${lblW + Math.max(tW, 4) + 8}" y="${y + bH - 6}" font-size="11" fill="#9CA3AF">${total}</text>
        </g>`;
    });
    return `<svg width="${lblW + barMaxW + 36}" height="${svgH}" style="max-width:100%">${bars}</svg>`;
  },

  _filterAssignee(userId) {
    Filters.set('assignedTo', userId);
    document.getElementById('filter-assignee').value = userId;
    Render.switchView('timeline');
    const u = AppState.users.find(u => u.id === userId);
    Components.toast(I18n.t('toast.filtered_member', { name: u ? u.name : '' }), 'info');
  },

  _projectProgress(projects, tasks) {
    if (!projects.length) return '<div class="empty-chart">No projects</div>';
    const rows = projects.map(p => {
      const pts  = tasks.filter(t => t.projectId === p.id);
      const done = pts.filter(t => t.status === 'done').length;
      const pct  = pts.length ? Math.round(done / pts.length * 100) : 0;
      const lbl  = p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name;
      return `<div class="proj-prog-row" onclick="Events.filterByProject('${p.id}')" title="Filter by ${Helpers.escapeHtml(p.name)}">
        <div class="proj-prog-dot" style="background:${p.color}"></div>
        <span class="proj-prog-name">${Helpers.escapeHtml(lbl)}</span>
        <div class="proj-prog-track">
          <div class="proj-prog-fill" style="background:${p.color}" data-pct="${pct}"></div>
        </div>
        <div class="proj-prog-stat">
          <span style="color:${p.color};font-weight:700">${done}</span>/<span>${pts.length}</span>
          <span class="proj-prog-pct">${pct}%</span>
        </div>
      </div>`;
    });
    return `<div class="proj-prog-list">${rows.join('')}</div>`;
  },

  _animateProgressBars() {
    requestAnimationFrame(() => {
      document.querySelectorAll('.proj-prog-fill').forEach(el => {
        const pct = el.dataset.pct || 0;
        el.style.width = '0%';
        requestAnimationFrame(() => { el.style.width = pct + '%'; });
      });
    });
  },

  _trendLine(tasks) {
    const weeks = 4;
    const now   = new Date();
    const data  = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(now); ws.setDate(now.getDate() - (i + 1) * 7);
      const we = new Date(now); we.setDate(now.getDate() - i * 7);
      const count = tasks.filter(t => {
        if (!t.updatedAt) return false;
        const u = new Date(t.updatedAt);
        return t.status === 'done' && u >= ws && u < we;
      }).length;
      data.push({ label: i === 0 ? 'Now' : `W-${i}`, count });
    }

    const svgW = 260, svgH = 140, pX = 32, pY = 24;
    const maxV = Math.max(...data.map(d => d.count), 1);
    const pts  = data.map((d, i) => ({
      x: pX + (i / (data.length - 1)) * (svgW - pX * 2),
      y: svgH - pY - (d.count / maxV) * (svgH - pY * 2),
      ...d
    }));
    const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${pts[0].x},${svgH - pY} ${poly} ${pts[pts.length-1].x},${svgH - pY}`;

    const gridLines = [0, 0.5, 1].map(r => {
      const gy = svgH - pY - r * (svgH - pY * 2);
      const gv = Math.round(r * maxV);
      return `<line x1="${pX}" y1="${gy}" x2="${svgW - pX}" y2="${gy}" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,3"/>
              <text x="${pX - 5}" y="${gy + 4}" text-anchor="end" font-size="9" fill="#9CA3AF">${gv}</text>`;
    }).join('');

    let s = `
      ${gridLines}
      <polygon points="${area}" fill="#4A90E2" opacity="0.08"/>
      <polyline points="${poly}" fill="none" stroke="#4A90E2" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;

    pts.forEach(p => {
      s += `<g class="trend-point" data-label="${p.label}" data-count="${p.count}">
        <circle cx="${p.x}" cy="${p.y}" r="6" fill="white" stroke="#4A90E2" stroke-width="2.5"/>
        <circle cx="${p.x}" cy="${p.y}" r="3" fill="#4A90E2"/>
        <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#374151">${p.count}</text>
        <text x="${p.x}" y="${svgH - 5}" text-anchor="middle" font-size="9" fill="#9CA3AF">${p.label}</text>
        <title>${p.label}: ${p.count} completed</title>
      </g>`;
    });

    return `<svg width="${svgW}" height="${svgH}" style="max-width:100%">${s}</svg>`;
  },

  _bottlenecks(tasks) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3);
    const stuck  = tasks.filter(t =>
      (t.status === 'review' || t.status === 'blocked') &&
      new Date(t.updatedAt || t.createdAt) < cutoff
    );
    if (!stuck.length) return `<div class="no-issues">${I18n.t('dash.no_stuck')}</div>`;

    return `<div class="bottleneck-list">
      ${stuck.map(t => {
        const proj = AppState.projects.find(p => p.id === t.projectId);
        const days = Math.floor((new Date() - new Date(t.updatedAt || t.createdAt)) / 864e5);
        return `<div class="bottleneck-row" onclick="Render.openDetailPanel('${t.id}')">
          ${Components.statusBadge(t.status)}
          <span class="bt-title">${Helpers.escapeHtml(t.title)}</span>
          ${proj ? `<span class="label-chip" style="border-left:3px solid ${proj.color}">${Helpers.escapeHtml(proj.name)}</span>` : ''}
          <span class="bt-days text-danger">${days}d stuck</span>
        </div>`;
      }).join('')}
    </div>`;
  },

  _bindChartEvents() {
    const tip = document.getElementById('dash-tooltip');
    if (!tip) return;

    const showTip = (e, html) => {
      tip.innerHTML = html;
      tip.classList.remove('hidden');
      this._moveTip(e, tip);
    };
    const hideTip = () => tip.classList.add('hidden');
    const moveTip = (e) => this._moveTip(e, tip);

    document.querySelectorAll('.donut-seg').forEach(el => {
      el.addEventListener('mouseenter', e => showTip(e,
        `<b>${el.dataset.label}</b>: ${el.dataset.count} tasks <span class="tip-pct">${el.dataset.pct}%</span>`));
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
      el.style.cursor = 'pointer';
    });

    document.querySelectorAll('.bar-group').forEach(el => {
      el.addEventListener('mouseenter', e => showTip(e,
        `<b>${el.dataset.label}</b>: ${el.dataset.count} tasks (${el.dataset.pct}%) — click to filter`));
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
    });

    document.querySelectorAll('.wl-group').forEach(el => {
      el.addEventListener('mouseenter', e => showTip(e,
        `<b>${el.dataset.label}</b> — ${el.dataset.done} done, ${el.dataset.total - el.dataset.done} open — click to filter`));
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
    });

    document.querySelectorAll('.trend-point').forEach(el => {
      el.addEventListener('mouseenter', e => showTip(e,
        `<b>${el.dataset.label}</b>: ${el.dataset.count} tasks completed`));
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
    });

    document.querySelectorAll('.proj-prog-row').forEach(el => {
      el.addEventListener('mouseenter', e => {
        const tip2 = document.getElementById('dash-tooltip');
        const name = el.title.replace('Filter by ', '');
        showTip(e, `<b>${name}</b> — click to filter tasks`);
      });
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
    });
  },

  _moveTip(e, tip) {
    const x = Math.min(e.clientX + 14, window.innerWidth - 220);
    const y = Math.max(4, e.clientY - 44);
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
  }

};
