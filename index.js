import express from 'express';
import cors from 'cors';

/* =========================================================
   CONFIG
   ========================================================= */
const DATASET_URL =
  'https://raw.githubusercontent.com/devjsn7/maismedicos-api/refs/heads/main/mais_medicos_sociedade_de_papel.json';

/* =========================================================
   CACHE + ÍNDICES (em memória, reutilizado entre invocações)
   ========================================================= */
const cache = {
  data: null,
  loadedAt: null,
  loading: null,
  index: {
    byCpf: new Map(),
    byCrm: new Map(),
    byNome: [],
    byUf: new Map(),
    byMunicipio: new Map(),
    byIbge: new Map(),
  },
};

/* =========================================================
   HELPERS
   ========================================================= */
function normalize(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCpf(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

function normalizeCrm(crm) {
  if (!crm) return '';
  return String(crm).replace(/\s+/g, '').toUpperCase();
}

function paginate(arr, req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
  const total = arr.length;
  const total_pages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const items = arr.slice(start, start + limit);
  return {
    paginacao: { page, limit, total, total_pages },
    items,
  };
}

/* =========================================================
   BUILD INDEX
   ========================================================= */
function buildIndex(medicos) {
  const byCpf = new Map();
  const byCrm = new Map();
  const byNome = [];
  const byUf = new Map();
  const byMunicipio = new Map();
  const byIbge = new Map();

  for (const medico of medicos) {
    const cpf = normalizeCpf(medico.cpf);
    if (cpf) {
      if (!byCpf.has(cpf)) byCpf.set(cpf, []);
      byCpf.get(cpf).push(medico);
    }

    if (medico.crm) {
      const crm = normalizeCrm(medico.crm);
      if (!byCrm.has(crm)) byCrm.set(crm, []);
      byCrm.get(crm).push(medico);
    }

    const nome = normalize(medico.nome_completo);
    byNome.push({ nome, medico });

    if (medico.uf) {
      const uf = normalize(medico.uf);
      if (!byUf.has(uf)) byUf.set(uf, []);
      byUf.get(uf).push(medico);
    }

    if (medico.municipio) {
      const mun = normalize(medico.municipio);
      if (!byMunicipio.has(mun)) byMunicipio.set(mun, []);
      byMunicipio.get(mun).push(medico);
    }

    for (const oc of medico.ocorrencias || []) {
      if (oc.ibge) {
        const ibge = String(oc.ibge).trim();
        if (!byIbge.has(ibge)) byIbge.set(ibge, []);
        const arr = byIbge.get(ibge);
        if (!arr.includes(medico)) arr.push(medico);
      }
    }
  }

  byNome.sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));

  return { byCpf, byCrm, byNome, byUf, byMunicipio, byIbge };
}

/* =========================================================
   LOAD DATA (memoizado)
   ========================================================= */
async function loadData(force = false) {
  if (cache.data && !force) return cache.data;
  if (cache.loading) return cache.loading;

  cache.loading = (async () => {
    console.log('[loader] Baixando dataset...');
    const res = await fetch(DATASET_URL);
    if (!res.ok) throw new Error(`Falha ao baixar dataset: HTTP ${res.status}`);
    const json = await res.json();
    const medicos = json.medicos || [];
    console.log(`[loader] Indexando ${medicos.length} médicos...`);
    cache.index = buildIndex(medicos);
    cache.data = json;
    cache.loadedAt = new Date().toISOString();
    cache.loading = null;
    console.log('[loader] OK.');
    return json;
  })();

  return cache.loading;
}

/* =========================================================
   APP
   ========================================================= */
const app = express();
app.use(cors());
app.use(express.json());

// Garante que o dataset esteja carregado antes de qualquer rota
app.use(async (req, res, next) => {
  try {
    await loadData();
    next();
  } catch (err) {
    console.error('Erro carregando dataset:', err);
    res.status(500).json({ erro: 'Falha ao carregar dataset', detalhe: String(err.message || err) });
  }
});

/* =========================================================
   ROTAS
   ========================================================= */

