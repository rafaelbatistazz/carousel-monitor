/* ============================================================
   CAROUSEL MONITOR — Main Application
   Connects directly to Supabase (anon key + service role)
   ============================================================ */

'use strict';

// ── Config ──────────────────────────────────────────────────
const SUPABASE_URL  = 'https://lhbwfbquxkutcyqazpnw.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYndmYnF1eGt1dGN5cWF6cG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUyNzkxOSwiZXhwIjoyMDY2MTAzOTE5fQ.0hMpegSa7vM5lfSr70OS0dvJAHurZdwH9ufp-NIAe5U';
const TABLE         = '@rafaelbatistaz Conteudo';
const PAGE_SIZE     = 50;

// ── Supabase client ──────────────────────────────────────────
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── State ────────────────────────────────────────────────────
const state = {
  all:          [],   // all loaded records
  filtered:     [],   // after client-side filters
  page:         0,
  sortCol:      'data_extracao',
  sortDir:      'desc',
  tab:          'conteudos',
  roteiroFiltered: [],
};

// ── DOM Refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const statusDot  = $('statusDot');
const statusText = $('statusText');
const refreshBtn = $('refreshBtn');
const kpiRow     = $('kpiRow');

// ── Utilities ────────────────────────────────────────────────
const fmt = {
  date: s => s ? new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—',
  dateShort: s => s ? new Date(s).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—',
  trunc: (s, n=80) => s ? (s.length > n ? s.slice(0, n) + '…' : s) : '—',
  badge: status => {
    const key = (status || 'default').toLowerCase().replace(/\s+/g, '_');
    const cls  = ['postado','publicado','pendente','aguardando_aprovacao','rejeitado','extraido','criado'].includes(key) ? key : 'default';
    const labels = {
      postado: 'Postado', publicado: 'Publicado', pendente: 'Pendente',
      aguardando_aprovacao: 'Aguard. Aprov.', rejeitado: 'Rejeitado',
      extraido: 'Extraído', criado: 'Criado', default: status || '?',
    };
    return `<span class="badge badge-${cls}">${labels[cls] ?? status}</span>`;
  },
  score: (n, showBar = true) => {
    if (n == null) return '<span class="cell-mono">—</span>';
    const pct  = Math.min(100, Math.max(0, n));
    const tier = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
    if (!showBar) return `<span class="score-num ${tier === 'high' ? 'high' : tier === 'low' ? 'low' : ''}">${n}</span>`;
    return `
      <div class="score-cell">
        <div class="score-bar-track"><div class="score-bar-fill ${tier}" style="width:${pct}%"></div></div>
        <span class="score-num ${tier === 'high' ? 'high' : tier === 'low' ? 'low' : ''}">${n}</span>
      </div>`;
  },
  platform: p => ({ instagram: '📷', facebook: '📘', linkedin: '💼', tiktok: '🎵' }[p] || '🌐'),
};

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Status indicator ─────────────────────────────────────────
function setStatus(type, msg) {
  statusDot.className  = 'status-dot ' + type;
  statusText.textContent = msg;
}

// ── Data Loading ─────────────────────────────────────────────
async function loadAll() {
  setStatus('loading', 'Carregando...');
  refreshBtn.classList.add('spinning');

  try {
    const batchSize = 1000;
    let offset = 0, rows = [];
    while (true) {
      const { data, error } = await sb
        .from(TABLE)
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      rows = rows.concat(data || []);
      if (!data || data.length < batchSize) break;
      offset += batchSize;
    }

    state.all = rows;
    setStatus('online', `Atualizado ${fmt.date(new Date().toISOString())} · ${rows.length} registros`);
    renderAll();
  } catch (err) {
    console.error(err);
    setStatus('error', 'Erro ao conectar com Supabase');
    kpiRow.innerHTML = `<div class="kpi-card" style="grid-column:1/-1;--kpi-color:var(--red)">
      <div class="kpi-label">Erro de conexão</div>
      <div class="kpi-value" style="font-size:14px">${esc(err.message)}</div>
    </div>`;
  } finally {
    refreshBtn.classList.remove('spinning');
  }
}

// ── Render All ───────────────────────────────────────────────
function renderAll() {
  buildFilterOptions();
  renderKpis();
  applyFilters();
  renderPublications();
}

