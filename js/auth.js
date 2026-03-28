// ============================================================
// auth.js — login, register, Google OAuth, logout
// ============================================================

function showAuthScreen() {
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}
function showAppScreen() {
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('userEmail').textContent = State.user?.email || State.user?.user_metadata?.full_name || '—';
  renderDash();
  refreshSelects();
}
function showLoading() {
  document.getElementById('loadingScreen').style.display = 'flex';
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'none';
}

// ── Tab switcher ──────────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.style.display = 'none');
  if (tab === 'login') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('panelLogin').style.display = 'flex';
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('panelRegister').style.display = 'flex';
  }
}

function authErr(panelId, msg) {
  const el = document.getElementById(panelId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function authOk(panelId, msg) {
  const el = document.getElementById(panelId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function clearAuthMsgs() {
  document.querySelectorAll('.auth-err,.auth-ok').forEach(el => el.style.display = 'none');
}

// ── Email / Password login ────────────────────────────────────
async function doLogin() {
  clearAuthMsgs();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) return authErr('loginErr', 'Preenche email e password.');
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = 'A entrar...';
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').textContent = 'Entrar';
  if (error) authErr('loginErr', error.message);
}

// ── Register ──────────────────────────────────────────────────
async function doRegister() {
  clearAuthMsgs();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  if (!email || !pass) return authErr('regErr', 'Preenche todos os campos.');
  if (pass !== pass2) return authErr('regErr', 'As passwords não coincidem.');
  if (pass.length < 6) return authErr('regErr', 'Password com mínimo 6 caracteres.');
  document.getElementById('regBtn').disabled = true;
  document.getElementById('regBtn').textContent = 'A criar...';
  const { error } = await sb.auth.signUp({
    email, password: pass,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  document.getElementById('regBtn').disabled = false;
  document.getElementById('regBtn').textContent = 'Criar Conta';
  if (error) authErr('regErr', error.message);
  else authOk('regOk', '✅ Conta criada! Verifica o teu email para confirmar.');
}

// ── Google OAuth ──────────────────────────────────────────────
async function doGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) toast('Erro Google: ' + error.message, 'err');
}

// ── Password reset ────────────────────────────────────────────
async function doReset() {
  clearAuthMsgs();
  const email = document.getElementById('resetEmail').value.trim();
  if (!email) return authErr('resetErr', 'Introduz o teu email.');
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) authErr('resetErr', error.message);
  else authOk('resetOk', '✅ Email enviado! Verifica a tua caixa.');
}

// ── Logout ────────────────────────────────────────────────────
async function doLogout() {
  await sb.auth.signOut();
  State.user = null;
  State.accounts = []; State.strategies = [];
  State.trades = []; State.notes = [];
  State.activeAccountId = '';
  showAuthScreen();
}

// ── Auth state listener ───────────────────────────────────────
async function initAuth() {
  showLoading();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    State.user = session.user;
    await loadAll();
    showAppScreen();
  } else {
    showAuthScreen();
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      State.user = session.user;
      await loadAll();
      showAppScreen();
    } else if (event === 'SIGNED_OUT') {
      showAuthScreen();
    }
  });
}
