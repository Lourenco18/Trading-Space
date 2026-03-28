// ============================================================
// trades.js — CRUD for trades + journal render
// ============================================================

let _editTradeId = null;
let _pendingImgs = [];

function openTradeModal(id = null) {
  _editTradeId = id;
  _pendingImgs = [];
  document.getElementById('imgPreview').innerHTML = '';
  document.getElementById('customAssetWrap').style.display = 'none';
  document.getElementById('tradeModalTitle').textContent = id ? 'Editar Trade' : 'Nova Trade';

  const now = new Date();
  const local = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  if (id) {
    const t = State.trades.find(x => x.id === id);
    if (!t) return;
    document.getElementById('tAcc').value = t.accountId || '';
    document.getElementById('tDate').value = t.date ? new Date(t.date).toISOString().slice(0, 16) : local;
    const sel = document.getElementById('tAsset');
    const hasOpt = [...sel.options].some(o => o.value === t.asset);
    if (hasOpt) { sel.value = t.asset; }
    else {
      sel.value = '__custom';
      document.getElementById('customAssetWrap').style.display = '';
      document.getElementById('tAssetCustom').value = t.asset || '';
    }
    document.getElementById('tDir').value = t.dir || 'Buy';
    document.getElementById('tEntry').value = t.entry || '';
    document.getElementById('tSL').value = t.sl || '';
    document.getElementById('tTP').value = t.tp || '';
    document.getElementById('tLots').value = t.lots || '';
    document.getElementById('tPnL').value = t.pnl || '';
    document.getElementById('tRisk').value = t.riskPct || '';
    document.getElementById('tRR').value = t.rr || '';
    document.getElementById('tRes').value = t.result || 'Win';
    document.getElementById('tSess').value = t.session || 'London';
    document.getElementById('tStrat').value = t.strategyId || '';
    document.getElementById('tSetup').value = t.setup || '';
    document.getElementById('tNotes').value = t.notes || '';
    _pendingImgs = t.images ? [...t.images] : [];
    renderImgPreview();
  } else {
    document.getElementById('tDate').value = local;
    document.getElementById('tDir').value = 'Buy';
    document.getElementById('tRes').value = 'Win';
    document.getElementById('tSess').value = 'London';
    document.getElementById('tStrat').value = '';
    ['tEntry','tSL','tTP','tLots','tPnL','tRisk','tRR','tSetup','tNotes','tAssetCustom'].forEach(x => {
      const el = document.getElementById(x); if (el) el.value = '';
    });
    document.getElementById('tAsset').value = 'EUR/USD';
    if (State.accounts.length) document.getElementById('tAcc').value = State.accounts[0].id;
  }
  openModal('tradeModal');
}

function closeTradeModal() { closeModal('tradeModal'); _editTradeId = null; _pendingImgs = []; }

function toggleCustomAsset() {
  document.getElementById('customAssetWrap').style.display =
    document.getElementById('tAsset').value === '__custom' ? '' : 'none';
}

async function saveTrade() {
  const assetSel = document.getElementById('tAsset').value;
  const asset = assetSel === '__custom'
    ? (document.getElementById('tAssetCustom').value.trim().toUpperCase() || 'OUTRO')
    : assetSel;
  const accountId = document.getElementById('tAcc').value;
  if (!accountId) return toast('Seleciona uma conta!', 'err');
  if (!asset) return toast('Ativo obrigatório!', 'err');

  const row = {
    user_id: State.user.id,
    account_id: accountId,
    strategy_id: document.getElementById('tStrat').value || null,
    trade_date: document.getElementById('tDate').value || null,
    asset,
    direction: document.getElementById('tDir').value,
    entry_price: parseFloat(document.getElementById('tEntry').value) || null,
    stop_loss: parseFloat(document.getElementById('tSL').value) || null,
    take_profit: parseFloat(document.getElementById('tTP').value) || null,
    lots: parseFloat(document.getElementById('tLots').value) || null,
    pnl: parseFloat(document.getElementById('tPnL').value) || 0,
    risk_pct: parseFloat(document.getElementById('tRisk').value) || null,
    rr: document.getElementById('tRR').value || null,
    result: document.getElementById('tRes').value,
    session: document.getElementById('tSess').value,
    setup: document.getElementById('tSetup').value || null,
    notes: document.getElementById('tNotes').value || null,
    images: [..._pendingImgs],
  };

  setSyncing(true);
  if (_editTradeId) {
    const { data, error } = await sb.from('trades').update(row).eq('id', _editTradeId).select().single();
    setSyncing(false, !!error);
    if (error) return toast('Erro ao guardar: ' + error.message, 'err');
    State.trades = State.trades.map(x => x.id === _editTradeId ? mapTrade(data) : x);
  } else {
    const { data, error } = await sb.from('trades').insert(row).select().single();
    setSyncing(false, !!error);
    if (error) return toast('Erro ao guardar: ' + error.message, 'err');
    State.trades.unshift(mapTrade(data));
  }
  closeTradeModal();
  renderTrades();
  renderDash();
  toast('Trade guardada! ✓');
}