// ── Build Filter Dropdowns ───────────────────────────────────
function buildFilterOptions() {
  const statuses   = [...new Set(state.all.map(r => r.status).filter(Boolean))].sort();
  const plataformas= [...new Set(state.all.map(r => r.plataforma).filter(Boolean))].sort();
  const arrobas    = [...new Set(state.all.map(r => r.arroba_referencia).filter(Boolean))].sort();

  populateSelect($('filterStatus'),    statuses);
  populateSelect($('filterPlataforma'),plataformas);
  populateSelect($('filterArroba'),    arrobas);
  populateSelect($('filterRoteiroStatus'), statuses);
}

function populateSelect(el, values) {
  const cur = el.value;
  const first = el.options[0].outerHTML;
  el.innerHTML = first + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (values.includes(cur)) el.value = cur;
}

// ── KPI Cards ────────────────────────────────────────────────
function renderKpis() {
  const data = state.all;
  const byStatus = {};
  data.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });

  const avgScore = (() => {
    const valid = data.filter(r => r.engagement_score != null);
    if (!valid.length) return null;
    return Math.round(valid.reduce((s, r) => s + r.engagement_score, 0) / valid.length);
  })();

  const kpis = [
    { label: 'Total', value: data.length, color: 'var(--amber)', sub: 'registros' },
    { label: 'Extraídos',  value: byStatus['extraido'] || 0,  color: 'var(--blue)',   sub: 'status' },
    { label: 'Criados',    value: byStatus['criado']   || 0,  color: 'var(--purple)', sub: 'status' },
    { label: 'Postados',   value: byStatus['postado']  || 0,  color: 'var(--green)',  sub: 'status' },
    { label: 'Pendentes',  value: byStatus['pendente'] || 0,  color: 'var(--yellow)', sub: 'status' },
    { label: 'Aguard. Aprov.', value: byStatus['aguardando_aprovacao'] || 0, color: 'var(--yellow)', sub: 'status' },
    { label: 'Rejeitados', value: byStatus['rejeitado']|| 0,  color: 'var(--red)',    sub: 'status' },
    { label: 'Score Médio',value: avgScore ?? '—',             color: 'var(--amber)',  sub: 'engagement' },
  ];

  kpiRow.innerHTML = kpis.map((k, i) => `
    <div class="kpi-card" style="--kpi-color:${k.color};animation-delay:${i * 60}ms">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" data-target="${k.value}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join('');

  // Animate number counters
  kpiRow.querySelectorAll('.kpi-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (!Number.isFinite(target)) return;
    animateCount(el, 0, target, 800);
  });
}

function animateCount(el, from, to, duration) {
  const start = performance.now();
  const tick = now => {
    const p = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Filters ──────────────────────────────────────────────────
function applyFilters() {
  const st      = $('filterStatus').value;
  const plat    = $('filterPlataforma').value;
  const arroba  = $('filterArroba').value;
  const minScore= parseInt($('filterScore').value) || 0;
  const q       = $('filterSearch').value.toLowerCase().trim();

  state.filtered = state.all.filter(r => {
    if (st     && r.status           !== st)    return false;
    if (plat   && r.plataforma       !== plat)  return false;
    if (arroba && r.arroba_referencia!== arroba) return false;
    if (minScore && (r.engagement_score || 0) < minScore) return false;
    if (q) {
      const hay = [r.titulo, r.tema, r.arroba_referencia, r.shortcode].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Sort
  state.filtered.sort((a, b) => {
    let av = a[state.sortCol], bv = b[state.sortCol];
    if (av == null) av = '';
    if (bv == null) bv = '';
    if (typeof av === 'number') return state.sortDir === 'asc' ? av - bv : bv - av;
    return state.sortDir === 'asc'
      ? String(av).localeCompare(String(bv), 'pt-BR')
      : String(bv).localeCompare(String(av), 'pt-BR');
  });

  state.page = 0;
  renderContentTable();
  renderPagination();
  $('contentCount').textContent = `${state.filtered.length} de ${state.all.length}`;

  // Roteiros
  applyRoteiroFilters();
}

function applyRoteiroFilters() {
  const st = $('filterRoteiroStatus').value;
  const q  = $('filterRoteiroSearch').value.toLowerCase().trim();
  const roteiroSource = state.all.filter(r => r.novo_script);

  state.roteiroFiltered = roteiroSource.filter(r => {
    if (st && r.status !== st) return false;
    if (q) {
      const hay = [r.titulo, r.arroba_referencia, r.novo_script].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $('roteiroCount').textContent = `${state.roteiroFiltered.length} roteiros`;
  renderRoteiros();
}

// ── Content Table ────────────────────────────────────────────
function renderContentTable() {
  const tbody = $('contentBody');
  const start = state.page * PAGE_SIZE;
  const rows  = state.filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state">
      <div class="empty-icon">◈</div>
      <p>Nenhum registro encontrado com esses filtros.</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const thumb = r.imagens_referencia_webp?.[0] || r.links_cards_origem?.[0];
    const thumbHtml = thumb
      ? `<img class="thumb-img" src="${esc(thumb)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'thumb-placeholder\\'>⬡</div>'">`
      : `<div class="thumb-placeholder">${fmt.platform(r.plataforma)}</div>`;

    const metrics = r.metadata?.metrics || {};
    const likes   = metrics.likes    ?? null;
    const comments= metrics.comments ?? null;
    const views   = metrics.videoViewCount ?? metrics.videoPlayCount ?? null;

    const fmtMetric = (n, icon) => n != null
      ? `<span class="metric-chip">${icon} ${n.toLocaleString('pt-BR')}</span>`
      : `<span class="metric-chip dim">${icon} —</span>`;

    const links = [];
    if (r.link_conteudo)           links.push(`<a class="link-chip" href="${esc(r.link_conteudo)}" target="_blank" rel="noopener">↗ orig</a>`);
    if (r.publicado_url_instagram) links.push(`<a class="link-chip" href="${esc(r.publicado_url_instagram)}" target="_blank" rel="noopener">📷 ig</a>`);
    if (r.publicado_url_facebook)  links.push(`<a class="link-chip" href="${esc(r.publicado_url_facebook)}"  target="_blank" rel="noopener">📘 fb</a>`);
    if (r.publicado_url_linkedin)  links.push(`<a class="link-chip" href="${esc(r.publicado_url_linkedin)}"  target="_blank" rel="noopener">💼 li</a>`);
    links.push(`<button class="link-chip" onclick="openModal('${r.id}')">⬡ det</button>`);

    return `<tr>
      <td class="col-thumb">${thumbHtml}</td>
      <td><div class="cell-title" onclick="openModal('${r.id}')" title="${esc(r.titulo)}">${esc(fmt.trunc(r.titulo, 70))}</div></td>
      <td>${fmt.badge(r.status)}</td>
      <td><span class="cell-mono">${esc(r.arroba_referencia || '—')}</span></td>
      <td>${fmt.score(r.engagement_score)}</td>
      <td class="metrics-cell">${fmtMetric(likes, '♥')}${fmtMetric(comments, '💬')}${fmtMetric(views, '▶')}</td>
      <td><span class="cell-mono">${esc(r.plataforma || '—')}</span></td>
      <td><span class="cell-mono" style="color:var(--text-dim)">${esc(fmt.trunc(r.template_usado, 20))}</span></td>
      <td><span class="cell-mono">${fmt.date(r.data_extracao || r.created_at)}</span></td>
      <td><div class="link-cell">${links.join('')}</div></td>
    </tr>`;
  }).join('');
}

// ── Pagination ───────────────────────────────────────────────
function renderPagination() {
  const total = Math.ceil(state.filtered.length / PAGE_SIZE);
  const pg    = $('contentPagination');
  if (total <= 1) { pg.innerHTML = ''; return; }

  const start  = Math.max(0, state.page - 2);
  const end    = Math.min(total, start + 5);
  const pages  = [];

  pages.push(`<button class="page-btn" onclick="goPage(${state.page - 1})" ${state.page === 0 ? 'disabled' : ''}>←</button>`);

  if (start > 0) pages.push(`<button class="page-btn" onclick="goPage(0)">1</button><span class="page-info">…</span>`);

  for (let i = start; i < end; i++) {
    pages.push(`<button class="page-btn ${i === state.page ? 'active' : ''}" onclick="goPage(${i})">${i + 1}</button>`);
  }

  if (end < total) pages.push(`<span class="page-info">…</span><button class="page-btn" onclick="goPage(${total - 1})">${total}</button>`);

  pages.push(`<button class="page-btn" onclick="goPage(${state.page + 1})" ${state.page === total - 1 ? 'disabled' : ''}>→</button>`);
  pages.push(`<span class="page-info">${state.page * PAGE_SIZE + 1}–${Math.min((state.page + 1) * PAGE_SIZE, state.filtered.length)} / ${state.filtered.length}</span>`);

  pg.innerHTML = pages.join('');
}

window.goPage = function(p) {
  const total = Math.ceil(state.filtered.length / PAGE_SIZE);
  state.page  = Math.max(0, Math.min(total - 1, p));
  renderContentTable();
  renderPagination();
  document.querySelector('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── Roteiros ─────────────────────────────────────────────────
function renderRoteiros() {
  const grid = $('roteiroGrid');
  const items = state.roteiroFiltered;

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">◎</div>
      <p>Nenhum roteiro encontrado. Roteiros aparecem quando o campo <code>novo_script</code> é preenchido.</p>
    </div>`;
    return;
  }

  grid.innerHTML = items.map((r, i) => `
    <article class="roteiro-card" style="animation-delay:${i * 40}ms">
      <div class="roteiro-card-head">
        <div>
          <div class="roteiro-title">${esc(fmt.trunc(r.titulo, 90))}</div>
          <div class="roteiro-meta">
            ${fmt.badge(r.status)}
            <span class="cell-mono">${esc(r.arroba_referencia || '—')}</span>
            <span class="cell-mono" style="color:var(--text-dim)">${fmt.dateShort(r.updated_at)}</span>
          </div>
        </div>
        ${fmt.score(r.engagement_score, false)}
      </div>
      <div class="roteiro-body">
        ${r.texto_cards ? `
          <div class="roteiro-section-label">Texto dos Cards</div>
          <div class="roteiro-text" id="cards-${i}">${esc(r.texto_cards)}</div>
          <button class="roteiro-expand-btn" onclick="toggleRoteiro('cards-${i}', this)">Ver tudo ▾</button>
        ` : ''}
        <div class="roteiro-section-label" style="margin-top:${r.texto_cards ? '12px' : '0'}">Roteiro de Atendimento</div>
        <div class="roteiro-text" id="script-${i}">${esc(r.novo_script || '')}</div>
        <button class="roteiro-expand-btn" onclick="toggleRoteiro('script-${i}', this)">Ver tudo ▾</button>
      </div>
    </article>
  `).join('');
}

