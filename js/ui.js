// ============================================================
// ui.js — Dashboard, Calendar, Analytics, Notes, Nav, Modals
// ============================================================

// ── Navigation ────────────────────────────────────────────────
function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.page === page) b.classList.add('active');
  });
  const renders = {
    dashboard: renderDash, journal: renderTrades, calendar: renderCal,
    analytics: renderAnalytics, daily: renderNotes,
    strategies: renderStrategies, accounts: renderAccounts,
  };
  renders[page]?.();
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// ── Dashboard ─────────────────────────────────────────────────
function renderDash() {
  const data = filteredTrades();
  const pnl = data.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = data.filter(t => t.result === 'Win').length;
  const losses = data.filter(t => t.result === 'Loss').length;
  const be = data.filter(t => t.result === 'BE').length;
  const wr = data.length ? (wins / data.length * 100).toFixed(1) : 0;
  const wPnl = data.filter(t => t.result === 'Win').reduce((s, t) => s + (t.pnl || 0), 0);
  const lPnl = data.filter(t => t.result === 'Loss').reduce((s, t) => s + (t.pnl || 0), 0);
  const avgW = wins ? (wPnl / wins).toFixed(2) : '0.00';
  const avgL = losses ? (lPnl / losses).toFixed(2) : '0.00';
  const pf = Math.abs(parseFloat(avgL)) > 0 ? (parseFloat(avgW) / Math.abs(parseFloat(avgL))).toFixed(2) : '∞';
  const riskTrades = data.filter(t => t.riskPct);
  const avgRisk = riskTrades.length ? (riskTrades.reduce((s, t) => s + parseFloat(t.riskPct || 0), 0) / riskTrades.length).toFixed(2) : '—';

  const sg = document.getElementById('statsGrid');
  if (sg) sg.innerHTML = `
    <div class="stat-card"><div class="stat-label">Total PnL</div><div class="stat-val ${pnl >= 0 ? 'green' : 'red'}">${fmt(pnl)}</div><div class="stat-sub">${data.length} trades</div></div>
    <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-val accent">${wr}%</div><div class="wr-bar"><div class="wr-fill" style="width:${wr}%"></div></div></div>
    <div class="stat-card"><div class="stat-label">W / L / BE</div><div class="stat-val">${wins}<span style="color:var(--text2);font-size:14px"> / ${losses} / ${be}</span></div></div>
    <div class="stat-card"><div class="stat-label">Avg Win</div><div class="stat-val green">+${avgW}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Loss</div><div class="stat-val red">${avgL}</div></div>
    <div class="stat-card"><div class="stat-label">Profit Factor</div><div class="stat-val accent">${pf}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Risco %</div><div class="stat-val" style="color:var(--yellow);font-size:18px">${avgRisk}${avgRisk !== '—' ? '%' : ''}</div></div>
  `;

  // PnL chart
  const recent = [...data].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)).slice(-20);
  const maxA = Math.max(...recent.map(t => Math.abs(t.pnl || 0)), 1);
  const chart = document.getElementById('pnlChart');
  if (chart) chart.innerHTML = recent.map(t => {
    const h = Math.round(Math.abs(t.pnl || 0) / maxA * 56) + 4;
    return `<div class="bar ${(t.pnl || 0) >= 0 ? 'bar-pos' : 'bar-neg'}" style="height:${h}px" title="${t.asset} ${fmt(t.pnl)}"></div>`;
  }).join('');

  // Recent trades
  const rt = document.getElementById('recentTrades');
  const last5 = [...data].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
  if (rt) rt.innerHTML = last5.length ? last5.map(t => `
    <div class="recent-row">
      <div><span style="font-weight:600;color:var(--accent2)">${t.asset}</span>
        <span class="tag ${t.dir === 'Buy' ? 'tag-buy' : 'tag-sell'}" style="margin-left:5px">${t.dir}</span>
      </div>
      <div>
        ${t.riskPct ? `<span style="font-size:11px;color:var(--yellow);margin-right:6px;font-family:'DM Mono',monospace">${parseFloat(t.riskPct).toFixed(1)}%R</span>` : ''}
        <span class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}" style="margin-right:6px">${fmt(t.pnl)}</span>
        <span class="tag ${t.result === 'Win' ? 'tag-win' : t.result === 'Loss' ? 'tag-loss' : 'tag-be'}">${t.result}</span>
      </div>
    </div>`).join('') : '<div class="empty" style="padding:20px"><p>Sem trades</p></div>';

  // Strategy table
  const ds = document.getElementById('dashStrat');
  if (!ds) return;
  if (!State.strategies.length) { ds.innerHTML = '<div class="empty" style="padding:24px"><p>Cria estratégias para ver estatísticas aqui.</p></div>'; return; }
  const rows = State.strategies.map(s => {
    const st = data.filter(t => t.strategyId === s.id);
    if (!st.length) return null;
    const p = st.reduce((a, t) => a + (t.pnl || 0), 0);
    const w = st.filter(t => t.result === 'Win').length;
    const l = st.filter(t => t.result === 'Loss').length;
    const wr2 = (w / st.length * 100).toFixed(1);
    const aW = w ? (st.filter(t => t.result === 'Win').reduce((a, t) => a + (t.pnl || 0), 0) / w).toFixed(2) : '0.00';
    const aL = l ? (st.filter(t => t.result === 'Loss').reduce((a, t) => a + (t.pnl || 0), 0) / l).toFixed(2) : '0.00';
    return `<div class="ds-row">
      <span style="display:flex;align-items:center;gap:7px;font-weight:600"><span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block;flex-shrink:0"></span>${s.name}</span>
      <span>${st.length}</span>
      <span class="${p >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmt(p)}</span>
      <span><span style="color:var(--accent2)">${wr2}%</span><div class="mini-wr"><div class="mini-wr-fill" style="width:${wr2}%"></div></div></span>
      <span style="color:var(--text2)">${w}/${l}</span>
      <span style="color:var(--green)">+${aW}</span>
      <span style="color:var(--red)">${aL}</span>
    </div>`;
  }).filter(Boolean);
  ds.innerHTML = rows.length ? rows.join('') : '<div class="empty" style="padding:24px"><p>Nenhuma trade associada a estratégias.</p></div>';
}

