// run-analysis.js
// Calls the Claude API (with web search) to produce a fundamental analysis
// for XAU/USD, US100 and US30, then POSTs the result to your live site's
// api/market.php endpoint.
//
// Requires environment variables:
//   ANTHROPIC_API_KEY   - your Claude API key
//   SITE_URL            - e.g. https://your-domain.com  (no trailing slash)
//   MARKET_WRITE_SECRET - must match MARKET_WRITE_SECRET in api/config.php

const SESSION = process.argv[2]; // "london" or "newyork"

if (!SESSION || !["london", "newyork"].includes(SESSION)) {
  console.error("Usage: node run-analysis.js <london|newyork>");
  process.exit(1);
}

const sessionLabel = SESSION === "london" ? "London" : "New York";

const PROMPT = `Faz uma análise fundamentalista destes pares para o dia de hoje e para a sessão de ${sessionLabel}: XAU/USD, US100, US30.

Usa notícias e dados económicos atuais (calendário económico, eventos macro, sentimento de mercado) de hoje para fundamentar a análise.

Para cada um dos 3 pares, decide se está "bullish", "bearish" ou "neutral", e se é "tradeable" hoje nesta sessão (true/false) — considera não tradeable se houver eventos de alto risco, falta de catalisador claro, ou condições demasiado erráticas.

Responde APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois, seguindo exatamente este formato:

{
  "pairs": [
    { "symbol": "XAUUSD", "label": "XAU/USD", "bias": "bullish|bearish|neutral", "tradeable": true, "summary": "2-3 frases explicando o racional fundamental" },
    { "symbol": "US100", "label": "Nasdaq 100 (US100)", "bias": "bullish|bearish|neutral", "tradeable": true, "summary": "..." },
    { "symbol": "US30", "label": "Dow Jones (US30)", "bias": "bullish|bearish|neutral", "tradeable": true, "summary": "..." }
  ]
}`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const siteUrl = process.env.SITE_URL;
  const writeSecret = process.env.MARKET_WRITE_SECRET;

  for (const [name, val] of Object.entries({ ANTHROPIC_API_KEY: apiKey, SITE_URL: siteUrl, MARKET_WRITE_SECRET: writeSecret })) {
    if (!val) {
      console.error(`Missing required environment variable: ${name}`);
      process.exit(1);
    }
  }

  // 1. Ask Claude for the analysis
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: PROMPT }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic API error:", response.status, await response.text());
    process.exit(1);
  }

  const data = await response.json();
  const textBlocks = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not find JSON in model response:\n", textBlocks);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Failed to parse JSON from model response:\n", jsonMatch[0]);
    process.exit(1);
  }

  const now = new Date();
  const payload = {
    date: now.toISOString().slice(0, 10),
    session_label: sessionLabel,
    generated_at_utc: now.toISOString(),
    pairs: parsed.pairs,
  };

  // 2. Push it to the live site
  const postRes = await fetch(`${siteUrl}/api/market.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Market-Secret": writeSecret,
    },
    body: JSON.stringify(payload),
  });

  const postBody = await postRes.text();
  if (!postRes.ok) {
    console.error("Failed to save analysis to site:", postRes.status, postBody);
    process.exit(1);
  }

  console.log("Saved analysis:", postBody);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