window.toggleRoteiro = function(id, btn) {
  const el = document.getElementById(id);
  el.classList.toggle('expanded');
  btn.textContent = el.classList.contains('expanded') ? 'Recolher ▴' : 'Ver tudo ▾';
};

// ── Publications ─────────────────────────────────────────────
function renderPublications() {
  const grid = $('pubGrid');
  const data = state.all;

  const platforms = [
    { key: 'instagram', icon: '📷', color: 'var(--amber)',  urlKey: 'publicado_url_instagram', label: 'Instagram' },
    { key: 'facebook',  icon: '📘', color: 'var(--blue)',   urlKey: 'publicado_url_facebook',  label: 'Facebook' },
    { key: 'linkedin',  icon: '💼', color: 'var(--purple)', urlKey: 'publicado_url_linkedin',  label: 'LinkedIn' },
  ];

  const cards = platforms.map(p => {
    const published = data.filter(r => r[p.urlKey]);
    const pending   = data.filter(r => r.status === 'pendente' || r.status === 'aguardando_aprovacao');
    const byStatus  = {};
    data.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });

    const links = published.slice(0, 6).map(r => `
      <a class="pub-link-item" href="${esc(r[p.urlKey])}" target="_blank" rel="noopener">
        ↗ ${esc(fmt.trunc(r.titulo, 50))}
      </a>
    `).join('');

    return `
      <div class="pub-card" style="--kpi-color:${p.color}">
        <div class="pub-platform-header">
          <div class="pub-platform-icon" style="background:${p.color}22">${p.icon}</div>
          <div>
            <div class="pub-platform-name" style="color:${p.color}">${p.label}</div>
          </div>
        </div>
        <div class="pub-stat-row">
          <span class="pub-stat-label">Publicados</span>
          <span class="pub-stat-value" style="color:${p.color}">${published.length}</span>
        </div>
        <div class="pub-stat-row">
          <span class="pub-stat-label">Pendentes</span>
          <span class="pub-stat-value">${pending.length}</span>
        </div>
        <div class="pub-stat-row">
          <span class="pub-stat-label">Total Extraídos</span>
          <span class="pub-stat-value">${data.filter(r => r.plataforma === p.key).length || data.length}</span>
        </div>
        ${published.length ? `
          <div style="margin-top:var(--space-md)">
            <div class="roteiro-section-label">Links Publicados</div>
            <div class="pub-link-list">${links}</div>
            ${published.length > 6 ? `<p style="font-size:11px;color:var(--text-dim);margin-top:6px">+${published.length - 6} mais</p>` : ''}
          </div>
        ` : `<p style="font-size:12px;color:var(--text-dim);margin-top:var(--space-md)">Nenhuma publicação registrada ainda.</p>`}
      </div>
    `;
  });

  $('pubCount').textContent = `${platforms.reduce((n, p) => n + data.filter(r => r[p.urlKey]).length, 0)} publicações`;
  grid.innerHTML = cards.join('');
}

