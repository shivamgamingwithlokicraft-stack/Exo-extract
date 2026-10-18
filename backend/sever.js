// EcoExtract backend – Made by Shivam Singh Patel | NextGen AI Studio
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const HUB_KEY = process.env.HUB_KEY || 'change-me';
// ASSUMPTIONS – edit with real figures: price = ₹ per gram, co2 = kg CO2 saved per kg,
// pts = points per 100 g, binCap = bin capacity in grams
const RATES = {
  copper_cable: { price: 0.8, co2: 2.5, pts: 10, binCap: 5000 },
  printed_circuit_board: { price: 2.5, co2: 20, pts: 25, binCap: 3000 },
  lithium_battery: { price: 0.5, co2: 5, pts: 15, binCap: 2000 },
};

const db = {
  totals: { g: 0, value: 0, co2: 0, items: 0 },
  bins: { copper_cable: 0, printed_circuit_board: 0, lithium_battery: 0 },
  users: {}, hubs: {}, recent: [],
};

app.post('/api/v1/hub/deposit', (req, res) => {
  if (req.get('x-api-key') !== HUB_KEY) return res.status(401).json({ error: 'Invalid API key' });
  const { hub_id, user_id, detected_items } = req.body || {};
  if (!hub_id || !user_id || !Array.isArray(detected_items))
    return res.status(400).json({ error: 'hub_id, user_id and detected_items are required' });

  let g = 0, value = 0, co2 = 0, points = 0;
  for (const it of detected_items) {
    const r = RATES[it.item_type];
    const w = Number(it.estimated_weight_g);
    if (!r || !(w > 0) || it.confidence_score < 0.6) continue; // ignore unknown / low-confidence
    g += w;
    value += w * r.price;
    co2 += (w / 1000) * r.co2;
    points += Math.round((w / 100) * r.pts);
    db.bins[it.item_type] += (w / r.binCap) * 100;
    db.recent.unshift({ hub: hub_id, type: it.item_type, g: w, t: Date.now() });
  }
  db.recent = db.recent.slice(0, 10);
  db.totals.g += g; db.totals.value += value; db.totals.co2 += co2; db.totals.items += detected_items.length;
  const u = (db.users[user_id] ||= { name: user_id, points: 0, g: 0 });
  u.points += points; u.g += g;
  db.hubs[hub_id] = { lastSeen: Date.now() };
  res.json({ ok: true, weight_g: g, value_inr: +value.toFixed(2), co2_kg: +co2.toFixed(3), points });
});

app.get('/api/stats', (_req, res) => res.json({
  kg: db.totals.g / 1000, value: db.totals.value, co2: db.totals.co2,
  bins: Object.fromEntries(Object.entries(db.bins).map(([k, v]) => [k, Math.min(100, Math.round(v))])),
  recent: db.recent, hubs: Object.keys(db.hubs).length,
}));

app.get('/api/leaderboard', (_req, res) => res.json(
  Object.values(db.users).sort((a, b) => b.points - a.points).slice(0, 20)
    .map((u, i) => ({ rank: i + 1, name: u.name, kg: +(u.g / 1000).toFixed(2), points: u.points }))
));

app.listen(process.env.PORT || 3000, () => console.log('EcoExtract running on http://localhost:3000'));
