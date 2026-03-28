// ============================================================
// strategies.js — CRUD for strategies
// ============================================================

let _editStratId = null;
let _selColor = '#818cf8';

const PAIRS_LIST = [
  'EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD','NZD/USD',
  'EUR/GBP','EUR/JPY','GBP/JPY','EUR/AUD','GBP/AUD','AUD/JPY','EUR/CAD',
  'GBP/CAD','CAD/JPY','EUR/NZD','GBP/NZD','NAS100','US500','US30','DAX40',
  'FTSE100','XAUUSD','XAGUSD','BTCUSD','ETHUSD','USOIL',
];

function openStratModal(id = null) {
  _editStratId = id;
  _selColor = '#818cf8';
  ['sName','sDesc','sEntry','sExit','sRR','sRisk','sNotes'].forEach(x => {
    const el = document.getElementById(x); if (el) el.value = '';
  });
  document.getElementById('sTF').value = '';
  document.querySelectorAll('#colorPicker .cp-dot').forEach(d => d.classList.remove('sel'));
  document.querySelector('#colorPicker .cp-dot')?.classList.add('sel');
  document.getElementById('pairsCB').innerHTML = PAIRS_LIST.map(p =>
    `<label class="cb-item"><input type="checkbox" value="${p}"> ${p}</label>`
  ).join('');
  document.querySelectorAll('#sessCB input').forEach(cb => cb.checked = false);
  document.getElementById('stratModalTitle').textContent = id ? 'Editar Estratégia' : 'Nova Estratégia';

  if (id) {
    const s = State.strategies.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sName').value = s.name;
    document.getElementById('sDesc').value = s.desc;
    document.getElementById('sEntry').value = s.entryRules;
    document.getElementById('sExit').value = s.exitRules;
    document.getElementById('sTF').value = s.tf;
    document.getElementById('sRR').value = s.minRR;
    document.getElementById('sRisk').value = s.riskPct;
    document.getElementById('sNotes').value = s.notes;
    _selColor = s.color;
    document.querySelectorAll('#colorPicker .cp-dot').forEach(d => {
      d.classList.remove('sel');
      if (d.dataset.color === _selColor) d.classList.add('sel');
    });
    document.querySelectorAll('#pairsCB input').forEach(cb => {
      if (s.pairs?.includes(cb.value)) cb.checked = true;
    });
    document.querySelectorAll('#sessCB input').forEach(cb => {
      if (s.sessions?.includes(cb.value)) cb.checked = true;
    });
  }
  openModal('stratModal');
}

function closeStratModal() { closeModal('stratModal'); _editStratId = null; }

function pickColor(el) {
  document.querySelectorAll('#colorPicker .cp-dot').forEach(d => d.classList.remove('sel'));
  el.classList.add('sel');
  _selColor = el.dataset.color;
}

async function saveStrategy() {
  const name = document.getElementById('sName').value.trim();
  if (!name) return toast('Nome obrigatório!', 'err');
  const pairs = [...document.querySelectorAll('#pairsCB input:checked')].map(c => c.value);
  const sessions = [...document.querySelectorAll('#sessCB input:checked')].map(c => c.value);
  const row = {
    user_id: State.user.id,
    name, color: _selColor,
    description: document.getElementById('sDesc').value,
    entry_rules: document.getElementById('sEntry').value,
    exit_rules: document.getElementById('sExit').value,
    timeframe: document.getElementById('sTF').value,
    min_rr: document.getElementById('sRR').value,
    risk_pct: parseFloat(document.getElementById('sRisk').value) || null,
    notes: document.getElementById('sNotes').value,
    pairs, sessions,
  };
  setSyncing(true);
  if (_editStratId) {
    const { data, error } = await sb.from('strategies').update(row).eq('id', _editStratId).select().single();
    setSyncing(false, !!error);
    if (error) return toast('Erro: ' + error.message, 'err');
    State.strategies = State.strategies.map(x => x.id === _editStratId ? mapStrategy(data) : x);
  } else {
    const { data, error } = await sb.from('strategies').insert(row).select().single();
    setSyncing(false, !!error);
    if (error) return toast('Erro: ' + error.message, 'err');
    State.strategies.push(mapStrategy(data));
  }
  closeStratModal();
  refreshSelects();
  renderStrategies();
  toast('Estratégia guardada! ✓');
}

