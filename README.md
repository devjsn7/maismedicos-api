# Mais Medicos API

**Base URL:** `https://maismedicos-api.vercel.app`

API REST publica para consulta do dataset Mais Medicos. Busque medicos por **CPF, CRM, UF, IBGE, municipio, nome e fonte**.

---

## <i class="fa-solid fa-list"></i> Endpoints

| <i class="fa-solid fa-code"></i> Metodo | <i class="fa-solid fa-route"></i> Rota | <i class="fa-solid fa-circle-info"></i> Descricao |
|--------|------|-----------|
| <i class="fa-solid fa-heart-pulse"></i> GET | `/api/health` | Health check |
| <i class="fa-solid fa-signal"></i> GET | `/api/status` | Status do cache |
| <i class="fa-solid fa-file-lines"></i> GET | `/api/sumario` | Sumario do dataset |
| <i class="fa-solid fa-users"></i> GET | `/api/medicos` | Lista paginada |
| <i class="fa-solid fa-id-card"></i> GET | `/api/medicos/cpf/:cpf` | Busca por CPF |
| <i class="fa-solid fa-id-badge"></i> GET | `/api/medicos/crm/:crm` | Busca por CRM |
| <i class="fa-solid fa-location-dot"></i> GET | `/api/medicos/ibge/:codigo` | Busca por IBGE |
| <i class="fa-solid fa-map"></i> GET | `/api/medicos/uf/:uf` | Medicos por UF |
| <i class="fa-solid fa-city"></i> GET | `/api/medicos/municipio/:nome` | Medicos por municipio |
| <i class="fa-solid fa-magnifying-glass"></i> GET | `/api/medicos/buscar` | Busca combinada |
| <i class="fa-solid fa-flag"></i> GET | `/api/ufs` | UFs + contagem |
| <i class="fa-solid fa-building"></i> GET | `/api/municipios?uf=CE` | Municipios |
| <i class="fa-solid fa-database"></i> GET | `/api/fontes` | Fontes + contagem |

---

## <i class="fa-solid fa-layer-group"></i> Paginacao

`?page=1&limit=50` — maximo `500`.

---

## <i class="fa-solid fa-sliders"></i> Busca combinada

```
/api/medicos/buscar?nome=&uf=&municipio=&cpf=&crm=&ibge=&fonte=&page=&limit=
```

Todos os filtros sao opcionais e combinaveis.

---

## <i class="fa-solid fa-terminal"></i> Exemplos

```bash
curl https://maismedicos-api.vercel.app/api/medicos/cpf/00001795317
curl "https://maismedicos-api.vercel.app/api/medicos/uf/CE?limit=20"
curl "https://maismedicos-api.vercel.app/api/medicos/buscar?nome=maria&uf=CE"
curl https://maismedicos-api.vercel.app/api/medicos/ibge/230440
curl https://maismedicos-api.vercel.app/api/ufs
curl "https://maismedicos-api.vercel.app/api/municipios?uf=CE"
```

---

## <i class="fa-solid fa-reply"></i> Resposta

```json
{
  "paginacao": { "page": 1, "limit": 50, "total": 1052, "total_pages": 22 },
  "items": [ { "cpf": "...", "nome_completo": "...", "uf": "CE", "municipio": "FORTALEZA" } ]
}
```

---

## <i class="fa-solid fa-triangle-exclamation"></i> Erros

| <i class="fa-solid fa-hashtag"></i> Codigo | <i class="fa-solid fa-circle-info"></i> Significado |
|--------|-------------|
| <i class="fa-solid fa-circle-check"></i> 200 | OK |
| <i class="fa-solid fa-circle-xmark"></i> 404 | Nao encontrado |
| <i class="fa-solid fa-bug"></i> 500 | Falha ao carregar dataset |

```json
{ "erro": "CPF nao encontrado", "cpf": "00001795317" }
```

---

## <i class="fa-solid fa-circle-info"></i> Notas

- <i class="fa-solid fa-lock-open"></i> Sem autenticacao, CORS liberado.
- <i class="fa-solid fa-font"></i> Busca ignora acentos e caixa (`ce` = `CE`).
- <i class="fa-solid fa-id-card"></i> CPF aceita com ou sem pontuacao.
- <i class="fa-solid fa-bolt"></i> Cache em memoria — 1a chamada ~2s, seguintes instantaneas.

---

<i class="fa-solid fa-database"></i> **Dataset:** 6.967 medicos · 2013–2016 · <i class="fa-brands fa-github"></i> [GitHub](https://github.com/devjsn7/maismedicos-api) · <i class="fa-brands fa-discord"></i> `jsndev`
