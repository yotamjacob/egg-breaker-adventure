// Paste into the DevTools console on the admin page (/admin), after logging in.
// Reads the Players list through the admin endpoint (it unpacks the compressed saves),
// keeps players above MIN eggs, and downloads two files:
//   top-players.csv   — email, user_id, eggs, last cloud save  (the mailing list)
//   gift-premium.sql  — run in Supabase → SQL Editor to grant the gift
// Nothing is written anywhere by this script; the SQL only runs when you run it.
(async () => {
  const MIN = 1000;
  const PRODUCTS = ['luckycharm', 'doubledaily'];
  const CAMPAIGN = 'gift-top-players-2026-10';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const res = await fetch(ADMIN_PLAYERS_FN, { headers: authHeaders() });
  if (!res.ok) throw new Error('admin-players HTTP ' + res.status + ' — log in first');
  const players = await res.json();
  const top = players
    .filter(p => p.email && UUID.test(p.user_id) && (p.stats?.totalEggs || 0) > MIN)
    .sort((a, b) => b.stats.totalEggs - a.stats.totalEggs);

  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = ['email,user_id,eggs,saved_at']
    .concat(top.map(p => [p.email, p.user_id, p.stats.totalEggs, p.saved_at].map(q).join(',')))
    .join('\n');

  // Same shape as grant-daily-product: restore-purchases finds rows by user_id, and the
  // game turns them on the next time the player opens Premium or signs in.
  // purchase_token is unique → re-running this is a no-op.
  const values = top.flatMap(p => PRODUCTS.map(pid => {
    const tok = `gift:${pid}:${p.user_id}`;
    return `  ('${CAMPAIGN}', '${pid}', '${tok}', '${tok}', '${p.user_id}', 'completed', false)`;
  }));
  const sql = values.length ? `-- ${top.length} players with more than ${MIN} eggs · gift: ${PRODUCTS.join(' + ')}
insert into play_purchases (device_id, product_id, purchase_token, order_id, user_id, status, disabled)
values
${values.join(',\n')}
on conflict (purchase_token) do nothing;

-- check: one row per player per product
select product_id, count(*) from play_purchases where device_id = '${CAMPAIGN}' group by product_id;
` : '-- no players matched\n';

  const save = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
  };
  save('top-players.csv', csv, 'text/csv');
  save('gift-premium.sql', sql, 'text/plain');
  console.table(top.map(p => ({ email: p.email, eggs: p.stats.totalEggs, saved: p.saved_at?.slice(0, 10) })));
  console.log(`${top.length} players above ${MIN} eggs (of ${players.length} with a cloud save)`);
})();