async function deleteStrategy(id) {
  if (!confirm('Eliminar estratégia?')) return;
  setSyncing(true);
  const { error } = await sb.from('strategies').delete().eq('id', id);
  setSyncing(false, !!error);
  if (error) return toast('Erro ao eliminar', 'err');
  State.strategies = State.strategies.filter(s => s.id !== id);
  State.trades = State.trades.map(t => t.strategyId === id ? { ...t, strategyId: '' } : t);
  refreshSelects();
  renderStrategies();
  toast('Estratégia eliminada');
}

function renderStrategies() {
  const el = document.getElementById('stratList');
  if (!el) return;
  if (!State.strategies.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⚡</div><p>Nenhuma estratégia. Cria a primeira!</p></div>';
    return;
  }
  el.innerHTML = State.strategies.map(s => {
    const st = State.trades.filter(t => t.strategyId === s.id);
    const pnl = st.reduce((a, t) => a + (t.pnl || 0), 0);
    const wins = st.filter(t => t.result === 'Win').length;
    const losses = st.filter(t => t.result === 'Loss').length;
    const wr = st.length ? (wins / st.length * 100).toFixed(1) : '0.0';
    const aW = wins ? (st.filter(t => t.result === 'Win').reduce((a, t) => a + (t.pnl || 0), 0) / wins).toFixed(2) : '0.00';
    const aL = losses ? (st.filter(t => t.result === 'Loss').reduce((a, t) => a + (t.pnl || 0), 0) / losses).toFixed(2) : '0.00';
    return `<div class="strat-card">
      <div class="strat-header">
        <div>
          <div class="strat-title">
            <span class="strat-dot" style="background:${s.color}"></span>${s.name}
          </div>
          <div style="display:flex;gap:12px;margin-top:3px;margin-left:18px;flex-wrap:wrap">
            ${s.tf ? `<span class="strat-meta">TF: ${s.tf}</span>` : ''}
            ${s.minRR ? `<span class="strat-meta">R:R ≥ ${s.minRR}</span>` : ''}
            ${s.riskPct ? `<span class="strat-meta">Risco: ${s.riskPct}%</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="openStratModal('${s.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStrategy('${s.id}')">🗑</button>
        </div>
      </div>
      ${s.desc ? `<p class="strat-desc">${s.desc}</p>` : ''}
      ${s.entryRules ? `<div class="field-label" style="margin-top:10px">Regras de Entrada</div><div class="strat-rules">${s.entryRules}</div>` : ''}
      ${s.exitRules ? `<div class="field-label" style="margin-top:8px">Regras de Saída</div><div class="strat-rules">${s.exitRules}</div>` : ''}
      ${s.pairs?.length ? `<div class="tag-row">${s.pairs.map(p => `<span class="tag-pair">${p}</span>`).join('')}</div>` : ''}
      ${s.sessions?.length ? `<div class="tag-row">${s.sessions.map(x => `<span class="tag-session">${x}</span>`).join('')}</div>` : ''}
      <div class="strat-stats">
        <div class="strat-stat"><div class="strat-stat-val" style="color:${pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(pnl)}</div><div class="strat-stat-lbl">PnL Total</div></div>
        <div class="strat-stat"><div class="strat-stat-val" style="color:var(--accent2)">${wr}%</div><div class="strat-stat-lbl">Win Rate</div></div>
        <div class="strat-stat"><div class="strat-stat-val">${st.length}</div><div class="strat-stat-lbl">Trades</div></div>
        <div class="strat-stat"><div class="strat-stat-val" style="color:var(--green)">+${aW}</div><div class="strat-stat-lbl">Avg Win</div></div>
        <div class="strat-stat"><div class="strat-stat-val" style="color:var(--red)">${aL}</div><div class="strat-stat-lbl">Avg Loss</div></div>
        <div class="strat-stat"><div class="strat-stat-val">${wins}/${losses}</div><div class="strat-stat-lbl">W / L</div></div>
      </div>
    </div>`;
  }).join('');
}
