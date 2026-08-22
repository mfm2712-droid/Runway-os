# Changelog

## 3.1.0 — 2026-08-22

### Security
- Support access token comparison (`api/verify-support-token.ts`) now uses a
  Web Crypto SHA-256 + constant-time byte comparison instead of a direct
  string `===`, closing a timing side-channel.
- `api/verify-subscription.ts` is now rate-limited (30 req/min per IP, same
  in-memory limiter as the AI endpoints).
- Settings and the Paywall now re-verify a Stripe-sourced license
  synchronously the moment they open (cached ~3 min), on top of the existing
  periodic background poll — a cancelled subscription is reflected
  immediately instead of up to hours later.

### Added
- Safe-spend streak (`🔥 X-day safe spend streak`) tracked from logged daily
  expenses vs. Daily Safe Spend, persisted locally.
- 30-day daily-spend sparkline under the Daily Safe Spend ring.
- Month-over-month spend delta in the Spend Breakdown header.
- Category drill-down modal — tap a Spend Breakdown row to see the
  underlying expenses, with per-bucket totals and averages.
- Runway explainer modal — an (i) button next to the Runway stat opens the
  formula and a worked example using your real numbers; the stat itself now
  shows years past 12 months and "∞ Sustainable" at zero burn.
- GitHub Actions CI (`.github/workflows/ci.yml`): lint, typecheck, and test
  on every push/PR to `main`.

### Fixed
- Numeric inputs across Projection Lab, Add Expense, Quick Tune, Onboarding,
  Cooldown, and Subscriptions no longer produce a "0500"-style leading-zero
  glitch when typing over a pre-filled value — fields now select-all on
  focus and parse on blur/submit instead of re-stringifying on every
  keystroke.
- Safe-spend streak calculation had a first-run bug where a brand-new
  install's backfill loop would never evaluate a single day, leaving the
  streak stuck at 0 forever.

### Docs
- `MARKETING.md` no longer claims the AI/billing endpoints have no rate
  limiting — corrected to describe the actual best-effort, per-instance
  Edge in-memory limits and when a distributed limiter is still worth
  adding.