async function deleteTrade(id) {
  if (!confirm('Eliminar esta trade?')) return;
  setSyncing(true);
  const { error } = await sb.from('trades').delete().eq('id', id);
  setSyncing(false, !!error);
  if (error) return toast('Erro ao eliminar', 'err');
  State.trades = State.trades.filter(t => t.id !== id);
  renderTrades();
  renderDash();
  toast('Trade eliminada');
}

// ── Images ────────────────────────────────────────────────────
function handleImgs(e) {
  [...e.target.files].forEach(f => {
    const r = new FileReader();
    r.onload = ev => { _pendingImgs.push(ev.target.result); renderImgPreview(); };
    r.readAsDataURL(f);
  });
  e.target.value = '';
}
function renderImgPreview() {
  document.getElementById('imgPreview').innerHTML = _pendingImgs.map((s, i) =>
    `<div class="img-thumb"><img src="${s}" onclick="openLightbox('${s}')"><button class="img-del" onclick="removeImg(${i})">✕</button></div>`
  ).join('');
}
function removeImg(i) { _pendingImgs.splice(i, 1); renderImgPreview(); }
function openLightbox(src) { document.getElementById('lboxImg').src = src; document.getElementById('lightbox').classList.add('open'); }

// ── Journal render ────────────────────────────────────────────
function renderTrades() {
  let data = filteredTrades();
  const search = (document.getElementById('fSrc')?.value || '').toLowerCase();
  const dir = document.getElementById('fDir')?.value || '';
  const res = document.getElementById('fRes')?.value || '';
  const str = document.getElementById('fStr')?.value || '';
  const mo = document.getElementById('fMo')?.value || '';
  if (search) data = data.filter(t =>
    (t.asset||'').toLowerCase().includes(search) ||
    (t.setup||'').toLowerCase().includes(search) ||
    (t.notes||'').toLowerCase().includes(search)
  );
  if (dir) data = data.filter(t => t.dir === dir);
  if (res) data = data.filter(t => t.result === res);
  if (str) data = data.filter(t => t.strategyId === str);
  if (mo) data = data.filter(t => (t.date || '').startsWith(mo));
  data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const tbody = document.getElementById('tBody');
  const empty = document.getElementById('tEmpty');
  if (!data.length) { if (tbody) tbody.innerHTML = ''; if (empty) empty.style.display = ''; return; }
  if (empty) empty.style.display = 'none';
  if (tbody) tbody.innerHTML = data.map(t => {
    const acc = State.accounts.find(a => a.id === t.accountId);
    const strat = State.strategies.find(s => s.id === t.strategyId);
    return `<tr>
      <td class="mono sm">${fmtDT(t.date)}</td>
      <td class="text-muted sm ellipsis" style="max-width:110px">${acc?.name || '—'}</td>
      <td style="font-weight:600;color:var(--accent2)">${t.asset || '—'}</td>
      <td><span class="tag ${t.dir === 'Buy' ? 'tag-buy' : 'tag-sell'}">${t.dir}</span></td>
      <td class="mono sm">${t.entry || '—'}</td>
      <td class="mono sm" style="color:var(--red)">${t.sl || '—'}</td>
      <td class="mono sm" style="color:var(--green)">${t.tp || '—'}</td>
      <td class="mono sm">${t.lots || '—'}</td>
      <td class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmt(t.pnl)}</td>
      <td>${t.riskPct ? `<span class="mono sm" style="color:var(--yellow)">${parseFloat(t.riskPct).toFixed(2)}%</span>` : '<span class="text-muted">—</span>'}</td>
      <td class="mono sm">${t.rr || '—'}</td>
      <td><span class="tag ${t.result === 'Win' ? 'tag-win' : t.result === 'Loss' ? 'tag-loss' : 'tag-be'}">${t.result}</span></td>
      <td class="sm text-muted">${t.session || '—'}</td>
      <td>${strat
        ? `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px"><span style="width:7px;height:7px;border-radius:50%;background:${strat.color};display:inline-block;flex-shrink:0"></span>${strat.name}</span>`
        : '<span class="text-muted">—</span>'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-xs" onclick="viewTrade('${t.id}')">Ver</button>
          <button class="btn btn-secondary btn-xs" onclick="openTradeModal('${t.id}')">✏️</button>
          <button class="btn btn-danger btn-xs" onclick="deleteTrade('${t.id}')">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function clearFilters() {
  ['fSrc','fMo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['fDir','fRes','fStr'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderTrades();
}

function viewTrade(id) {
  const t = State.trades.find(x => x.id === id);
  if (!t) return;
  const acc = State.accounts.find(a => a.id === t.accountId);
  const strat = State.strategies.find(s => s.id === t.strategyId);
  document.getElementById('detailTitle').textContent = `${t.asset} — ${fmtDT(t.date)}`;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-box"><div class="detail-label">Conta</div><div class="detail-val sm">${acc?.name || '—'}</div></div>
      <div class="detail-box"><div class="detail-label">Ativo</div><div class="detail-val" style="color:var(--accent2)">${t.asset}</div></div>
      <div class="detail-box"><div class="detail-label">Direção</div><div class="detail-val"><span class="tag ${t.dir === 'Buy' ? 'tag-buy' : 'tag-sell'}">${t.dir}</span></div></div>
      <div class="detail-box"><div class="detail-label">Resultado</div><div class="detail-val"><span class="tag ${t.result === 'Win' ? 'tag-win' : t.result === 'Loss' ? 'tag-loss' : 'tag-be'}">${t.result}</span></div></div>
      <div class="detail-box"><div class="detail-label">Entry</div><div class="detail-val mono">${t.entry || '—'}</div></div>
      <div class="detail-box"><div class="detail-label">Stop Loss</div><div class="detail-val mono" style="color:var(--red)">${t.sl || '—'}</div></div>
      <div class="detail-box"><div class="detail-label">Take Profit</div><div class="detail-val mono" style="color:var(--green)">${t.tp || '—'}</div></div>
      <div class="detail-box"><div class="detail-label">Lotes</div><div class="detail-val mono">${t.lots || '—'}</div></div>
      <div class="detail-box"><div class="detail-label">PnL</div><div class="detail-val ${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmt(t.pnl)}</div></div>
      <div class="detail-box"><div class="detail-label">Risco</div><div class="detail-val" style="color:var(--yellow)">${t.riskPct ? parseFloat(t.riskPct).toFixed(2) + '%' : '—'}</div></div>
      <div class="detail-box"><div class="detail-label">R:R</div><div class="detail-val">${t.rr || '—'}</div></div>
      <div class="detail-box"><div class="detail-label">Sessão</div><div class="detail-val">${t.session || '—'}</div></div>
      <div class="detail-box" style="grid-column:1/-1"><div class="detail-label">Setup</div><div class="detail-val">${t.setup || '—'}</div></div>
    </div>
    ${strat ? `<div class="note-card" style="margin-bottom:10px"><div class="field-label">Estratégia</div><div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="width:10px;height:10px;border-radius:50%;background:${strat.color};display:inline-block;flex-shrink:0"></span><strong>${strat.name}</strong></div></div>` : ''}
    ${t.notes ? `<div class="note-card" style="margin-bottom:10px"><div class="field-label">Observações</div><p style="margin-top:6px;font-size:13.5px;line-height:1.65">${t.notes}</p></div>` : ''}
    ${t.images?.length ? `<div><div class="field-label" style="margin-bottom:8px">Screenshots</div><div class="img-grid">${t.images.map(s => `<div class="img-thumb lg"><img src="${s}" onclick="openLightbox('${s}')"></div>`).join('')}</div></div>` : ''}
  `;
  openModal('detailModal');
}
