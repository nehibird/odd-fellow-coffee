export const helpers = {
  formatCents(cents) {
    if (cents == null) return '$0.00';
    return '$' + (cents / 100).toFixed(2);
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  },

  dayName(dayNum) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum] || '?';
  },

  frequencyLabel(freq) {
    const labels = { weekly: 'Weekly', biweekly: 'Every 2 Weeks', monthly: 'Monthly' };
    return labels[freq] || freq;
  },

  statusBadge(status) {
    if (!status) return '';
    const colors = {
      pending: 'warning', confirmed: 'primary', fulfilled: 'success',
      active: 'success', canceled: 'danger', past_due: 'warning', paused: 'secondary',
      scheduled: 'info', live: 'success', sold_out: 'danger', closed: 'secondary',
      ordered: 'primary', baking: 'warning', ready: 'success',
      picked_up: 'secondary', shipped: 'info', delivered: 'secondary'
    };
    const color = colors[status] || 'secondary';
    return `<span class="badge bg-${color}">${status.replace(/_/g, ' ')}</span>`;
  },

  parseAddress(json) {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  },

  parseItems(json) {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  },

  isOverdue(nextDelivery) {
    if (!nextDelivery) return false;
    return new Date(nextDelivery) < new Date();
  }
};
