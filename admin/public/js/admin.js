document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => {
      if (!confirm(el.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });

  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', e => {
      if (!confirm(form.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });

  // Bulk order selection
  const selectAll = document.getElementById('select-all');
  const bulkBar = document.getElementById('bulk-bar');
  if (selectAll && bulkBar) {
    const checks = document.querySelectorAll('.order-check');
    selectAll.addEventListener('change', () => {
      checks.forEach(cb => { cb.checked = selectAll.checked; });
      updateBulkBar();
    });
    checks.forEach(cb => cb.addEventListener('change', updateBulkBar));
  }
});

function updateBulkBar() {
  const checks = document.querySelectorAll('.order-check:checked');
  const bar = document.getElementById('bulk-bar');
  const count = document.getElementById('bulk-count');
  if (!bar || !count) return;
  if (checks.length > 0) {
    bar.style.cssText = '';
    count.textContent = checks.length;
  } else {
    bar.style.display = 'none';
    bar.style.cssText = 'display: none !important;';
  }
}

function submitBulk(status) {
  const checks = document.querySelectorAll('.order-check:checked');
  if (checks.length === 0) return;
  if (!confirm(`Mark ${checks.length} order(s) as ${status}?`)) return;
  document.getElementById('bulk-status-val').value = status;
  const container = document.getElementById('bulk-ids');
  container.innerHTML = '';
  checks.forEach(cb => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'ids[]';
    input.value = cb.value;
    container.appendChild(input);
  });
  document.getElementById('bulk-form').submit();
}

function copyShipping(btn, json) {
  const a = JSON.parse(json);
  const lines = [a.name];
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  lines.push([a.city, a.state].filter(Boolean).join(', ') + ' ' + a.zip);
  const text = lines.join('\n');
  // execCommand fallback for HTTP (navigator.clipboard requires HTTPS)
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
  btn.classList.replace('btn-outline-secondary', 'btn-success');
  setTimeout(() => { btn.innerHTML = orig; btn.classList.replace('btn-success', 'btn-outline-secondary'); }, 1500);
}
