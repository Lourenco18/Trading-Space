// ============================================================
// config.js — Supabase client + shared state
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const State = {
  user: null,
  profile: null,
  accounts: [],
  strategies: [],
  trades: [],
  notes: [],
  activeAccountId: "",
  // Community
  communities: [],
  activeCommunityId: null,
  communityPosts: [],
  communityMembers: [],
};

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n) => {
  const v = parseFloat(n) || 0;
  return (v >= 0 ? "+" : "") + v.toFixed(2);
};
const fmtD = (s) =>
  s
    ? new Date(s).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";
const fmtDT = (s) =>
  s
    ? new Date(s).toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const fmtAgo = (s) => {
  if (!s) return "";
  const d = Math.floor((Date.now() - new Date(s)) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
};
const filteredTrades = () =>
  State.activeAccountId
    ? State.trades.filter((t) => t.accountId === State.activeAccountId)
    : [...State.trades];

// ── Map DB rows ───────────────────────────────────────────────
const mapAccount = (r) => ({
  id: r.id,
  name: r.name,
  firm: r.firm || "",
  capital: +r.capital || 0,
  split: +r.split || 80,
  profitTarget: +r.profit_target || 10,
  maxDD: +r.max_dd || 10,
  dailyDD: +r.daily_dd || 5,
  status: r.status || "Challenge",
  market: r.market || "Forex",
});
const mapStrategy = (r) => ({
  id: r.id,
  name: r.name,
  color: r.color || "#818cf8",
  desc: r.description || "",
  entryRules: r.entry_rules || "",
  exitRules: r.exit_rules || "",
  pairs: r.pairs || [],
  sessions: r.sessions || [],
  tf: r.timeframe || "",
  minRR: r.min_rr || "",
  riskPct: r.risk_pct || "",
  notes: r.notes || "",
});
const mapTrade = (r) => ({
  id: r.id,
  accountId: r.account_id,
  strategyId: r.strategy_id || "",
  date: r.trade_date,
  asset: r.asset,
  dir: r.direction,
  lots: r.lots,
  pnl: +r.pnl || 0,
  riskPct: r.risk_pct || "",
  rr: r.rr || "",
  result: r.result,
  session: r.session,
  setup: r.setup || "",
  notes: r.notes || "",
  images: r.images || [],
});
const mapNote = (r) => ({
  id: r.id,
  date: r.note_date,
  mood: r.mood,
  note: r.analysis || "",
  plan: r.plan || "",
});
const mapCommunity = (r) => ({
  id: r.id,
  name: r.name,
  desc: r.description || "",
  color: r.avatar_color || "#818cf8",
  isPublic: r.is_public,
  allowPosts: r.allow_posts,
  inviteCode: r.invite_code,
  ownerId: r.owner_id,
});
const mapPost = (r) => ({
  id: r.id,
  communityId: r.community_id,
  userId: r.user_id,
  content: r.content || "",
  images: r.images || [],
  asset: r.asset,
  direction: r.direction,
  result: r.result,
  pnl: r.pnl,
  rr: r.rr,
  isPinned: r.is_pinned,
  replyTo: r.reply_to,
  createdAt: r.created_at,
  profile: r.profiles,
});

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show " + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = "toast"), 3200);
}

// ── Sync dot ──────────────────────────────────────────────────
function setSyncing(on, err = false) {
  const d = document.getElementById("syncDot");
  if (!d) return;
  d.className = "sync-dot" + (on ? " syncing" : err ? " error" : "");
}

// ── Load all ──────────────────────────────────────────────────
async function loadAll() {
  setSyncing(true);
  try {
    const uid = State.user.id;
    const [a, s, tr, n, cm] = await Promise.all([
      sb.from("accounts").select("*").eq("user_id", uid).order("created_at"),
      sb.from("strategies").select("*").eq("user_id", uid).order("created_at"),
      sb
        .from("trades")
        .select("*")
        .eq("user_id", uid)
        .order("trade_date", { ascending: false }),
      sb
        .from("daily_notes")
        .select("*")
        .eq("user_id", uid)
        .order("note_date", { ascending: false }),
      sb.from("community_members").select("communities(*)").eq("user_id", uid),
    ]);
    if (a.error) throw a.error;
    if (s.error) throw s.error;
    if (tr.error) throw tr.error;
    if (n.error) throw n.error;
    State.accounts = (a.data || []).map(mapAccount);
    State.strategies = (s.data || []).map(mapStrategy);
    State.trades = (tr.data || []).map(mapTrade);
    State.notes = (n.data || []).map(mapNote);
    State.communities = (cm.data || [])
      .filter((r) => r.communities)
      .map((r) => mapCommunity(r.communities));
    // profile
    const { data: prof } = await sb
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    State.profile = prof;
    setSyncing(false);
  } catch (e) {
    console.error(e);
    setSyncing(false, true);
    toast(t("error") + ": " + e.message, "err");
  }
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    document
      .querySelectorAll(".modal-overlay.open")
      .forEach((m) => m.classList.remove("open"));
});