// ── Calendar ──────────────────────────────────────────────────
let _calY = new Date().getFullYear(), _calM = new Date().getMonth();
function renderCal() {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('calTitle').textContent = `${months[_calM]} ${_calY}`;
  const data = filteredTrades(), byDay = {};
  data.forEach(t => { if (t.date) { const d = new Date(t.date).toISOString().slice(0, 10); byDay[d] = (byDay[d] || 0) + (t.pnl || 0); } });
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  let html = days.map(d => `<div class="cal-hd">${d}</div>`).join('');
  const first = new Date(_calY, _calM, 1).getDay();
  const dim = new Date(_calY, _calM + 1, 0).getDate();
  for (let i = 0; i < first; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= dim; d++) {
    const k = `${_calY}-${String(_calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const p = byDay[k];
    html += `<div class="cal-day${p !== undefined ? ' has-trades' : ''}" onclick="goDay('${k}')">
      <div class="cal-day-num">${d}</div>
      ${p !== undefined ? `<div class="cal-day-pnl ${p >= 0 ? 'pos' : 'neg'}">${fmt(p)}</div>` : ''}
    </div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}
function calPrev() { _calM--; if (_calM < 0) { _calM = 11; _calY--; } renderCal(); }
function calNext() { _calM++; if (_calM > 11) { _calM = 0; _calY++; } renderCal(); }
function goDay(date) { nav('journal'); document.getElementById('fMo').value = date.slice(0, 7); renderTrades(); }

// ── Analytics ─────────────────────────────────────────────────
function renderAnalytics() { renderWeekly(); renderMonthly(); renderByPair(); renderBySession(); renderByStrategy(); }

function grp(data, fn) {
  const g = {};
  data.forEach(t => { const k = fn(t); if (!g[k]) g[k] = []; g[k].push(t); });
  return Object.entries(g).map(([k, ts]) => {
    const p = ts.reduce((s, t) => s + (t.pnl || 0), 0);
    const w = ts.filter(t => t.result === 'Win').length;
    return { key: k, n: ts.length, pnl: p, wins: w, wr: (w / ts.length * 100).toFixed(1) };
  }).sort((a, b) => b.pnl - a.pnl);
}
function mkTable(rows, heads) {
  if (!rows.length) return '<div class="empty" style="padding:32px"><p>Sem dados</p></div>';
  return `<div class="card" style="padding:0"><div class="table-wrap"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`;
}
const tRow = r => `<tr><td style="font-weight:500">${r.key}</td><td>${r.n}</td><td class="${r.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmt(r.pnl)}</td><td style="color:var(--accent2)">${r.wr}%</td><td>${r.wins}/${r.n - r.wins}</td></tr>`;

function renderWeekly() {
  document.getElementById('tabWeekly').innerHTML = mkTable(
    grp(filteredTrades(), t => {
      if (!t.date) return 'S/data';
      const d = new Date(t.date), o = new Date(d);
      o.setDate(d.getDate() - d.getDay() + 1);
      return o.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }).map(tRow), ['Semana', 'Trades', 'PnL', 'WR', 'W/L']
  );
}
function renderMonthly() {
  document.getElementById('tabMonthly').innerHTML = mkTable(
    grp(filteredTrades(), t => t.date ? new Date(t.date).toISOString().slice(0, 7) : '—').map(tRow),
    ['Mês', 'Trades', 'PnL', 'WR', 'W/L']
  );
}
function renderByPair() {
  document.getElementById('tabPairs').innerHTML = mkTable(
    grp(filteredTrades(), t => t.asset || '—').map(r =>
      `<tr><td style="font-weight:600;color:var(--accent2)">${r.key}</td><td>${r.n}</td><td class="${r.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmt(r.pnl)}</td><td style="color:var(--accent2)">${r.wr}%</td><td>${r.wins}/${r.n - r.wins}</td></tr>`
    ), ['Ativo', 'Trades', 'PnL', 'WR', 'W/L']
  );
}
function renderBySession() {
  document.getElementById('tabSessions').innerHTML = mkTable(
    grp(filteredTrades(), t => t.session || '—').map(tRow),
    ['Sessão', 'Trades', 'PnL', 'WR', 'W/L']
  );
}
function renderByStrategy() {
  const data = filteredTrades();
  const rows = State.strategies.map(s => {
    const st = data.filter(t => t.strategyId === s.id);
    if (!st.length) return null;
    const p = st.reduce((a, t) => a + (t.pnl || 0), 0);
    const w = st.filter(t => t.result === 'Win').length;
    const l = st.filter(t => t.result === 'Loss').length;
    const wr = (w / st.length * 100).toFixed(1);
    const aW = w ? (st.filter(t => t.result === 'Win').reduce((a, t) => a + (t.pnl || 0), 0) / w).toFixed(2) : '0.00';
    const aL = l ? (st.filter(t => t.result === 'Loss').reduce((a, t) => a + (t.pnl || 0), 0) / l).toFixed(2) : '0.00';
    return `<tr>
      <td><span style="display:inline-flex;align-items:center;gap:7px;font-weight:600"><span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block"></span>${s.name}</span></td>
      <td>${st.length}</td><td class="${p >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmt(p)}</td>
      <td style="color:var(--accent2)">${wr}%</td><td>${w}/${l}</td>
      <td style="color:var(--green)">+${aW}</td><td style="color:var(--red)">${aL}</td>
    </tr>`;
  }).filter(Boolean);
  document.getElementById('tabStrats').innerHTML = mkTable(rows, ['Estratégia', 'Trades', 'PnL', 'WR', 'W/L', 'Avg Win', 'Avg Loss']);
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${name}"]`)?.classList.add('active');
  document.getElementById('tab-' + name)?.classList.add('active');
}

// ── Daily Notes ───────────────────────────────────────────────
async function saveNote() {
  const row = {
    user_id: State.user.id,
    note_date: document.getElementById('dDate').value || new Date().toISOString().slice(0, 10),
    mood: document.getElementById('dMood').value,
    analysis: document.getElementById('dNote').value.trim(),
    plan: document.getElementById('dPlan').value.trim(),
  };
  if (!row.analysis && !row.plan) return toast('Escreve pelo menos uma análise ou plano!', 'err');
  setSyncing(true);
  const { data, error } = await sb.from('daily_notes').insert(row).select().single();
  setSyncing(false, !!error);
  if (error) return toast('Erro ao guardar nota: ' + error.message, 'err');
  State.notes.unshift(mapNote(data));
  ['dNote', 'dPlan'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderNotes();
  toast('Nota guardada! ✓');
}

async function deleteNote(id) {
  if (!confirm('Eliminar nota?')) return;
  setSyncing(true);
  const { error } = await sb.from('daily_notes').delete().eq('id', id);
  setSyncing(false, !!error);
  if (error) return toast('Erro ao eliminar', 'err');
  State.notes = State.notes.filter(n => n.id !== id);
  renderNotes();
}

function renderNotes() {
  const dateEl = document.getElementById('dDate');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0, 10);
  const el = document.getElementById('notesList');
  if (!el) return;
  if (!State.notes.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">✎</div><p>Sem notas ainda.</p></div>'; return; }
  el.innerHTML = State.notes.map(n => `
    <div class="note-card">
      <div class="note-meta">
        <span>${fmtD(n.date)} · ${n.mood}</span>
        <button class="btn btn-danger btn-xs" onclick="deleteNote('${n.id}')">✕</button>
      </div>
      ${n.note ? `<div class="field-label">Análise</div><p class="note-text">${n.note}</p>` : ''}
      ${n.plan ? `<div class="field-label" style="margin-top:10px">Plano Amanhã</div><p class="note-text">${n.plan}</p>` : ''}
    </div>`).join('');
}
