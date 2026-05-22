const API_BASE = window.API_BASE || 'https://offshore-nat-suspected-madrid.trycloudflare.com/api';
const formatDate = (s)=> new Date(s).toLocaleString('pt-BR');
const statusClass = (s)=> ['postado','pendente','aguardando_aprovacao','rejeitado'].includes(s)?`s-${s}`:'s-default';

let allItems = []; let allScripts = [];

async function fetchJson(url){ const r=await fetch(url); if(!r.ok) throw new Error(url); return r.json(); }

function renderKpis(items){
  const map={}; items.forEach(i=> map[i.status]=(map[i.status]||0)+1);
  const total=items.length;
  const kpis=[['Total',total],['Postados',map.postado||0],['Pendentes',map.pendente||0],['Aguardando aprovação',map.aguardando_aprovacao||0]];
  document.getElementById('kpis').innerHTML = kpis.map(([k,v])=>`<div class='card'><div class='k'>${k}</div><div class='v'>${v}</div></div>`).join('');
}

function renderContentRows(items){
  const tbody=document.getElementById('contentRows');
  tbody.innerHTML = items.map(i=>`<tr>
    <td>${(i.titulo||'—').slice(0,120)}</td>
    <td><span class='status ${statusClass(i.status)}'>${i.status}</span></td>
    <td>${i.arroba_referencia||'—'}</td>
    <td>${formatDate(i.updated_at)}</td>
    <td>${i.link_conteudo?`<a class='link' href='${i.link_conteudo}' target='_blank'>abrir</a>`:'—'}</td>
  </tr>`).join('');
}

function renderScripts(items){
  const wrap=document.getElementById('scriptCards');
  wrap.innerHTML = items.map(i=>`<article class='script'>
    <h3>${(i.titulo||'Sem título').slice(0,100)}</h3>
    <div class='meta'>${i.status} • ${i.arroba_referencia||'sem origem'} • ${formatDate(i.updated_at)}</div>
    <details>
      <summary>Ver roteiro completo</summary>
      <pre>${(i.novo_script||'').replace(/[<>]/g,m=>m==='<'?'&lt;':'&gt;')}</pre>
    </details>
  </article>`).join('');
}

function applyFilters(){
  const st=document.getElementById('statusFilter').value;
  const origin=document.getElementById('originFilter').value.toLowerCase().trim();
  const q=document.getElementById('searchFilter').value.toLowerCase().trim();
  const filtered=allItems.filter(i=>(!st||i.status===st) && (!origin|| (i.arroba_referencia||'').toLowerCase().includes(origin)) && (!q|| (i.titulo||'').toLowerCase().includes(q) || (i.tema||'').toLowerCase().includes(q)));
  renderContentRows(filtered);
}

function applyScriptFilter(){
  const st=document.getElementById('scriptStatusFilter').value;
  renderScripts(allScripts.filter(i=>!st||i.status===st));
}

async function boot(){
  try{
    const [c,s]=await Promise.all([
      fetchJson(`${API_BASE}/conteudos?limit=400`),
      fetchJson(`${API_BASE}/conteudos?limit=200`)
    ]);
    allItems=c.items||[];
    allScripts=(s.items||[]).filter(i=>i.novo_script);

    const statuses=[...new Set(allItems.map(i=>i.status))].sort();
    const stSel=document.getElementById('statusFilter');
    const scSel=document.getElementById('scriptStatusFilter');
    statuses.forEach(st=>{
      stSel.insertAdjacentHTML('beforeend',`<option value='${st}'>${st}</option>`);
      scSel.insertAdjacentHTML('beforeend',`<option value='${st}'>${st}</option>`);
    });

    renderKpis(allItems);
    applyFilters();
    applyScriptFilter();
    document.getElementById('syncInfo').textContent=`Atualizado: ${new Date().toLocaleTimeString('pt-BR')}`;
  }catch(e){
    document.getElementById('syncInfo').textContent='Erro ao carregar dados';
    document.getElementById('kpis').innerHTML=`<div class='card'><div class='k'>Falha</div><div class='v'>API indisponível</div></div>`;
  }
}

['statusFilter','originFilter','searchFilter'].forEach(id=> document.getElementById(id).addEventListener('input',applyFilters));
document.getElementById('scriptStatusFilter').addEventListener('input',applyScriptFilter);
boot();