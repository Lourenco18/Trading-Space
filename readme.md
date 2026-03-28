# 📈 Trading Space — Prop Firm Journal

> Built entirely with AI assistance (Claude by Anthropic)

**Trading Space** is a full-stack trading journal designed specifically for prop firm traders. Log trades, track performance, analyse patterns, and manage multiple funded accounts — all in one place, accessible from any device.

---

## ✨ Features

### 📊 Dashboard
- Real-time PnL overview with mini bar chart
- Key stats: Win Rate, Avg Win/Loss, Profit Factor, Average Risk %
- Performance breakdown by strategy
- Latest 5 trades at a glance

### 📋 Trade Journal
- Log every trade with full detail: asset, direction, entry/SL/TP, lots, PnL, risk %, R:R, session, setup
- Attach screenshots directly to each trade (stored as base64)
- Filter by direction, result, strategy, month, or search by asset/setup
- Edit or delete any trade at any time

### 📅 Calendar View
- Monthly PnL heatmap — see your best and worst days at a glance
- Click any day to filter the journal to that date

### 📈 Analytics
- Performance breakdown by week, month, asset pair, session, and strategy
- Win rate, total PnL, and W/L ratio for each dimension

### ⚡ Strategies
- Create and manage your trading strategies with colour coding
- Define entry/exit rules, preferred pairs, sessions, timeframe, and minimum R:R
- Auto-calculated live stats per strategy (PnL, WR, Avg Win/Loss)

### ⊞ Account Management
- Add multiple prop firm accounts (FTMO, MyFundedFX, etc.)
- Track capital, profit split, profit target, max DD, and daily DD
- Visual progress bar towards profit target per account

### ✎ Daily Journal
- Write daily trading notes with mood tracking
- Separate fields for market analysis and plan for tomorrow


### 📱 Fully Responsive
- Works on desktop, tablet, and mobile
- Collapsible sidebar with hamburger menu on small screens


## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (single file) |
| Backend / Database | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Auth | Supabase Auth (email) |
| Fonts | DM Sans + DM Mono (Google Fonts) |
