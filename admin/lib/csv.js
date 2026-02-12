export function generatePirateshipCSV(orders) {
  const headers = [
    'Order ID',
    'Name',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Zip Code',
    'Country',
    'Email',
    'Phone',
    'Weight (oz)',
    'Items',
    'Order Total'
  ];

  const rows = orders.map(order => {
    const addr = parseAddress(order.shipping_address);
    const items = parseItems(order.items);
    const itemSummary = items.map(i => `${i.quantity || 1}x ${i.name || 'item'}`).join('; ');

    return [
      order.id,
      escapeCsv(order.shipping_name || order.customer_name || ''),
      escapeCsv(addr?.line1 || ''),
      escapeCsv(addr?.line2 || ''),
      escapeCsv(addr?.city || ''),
      escapeCsv(addr?.state || ''),
      escapeCsv(addr?.postal_code || ''),
      'US',
      escapeCsv(order.customer_email || ''),
      '',
      estimateWeight(items),
      escapeCsv(itemSummary),
      ((order.total_cents + (order.shipping_cents || 0)) / 100).toFixed(2)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function parseAddress(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function parseItems(json) {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function escapeCsv(str) {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function estimateWeight(items) {
  let totalOz = 0;
  for (const item of items) {
    const qty = item.quantity || 1;
    totalOz += qty * 8;
  }
  return totalOz || 8;
}
