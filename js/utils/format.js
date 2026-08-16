/* utils/format.js — date and value formatting helpers */

const Format = {

  date(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString(I18n.locale, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  shortDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString(I18n.locale, { month: 'short', day: 'numeric' });
  },

  relativeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const now = new Date();
    const diffMs = d - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0)  return I18n.t('date.overdue',  { n: Math.abs(diffDays) });
    if (diffDays === 0) return I18n.t('date.today');
    if (diffDays === 1) return I18n.t('date.tomorrow');
    if (diffDays <= 7)  return I18n.t('date.due_in',  { n: diffDays });
    return Format.shortDate(dateStr);
  },

  hours(h) {
    if (!h && h !== 0) return '—';
    if (h < 8) return `${h}h`;
    const days = Math.floor(h / 8);
    const rem  = h % 8;
    return rem ? `${days}d ${rem}h` : `${days}d`;
  },

  initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  isoDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
  },

  timestamp() {
    return new Date().toISOString();
  }

};
