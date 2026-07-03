# Market page — integration into Trading Space

I integrated the pre-session analysis directly into your existing app rather
than building a separate page, since you already have a PHP + MySQL backend.
Here's exactly what changed.

## What was added to your site (already applied to the files in this zip)

- **`index.html`**
  - A new **Market** nav button in the sidebar (Tools section).
  - A new **page-market** section: a 24h session clock (London/New York bands
    + a live "now" marker) and a card per pair (bias, tradeable, reasoning),
    styled with your existing `--bg` / `--card` / `--accent` / `--red` tokens
    so it matches the rest of the app.
  - A `renderMarket()` function that fetches `api/market.php` and fills in
    the cards. Wired into your existing `nav()` router.
- **`api/market.php`** *(new file)* — `GET` returns the latest saved reading
  (public, no login needed — so this works even if you want to make this one
  page visible to visitors who aren't logged in yet). `POST` is how the
  automated job writes a new reading; it's protected by a shared secret
  instead of a user session, since it's not a logged-in person.
- **`api/config.php`** — added one constant, `MARKET_WRITE_SECRET`. **You
  must change the placeholder value** to a long random string.
- **`schema.sql`** — added a `market_analysis` table.

## What's outside your site (the automation)

- **`scripts/run-analysis.js`** — calls the Claude API (with web search) using
  your prompt, then POSTs the structured result straight to
  `https://your-domain.com/api/market.php`.
- **`.github/workflows/market-analysis.yml`** — runs that script automatically
  before London and before New York, on weekdays.

## Setup steps

1. **Run the new table**: open `schema.sql` in phpMyAdmin (or wherever you
   manage the `trading_space` database) and run the `market_analysis` table
   creation block — or just re-run the whole file, it's all `IF NOT EXISTS`.
2. **Set your write secret**: in `api/config.php`, change
   `MARKET_WRITE_SECRET` to a long random string (e.g. run
   `openssl rand -hex 32` locally, or generate one at random.org). Deploy
   this change to your live site.
3. **Deploy the updated files** to your live site: `index.html`,
   `api/config.php`, `api/market.php`.
4. **Add GitHub secrets** in the repo that will run the automation (Settings
   → Secrets and variables → Actions → New repository secret):
   - `ANTHROPIC_API_KEY` — from console.anthropic.com
   - `SITE_URL` — e.g. `https://your-domain.com` (no trailing slash)
   - `MARKET_WRITE_SECRET` — the exact same string you put in `config.php`
5. **Add the workflow and script** (`.github/workflows/market-analysis.yml`
   and `scripts/run-analysis.js`) to that repo.
6. Go to the **Actions** tab and click **Run workflow** on "Market
   Fundamental Analysis" to trigger it manually the first time.
7. Open your site, log in, click **Market** in the sidebar — you should see
   the reading.

## One thing to decide: public or logged-in only?

Right now the Market page lives inside the app, behind your existing login
screen — so only signed-in users see it. The API endpoint itself (`GET
api/market.php`) is already public with no auth required, so if you want
this specific page visible to visitors who haven't signed up (e.g. as a
free hook to get people to create an account), I can pull the Market page
out from behind the login screen — that's a small additional change to
where the page div sits and how it's shown. Let me know if you want that.

## Costs

Each automated run is one Claude API call with web search — a few cents,
twice a day. Check current pricing at anthropic.com for exact numbers.
