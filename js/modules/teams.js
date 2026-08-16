/* modules/teams.js — user and team management */

const Teams = {

  createUser(data) {
    const user = {
      id:     generateId('user'),
      name:   data.name   || 'New Member',
      email:  data.email  || '',
      color:  data.color  || CONFIG.PROJECT_COLORS[AppState.users.length % CONFIG.PROJECT_COLORS.length],
      role:   data.role   || 'Member',
      teamId: data.teamId || null
    };
    AppState.users.push(user);
    App.scheduleSave();
    return user;
  },

  updateUser(id, updates) {
    const idx = AppState.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    AppState.users[idx] = Object.assign({}, AppState.users[idx], updates);
    App.scheduleSave();
    return AppState.users[idx];
  },

  deleteUser(id) {
    AppState.users = AppState.users.filter(u => u.id !== id);
    AppState.tasks.forEach(t => {
      if (t.assignedTo.includes(id)) {
        t.assignedTo = t.assignedTo.filter(uid => uid !== id);
      }
    });
    App.scheduleSave();
  },

  getUsers() {
    return AppState.users;
  },

  getUserById(id) {
    return AppState.users.find(u => u.id === id) || null;
  },

  createTeam(data) {
    const team = {
      id:          generateId('team'),
      name:        data.name        || 'New Team',
      description: data.description || '',
      members:     data.members     || [],
      color:       data.color       || '#4A90E2'
    };
    AppState.teams.push(team);
    App.scheduleSave();
    return team;
  },

  getTeams() {
    return AppState.teams;
  },

  getUserAvatar(user, size = 'md') {
    if (!user) return '';
    const s = size === 'sm' ? 24 : size === 'lg' ? 40 : 30;
    const fs = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;
    if (user.avatar) {
      return `<img class="avatar avatar-${size}" src="${user.avatar}" style="width:${s}px;height:${s}px;object-fit:cover;border-radius:50%" title="${Helpers.escapeHtml(user.name)}">`;
    }
    return `<span class="avatar avatar-${size}" style="background:${user.color};width:${s}px;height:${s}px;font-size:${fs}px" title="${Helpers.escapeHtml(user.name)}">${Format.initials(user.name)}</span>`;
  }

};