// Docs
app.get('/', (_req, res) => {
  res.json({
    nome: 'Mais Médicos API',
    versao: '1.0.0',
    endpoints: {
      'GET /api/health': 'Health check',
      'GET /api/status': 'Status do cache/dataset',
      'GET /api/sumario': 'Sumário original do dataset',
      'GET /api/medicos': 'Lista paginada (?page=1&limit=50)',
      'GET /api/medicos/buscar':
        'Busca livre: ?nome=&uf=&municipio=&cpf=&crm=&ibge=&fonte=&page=&limit=',
      'GET /api/medicos/cpf/:cpf': 'Busca por CPF',
      'GET /api/medicos/crm/:crm': 'Busca por CRM',
      'GET /api/medicos/ibge/:codigo': 'Busca por código IBGE',
      'GET /api/medicos/uf/:uf': 'Médicos por UF',
      'GET /api/medicos/municipio/:nome': 'Médicos por município',
      'GET /api/ufs': 'Lista de UFs com contagem',
      'GET /api/municipios?uf=CE': 'Lista de municípios',
      'GET /api/fontes': 'Lista de fontes com contagem',
    },
  });
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Status
app.get('/api/status', (_req, res) => {
  res.json({
    loaded: !!cache.data,
    loaded_at: cache.loadedAt,
    medicos_total: cache.data?.sumario?.medicos_total ?? null,
    titulares_total: cache.data?.sumario?.titulares_total ?? null,
    fontes: cache.data?.sumario?.origens_dados?.length ?? null,
  });
});

// Sumário
app.get('/api/sumario', (_req, res) => {
  res.json(cache.data?.sumario || {});
});

// Lista geral paginada
app.get('/api/medicos', (req, res) => {
  const medicos = cache.data?.medicos || [];
  res.json(paginate(medicos, req));
});

// Busca livre
app.get('/api/medicos/buscar', (req, res) => {
  const { byCpf, byCrm, byIbge, byUf, byMunicipio, byNome } = cache.index;
  const { nome, uf, municipio, cpf, crm, ibge, fonte } = req.query;

  let base;
  if (cpf) base = byCpf.get(normalizeCpf(cpf)) || [];
  else if (crm) base = byCrm.get(normalizeCrm(crm)) || [];
  else if (ibge) base = byIbge.get(String(ibge).trim()) || [];
  else if (uf) base = byUf.get(normalize(uf)) || [];
  else if (municipio) base = byMunicipio.get(normalize(municipio)) || [];
  else base = byNome.map((x) => x.medico);

  let result = base;

  if (nome) {
    const n = normalize(nome);
    result = result.filter((m) => normalize(m.nome_completo).includes(n));
  }
  if (uf) {
    const u = normalize(uf);
    result = result.filter((m) => normalize(m.uf) === u);
  }
  if (municipio) {
    const mu = normalize(municipio);
    result = result.filter((m) => normalize(m.municipio) === mu);
  }
  if (fonte) {
    const f = String(fonte);
    result = result.filter((m) => (m.fontes || []).includes(f));
  }

  res.json(paginate(result, req));
});

// Por CPF
app.get('/api/medicos/cpf/:cpf', (req, res) => {
  const cpf = normalizeCpf(req.params.cpf);
  const items = cache.index.byCpf.get(cpf) || [];
  if (!items.length) return res.status(404).json({ erro: 'CPF não encontrado', cpf });
  res.json({ total: items.length, items });
});

// Por CRM
app.get('/api/medicos/crm/:crm', (req, res) => {
  const crm = normalizeCrm(req.params.crm);
  const items = cache.index.byCrm.get(crm) || [];
  if (!items.length) return res.status(404).json({ erro: 'CRM não encontrado', crm });
  res.json({ total: items.length, items });
});

// Por IBGE
app.get('/api/medicos/ibge/:codigo', (req, res) => {
  const codigo = String(req.params.codigo).trim();
  const items = cache.index.byIbge.get(codigo) || [];
  if (!items.length) return res.status(404).json({ erro: 'IBGE não encontrado', codigo });
  res.json({ total: items.length, items });
});

// Por UF
app.get('/api/medicos/uf/:uf', (req, res) => {
  const uf = normalize(req.params.uf);
  const items = cache.index.byUf.get(uf) || [];
  if (!items.length) return res.status(404).json({ erro: 'UF não encontrada', uf });
  res.json({ total: items.length, ...paginate(items, req) });
});

// Por município
app.get('/api/medicos/municipio/:nome', (req, res) => {
  const mun = normalize(req.params.nome);
  const items = cache.index.byMunicipio.get(mun) || [];
  if (!items.length)
    return res.status(404).json({ erro: 'Município não encontrado', municipio: req.params.nome });
  res.json({ total: items.length, ...paginate(items, req) });
});

// Fallback: tenta CPF
app.get('/api/medicos/:cpf', (req, res) => {
  const cpf = normalizeCpf(req.params.cpf);
  const items = cache.index.byCpf.get(cpf) || [];
  if (!items.length) return res.status(404).json({ erro: 'Não encontrado', cpf });
  res.json({ total: items.length, items });
});

// UFs + contagem
app.get('/api/ufs', (_req, res) => {
  const out = [];
  for (const [uf, arr] of cache.index.byUf.entries()) {
    out.push({ uf: uf.toUpperCase(), total: arr.length });
  }
  out.sort((a, b) => a.uf.localeCompare(b.uf));
  res.json({ total: out.length, items: out });
});

// Municípios (filtro opcional por UF)
app.get('/api/municipios', (req, res) => {
  const { uf } = req.query;
  const map = new Map();

  const base = uf
    ? cache.index.byUf.get(normalize(uf)) || []
    : cache.data?.medicos || [];

  for (const m of base) {
    if (!m.municipio) continue;
    const key = `${m.uf || ''}|${m.municipio}`;
    map.set(key, (map.get(key) || 0) + 1);
  }

  const out = [...map.entries()].map(([k, total]) => {
    const [uf, municipio] = k.split('|');
    return { uf, municipio, total };
  });
  out.sort((a, b) => a.municipio.localeCompare(b.municipio));
  res.json({ total: out.length, items: out });
});

// Fontes + contagem
app.get('/api/fontes', (_req, res) => {
  const medicos = cache.data?.medicos || [];
  const map = new Map();
  for (const m of medicos) {
    for (const f of m.fontes || []) {
      map.set(f, (map.get(f) || 0) + 1);
    }
  }
  const out = [...map.entries()].map(([fonte, total]) => ({ fonte, total }));
  out.sort((a, b) => b.total - a.total);
  res.json({ total: out.length, items: out });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

/* =========================================================
   START (local)
   ========================================================= */
// Na Vercel, o módulo é exportado e não executado aqui.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n API rodando em http://localhost:${PORT}`);
    console.log(` Docs em   http://localhost:${PORT}/\n`);
  });
}

export default app;