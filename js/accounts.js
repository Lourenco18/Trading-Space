// ============================================================
// accounts.js — CRUD for accounts
// ============================================================

async function saveAccount() {
  const name = document.getElementById('aN').value.trim();
  if (!name) return toast('Nome da conta obrigatório!', 'err');
  const row = {
    user_id: State.user.id,
    name,
    firm: document.getElementById('aF').value.trim(),
    capital: parseFloat(document.getElementById('aC').value) || 0,
    split: parseFloat(document.getElementById('aS').value) || 80,
    profit_target: parseFloat(document.getElementById('aPT').value) || 10,
    max_dd: parseFloat(document.getElementById('aDD').value) || 10,
    daily_dd: parseFloat(document.getElementById('aDDD').value) || 5,
    status: document.getElementById('aSt').value,
    market: document.getElementById('aMkt').value,
  };
  setSyncing(true);
  const { data, error } = await sb.from('accounts').insert(row).select().single();
  setSyncing(false, !!error);
  if (error) return toast('Erro ao guardar conta: ' + error.message, 'err');
  State.accounts.push(mapAccount(data));
  ['aN','aF','aC','aS','aPT','aDD','aDDD'].forEach(id => document.getElementById(id).value = '');
  refreshSelects();
  renderAccounts();
  toast('Conta adicionada! ✓');
}

async function deleteAccount(id) {
  if (!confirm('Eliminar conta e todas as suas trades?')) return;
  setSyncing(true);
  const { error } = await sb.from('accounts').delete().eq('id', id);
  setSyncing(false, !!error);
  if (error) return toast('Erro ao eliminar conta', 'err');
  State.accounts = State.accounts.filter(a => a.id !== id);
  State.trades = State.trades.filter(t => t.accountId !== id);
  if (State.activeAccountId === id) {
    State.activeAccountId = '';
    document.getElementById('gAcc').value = '';
  }
  refreshSelects();
  renderAccounts();
  toast('Conta eliminada');
}

function renderAccounts() {
  const el = document.getElementById('accList');
  if (!el) return;
  if (!State.accounts.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⊞</div><p>Nenhuma conta ainda. Adiciona a primeira!</p></div>';
    return;
  }
  el.innerHTML = State.accounts.map(a => {
    const at = State.trades.filter(t => t.accountId === a.id);
    const pnl = at.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = at.filter(t => t.result === 'Win').length;
    const wr = at.length ? Math.round(wins / at.length * 100) : 0;
    const pPct = a.capital ? (pnl / a.capital * 100) : 0;
    const tgt = a.profitTarget || 10;
    const prog = Math.min(100, Math.max(0, pPct / tgt * 100));
    const sc = a.status === 'Funded' ? 'funded' : a.status === 'Challenge' ? 'challenge' : 'other';
    const fc = prog >= 100 ? 'done' : prog > 50 ? 'ok' : 'warn';
    return `<div class="acc-card">
      <div style="flex:1">
        <div class="acc-name">${a.name}<span class="acc-status ${sc}">${a.status}</span></div>
        <div class="acc-meta">
          ${a.firm || '—'} · $${a.capital.toLocaleString()} · ${a.split}% split · ${a.market}<br>
          Max DD: ${a.maxDD}% · Daily DD: ${a.dailyDD}% · Target: ${tgt}%<br>
          PnL: <span style="color:${pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(pnl)} (${pPct.toFixed(2)}%)</span>
          · ${at.length} trades · WR: ${wr}%
        </div>
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);font-family:'DM Mono',monospace;margin-bottom:4px">
            <span>Progresso para target</span><span>${pPct.toFixed(2)}% / ${tgt}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ${fc}" style="width:${prog}%"></div></div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteAccount('${a.id}')">🗑 Eliminar</button>
    </div>`;
  }).join('');
}

function refreshSelects() {
  const aOpts = State.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  const gAcc = document.getElementById('gAcc');
  if (gAcc) { gAcc.innerHTML = `<option value="">Todas as Contas</option>${aOpts}`; gAcc.value = State.activeAccountId; }
  const tAcc = document.getElementById('tAcc');
  if (tAcc) tAcc.innerHTML = aOpts || '<option value="">— Sem contas —</option>';
  const sOpts = State.strategies.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const tStrat = document.getElementById('tStrat');
  if (tStrat) tStrat.innerHTML = `<option value="">— Nenhuma —</option>${sOpts}`;
  const fStr = document.getElementById('fStr');
  if (fStr) fStr.innerHTML = `<option value="">Estratégia</option>${sOpts}`;
}

function switchAccount(id) {
  State.activeAccountId = id;
  const a = State.accounts.find(x => x.id === id);
  const sub = document.getElementById('dash-sub');
  if (sub) sub.textContent = a ? `// ${a.name}` : '// todas as contas';
  const pg = document.querySelector('.page.active');
  if (!pg) return;
  const renders = { dashboard: renderDash, journal: renderTrades, calendar: renderCal, analytics: renderAnalytics };
  renders[pg.id.replace('page-', '')]?.();
}
