# Lemon Squeezy listing — ready to paste

## Product settings

| Field | Value |
|---|---|
| Title | Runway OS — The AI Financial Copilot |
| Price | £29 / $37 (one-time payment) — see pricing note below before you launch |
| Type | Digital product (no license key needed unless you want update-gating later) |

## Headline

> The financial operating system with a built-in AI copilot — ask it anything,
> hand it a receipt, and get a real answer grounded in your actual numbers.

## Short description (for the product card / social preview)

> Daily safe-spend limit, zero-income runway, subscription-leak detection, and
> an AI advisor that answers real questions about your money — plus receipt
> scanning that logs expenses for you. Core numbers stay local; nothing else
> does.

## Full description

Most budgeting apps turn money management into a second job: categorize every
transaction, link your bank, stare at a dozen charts you'll never read twice.

Runway OS strips the tracking down to what you'd actually check every
morning — and adds an AI copilot for the part spreadsheets can't do:
answering questions.

- **Daily Safe Spend** — what you can spend today without risk, recalculated
  automatically from your cash, fixed costs, and what you've already spent
  this month.
- **Zero-Income Runway** — how many months your current cash covers if income
  stopped tomorrow, subscriptions included.
- **Subscription Leak Detector** — flag what you don't use and see the
  monthly total quietly draining your account.
- **✨ Ask Money Copilot** — "Can I afford this?" "How do I extend my runway by
  two months?" Get a direct answer grounded in your real numbers.
- **✨ Receipt Scanner** — drop a photo or paste a line of text; merchant,
  amount, category, and recurring-vs-one-off are extracted and logged
  automatically.
- **✨ Morning Briefing** — one AI-written sentence every time you open the
  app: what's safe to spend, and the single change that would help most.

No bank connection, no account required. Your cash balance, subscriptions,
and expense history are stored locally in your own browser. The AI features
send your financial snapshot and question to a secured backend only when you
actually use them — see the Privacy note below.

## Delivery / confirmation screen copy

> **Access Your System**
> [Launch Runway OS →](https://YOUR-DEPLOYED-URL.vercel.app/app)
>
> Bookmark this link — your data is saved locally to whichever browser you use
> it in. Source code: [link if you're delivering the repo, e.g. a private GitHub
> repo invite or a downloadable zip].

Replace the placeholder URL with your actual Vercel deployment once live (see
[README.md](README.md) for setup), and decide whether "access" means (a) a
hosted link, (b) a downloadable copy of this repo to self-host, or (c) both —
the copy above assumes (a).

## Before you publish — read this, not just skim it

1. **The AI and billing endpoints have no auth, and rate limiting is
   best-effort only.** `api/chat.ts`, `api/parse-receipt.ts`, and
   `api/verify-subscription.ts` each throttle per-IP via an in-memory sliding
   window (`api/_lib/rateLimit.ts` — currently 15 req/min for chat and
   receipt parsing, 30 req/min for subscription re-verification). This is
   real protection against a runaway client or a simple abuse script, but it
   is **not a hard guarantee**: Vercel Edge Functions run as multiple,
   ephemeral, per-region instances with no shared state, so the limit caps
   each hot instance rather than the true global rate for an IP. There's
   still no auth, so anyone with the URL — not just people who paid — can
   call these endpoints up to that limit. **Before turning on paid ad
   traffic at meaningful volume**, put a real distributed limiter in front
   (e.g. Vercel's built-in Firewall rate-limit rules, or `@upstash/ratelimit`
   with a free Upstash Redis instance) if you need a strict per-IP cap rather
   than this best-effort one.
2. **AI usage costs are now a real, ongoing marginal cost per user** — this
   changes your unit economics from "£29 once, zero marginal cost" to "£29
   once, plus however many Claude API calls each buyer makes, forever." A
   one-time payment with unlimited AI use is a real risk if the product takes
   off. Options worth considering: cap AI requests per user (needs some form
   of session/account, which needs a backend you don't have yet), switch
   pricing to a monthly subscription (Lemon Squeezy supports this) so revenue
   scales with ongoing cost, or ship the AI features as a metered/limited
   "Pro" tier on top of a free-forever core tool.
3. **What "one-time payment, lifetime access" means here.** There's still no
   auth, so anyone with the URL has access to the app itself. Combined with
   point 1, this also means anyone with the URL has access to the AI
   endpoints. Don't promise account-based licensing you haven't built.
4. **"Source included"** in the pricing card (`src/pages/Landing.tsx`) assumes
   you're comfortable handing over this repo, AI backend and all. Remove that
   bullet if you'd rather sell hosted access only.
5. **Privacy claim accuracy.** The landing page now says core numbers are
   local-first and AI features send data out only when used — that's
   accurate as built. Don't revert to "100% local, nothing ever leaves your
   browser" copy without also removing the AI features, or it becomes false.
