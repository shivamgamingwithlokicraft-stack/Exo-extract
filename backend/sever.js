/* ============================================================
   EcoExtract — Backend API Server
   ============================================================
   Node.js + Express REST API for e-waste collection records.

   Endpoints:
     GET    /api/health          Server status
     GET    /api/materials       Material catalog
     GET    /api/records         All records (with optional ?limit=)
     POST   /api/records         Create new record
     DELETE /api/records/:id     Delete record by ID
     GET    /api/summary         Totals and breakdown
     POST   /api/impact          CO₂e estimate (requires factor)
     GET    /api/export.csv      CSV export of all records

   Deployable to: Railway, Render, Fly.io, Heroku, Vercel (Node),
                  or any Node.js host.

   Local test:
     npm install
     npm start
     → http://localhost:3000/api/health

   By: Shivam Singh Patel | NextGen AI Studio
============================================================ */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

/* ── App setup ──────────────────────────────────────────── */
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/* ── Middleware ─────────────────────────────────────────── */
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Basic request logger (dev mode only)
if (NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${req.method} ${req.path}`);
    next();
  });
}

// Serve the frontend static files if they're in the sibling folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ── In-memory storage ──────────────────────────────────── */
// For a real deployment, replace this with a database (SQLite, Postgres, MongoDB).
// For the school demo, in-memory is perfect — it resets on server restart,
// which is fine because it's a demonstration API.
const records = [];
let recordCounter = 0;

/* ── Material catalog (mirrors the frontend) ───────────── */
const MATERIALS = {
  pcb: {
    name: 'Printed Circuit Board',
    bin: 'PCB Safe-Box',
    value_per_kg: 350,
    category: 'e-waste',
    icon: '▦'
  },
  copper: {
    name: 'Copper Wires & Cables',
    bin: 'Copper Bin',
    value_per_kg: 600,
    category: 'metal',
    icon: '◎'
  },
  battery: {
    name: 'Lithium-Ion Battery',
    bin: 'Lithium Cell Box',
    value_per_kg: 120,
    category: 'battery',
    icon: '▰'
  },
  gold: {
    name: 'Gold-bearing Components',
    bin: 'Gold Recovery Box',
    value_per_kg: 4200,
    category: 'metal',
    icon: 'Au'
  },
  mixed: {
    name: 'Mixed Electronic Waste',
    bin: 'Manual Review Bay',
    value_per_kg: 80,
    category: 'e-waste',
    icon: '♻'
  }
};

/* ── Helper: build a full record object ────────────────── */
function buildRecord(category, grams, extra = {}) {
  const material = MATERIALS[category];
  const mass = Number(grams);
  return {
    id: 'rec_' + (++recordCounter).toString().padStart(6, '0'),
    timestamp: new Date().toISOString(),
    category,
    material: material.name,
    bin: material.bin,
    grams: mass,
    kg: mass / 1000,
    estimated_value_inr: Math.round((mass / 1000) * material.value_per_kg),
    signature: String(extra.signature || '').trim(),
    model_label: String(extra.model_label || ''),
    model_score: Number.isFinite(Number(extra.model_score)) ? Number(extra.model_score) : null,
    image_name: String(extra.image_name || '')
  };
}

/* ── Helper: escape CSV cell ───────────────────────────── */
function csvEscape(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

/* ============================================================
   ROUTES
============================================================ */

/* ── Root ──────────────────────────────────────────────── */
app.get('/', (req, res) => {
  res.json({
    service: 'EcoExtract API',
    version: '1.0.0',
    message: 'Welcome to the EcoExtract backend.',
    endpoints: [
      'GET  /api/health',
      'GET  /api/materials',
      'GET  /api/records',
      'POST /api/records',
      'DELETE /api/records/:id',
      'GET  /api/summary',
      'POST /api/impact',
      'GET  /api/export.csv'
    ]
  });
});

/* ── GET /api/health ───────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EcoExtract API',
    version: '1.0.0',
    environment: NODE_ENV,
    uptime_seconds: Math.floor(process.uptime()),
    records_stored: records.length,
    timestamp: new Date().toISOString()
  });
});

/* ── GET /api/materials ───────────────────────────────── */
app.get('/api/materials', (req, res) => {
  res.json(MATERIALS);
});

/* ── GET /api/records ─────────────────────────────────── */
app.get('/api/records', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const sorted = records.slice().sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  res.json({
    count: sorted.length,
    total_returned: Math.min(sorted.length, limit),
    records: sorted.slice(0, limit)
  });
});

/* ── POST /api/records ────────────────────────────────── */
app.post('/api/records', (req, res) => {
  const body = req.body || {};
  const { category, grams, signature, model_label, model_score, image_name } = body;

  // Validate category
  if (!category || !MATERIALS[category]) {
    return res.status(400).json({
      error: 'Invalid category',
      message: 'category must be one of: ' + Object.keys(MATERIALS).join(', '),
      received: category
    });
  }

  // Validate mass
  const mass = Number(grams);
  if (!Number.isFinite(mass) || mass <= 0) {
    return res.status(400).json({
      error: 'Invalid mass',
      message: 'grams must be a positive number',
      received: grams
    });
  }
  if (mass > 1_000_000) {
    return res.status(400).json({
      error: 'Mass too large',
      message: 'grams must not exceed 1,000,000 (1000 kg per record)'
    });
  }

  const record = buildRecord(category, mass, {
    signature,
    model_label,
    model_score,
    image_name
  });

  records.push(record);

  res.status(201).json({
    success: true,
    message: 'Record created',
    record
  });
});

/* ── DELETE /api/records/:id ──────────────────────────── */
app.delete('/api/records/:id', (req, res) => {
  const id = req.params.id;
  const index = records.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: 'Record not found',
      id
    });
  }

  const [removed] = records.splice(index, 1);
  res.json({
    success: true,
    message: 'Record deleted',
    deleted: removed
  });
});

/* ── GET /api/summary ─────────────────────────────────── */
app.get('/api/summary', (req, res) => {
  let totalGrams = 0;
  let totalValue = 0;
  const byCategory = {};
  const byBin = {};

  for (const record of records) {
    totalGrams += record.grams;
    totalValue += record.estimated_value_inr;
    byCategory[record.category] = (byCategory[record.category] || 0) + record.grams;
    byBin[record.bin] = (byBin[record.bin] || 0) + record.grams;
  }

  res.json({
    record_count: records.length,
    total_grams: totalGrams,
    total_kg: Number((totalGrams / 1000).toFixed(3)),
    total_estimated_value_inr: totalValue,
    by_category_grams: byCategory,
    by_bin_grams: byBin,
    generated_at: new Date().toISOString()
  });
});

/* ── POST /api/impact ─────────────────────────────────── */
app.post('/api/impact', (req, res) => {
  const body = req.body || {};
  const factor = Number(body.emission_factor);

  if (!Number.isFinite(factor) || factor <= 0) {
    return res.status(400).json({
      error: 'Invalid emission_factor',
      message: 'emission_factor must be a positive number (kg CO₂e per kg collected)',
      received: body.emission_factor
    });
  }
  if (factor > 1_000_000) {
    return res.status(400).json({
      error: 'Factor too large',
      message: 'emission_factor must not exceed 1,000,000'
    });
  }

  const totalKg = records.reduce((sum, r) => sum + r.kg, 0);
  const estimatedCO2e = totalKg * factor;

  res.json({
    record_count: records.length,
    total_kg: Number(totalKg.toFixed(3)),
    emission_factor_kgco2_per_kg: factor,
    estimated_co2e_kg: Number(estimatedCO2e.toFixed(4)),
    note: 'Estimate is only as reliable as the emission factor source. Cite your factor.',
    generated_at: new Date().toISOString()
  });
});

/* ── GET /api/export.csv ──────────────────────────────── */
app.get('/api/export.csv', (req, res) => {
  const headers = [
    'id',
    'timestamp',
    'material',
    'category',
    'grams',
    'kg',
    'bin',
    'estimated_value_inr',
    'model_label',
    'model_score',
    'image_name',
    'signature'
  ];

  const rows = records.map(record =>
    headers.map(h => csvEscape(record[h])).join(',')
  );

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  const filename = `ecoextract-records-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

/* ── 404 for unknown /api/ routes ─────────────────────── */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    hint: 'See GET / for the list of available endpoints'
  });
});

/* ── Fallback: serve frontend index.html for non-API routes ─ */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
        hint: 'Frontend files not found. See /api/health for API status.'
      });
    }
  });
});

/* ── Global error handler ─────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('[EcoExtract API Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    timestamp: new Date().toISOString()
  });
});

/* ── Start server ─────────────────────────────────────── */
const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ⌬  EcoExtract API Server');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Status:    RUNNING`);
  console.log(`  Port:      ${PORT}`);
  console.log(`  Env:       ${NODE_ENV}`);
  console.log(`  URL:       ${url}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`    GET    ${url}/api/health`);
  console.log(`    GET    ${url}/api/materials`);
  console.log(`    GET    ${url}/api/records`);
  console.log(`    POST   ${url}/api/records`);
  console.log(`    DELETE ${url}/api/records/:id`);
  console.log(`    GET    ${url}/api/summary`);
  console.log(`    POST   ${url}/api/impact`);
  console.log(`    GET    ${url}/api/export.csv`);
  console.log('');
  console.log('  Ready to accept requests.');
  console.log('');
});

/* ── Graceful shutdown ────────────────────────────────── */
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('[SHUTDOWN] Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after 10s.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/* ── Export for testing ───────────────────────────────── */
module.exports = app;
