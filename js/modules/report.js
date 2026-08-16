/* modules/report.js — offline PDF report generator (print-to-PDF) */

const Report = {

  /* ── Scope picker modal ───────────────────────────────── */
  showOptions() {
    if (!AppState.projects.length && !AppState.tasks.length) {
      Components.toast(I18n.t('toast.no_report_data'), 'warning');
      return;
    }

    const projOpts = AppState.projects.map(p =>
      `<option value="${p.id}">${Helpers.escapeHtml(p.name)}</option>`
    ).join('');
    const userOpts = AppState.users.map(u =>
      `<option value="${u.id}">${Helpers.escapeHtml(u.name)}${u.role ? ' — ' + Helpers.escapeHtml(u.role) : ''}</option>`
    ).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <p class="settings-note">${I18n.t('report.choose')}</p>
        <div class="rpt-scope-grid">
          <label class="rpt-scope-card active" id="rsc-all">
            <input type="radio" name="rpt-scope" value="all" checked onchange="Report._onScopeChange(this)">
            <span class="rsc-icon">📊</span>
            <span class="rsc-label">${I18n.t('report.all_data')}</span>
            <span class="rsc-desc">${I18n.t('report.all_data_desc')}</span>
          </label>
          <label class="rpt-scope-card" id="rsc-project">
            <input type="radio" name="rpt-scope" value="project" onchange="Report._onScopeChange(this)">
            <span class="rsc-icon">📁</span>
            <span class="rsc-label">${I18n.t('report.single_project')}</span>
            <span class="rsc-desc">${I18n.t('report.single_project_desc')}</span>
          </label>
          <label class="rpt-scope-card" id="rsc-member">
            <input type="radio" name="rpt-scope" value="member" onchange="Report._onScopeChange(this)">
            <span class="rsc-icon">👤</span>
            <span class="rsc-label">${I18n.t('report.team_member')}</span>
            <span class="rsc-desc">${I18n.t('report.team_member_desc')}</span>
          </label>
        </div>

        <div id="rpt-proj-row" class="form-group full hidden">
          <label>${I18n.t('report.select_project')}</label>
          <select id="rpt-proj-id" class="form-input">
            <option value="">${I18n.t('report.choose_project')}</option>
            ${projOpts}
          </select>
        </div>

        <div id="rpt-user-row" class="form-group full hidden">
          <label>${I18n.t('report.select_member')}</label>
          <select id="rpt-user-id" class="form-input">
            <option value="">${I18n.t('report.choose_member')}</option>
            ${userOpts}
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="Components.closeModal()">${I18n.t('btn.cancel')}</button>
          <button class="btn btn-primary" onclick="Report._confirmGenerate()">&#128438; ${I18n.t('btn.generate_report')}</button>
        </div>
      </div>`;

    Components.modal(I18n.t('modal.gen_report'), body);
  },

  _onScopeChange(radio) {
    document.querySelectorAll('.rpt-scope-card').forEach(el => el.classList.remove('active'));
    radio.closest('.rpt-scope-card').classList.add('active');
    document.getElementById('rpt-proj-row').classList.toggle('hidden', radio.value !== 'project');
    document.getElementById('rpt-user-row').classList.toggle('hidden', radio.value !== 'member');
  },

  _confirmGenerate() {
    const scope = document.querySelector('input[name="rpt-scope"]:checked')?.value || 'all';
    const opts  = {};
    if (scope === 'project') {
      const pid = document.getElementById('rpt-proj-id').value;
      if (!pid) { Components.toast(I18n.t('toast.select_project'), 'warning'); return; }
      opts.projectId = pid;
    } else if (scope === 'member') {
      const uid = document.getElementById('rpt-user-id').value;
      if (!uid) { Components.toast(I18n.t('toast.select_member'), 'warning'); return; }
      opts.userId = uid;
    }
    Components.closeModal();
    this.generate(opts);
  },

  /* ── Main generator ────────────────────────────────────── */
  generate(options = {}) {
    // Apply scope filter
    let tasks    = AppState.tasks;
    let projects = AppState.projects;
    let users    = AppState.users;
    let scopeTitle = null;

    if (options.projectId) {
      const proj  = AppState.projects.find(p => p.id === options.projectId);
      tasks       = AppState.tasks.filter(t => t.projectId === options.projectId);
      projects    = proj ? [proj] : [];
      const ids   = new Set(tasks.flatMap(t => t.assignedTo));
      users       = AppState.users.filter(u => ids.has(u.id));
      scopeTitle  = proj ? proj.name : 'Project Report';
    } else if (options.userId) {
      const user  = AppState.users.find(u => u.id === options.userId);
      tasks       = AppState.tasks.filter(t => t.assignedTo.includes(options.userId));
      const pids  = new Set(tasks.map(t => t.projectId).filter(Boolean));
      projects    = AppState.projects.filter(p => pids.has(p.id));
      users       = user ? [user] : [];
      scopeTitle  = user ? user.name : 'Member Report';
    }

    if (!tasks.length) {
      Components.toast(I18n.t('toast.no_tasks_sel'), 'warning');
      return;
    }

    const profile  = AppState.settings.profile || {};
    const now      = new Date();
    const dateStr  = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const done     = tasks.filter(t => t.status === 'done');
    const open     = tasks.filter(t => t.status !== 'done');
    const overdue  = tasks.filter(t => Helpers.isOverdue(t.dueDate, t.status));
    const compPct  = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
    const thisWeek = tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const e = new Date(now); e.setDate(e.getDate() + 7);
      return d >= now && d <= e;
    });

    const pageTitle = scopeTitle ? `${scopeTitle} — Report` : 'Project Status Report';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${this._esc(pageTitle)} — ${dateStr}</title>
  <style>${this._css()}</style>
</head>
<body>
  ${this._printBar(dateStr, scopeTitle)}
  ${this._cover(profile, dateStr, tasks, projects, compPct, scopeTitle, options)}
  ${this._kpiSection(tasks, projects, users, compPct, open, done, overdue, thisWeek)}
  ${this._projectSection(projects, tasks)}
  ${this._taskSection(tasks, projects, users)}
  ${this._teamSection(tasks, users)}
  ${this._bottleneckSection(tasks, projects)}
  <div class="report-footer">
    Generated by ProjectFlow${profile.name ? ' &middot; ' + this._esc(profile.name) : ''}
    ${profile.designation ? ' &middot; ' + this._esc(profile.designation) : ''}
    &middot; ${dateStr}
    ${scopeTitle ? ' &middot; ' + this._esc(scopeTitle) : ''}
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      Components.toast(I18n.t('toast.popup_blocked'), 'warning');
      return;
    }
    win.document.write(html);
    win.document.close();
    Components.toast(I18n.t('toast.report_opened'), 'success', 5000);
  },

  _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _printBar(dateStr, scopeTitle) {
    const label = scopeTitle ? `${this._esc(scopeTitle)} &mdash; ${dateStr}` : `Project Status Report &mdash; ${dateStr}`;
    return `<div class="print-bar no-print">
      <span style="font-weight:600">&#9679; ${label}</span>
      <div style="display:flex;gap:10px;align-items:center">
        <span style="font-size:12px;opacity:0.7">File &rsaquo; Print &rsaquo; Save as PDF</span>
        <button class="print-btn" onclick="window.print()">&#128438; Print / Save PDF</button>
        <button class="print-btn" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3)" onclick="window.close()">&#10005;</button>
      </div>
    </div>`;
  },

  _cover(profile, dateStr, tasks, projects, compPct, scopeTitle, options = {}) {
    const done    = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => Helpers.isOverdue(t.dueDate, t.status)).length;
    const scopeTag = options.projectId ? 'Project Report'
                   : options.userId   ? 'Member Report'
                   : 'Status Report';
    const titleLine = scopeTitle
      ? `${this._esc(scopeTitle)}<br><span style="font-size:0.5em;opacity:0.55;font-weight:600;letter-spacing:2px;text-transform:uppercase">${scopeTag}</span>`
      : `Project Status<br>Report`;
    return `
    <div class="cover">
      <div class="cover-bg-circle c1"></div>
      <div class="cover-bg-circle c2"></div>
      <div class="cover-inner">
        <div>
          <div class="cover-logo">&#9672; ProjectFlow</div>
          <div class="cover-tagline">Project Management Suite</div>
          <div class="cover-title">${titleLine}</div>
          <div class="cover-subtitle">${dateStr}</div>
          <div class="cover-divider"></div>
          <div class="cover-meta">
            ${profile.name ? `<div class="cover-meta-row"><span class="cover-meta-lbl">Prepared by</span><span class="cover-meta-val">${this._esc(profile.name)}${profile.designation ? ' &middot; ' + this._esc(profile.designation) : ''}</span></div>` : ''}
            <div class="cover-meta-row"><span class="cover-meta-lbl">Projects</span><span class="cover-meta-val">${projects.length} active</span></div>
            <div class="cover-meta-row"><span class="cover-meta-lbl">Total Tasks</span><span class="cover-meta-val">${tasks.length}</span></div>
            <div class="cover-meta-row"><span class="cover-meta-lbl">Completion</span><span class="cover-meta-val">${compPct}% complete</span></div>
          </div>
        </div>
        <div class="cover-kpis">
          <div class="cover-kpi"><div class="cover-kpi-val">${projects.length}</div><div class="cover-kpi-lbl">Projects</div></div>
          <div class="cover-kpi"><div class="cover-kpi-val">${tasks.length}</div><div class="cover-kpi-lbl">Tasks</div></div>
          <div class="cover-kpi"><div class="cover-kpi-val">${compPct}%</div><div class="cover-kpi-lbl">Done</div></div>
          <div class="cover-kpi"><div class="cover-kpi-val" style="color:#FCA5A5">${overdue}</div><div class="cover-kpi-lbl">Overdue</div></div>
        </div>
      </div>
    </div>`;
  },

  _kpiSection(tasks, projects, users, compPct, open, done, overdue, thisWeek) {
    const kpis = [
      { icon: '&#128193;', label: 'Active Projects',  value: projects.length, color: '#4A90E2' },
      { icon: '&#128203;', label: 'Open Tasks',        value: open.length,    color: '#F59E0B' },
      { icon: '&#9989;',   label: 'Complete',          value: compPct + '%',  color: '#10B981' },
      { icon: '&#9888;',   label: 'Overdue',           value: overdue.length, color: '#EF4444' },
      { icon: '&#128197;', label: 'Due This Week',     value: thisWeek.length,color: '#8B5CF6' },
      { icon: '&#128101;', label: 'Team Members',      value: users.length,   color: '#3B82F6' },
    ];
    const cards = kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-accent" style="background:${k.color}"></div>
        <div style="font-size:28px;opacity:0.12;position:absolute;right:14px;top:50%;transform:translateY(-50%)">${k.icon}</div>
        <div class="kpi-value" style="color:${k.color}">${k.value}</div>
        <div class="kpi-label">${k.label}</div>
      </div>`).join('');
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-title">Executive Summary</span>
          <span class="section-badge">${tasks.length} Tasks Total</span>
        </div>
        <div class="kpi-grid">${cards}</div>
      </div>`;
  },

  _projectSection(projects, tasks) {
    if (!projects.length) return '';
    const rows = projects.map(p => {
      const pts  = tasks.filter(t => t.projectId === p.id);
      const done = pts.filter(t => t.status === 'done').length;
      const inP  = pts.filter(t => t.status === 'in_progress').length;
      const blk  = pts.filter(t => t.status === 'blocked').length;
      const pct  = pts.length ? Math.round(done / pts.length * 100) : 0;
      return `
        <div class="proj-row">
          <div class="proj-dot" style="background:${p.color}"></div>
          <div class="proj-name">${this._esc(p.name)}</div>
          <div class="proj-track"><div class="proj-fill" style="background:${p.color};width:${pct}%"></div></div>
          <div class="proj-stat">
            <span style="color:${p.color};font-weight:700">${done}</span>/<span>${pts.length}</span>
            <span class="proj-pct-val">${pct}%</span>
          </div>
          <div class="proj-pills">
            ${inP  ? `<span class="mini-pill" style="color:#2563EB;background:#DBEAFE">${inP} in progress</span>` : ''}
            ${blk  ? `<span class="mini-pill" style="color:#DC2626;background:#FEE2E2">${blk} blocked</span>` : ''}
          </div>
        </div>`;
    }).join('');
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-title">Project Progress</span>
          <span class="section-badge">${projects.length} Projects</span>
        </div>
        <div class="proj-rows">${rows}</div>
      </div>`;
  },

  _taskSection(tasks, projects, users) {
    if (!tasks.length) return '';
    const grouped = {};
    const order   = [];
    tasks.forEach(t => {
      const key = t.projectId || '__none__';
      if (!grouped[key]) { grouped[key] = []; order.push(key); }
      grouped[key].push(t);
    });
    let html = '';
    order.forEach(projId => {
      const projTasks = grouped[projId];
      const proj      = projects.find(p => p.id === projId);
      const projColor = proj ? proj.color : '#6B7280';
      const projName  = proj ? this._esc(proj.name) : 'No Project';
      html += `
        <div class="task-group-hdr" style="border-left:5px solid ${projColor}">
          <span>&#128193;</span>
          <span>${projName}</span>
          <span class="task-group-count">${projTasks.length} task${projTasks.length !== 1 ? 's' : ''}</span>
        </div>
        <table class="task-table">
          <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assigned To</th><th>Due Date</th><th>%</th></tr></thead>
          <tbody>
            ${projTasks.map(t => {
              const sCfg = CONFIG.STATUSES[t.status]   || { label: t.status,    color: '#6B7280', bg: '#F3F4F6' };
              const pCfg = CONFIG.PRIORITIES[t.priority]|| { label: t.priority, color: '#6B7280' };
              const asgn = t.assignedTo.map(id => users.find(u => u.id === id)).filter(Boolean);
              const ov   = Helpers.isOverdue(t.dueDate, t.status);
              const due  = t.dueDate
                ? (ov ? `<span style="color:#EF4444;font-weight:700">&#9888; ${this._fmtDate(t.dueDate)}</span>`
                      : this._fmtDate(t.dueDate))
                : '<span style="color:#9CA3AF">—</span>';
              const pct  = t.completionPercentage || (t.status === 'done' ? 100 : 0);
              return `<tr>
                <td>
                  <strong>${this._esc(t.title)}</strong>
                  ${t.description ? `<br><span class="task-desc">${this._esc(t.description.slice(0,90))}${t.description.length > 90 ? '…' : ''}</span>` : ''}
                  ${t.labels && t.labels.length ? `<br>${t.labels.map(l => `<span class="label-pill">${this._esc(l)}</span>`).join('')}` : ''}
                </td>
                <td><span class="status-pill" style="color:${sCfg.color};background:${sCfg.bg}">${sCfg.label}</span></td>
                <td><span class="pri-dot" style="background:${pCfg.color}"></span>${pCfg.label}</td>
                <td>${asgn.length ? asgn.map(u => this._esc(u.name.split(' ')[0])).join(', ') : '<span style="color:#9CA3AF">—</span>'}</td>
                <td>${due}</td>
                <td>${pct ? `<span style="color:#003366;font-weight:700">${pct}%</span>` : '<span style="color:#9CA3AF">0%</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    });
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-title">All Tasks by Project</span>
          <span class="section-badge">${tasks.length} Tasks</span>
        </div>
        ${html}
      </div>`;
  },

  _teamSection(tasks, users) {
    if (!users.length) return '';
    const data = users.map(u => ({
      u,
      total:   tasks.filter(t => t.assignedTo.includes(u.id)).length,
      done:    tasks.filter(t => t.assignedTo.includes(u.id) && t.status === 'done').length,
      overdue: tasks.filter(t => t.assignedTo.includes(u.id) && Helpers.isOverdue(t.dueDate, t.status)).length
    })).sort((a, b) => b.total - a.total);
    const max  = Math.max(...data.map(d => d.total), 1);

    const rows = data.map(({ u, total, done, overdue }) => {
      const totalPct = Math.round((total / max) * 100);
      const donePct  = total ? Math.round((done  / total) * totalPct) : 0;
      return `
        <div class="team-row">
          <div class="team-avatar" style="background:${u.color}">${this._initials(u.name)}</div>
          <div class="team-info">
            <div class="team-name">${this._esc(u.name)}</div>
            <div class="team-role">${this._esc(u.role || '—')}</div>
          </div>
          <div class="team-track">
            <div style="height:100%;width:${totalPct}%;background:${u.color};opacity:0.15;border-radius:6px;position:absolute;left:0;top:0"></div>
            <div style="height:100%;width:${donePct}%;background:${u.color};border-radius:6px;position:absolute;left:0;top:0"></div>
          </div>
          <div class="team-counts">
            <span style="color:${u.color};font-weight:700">${done}</span><span style="color:#9CA3AF">/${total}</span>
            ${overdue ? `<span class="overdue-tag">${overdue} late</span>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="section">
        <div class="section-header">
          <span class="section-title">Team Workload</span>
          <span class="section-badge">${users.length} Members</span>
        </div>
        <div style="font-size:11px;color:#9CA3AF;margin-bottom:16px">Solid bar = completed tasks &nbsp;&#8226;&nbsp; Background bar = total assigned</div>
        <div class="team-rows">${rows}</div>
      </div>`;
  },

  _bottleneckSection(tasks, projects) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3);
    const stuck  = tasks.filter(t =>
      (t.status === 'review' || t.status === 'blocked') &&
      new Date(t.updatedAt || t.createdAt) < cutoff
    );
    if (!stuck.length) {
      return `
        <div class="section">
          <div class="section-header">
            <span class="section-title">Bottlenecks</span>
            <span class="section-badge" style="background:#10B981">&#10003; All Clear</span>
          </div>
          <div style="color:#10B981;font-weight:600;padding:12px 0;font-size:14px">&#10003; No stuck tasks — great work!</div>
        </div>`;
    }
    const rows = stuck.map(t => {
      const proj  = projects.find(p => p.id === t.projectId);
      const days  = Math.floor((new Date() - new Date(t.updatedAt || t.createdAt)) / 864e5);
      const sCfg  = CONFIG.STATUSES[t.status] || { label: t.status, color: '#6B7280', bg: '#F3F4F6' };
      return `<tr>
        <td><strong>${this._esc(t.title)}</strong></td>
        <td><span class="status-pill" style="color:${sCfg.color};background:${sCfg.bg}">${sCfg.label}</span></td>
        <td>${proj ? `<span style="color:${proj.color};font-weight:600">&#9679; ${this._esc(proj.name)}</span>` : '—'}</td>
        <td style="color:#EF4444;font-weight:700">${days} day${days !== 1 ? 's' : ''} stuck</td>
      </tr>`;
    }).join('');

    return `
      <div class="section">
        <div class="section-header">
          <span class="section-title">&#9888; Bottlenecks</span>
          <span class="section-badge" style="background:#EF4444">${stuck.length} Stuck</span>
        </div>
        <div style="font-size:11px;color:#9CA3AF;margin-bottom:16px">Tasks in "Blocked" or "In Review" with no update for 3+ days — immediate attention needed</div>
        <table class="btl-table">
          <thead><tr><th>Task</th><th>Status</th><th>Project</th><th>Stuck For</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  _initials(name) {
    return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  _css() {
    return `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #111827; background: #fff; padding-top: 52px; }
@media print { body { padding-top: 0; } .no-print { display: none !important; } @page { margin: 0; size: A4 portrait; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

/* Print bar */
.print-bar { position: fixed; top: 0; left: 0; right: 0; background: #003366; color: white; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; font-size: 13px; box-shadow: 0 2px 12px rgba(0,0,0,.35); }
.print-btn { background: white; color: #003366; border: none; padding: 7px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; transition: background .15s; }
.print-btn:hover { background: #EFF6FF; }

/* Cover */
.cover { background: linear-gradient(135deg, #001f4d 0%, #003366 55%, #004a94 100%); color: white; min-height: 100vh; display: flex; align-items: center; padding: 64px; page-break-after: always; position: relative; overflow: hidden; }
.cover-bg-circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,.04); }
.cover-bg-circle.c1 { width: 500px; height: 500px; top: -180px; right: -150px; }
.cover-bg-circle.c2 { width: 350px; height: 350px; bottom: -120px; left: -80px; }
.cover-inner { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 40px; position: relative; z-index: 1; }
.cover-logo { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; opacity: .9; }
.cover-tagline { font-size: 10px; opacity: .45; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 52px; }
.cover-title { font-size: 52px; font-weight: 800; line-height: 1.05; margin-bottom: 14px; }
.cover-subtitle { font-size: 16px; opacity: .6; margin-bottom: 36px; }
.cover-divider { width: 56px; height: 4px; background: rgba(255,255,255,.25); border-radius: 2px; margin-bottom: 36px; }
.cover-meta { display: flex; flex-direction: column; gap: 10px; }
.cover-meta-row { display: flex; align-items: center; gap: 14px; font-size: 13px; }
.cover-meta-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; opacity: .4; width: 90px; flex-shrink: 0; }
.cover-meta-val { opacity: .8; }
.cover-kpis { display: flex; flex-direction: column; gap: 28px; align-items: center; flex-shrink: 0; }
.cover-kpi { text-align: center; }
.cover-kpi-val { font-size: 40px; font-weight: 800; line-height: 1; }
.cover-kpi-lbl { font-size: 9px; opacity: .45; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }

/* Sections */
.section { padding: 40px 56px; }
.section + .section { border-top: 1px solid #F3F4F6; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 3px solid #003366; }
.section-title { font-size: 18px; font-weight: 800; color: #003366; }
.section-badge { background: #003366; color: white; padding: 3px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }

/* KPI cards */
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.kpi-card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 20px 20px 20px 26px; position: relative; overflow: hidden; background: white; }
.kpi-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; border-radius: 10px 0 0 10px; }
.kpi-value { font-size: 34px; font-weight: 800; line-height: 1; margin-bottom: 6px; }
.kpi-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: .07em; font-weight: 600; }

/* Project progress */
.proj-rows { display: flex; flex-direction: column; gap: 16px; }
.proj-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid #F9FAFB; }
.proj-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.proj-name { width: 160px; flex-shrink: 0; font-weight: 700; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.proj-track { flex: 1; height: 12px; background: #F3F4F6; border-radius: 6px; overflow: hidden; }
.proj-fill { height: 100%; border-radius: 6px; }
.proj-stat { width: 90px; flex-shrink: 0; font-size: 12px; color: #374151; text-align: right; white-space: nowrap; }
.proj-pct-val { font-weight: 700; color: #374151; margin-left: 6px; }
.proj-pills { display: flex; gap: 6px; flex-shrink: 0; }
.mini-pill { font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 600; white-space: nowrap; }

/* Task table */
.task-group-hdr { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #F8FAFF; border-left: 5px solid #003366; margin-top: 18px; border-radius: 0 6px 6px 0; font-weight: 700; font-size: 13px; color: #003366; }
.task-group-hdr:first-child { margin-top: 0; }
.task-group-count { margin-left: auto; font-size: 10px; font-weight: 700; background: #003366; color: white; padding: 2px 8px; border-radius: 10px; }
.task-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 0; }
.task-table th { background: #F9FAFB; color: #6B7280; font-weight: 700; padding: 9px 12px; text-align: left; border-bottom: 2px solid #E5E7EB; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
.task-table td { padding: 9px 12px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
.task-table tr:last-child td { border-bottom: none; }
.task-table tr:nth-child(even) td { background: #FAFAFA; }
.task-desc { color: #9CA3AF; font-size: 10px; }
.status-pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.pri-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.label-pill { display: inline-block; font-size: 9px; padding: 1px 6px; border-radius: 8px; background: #F3F4F6; color: #6B7280; margin-right: 3px; margin-top: 2px; }

/* Team workload */
.team-rows { display: flex; flex-direction: column; gap: 14px; }
.team-row { display: flex; align-items: center; gap: 14px; padding: 8px 0; border-bottom: 1px solid #F9FAFB; }
.team-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; flex-shrink: 0; }
.team-info { width: 140px; flex-shrink: 0; }
.team-name { font-weight: 700; font-size: 12px; }
.team-role { font-size: 10px; color: #9CA3AF; margin-top: 2px; }
.team-track { flex: 1; height: 14px; background: #F3F4F6; border-radius: 7px; position: relative; overflow: hidden; }
.team-counts { width: 90px; flex-shrink: 0; font-size: 12px; text-align: right; white-space: nowrap; }
.overdue-tag { font-size: 10px; color: #EF4444; font-weight: 700; margin-left: 6px; }

/* Bottleneck table */
.btl-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.btl-table th { background: #FEF2F2; color: #DC2626; font-weight: 700; padding: 10px 14px; text-align: left; border-bottom: 2px solid #FECACA; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
.btl-table td { padding: 10px 14px; border-bottom: 1px solid #FEF2F2; }
.btl-table tr:last-child td { border-bottom: none; }

/* Footer */
.report-footer { padding: 24px 56px; background: #F9FAFB; color: #9CA3AF; font-size: 10px; text-align: center; border-top: 1px solid #E5E7EB; }
    `;
  }

};
