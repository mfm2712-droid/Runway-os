---

> **⚠️ MAINTENANCE RULE — READ BEFORE YOU LEAVE THIS REPO**
>
> This file is the living architectural memory of Runway OS. **Any AI agent or
> human developer who makes an architectural change, adds a feature, changes a
> data model, adds/removes an API endpoint, or fixes a non-trivial bug MUST
> append a note to the [Changelog & Evolution History](#2-full-changelog--evolution-history)
> section below before finishing their task.** Don't just fix the code and
> leave — future work (including your own next session) depends on this log
> staying current. Keep entries factual and specific (what changed, why, and
> which files), not vague ("improved UX"). If you're not sure whether a change
> is "architectural enough" to log, log it anyway — the cost of an extra line
> here is far lower than the cost of the next person re-discovering it the
> hard way.

---

# Runway OS — Project Knowledge Base

This is the canonical developer reference for Runway OS: what it is, how it's
built, why it's built that way, and how to work on it safely. Treat this as
the first thing to read before touching the codebase, and the first place to
update after changing it.

For quick setup/deploy instructions aimed at a new user, see
[README.md](README.md). This file goes deeper — it's aimed at whoever is
*building* the thing, not just running it.

---

## Table of Contents

1. [Executive Architecture Summary](#1-executive-architecture-summary)
2. [Full Changelog & Evolution History](#2-full-changelog--evolution-history)
3. [Developer How-To Guides](#3-developer-how-to-guides)
   - [3.1 How the math engine works (Runway, Burn, Daily Safe Spend)](#31-how-the-math-engine-works)
   - [3.2 How to add or modify expense categories](#32-how-to-add-or-modify-expense-categories)
   - [3.3 How to test and debug Stripe (webhooks + client verification)](#33-how-to-test-and-debug-stripe)
   - [3.4 How to deploy and verify updates on Vercel](#34-how-to-deploy-and-verify-updates-on-vercel)

---

## 1. Executive Architecture Summary

### Tech stack

| Layer | Choice |
|---|---|
| Build tool | Vite |
| UI framework | React 19 + TypeScript (strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`) |
| Styling | Tailwind CSS v4 — CSS-first config (`@theme` in `src/index.css`), no `tailwind.config.js` |
| Animation | `motion` (the successor package to `framer-motion`) for modal transitions; raw CSS `@keyframes`/Tailwind arbitrary-value animations for ambient/decorative motion |
| Backend | Vercel Edge Functions only (`api/*.ts`, `export const config = { runtime: "edge" }`) — no Node server, no long-running process |
| Database | **None.** See "Zero-DB model" below |
| Payments | Stripe (Checkout, Billing Portal, webhook receiver — see §1.4) |
| AI | Anthropic API (Claude), called from Edge Functions with a client-side simulated fallback (see §1.5) |
| Testing | Vitest (`src/lib/__tests__/`), `oxlint` for linting |
| CI | GitHub Actions (`.github/workflows/ci.yml`) — lint, typecheck, test on every push/PR to `main` |
| Deployment | Vercel (static site + Edge Functions); Netlify works for the static frontend only (AI endpoints won't run there as-is — see README) |

Three separate `tsconfig*.json` projects are wired together via
`tsconfig.json`'s `references`: `tsconfig.app.json` (`src/`, DOM + JSX),
`tsconfig.node.json` (Vite config), and `tsconfig.api.json` (`api/`, Edge
runtime). **`api/` and `src/` are intentionally isolated TypeScript
projects** — `api/*.ts` files cannot import from `src/`. This is why some
small constants (like the expense category list) are duplicated between the
two — see §3.2.

### Local-first design principles

Runway OS's entire premise is: **your financial numbers never have to leave
your device.**

- All financial state (`FinanceState` — cash balance, fixed outflows,
  subscriptions, expenses, wishlist, currency, settings) lives in
  **`localStorage`**, not a server database.
- There is **no user account system, no login, no server-side user table.**
  "Signing up" for Runway OS means nothing more than opening the app in a
  browser and completing onboarding.
- The only two things that ever talk to a server are:
  1. **AI features** (chat advisor, receipt vision OCR, cancellation/negotiation drafts) — and only when the user actively invokes them, sending only the minimal financial snapshot needed for that one request (see `src/lib/ai/context.ts`).
  2. **Stripe** (checkout, billing, subscription status) — because payment processing fundamentally requires a trusted third party; Runway OS never stores card details itself.
- Every AI call degrades gracefully to a **deterministic, math-backed
  simulated response** when no backend is configured or reachable (see §1.5)
  — the app is fully usable and honest about its numbers with zero backend
  deployed at all.

### State management (localStorage)

- `src/hooks/useLocalStorage.ts` is the single hook every piece of persisted
  state goes through. It:
  - Lazily reads+parses the stored value on mount, falling back to a caller-supplied default.
  - **Merges** stored JSON with the default at the top level (`mergeWithDefaults`) — so adding a new field to `FinanceState` doesn't require a storage-key version bump; existing users just get the new field's default value on next load, and everything else they've saved is preserved.
  - Writes back to `localStorage` on every state change via a `useEffect`, wrapped in try/catch (private-browsing quota errors fail silently rather than crashing the app).
- All storage keys live in one place: [`src/lib/storageKeys.ts`](src/lib/storageKeys.ts):

  | Key | Purpose |
  |---|---|
  | `runway-os:v3` | The main `FinanceState` blob (cash, outflows, subs, expenses, wishlist, currency, settings). Bumped from `v1`→`v3` historically when the shape changed enough to warrant a clean key (rare — most additions rely on the merge behavior above instead). |
  | `runway-os:onboarded` | Has the 3-step onboarding flow been completed (or demo data loaded)? |
  | `runway-os:trialStartedAt` | ISO timestamp — the trial clock starts here, not on first app mount (see §2, "trial-start timing fix"). |
  | `runway-os:licenseKey` | Either a Stripe customer id (`cus_...`) or the sentinel `support:verified` (see §1.4). |
  | `runway-os:devOverride` | Dev-only trial-state override, stripped from production UI via `import.meta.env.DEV`. |
  | `runway-os:streak` | `{ count, lastSafeDate }` — the safe-spend streak (§1.2 in changelog / §3.1). |
  | `runway-os:dailySeries` | Last-30-days `{date, spent, safeSpend}[]` for the sparkline. |
  | `runway-os:stealthMode`, `runway-os:saved-total`, `runway-os:audioMuted` | Smaller standalone preferences/counters, each with its own key rather than living inside `FinanceState` (they're not "financial truth," just UI/session state). |

- Each `Dashboard.tsx` mutation function (`addExpense`, `cancelSubscription`,
  etc.) reads-modifies-writes the whole `FinanceState` object — there's no
  finer-grained reducer/store; the app is small enough that this is fine.

### Zero-DB model

There is genuinely no database anywhere in this stack — not Postgres, not
Redis, not even a KV store. This is a **deliberate constraint**, not a
missing feature, and it shapes several other decisions documented in this
file:

- **Stripe is the source of truth for subscription status**, queried live
  (`stripe.subscriptions.list`, `stripe.checkout.sessions.retrieve`) rather
  than cached in a database Runway OS would otherwise own.
- **Cross-device restore** (`api/restore-by-email.ts`) asks Stripe directly
  "does this email have an active subscription?" at restore time, rather than
  looking up a local user record.
- **The Stripe webhook receiver** (`api/stripe-webhook.ts`) verifies
  signatures and logs events but **persists nothing** — there is nowhere
  durable to write "this customer is now active." It exists so the webhook
  endpoint is valid and the signature-verification code path is real and
  testable, not so it can update any stored state.
- **Rate limiting is in-memory, per-Edge-instance** (`api/_lib/rateLimit.ts`)
  rather than backed by a shared store like Upstash Redis — this means it's a
  best-effort defense against runaway clients, not a strict global guarantee
  (documented in the file itself and in `MARKETING.md`).
- The consequence of all this: **cancelling a Stripe subscription doesn't
  instantly downgrade the user** — the client has to notice on its own (via
  polling `verify-subscription.ts`; see §1.4). A real backend reacting to the
  webhook in real time would close that gap, at the cost of needing the
  datastore this project deliberately doesn't have.

### Stripe integration flow

Full detail lives in [README.md § Payments](README.md#payments-stripe); this
is the architectural shape.

```
┌─────────────┐   POST /api/create-checkout-session   ┌──────────────────┐
│ PaywallModal│ ─────────────────────────────────────▶ │ Stripe Checkout  │
└─────────────┘                                        │  (hosted page)   │
                                                         └────────┬─────────┘
                                                                  │ redirect on success
                                                                  ▼
                                        /app?checkout=success&session_id=...
                                                                  │
                                                                  ▼
                                      ┌──────────────────────────────────────┐
                                      │ useStripeVerification (Dashboard)    │
                                      │ → POST /api/verify-checkout-session  │
                                      │   (never trusts the query param      │
                                      │    alone — confirms with Stripe)     │
                                      └──────────────┬───────────────────────┘
                                                      ▼
                                    licenseKey = customerId ("cus_...")
                                    stored in localStorage — this IS the
                                    "Pro" flag; computeTrialStatus() just
                                    checks it's present, not its shape.
```

- **Ongoing re-verification** (since a `licenseKey` never expires on its
  own): `src/hooks/useStripeVerification.ts` calls
  `GET /api/verify-subscription?customerId=...` on mount and every 6 hours;
  if Stripe says the subscription is no longer active, the license is
  cleared locally.
- **Since v3.1.0**, `src/hooks/useSyncSubscriptionCheck.ts` adds a
  *synchronous* re-check the instant `SettingsModal` or `PaywallModal` opens
  (result cached ~3 min via `src/lib/subscriptionCache.ts`) — so a cancelled
  subscriber sees the downgrade immediately on next relevant screen, not just
  on the next 6-hourly poll.
- **Restoring on a new device**: `api/restore-by-email.ts` asks Stripe
  directly whether an email has an active subscription — no account system
  needed.
- **Managing/cancelling**: Stripe's own hosted Billing Portal
  (`api/create-portal-session.ts`), surfaced as "Manage Billing" in Settings.
  Only shown when `licenseKey?.startsWith("cus_")` — a support-access license
  (below) has no Stripe customer behind it, so no portal link.
- **Support access codes** (`SUPPORT_ACCESS_TOKEN` env var, optional): a
  hand-issued manual override, verified server-side with a **timing-safe**
  comparison (`api/verify-support-token.ts` — SHA-256 both sides via Web
  Crypto, then constant-time XOR byte comparison; direct `===` on secrets is
  a timing side-channel). Grants the sentinel license `support:verified`
  (`src/lib/trial.ts`), which is distinct from a `cus_...` id specifically so
  the Billing Portal button doesn't show for it. Leaving the env var unset
  disables this path entirely — there is no client-side bypass.

### OCR / receipt-scanning pipeline

Two genuinely different code paths, both producing the same `ParsedReceipt`
shape (`src/lib/ai/simulate.ts`), and the UI (`ReceiptDropzone.tsx`) must be
able to tell them apart honestly:

1. **Image → real vision OCR** (`api/parse-receipt.ts`): sends the image
   (base64, JPEG/PNG/WebP only, ≤4.5MB) to Claude's vision API with a strict
   JSON-only extraction prompt, then **server-side sanitizes/clamps** the
   model's raw JSON into the canonical shape (`sanitize()` — rejects anything
   missing `isReceipt` or with a non-finite `amount` as a hard failure, never
   a fabricated zero-value result). **This path has no simulated fallback.**
   If the vision call fails for any reason (no API key, network error,
   unparseable model output, rate-limited), `src/lib/ai/client.ts` throws a
   typed `ReceiptParseError` instead of ever substituting fake data — an
   image receipt result that's wrong or silently fabricated is considered
   worse than an honest error. The UI shows a real error state with a retry
   button.
2. **Pasted text → local heuristic** (`src/lib/ai/simulate.ts`,
   `simulateReceiptParse`): a regex/keyword guess against known
   merchant/category patterns. This was never real OCR — there's no image to
   read — so it's always labeled "Simulated" in the UI with a fixed modest
   confidence score (0.4), regardless of whether a live backend is
   configured.

Both paths converge on the same `ParsedReceipt` interface: `merchant,
amount, currency, date, taxAmount, category, confidenceScore,
lineItemsSummary, isReceipt, recurring`. `recurring` is an app-internal
addition beyond what a "canonical OCR schema" would strictly need — it
drives the "track as subscription instead of one-off expense" UI prompt.

### AI simulated-fallback pattern (applies beyond just OCR)

Every AI surface (`streamAdvisorReply`, `generateCancellationEmail`,
`generateNegotiationScript`, plus receipt text-paste above) follows the same
shape: try the live `/api/chat` (or `/api/parse-receipt`) endpoint first; on
any failure, fall back to a **deterministic, math-backed** simulated
response built from the user's real `FinanceState` (never random/fake
numbers) and mark it with a visible "Simulated" badge. This is why the app
is fully demoable and honest with zero backend deployed — `npm run dev`
alone (no `vercel dev`, no API keys) exercises the full simulated path.

---

## 2. Full Changelog & Evolution History

> This section is the authoritative "how did we get here" record. Newest at
> the top. When you make a change, add an entry — see the maintenance rule
> at the top of this file. Entries before v3.1.0 are reconstructed from the
> codebase and `CHANGELOG.md`; keep both files in sync going forward
> (`CHANGELOG.md` is the terse, user-facing release-notes version of this
> log — this file is the fuller "why" behind it).

### Unreleased (post-3.1.0, header/ambient-visual follow-ups)

- **Header logo now spins in place; the giant ambient background ring was
  removed entirely.** Original attempt combined `scale-150` (a `transform:
  scale()`) with a `transform: rotate()` keyframe on the same `<img>` —
  CSS animations fully own the `transform` property while running, so the
  scale was silently wiped out mid-spin, and the un-scaled square's corners
  poked past the clipped badge (visible as "deformation"). Fixed by sizing
  the spinning image via real box dimensions (`w-[160%] h-[160%]`, plus
  `max-w-none` to defeat Tailwind's `img { max-width: 100% }` preflight
  reset) instead of a `scale` transform, so `rotate()` is the only transform
  ever applied — see `src/components/Header.tsx`. The separate
  `BackgroundRing.tsx` (a full-page dotted decorative ring rendered in
  `App.tsx`) was deleted outright — it was decorative-only, unrelated to the
  header logo, and competed visually with the dashboard cards.

### v3.1.0 (2026-08-22) — Security hardening, retention features, UX polish

Full detail in [`CHANGELOG.md`](CHANGELOG.md). Summary:

- **Security**: constant-time support-token comparison (Web Crypto
  SHA-256 + XOR compare); rate-limited `verify-subscription` (30 req/min/IP);
  synchronous license re-verification on Settings/Paywall open
  (`useSyncSubscriptionCheck.ts`, `subscriptionCache.ts`), on top of the
  existing 6-hourly background poll.
- **Retention features**: safe-spend streak (`src/lib/streak.ts`) — judges
  each completed calendar day's logged expenses against that day's Daily
  Safe Spend; 30-day daily-spend sparkline (`src/lib/dailySeries.ts`,
  `SafeSpendSparkline.tsx`); month-over-month spend delta
  (`monthOverMonthDelta` in `calculations.ts`) shown in the Spend Breakdown
  header.
- **Category drill-down**: tapping a Spend Breakdown row opens
  `CategoryDetailModal.tsx` — per-bucket expense list with count/average/sum;
  "subscriptions" and "housing" buckets get special read-only treatment
  since they aren't 1:1 `ExpenseCategory` mappings (see §3.2).
- **Runway explainer**: an (i) button next to the Runway stat
  (`StatPills.tsx`) opens `RunwayExplainerModal.tsx` — shows the formula and
  a worked example using the user's real numbers. The Runway stat display
  itself (`formatRunwayDisplay`) now shows years past 12 months and
  "∞ Sustainable" at zero burn, instead of always showing raw months.
- **Numeric input fix**: `ProjectionLab`, `ExpenseModal`, `QuickTuneModal`,
  `OnboardingModal`, `CooldownModule`, `SubscriptionTracker` — inputs that
  re-stringified the value on every keystroke produced a "0500"-style
  leading-zero glitch when typing over a pre-filled non-empty value. Fixed
  with the pattern: keep a local string "draft" state while editing,
  `onFocus={(e) => e.target.select()}` for select-all, parse only on
  blur/submit via `parseFloat` + `Number.isFinite` fallback.
- **Bug fix**: the streak backfill loop had a first-run bug — with
  `lastSafeDate === null`, the cursor started at *today*, and the loop only
  evaluates days strictly before today, so it never ran even once. Fixed by
  starting the cursor from the same 60-day floor used for stale-data
  recovery.
- GitHub Actions CI added (`.github/workflows/ci.yml`).
- `MARKETING.md` corrected — no longer claims "no rate limiting" now that
  rate limiting exists (it was accurate when originally written, then went
  stale as hardening landed).

### Pre-v3.1.0 — "Production hardening + UX + OCR + retention" pass

- **Dev Mode purge**: developer-only trial-state override UI
  (`SettingsModal.tsx`'s "Dev Mode — Trial State" panel) gated behind
  `import.meta.env.DEV`, confirmed absent from production builds (`grep`
  against `dist/assets/*.js`). "Built in the open" marketing copy referencing
  dev-mode visibility was purged to match.
- **Toggle-switch fix**: old toggle pattern used an `absolute`-positioned
  knob with hardcoded pixel `translate-x` values, producing an asymmetric
  2px/0px inset between the "off" and "on" states. Replaced with the
  standard `border-2 border-transparent` (border-box) + `inline-block` +
  `translate-x-5`/`translate-x-0` pattern used consistently across
  `QuickTuneModal.tsx` and elsewhere now.
- **Audio engine** (`src/lib/audio.ts`): singleton `AudioContext` with
  gesture-unlock (first `pointerdown`/`keydown` anywhere resumes a suspended
  context — required for iOS/Safari, which only allows audio inside a real
  user gesture), synthesized tones (no external audio assets) with soft
  gain ramps, muted-by-default-**false** preference persisted to
  `localStorage`. `playClick()` on primary taps/category-select/modal-close;
  `playPop()` on successful-add/subscription-cancelled. Deliberately **not**
  played on every keystroke.
- **Haptics** (`src/lib/haptics.ts`): `navigator.vibrate()`, feature-detected
  and wrapped in try/catch (some browsers throw calling it outside a genuine
  gesture) — a safe no-op everywhere it isn't supported.
- **Visual ambient ring (superseded — see "Unreleased" above)**: originally
  a slowly-rotating (40s) dotted gradient ring rendered once at the app root
  (`BackgroundRing.tsx`) behind every page, respecting
  `prefers-reduced-motion`. Iterated on several times (sped up to 11s,
  brightened, reverted, and ultimately deleted entirely) before landing on
  the current design: the rotation lives on the header's small logo badge
  instead (`Header.tsx`), and the page background is plain/minimal.
- **Receipt OCR pipeline hardening**: this is where the current
  never-fabricate-on-image-failure design (§1's OCR section) was built —
  before this pass, a failed vision call silently fell back to
  `simulateReceiptParse(file.name)`, i.e. **fake merchant/amount data
  presented as if it were a real read**. Fixed by making `ReceiptParseError`
  a real thrown error for the image path, with the canonical `ParsedReceipt`
  schema (`taxAmount`, `lineItemsSummary`, `confidenceScore`, etc.) added at
  the same time and server-side sanitized in `api/parse-receipt.ts`.
- **Category drill-down groundwork**: `spendBreakdown.ts` reviewed and two
  helpers exported (`LEISURE_CATEGORIES`, `isThisMonth`) specifically so
  `CategoryDetailModal.tsx` could reuse the exact same bucket-grouping logic
  as the donut chart rather than duplicating it.
- **Security**: removed the old client-side "any correctly-formatted string
  is accepted" manual license key entirely, replaced with the
  server-verified support-access-token flow (§1.4); added periodic Stripe
  subscription re-verification (`verify-subscription.ts` +
  `useStripeVerification.ts`); added rate limiting + payload/MIME guards
  to `api/parse-receipt.ts`; fixed trial-start timing (starts on
  *onboarding completion*, not on app mount — a bookmark/PWA-shortcut visit
  to an unfinished onboarding must not start the clock).
- **UX**: Merchant/Note field added to manual expense entry
  (`ExpenseModal.tsx`).
- **Architecture**: `useShortcutHandler` and `useStripeVerification` hooks
  extracted out of `Dashboard.tsx` to keep it from growing into a monolith.
- **Testing**: `vitest` installed, first unit test suite written
  (`src/lib/__tests__/calculations.test.ts` — covers `dailySafeSpend`,
  `isBurnSpike`, `runwayMonths`, projection, trial status).

### Earlier history (pre-hardening passes, condensed)

The project was built up in many incremental passes before the hardening
work above; condensed here rather than itemized day-by-day (see `git log`
for the full commit history if needed):

- Initial build: calculations lib, `useLocalStorage` hook, core UI
  components, landing page + dashboard SPA routing (`App.tsx`'s
  path-based router — no react-router dependency).
- Visual redesign pass: "obsidian/glass/glow" design system tokens, glass
  surfaces, primitive components (`GlassCard`, `Button`, `RingProgress`,
  etc.).
- AI features added: Ask Money Copilot chat drawer, receipt scan mode,
  Smart Briefing card — all with the simulated-fallback pattern from day
  one.
- Data model growth: wishlist (72-hour Cooldown feature),
  `flaggedSince`/`flaggedUnused` on subscriptions, `paydayDay` +
  `safetyBuffer` (payday-aware Daily Safe Spend), `weekendBooster`,
  `currency` (multi-currency support with a robust localStorage migration).
- Projection Lab: `src/lib/projection.ts` engine, scenario presets,
  `BurnProjectionChart.tsx` SVG area chart, scrub-bar interaction.
- Monetization: Stripe integration built from scratch (all the
  `api/*checkout*`, `*portal*`, `*webhook*` functions), trial engine +
  paywall + feature gating, `SettingsModal` (currency, dev toggle,
  backup/restore), CSV export.
- Motion polish: migrated to `motion` (framer-motion successor) for all
  modal transitions (`AnimatePresence` + shared `motionPresets.ts` spring
  config), shared `layoutId` transitions on tabs/toggles, WCAG AA contrast
  pass, PWA manifest + service worker + share-target handling.
- Behavioral/retention features (first wave): Stealth Mode (blur sensitive
  numbers), Weekend Booster, Burn Spike Warning, Savings Vault (lifetime
  recovered-savings counter on subscription cancellation), negotiation
  script generator, micro-audio synth v1.

---

## 3. Developer How-To Guides

### 3.1 How the math engine works

All of this lives in [`src/lib/calculations.ts`](src/lib/calculations.ts).
Everything is a pure function of `FinanceState` (+ an optional `today: Date`
parameter for testability — every function defaults it to `new Date()` but
tests pass fixed dates).

**Total Monthly Outflow** (the "burn rate"):

```
totalMonthlyOutflow(state) = state.fixedMonthlyOutflows + subscriptionsTotal(state)
```

Fixed monthly outflows (rent, bills — a single lump-sum number the user sets
directly) plus the sum of all tracked subscriptions. This is deliberately
**not** reduced by anything else — it's the raw recurring commitment.

**Runway** — "how many months until cash hits zero at zero income, doing
nothing differently":

```
runwayMonths(state) = state.cashBalance / totalMonthlyOutflow(state)
                       (Infinity if outflow <= 0)
```

This is a **worst-case, static** number: it does not account for the safety
buffer (that's what Daily Safe Spend is for — see below), doesn't assume any
income, and doesn't reduce for money already spent this month. The headline
display (`formatRunwayDisplay`) converts this raw month count into a
friendlier unit: months if ≤12, years if >12, `"∞ Sustainable"` if burn is
zero. `RunwayExplainerModal.tsx` shows the full formula plus this exact
calculation done live with the user's real numbers.

**Daily Safe Spend** — the app's headline "one number that matters":

```
remaining = max(0, cashBalance - totalMonthlyOutflow - spentThisMonth - safetyBuffer)
days      = spendingHorizonDays(state)   // to payday if set, else days left in calendar month
dailySafeSpend = remaining / days                        // if no weekendBooster
```

With **Weekend Booster** enabled, the same total `remaining` budget is
redistributed so Friday–Sunday gets 1.4× the daily share of Monday–Thursday,
rather than an equal split — `countWeekendWeightedDays()` counts how many of
each day type remain in the horizon, and today's actual allowance depends on
both that mix and whether today itself is a weekend day.

`spendingHorizonDays` is the other lever: if `state.paydayDay` is set, the
horizon runs to the next occurrence of that day-of-month
(`daysUntilDayOfMonth`); otherwise it's simply the days left in the current
calendar month (`daysLeftInMonth`).

**Month-over-month delta** (`monthOverMonthDelta`, added in v3.1.0): compares
*this month's total footprint* (fixed + subs + logged expenses so far) to
*last month's* (fixed + subs, treated as constant since there's no
historical record of them, + last month's logged expenses). Returns `null`
— not zero — when last month has no logged expenses at all, since there's
genuinely nothing to compare against yet; callers must treat `null` as
"hide this," not "0% change."

**Safe-spend streak** (`src/lib/streak.ts`, added in v3.1.0): a **known
approximation**, documented in the file itself — because there's no
historical snapshot of cash balance or settings, judging whether a *past*
day was "safe" uses `dailySafeSpend()` computed with *today's* current
balance and settings applied retroactively to that past date, not a true
replay of what the limit actually was back then. A day counts as safe when
`dailySpend(state, thatDate) <= dailySafeSpend(state, thatDate)` — never
today itself (it isn't over yet), and never pro-rated fixed
costs/subscriptions (those are already netted into the Daily Safe Spend
side of the comparison).

**Tests**: `src/lib/__tests__/calculations.test.ts` is the reference for
exact expected values — read it before changing any of the functions above,
and add a case there for any new formula.

### 3.2 How to add or modify expense categories

`ExpenseCategory` is a **union type**, not a database enum, so "adding a
category" means touching every place that exhaustively lists it. There is
**no single source of truth to edit and be done** — this is the single most
error-prone place in the codebase to make an incomplete change, because
`api/` cannot import from `src/` (separate TypeScript projects — see §1).

Checklist, in dependency order:

1. **`src/types.ts`** — add the new value to the `ExpenseCategory` union,
   and add an entry to both `CATEGORY_LABELS` and `CATEGORY_ICONS`. TS will
   now flag every other place that needs an entry via missing-case errors
   *if* that code uses an exhaustive switch/`Record` — most of the following
   steps rely on this, but not all (see step 6).
2. **`src/lib/spendBreakdown.ts`** — decide which of the four overview
   buckets (`housing`, `food`, `leisure`, `subscriptions`) the new category
   belongs to. `food` and `housing` are effectively 1:1 with their
   like-named categories; everything else defaults into `LEISURE_CATEGORIES`
   unless you have a reason to special-case it. Update
   `CategoryDetailModal.tsx`'s bucket-filter logic (the
   `bucketKey === "..."` chain) to match if you change this grouping.
3. **`api/parse-receipt.ts`** — the `CATEGORIES` const array (and the
   `EXTRACT_PROMPT` text listing them for the vision model) is a
   **hand-duplicated copy** of the category list, because `api/` cannot
   import `src/types.ts` across the project boundary. **You must update this
   file too, by hand, or the vision OCR pipeline will silently reject the
   new category** (`isCategory()` in that file will return false for it, and
   `sanitize()` falls back to `"other"`).
4. **`src/lib/ai/simulate.ts`** — `MERCHANT_CATEGORY` is the pasted-text
   heuristic's pattern-matching table; add a regex pattern there if the new
   category should be detectable from pasted receipt text.
5. **`src/lib/csvExport.ts`** — check whether category-specific formatting
   or ordering needs updating (usually not — it typically just uses
   `CATEGORY_LABELS`, so step 1 alone covers it, but verify).
6. **UI components that render category pickers/icons directly** —
   `ExpenseModal.tsx` (the category grid in manual entry),
   `ExpenseHistory.tsx`, `ReceiptDropzone.tsx` (parsed-result display),
   `CategoryDetailModal.tsx`. Most of these just iterate
   `Object.keys(CATEGORY_LABELS)` or index into `CATEGORY_ICONS`/
   `CATEGORY_LABELS`, so step 1 covers them automatically — but grep for
   `ExpenseCategory` before finishing to confirm nothing hardcodes the old
   list (`grep -rln "ExpenseCategory\|CATEGORY_LABELS\|CATEGORY_ICONS" src/`
   is the exact check used to write this guide).
7. Run `npx tsc -b` — TypeScript's exhaustiveness checking on any `Record<ExpenseCategory, ...>` will catch anything missed in `src/` (but **not** in `api/`, per point 3 — that one's on you to remember).
8. Add/update a case in `src/lib/__tests__/calculations.test.ts` if the
   category affects a calculation (it currently doesn't — categories only
   affect display/bucketing, not the math engine — but confirm this is still
   true after your change).

**Renaming or removing** a category: same checklist, plus consider what
happens to *existing users' already-stored expenses* with the old category
value in `localStorage` — there's no migration system for this beyond what
`useLocalStorage`'s shallow-merge gives you (which won't rewrite array
contents). Prefer keeping old category values valid (even if hidden from new
entry) over silently breaking old data.

### 3.3 How to test and debug Stripe

**Local development does not run the Stripe (or any) API endpoints.** Plain
`npm run dev` / `vite dev` only serves the frontend — `api/*.ts` files are
Vercel Edge Functions with no local equivalent under plain Vite. This is
mentioned inline in several source-code comments; it's the single most
common cause of "why did my endpoint return an unexpected response" in this
repo. Two ways to actually test the backend:

**Option A — `vercel dev` (recommended for full-stack local testing):**

```bash
npm install -g vercel
vercel link          # one-time, links this folder to a Vercel project
vercel dev
```

This runs the Vite frontend *and* the `api/` Edge Functions together,
reading env vars from `.env.local` (copy the shape from
[`.env.example`](.env.example) — never commit real values). Set
`STRIPE_SECRET_KEY` (use `sk_test_...`), `STRIPE_PRICE_MONTHLY`,
`STRIPE_PRICE_ANNUAL` here.

**Option B — Stripe CLI for webhook testing specifically:**

The webhook endpoint (`api/stripe-webhook.ts`) needs a publicly reachable
URL in normal operation (configured in the Stripe Dashboard). To test it
locally instead:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook   # port from `vercel dev`
```

This prints a webhook signing secret (`whsec_...`) — put that in
`STRIPE_WEBHOOK_SECRET` in `.env.local` for the session. Then trigger events:

```bash
stripe trigger checkout.session.completed
```

Watch the terminal running `vercel dev` — `stripe-webhook.ts` currently just
`console.log`s the event type and id for the three events it cares about
(`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`) and returns `{received: true}`; it does
**not** persist anything (§1, "Zero-DB model" — there's nowhere to persist
it to). If you're debugging "why didn't the webhook do X," remember it isn't
supposed to do X yet — check whether the behavior you want should actually
live in the polling/sync-verify path instead (`useStripeVerification.ts`,
`useSyncSubscriptionCheck.ts`), since those are what the client actually
acts on.

**Testing checkout end-to-end** (with `vercel dev` running):

1. Open the app, trigger the paywall, choose a plan → redirects to Stripe's
   hosted Checkout.
2. Use a [Stripe test card](https://docs.stripe.com/testing) (e.g.
   `4242 4242 4242 4242`, any future expiry, any CVC).
3. On success, you land back on `/app?checkout=success&session_id=...` —
   confirm `verify-checkout-session` gets called (Network tab) and that
   `localStorage`'s `runway-os:licenseKey` gets set to a `cus_...` value, not
   just that the UI *looks* like it unlocked (a stale/cached client render
   could look right without the license actually being set).

**Debugging client-side subscription verification** (no Stripe CLI needed —
this part runs against your deployed backend from any environment):

- `src/hooks/useStripeVerification.ts` — the 6-hourly background poll. Set a
  breakpoint or `console.log` in its `reverify()` closure; it no-ops
  silently on network failure (by design — never downgrade on a failed
  *check*, only on a confirmed "not active" response) so a silent failure
  here can look identical to "nothing happening."
- `src/lib/subscriptionCache.ts` — the ~3-minute cache in front of
  `verify-subscription`. If you're testing rapid state changes (e.g. just
  cancelled a test subscription and want to see the app react), this cache
  will mask it for up to 3 minutes; clear it by reloading the page in a way
  that resets module state (a hard reload), or temporarily lower
  `CACHE_TTL_MS` while debugging.
- Because there's no real backend under plain `vite dev`, a `cus_...`
  license key tested that way will hit `/api/verify-subscription` and get
  back **Vite's raw source-transform of the `.ts` file** (a 200 response
  that isn't valid JSON) rather than a real API response — this is
  harmless (the `try/catch` in `subscriptionCache.ts` swallows the resulting
  JSON-parse error and returns `null`, never falsely downgrading), but don't
  mistake it for a working integration. Use `vercel dev` to actually
  exercise this path.

### 3.4 How to deploy and verify updates on Vercel

**First-time setup** — see [README.md § Deploy to Vercel](README.md#deploy-to-vercel-under-2-minutes--required-for-live-ai)
for the full walkthrough (CLI or Git-import options). This section is about
*ongoing* deploys once the project already exists on Vercel.

**Before deploying:**

```bash
npm ci                # clean install matching package-lock.json exactly
npm run lint           # oxlint — should be clean or only pre-existing warnings
npx tsc -b             # typechecks src/ AND api/ together (two separate tsconfig projects)
npm test               # vitest run — the calculations/projection/trial suite
npm run build           # tsc -b && vite build — outputs dist/
```

All four of these are exactly what `.github/workflows/ci.yml` runs on every
push/PR to `main` — if CI is green, a deploy from that commit should build
cleanly on Vercel too (Vercel runs its own build, but matching CI locally
first catches problems before they hit the deploy log).

**Deploying:**

- **Git-connected project** (recommended, and how this repo is set up):
  pushing to `main` on GitHub triggers an automatic production deploy on
  Vercel. There is no separate manual deploy step for normal changes —
  `git push origin main` *is* the deploy trigger.
- **Manual/CLI deploy** (e.g. deploying from a branch, or a fresh clone not
  yet Git-connected): `vercel deploy --prod` from the project root.

**Environment variables that must be set on Vercel** (Project Settings →
Environment Variables — see [`.env.example`](.env.example) for the full
annotated list): `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`),
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`,
`STRIPE_WEBHOOK_SECRET`, and optionally `SUPPORT_ACCESS_TOKEN`. None of
these are needed for the app to *run* — every feature they gate has a
working fallback/disabled state — but AI and payments will be
simulated/unavailable without them.

**Verifying a deploy actually worked:**

1. **Build succeeded**: check the Vercel deployment's build log directly —
   don't just trust that the push went through.
2. **Static site**: load the deployed URL, confirm the landing page and
   `/app` render. Check the browser console for errors.
3. **API functions deployed as Edge Functions**: in the Vercel dashboard,
   the deployment's "Functions" tab should list `api/chat`,
   `api/parse-receipt`, `api/create-checkout-session`, etc. If they're
   missing, something about the `api/` directory structure or
   `tsconfig.api.json` broke Vercel's auto-detection.
4. **AI path**: with `ANTHROPIC_API_KEY` set, open Ask Money Copilot and
   send a message — a real (non-"Simulated"-badged) response confirms the
   key and endpoint both work. Without the key set, confirm you instead get
   a clearly-labeled "Simulated" response, **not** a broken/blank state —
   that's the fallback working as intended, not a bug.
5. **Stripe path**: run through a real test-mode checkout (§3.3) against the
   *deployed* URL, not `vercel dev` — this is the only way to confirm
   `success_url`/`cancel_url` (built from the request's own origin in
   `create-checkout-session.ts`) resolve correctly for your actual domain.
6. **Rate limiting**: remember it's per-Edge-instance, in-memory (§1,
   "Zero-DB model") — you cannot reliably "verify it's working" by hammering
   the deployed endpoint a few times from one machine, since Vercel may
   route your requests to different instances. Trust the code review /
   `checkRateLimit` unit behavior over an informal production smoke test for
   this specific feature.