// ── Detail Modal ─────────────────────────────────────────────
window.openModal = function(id) {
  const r = state.all.find(x => x.id === id);
  if (!r) return;

  const overlay = $('modalOverlay');
  const body    = $('modalBody');

  const imgsHtml = (() => {
    const imgs = r.imagens_referencia_webp?.length
      ? r.imagens_referencia_webp
      : r.links_cards_origem?.slice(0, 8) || [];
    if (!imgs.length) return '';
    return `
      <div class="modal-section">
        <div class="modal-section-title">Imagens de Referência</div>
        <div class="modal-img-grid">
          ${imgs.slice(0, 8).map(url => `<img src="${esc(url)}" loading="lazy" onerror="this.style.display='none'">`).join('')}
        </div>
      </div>`;
  })();

  const metadata = r.metadata || {};
  const metrics  = metadata.metrics || {};

  body.innerHTML = `
    <h2 class="modal-title">${esc(r.titulo || 'Sem título')}</h2>

    <div class="modal-field-grid">
      <div class="modal-field"><span class="modal-field-label">Status</span><span class="modal-field-value">${fmt.badge(r.status)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Conta</span><span class="modal-field-value cell-mono">${esc(r.arroba_referencia || '—')}</span></div>
      <div class="modal-field"><span class="modal-field-label">Plataforma</span><span class="modal-field-value">${esc(r.plataforma || '—')}</span></div>
      <div class="modal-field"><span class="modal-field-label">Tipo</span><span class="modal-field-value">${esc(r.tipo_conteudo || '—')}</span></div>
      <div class="modal-field"><span class="modal-field-label">Score</span><span class="modal-field-value">${fmt.score(r.engagement_score)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Template</span><span class="modal-field-value cell-mono">${esc(r.template_usado || '—')}</span></div>
      <div class="modal-field"><span class="modal-field-label">Extraído em</span><span class="modal-field-value cell-mono">${fmt.date(r.data_extracao || r.created_at)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Publicado em</span><span class="modal-field-value cell-mono">${fmt.date(r.data_publicacao)}</span></div>
      <div class="modal-field"><span class="modal-field-label">Likes</span><span class="modal-field-value cell-mono">${metrics.likes ?? '—'}</span></div>
      <div class="modal-field"><span class="modal-field-label">Comentários</span><span class="modal-field-value cell-mono">${metrics.comments ?? '—'}</span></div>
    </div>

    ${r.link_conteudo ? `
      <div class="modal-section">
        <div class="modal-section-title">Links</div>
        <div class="link-cell" style="flex-wrap:wrap;gap:8px">
          <a class="link-chip" href="${esc(r.link_conteudo)}" target="_blank" rel="noopener">↗ Original</a>
          ${r.publicado_url_instagram ? `<a class="link-chip" href="${esc(r.publicado_url_instagram)}" target="_blank" rel="noopener">📷 Instagram</a>` : ''}
          ${r.publicado_url_facebook  ? `<a class="link-chip" href="${esc(r.publicado_url_facebook)}"  target="_blank" rel="noopener">📘 Facebook</a>` : ''}
          ${r.publicado_url_linkedin  ? `<a class="link-chip" href="${esc(r.publicado_url_linkedin)}"  target="_blank" rel="noopener">💼 LinkedIn</a>` : ''}
          ${r.drive_criacao_url       ? `<a class="link-chip" href="${esc(r.drive_criacao_url)}"       target="_blank" rel="noopener">📁 Drive</a>` : ''}
        </div>
      </div>` : ''}

    ${imgsHtml}

    ${r.descricao_original ? `
      <div class="modal-section">
        <div class="modal-section-title">Descrição Original</div>
        <div class="modal-text-block">${esc(r.descricao_original)}</div>
      </div>` : ''}

    ${r.nova_descricao || r.descricao_instagram ? `
      <div class="modal-section">
        <div class="modal-section-title">Nova Descrição (Instagram)</div>
        <div class="modal-text-block">${esc(r.nova_descricao || r.descricao_instagram)}</div>
      </div>` : ''}

    ${r.descricao_facebook ? `
      <div class="modal-section">
        <div class="modal-section-title">Descrição Facebook</div>
        <div class="modal-text-block">${esc(r.descricao_facebook)}</div>
      </div>` : ''}

    ${r.descricao_linkedin ? `
      <div class="modal-section">
        <div class="modal-section-title">Descrição LinkedIn</div>
        <div class="modal-text-block">${esc(r.descricao_linkedin)}</div>
      </div>` : ''}

    ${r.texto_cards ? `
      <div class="modal-section">
        <div class="modal-section-title">Texto dos Cards</div>
        <div class="modal-text-block">${esc(r.texto_cards)}</div>
      </div>` : ''}

    ${r.novo_script ? `
      <div class="modal-section">
        <div class="modal-section-title">Roteiro de Atendimento</div>
        <div class="modal-script-block">${esc(r.novo_script)}</div>
      </div>` : ''}

    ${r.observacoes ? `
      <div class="modal-section">
        <div class="modal-section-title">Observações</div>
        <div class="modal-text-block">${esc(r.observacoes)}</div>
      </div>` : ''}

    ${metadata.triage_reason ? `
      <div class="modal-section">
        <div class="modal-section-title">Triagem</div>
        <div class="modal-text-block" style="color:var(--yellow)">${esc(metadata.triage_reason)}</div>
      </div>` : ''}
  `;

  overlay.classList.add('open');
};

