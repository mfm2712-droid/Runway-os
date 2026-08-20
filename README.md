# Runway OS

A friction-free personal finance utility: daily safe spending limit, subscription
leak detection, an emergency runway calculator, and an AI copilot (chat advisor,
receipt scanning, daily briefing). Core numbers live entirely in `localStorage`;
the AI features call a small serverless backend only when you use them.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- Core app: no database, no auth — 100% client-side
- AI features: Vercel Edge Functions (`api/`) calling the Anthropic API,
  with a fully-functional simulated fallback when no backend/key is
  configured (see [AI features](#ai-features) below)

## How it works

- **Runway Inputs** (cash balance, fixed monthly outflows) is the single source of
  truth. Every metric card and the runway figure derive from it — see
  [`src/lib/calculations.ts`](src/lib/calculations.ts).
- **Subscriptions** count toward monthly burn automatically and can be flagged as
  "unused" to surface them as recurring leaks.
- **Expenses** logged via the mobile-optimized "+" quick-add sheet reduce the
  Daily Safe Spend for the rest of the current month in real time.
- Everything persists to `localStorage` under the key `runway-os:v1` via
  [`src/hooks/useLocalStorage.ts`](src/hooks/useLocalStorage.ts) — closing the tab
  or restarting the browser does not lose data. Clearing site data/cookies does.

## AI features

Three AI surfaces, all in [`src/components/ai/`](src/components/ai) and
[`src/lib/ai/`](src/lib/ai):

- **Ask Money Copilot** (`AdvisorDrawer.tsx`) — a chat drawer that gets the
  user's real financial snapshot as context (see `lib/ai/context.ts`) and
  streams back an answer.
- **Receipt Scanner** (`ReceiptDropzone.tsx`, inside the Add Expense modal) —
  drop a photo (vision model) or paste text (local parse), get back merchant/
  amount/category/recurring, confirm to log it.
- **Smart Briefing** (`SmartBriefingCard.tsx`) — a dashboard card with a
  real, computed insight (e.g. runway impact of cancelling flagged
  subscriptions) revealed with a typewriter effect.

**Every AI call has a working simulated fallback.** `src/lib/ai/client.ts`
tries the live `/api/chat` or `/api/parse-receipt` endpoint first; if that
fails (no backend deployed, no API key set, network error — which is always
true under plain `vite dev`, since Vite doesn't run Vercel functions), it
falls back to a deterministic, math-backed simulated response and marks the
message with a visible "Simulated" badge. Nothing pretends to be live AI when
it isn't.

### Enabling live AI

1. Get an API key at [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in your Vercel
   project's Environment Variables — see [`.env.example`](.env.example).
   Never commit the real key.
3. Deploy to Vercel (below). `api/chat.ts` and `api/parse-receipt.ts` deploy
   automatically as Edge Functions alongside the static site.
4. To test the backend locally (not just the simulated fallback), use
   `vercel dev` instead of `npm run dev` — it runs both the Vite frontend and
   the `api/` functions. Requires `vercel link` first.

### Before sending paid traffic here — read [MARKETING.md](MARKETING.md)

The AI endpoints currently have **no rate limiting or auth** — anyone who
finds the URL can call them, not just paying customers, and each call costs
you real Anthropic API spend. This is fine for testing/demoing, but
[MARKETING.md](MARKETING.md) has the details on why you need rate limiting
before running ads, and the pricing-model implications of ongoing AI costs
against a one-time payment.

## Local development

```bash
npm install
npm run dev
```

This runs the frontend only — AI calls use the simulated fallback (see
above). Use `vercel dev` if you need to test the real endpoints locally.

## Build

```bash
npm run build
```

Type-checks the frontend (`src/`) and the API functions (`api/`) together,
then outputs the static site to `dist/`.

## Deploy to Vercel (under 2 minutes) — required for live AI

**Option A — CLI:**

```bash
npm install -g vercel
vercel deploy --prod
```

Accept the defaults (Vercel auto-detects Vite + the `api/` functions). Set
`ANTHROPIC_API_KEY` in the project's environment variables for live AI —
without it, the app still works fully via the simulated fallback.

**Option B — Git:**

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: Vite (auto-detected). Add `ANTHROPIC_API_KEY` under
   Environment Variables. Click Deploy.

## Deploy to Netlify

Netlify works for the static frontend, but `api/chat.ts` and
`api/parse-receipt.ts` are written as **Vercel Edge Functions** and won't run
as-is on Netlify — the app will fall back to simulated AI responses
everywhere. Porting them to
[Netlify Functions](https://docs.netlify.com/functions/overview/) is
straightforward (same fetch-based logic, different handler signature) but
isn't done here. If you specifically want Netlify, do that port first, or
stick to Vercel for the AI backend.

**Option A — CLI:**

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**Option B — Drag and drop:**

1. Run `npm run build`.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag in the
   `dist/` folder.
