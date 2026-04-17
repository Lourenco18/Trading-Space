# Trading Space — MySQL + Vercel Edition

A prop-firm trading journal running on **Next.js** + **MySQL**, deployed on **Vercel**.  
The original Supabase backend has been replaced with a REST API layer using persistent MySQL connection pooling.

---

## Architecture

```
Browser (public/index.html)
        │  fetch() calls
        ▼
Next.js API Routes on Vercel (/pages/api/*)
        │  mysql2 connection pool (persistent)
        ▼
MySQL database (hosted: PlanetScale / Aiven / Railway / etc.)
```

Authentication uses **JWT tokens stored in httpOnly cookies** — no Supabase, no OAuth required.

---

## Project Structure

```
trading-space-mysql/
├── public/
│   └── index.html          ← The full single-page app (HTML + CSS + JS)
├── pages/
│   ├── index.js            ← Redirects to /index.html
│   └── api/
│       ├── auth/
│       │   ├── login.js    ← POST  /api/auth/login
│       │   ├── register.js ← POST  /api/auth/register
│       │   ├── logout.js   ← POST  /api/auth/logout
│       │   └── me.js       ← GET   /api/auth/me  (session check)
│       └── data/
│           ├── load.js     ← GET   /api/data/load (all data at once)
│           ├── accounts.js ← POST/DELETE /api/data/accounts
│           ├── strategies.js ← POST/PUT/DELETE /api/data/strategies
│           ├── trades.js   ← POST/PUT/DELETE /api/data/trades
│           └── notes.js    ← POST/DELETE /api/data/notes
├── lib/
│   ├── db.js               ← MySQL persistent connection pool
│   └── auth.js             ← JWT sign/verify + cookie helpers
├── schema.sql              ← Run this once to create your database tables
├── vercel.json             ← Vercel routing config
├── .env.local              ← Local env vars (never commit this)
└── package.json
```

---

## Step 1 — Set Up MySQL Database

You need a hosted MySQL database. Recommended providers:

| Provider | Free tier | Notes |
|---|---|---|
| **PlanetScale** | Yes | MySQL-compatible, serverless |
| **Aiven** | Yes (trial) | Full MySQL |
| **Railway** | Yes | Easy setup |
| **TiDB Cloud** | Yes | MySQL-compatible |
| **Supabase** | Yes | Has a MySQL-compatible endpoint |

Once you have your database, run `schema.sql`:

```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < schema.sql
```

Or paste the contents of `schema.sql` into your provider's SQL editor.

---

## Step 2 — Export Data from Supabase (if migrating)

### Option A — CSV Export (easiest)
1. Go to your Supabase dashboard → **Table Editor**
2. For each table (`accounts`, `strategies`, `trades`, `daily_notes`), click the table → **Export → CSV**
3. Once you have the CSVs, you can import them to MySQL using:

```bash
mysqlimport --local --fields-terminated-by=',' --lines-terminated-by='\n' \
  -h HOST -u USER -p DATABASE accounts.csv
```

Or use a GUI tool like **TablePlus**, **DBeaver**, or **MySQL Workbench** to import the CSVs visually.

### Option B — pg_dump (advanced)
If you have direct Postgres access to Supabase:

```bash
pg_dump \
  --data-only \
  --column-inserts \
  --no-privileges \
  -t accounts -t strategies -t trades -t daily_notes \
  "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  > supabase_data.sql
```

Then convert PostgreSQL syntax to MySQL:
- Replace `true/false` → `1/0` for booleans
- Replace `::jsonb` type casts → remove them
- Replace `uuid_generate_v4()` → use the UUIDs as-is (they're already strings)
- Arrays like `'{EUR/USD,GBP/USD}'` → `'["EUR/USD","GBP/USD"]'` (JSON format)

> **Note:** User accounts cannot be exported from Supabase Auth — users will need to re-register. Only trade data, accounts, strategies, and notes can be migrated.

---

## Step 3 — Local Development

```bash
# Install dependencies
npm install

# Copy and fill in your env vars
cp .env.local .env.local.example  # backup
# Edit .env.local with your real values

# Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Step 4 — Deploy to Vercel

### 4a — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/trading-space.git
git push -u origin main
```

### 4b — Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add Environment Variables (see below)
5. Click **Deploy**

### 4c — Environment Variables on Vercel
In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `MYSQL_HOST` | Your MySQL host (e.g. `aws.connect.psdb.cloud`) |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | Your MySQL username |
| `MYSQL_PASSWORD` | Your MySQL password |
| `MYSQL_DATABASE` | `trading_space` |
| `MYSQL_SSL` | `true` |
| `JWT_SECRET` | A long random string (64+ chars) |

**Generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 5 — How to Use the App

### First Visit
1. Go to your Vercel URL (e.g. `https://trading-space.vercel.app`)
2. Click **Create Account** → enter email + password → you're in
3. Your session is stored in a secure httpOnly cookie — you stay logged in for 30 days

### Dashboard
- Shows total PnL, win rate, profit factor, average win/loss
- Bar chart of recent 20 trades
- Strategy breakdown table

### Accounts (⊞)
- Add your prop firm accounts (FTMO, My Forex Funds, etc.)
- Set capital, split %, profit target, max drawdown
- Progress bar shows how close you are to target

### Journal (≡)
- Log every trade: asset, direction, lots, PnL, R:R, session, setup notes, screenshots
- Filter by direction, result, strategy, month
- Click **Ver** to see full trade detail with images

### Strategies (⚡)
- Create trading strategies with entry/exit rules, pairs, sessions, timeframe
- See live stats per strategy: win rate, avg win/loss, profit factor

### Calendar (◫)
- Monthly view with daily PnL coloured green/red
- Click a day to filter the journal to that day

### Analytics (↗)
- Weekly / monthly PnL breakdowns
- Stats by pair, session, strategy

### Daily Notes (✎)
- Journal your daily mindset, market analysis, plan for tomorrow

### Calculator (⌗)
- Floating calculator in the bottom-right corner

---

## Persistent Database Connection

The `lib/db.js` file creates a **connection pool** that is reused across all serverless function invocations on Vercel. This means:

- No cold-start connection overhead after the first request
- Maximum 10 simultaneous connections (configurable)
- Automatic reconnection on dropped connections
- SSL support for hosted databases

If you see connection errors, check:
1. Your `MYSQL_SSL` env var — most hosted providers require `true`
2. Your provider's IP allowlist — Vercel uses dynamic IPs, so set it to **allow all** (`0.0.0.0/0`) or use a provider that doesn't require IP allowlisting (PlanetScale, TiDB Cloud)

---

## Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- Sessions use **JWT** in **httpOnly cookies** (not accessible from JavaScript)
- All API routes verify the user's session before touching the database
- Each query filters by `user_id` to prevent cross-user data access
- No Supabase anon key exposed in the browser

---

## Adding Google OAuth (optional)

The current build uses email/password only. To add Google OAuth you would need to:
1. Add `next-auth` as a dependency
2. Configure a Google OAuth app in Google Cloud Console
3. Replace the login/register flow with NextAuth providers

This is not included in the current build to keep things simple.