$('modalClose').addEventListener('click', () => $('modalOverlay').classList.remove('open'));
$('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) $('modalOverlay').classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('modalOverlay').classList.remove('open'); });

// ── Tabs ─────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    state.tab = btn.dataset.tab;
  });
});

// ── Sorting ──────────────────────────────────────────────────
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (state.sortCol === col) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortCol = col;
      state.sortDir = 'desc';
    }
    document.querySelectorAll('.sortable').forEach(t => t.classList.remove('sorted-asc', 'sorted-desc'));
    th.classList.add(state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    applyFilters();
  });
});

// ── Filter events ────────────────────────────────────────────
['filterStatus','filterPlataforma','filterArroba','filterScore','filterSearch'].forEach(id => {
  $(id)?.addEventListener('input', applyFilters);
});

['filterRoteiroStatus','filterRoteiroSearch'].forEach(id => {
  $(id)?.addEventListener('input', applyRoteiroFilters);
});

$('clearFilters').addEventListener('click', () => {
  $('filterStatus').value    = '';
  $('filterPlataforma').value= '';
  $('filterArroba').value    = '';
  $('filterScore').value     = '';
  $('filterSearch').value    = '';
  applyFilters();
});

// ── Publication tab filter ───────────────────────────────────
$('filterPubPlatform')?.addEventListener('change', renderPublications);

// ── Refresh ──────────────────────────────────────────────────
refreshBtn.addEventListener('click', loadAll);

// ── Boot ─────────────────────────────────────────────────────
loadAll();
