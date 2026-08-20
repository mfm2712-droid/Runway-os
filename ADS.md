# Ad creative & targeting — revised

Same toolchain as your original playbook (Rotato/Mockup.video for UI animation,
Creatify/InVideo for full-ad generation, HeyGen/ElevenLabs for voiceover). Two
changes from the original draft, both about avoiding a policy strike or an FTC
problem before you've spent a pound on media:

1. **Scripts below are ad-copy voice, not fabricated first-person testimony.**
   The original scripts ("I stopped using... that's why I use this...") read as
   a real customer's account of using the product, spoken by an AI voice, for a
   product with zero actual users. Meta's ad policy disqualifies
   misrepresented/fabricated testimonials, and the FTC's endorsement guidelines
   require testimonial claims to reflect real experience. Once you have a
   handful of real buyers, swap in an actual quote from one of them (with
   permission) — that's the strongest version of this ad, and it's real.
2. **"After" screenshots should be real captures of the actual app**, not a
   generated mockup — you now have a real product at `/app`, so use it. The
   glowing "£45.00" metric in the landing page's before/after section
   (`src/pages/Landing.tsx`) is the real component with sample data, not a
   fabricated image — screen-record that directly for B-roll.

## Script 1 — "The Spreadsheet Killer" (Hook → Solution)

**Visual:** Messy red-flagged spreadsheet (illustrative mockup) zooms out →
transforms into the real Runway OS dashboard (screen-recorded from `/app`).

**Voiceover (AI):**
> Budgeting apps turn your money into a second job. Categorize every
> transaction, link your bank, stare at charts you'll never check twice.
> Runway OS cuts it down to one number: what's safe to spend today. No manual
> entry, no bank connection. Link below to get instant access.

## Script 2 — "The Runway Formula" (High curiosity)

**Visual:** 3D phone mockup (Rotato) scrolling through the runway progress bar
on the real dashboard.

**Voiceover (AI):**
> Do you know your exact financial runway, down to the month? Runway OS
> calculates how long your cash lasts with zero income, and surfaces the
> subscriptions quietly draining it every month. Tap the link to try it.

## Creatify / InVideo prompt

> Create a fast-paced 15-second TikTok/Reels ad for a minimalist personal
> finance tool. Target: tech-savvy professionals aged 22–38. Tone: premium,
> dark-mode aesthetic, Apple-like minimalism. Problem: spreadsheet budgeting is
> tedious and ugly. Solution: a one-page dashboard showing a daily safe-spend
> number and a runway calculator. Voice: informative and direct, not a
> first-person testimonial. Strong CTA: "Get instant access today."

## Meta Ads targeting

| Setting | Value |
|---|---|
| Locations | United Kingdom, United States, Canada, Australia |
| Languages | English (all) |
| Placements | Instagram Reels, Stories; Facebook Feed; TikTok |
| Daily budget | £10–£15/day to start |
| Target CPA | Keep it under roughly a third of your £29 price (~£8–£10) so a sale is profitable after ad spend — tighten once you have real conversion data; there isn't enough volume on day one to trust a lower number than that. |

## Before you launch

- If you use an AI avatar (HeyGen) as the on-screen presenter, check Meta's
  current disclosure requirements for AI-generated people in ads — this
  changes periodically, so check at launch time rather than relying on this
  note.
- Have the checkout link live and tested (`CHECKOUT_URL` in
  `src/pages/Landing.tsx`) before spending on traffic to it.
- The product now has a real AI copilot (chat advisor, receipt scan, morning
  briefing) — worth a line in the ad copy as the actual differentiator now
  ("with an AI advisor built in" beats another budgeting-app claim). But do
  not turn on paid traffic until the AI endpoints have rate limiting — see
  [MARKETING.md](MARKETING.md) point 1. Every visitor who clicks through can
  hit `/api/chat` and `/api/parse-receipt` whether they buy or not, and each
  call is real Anthropic spend on your key. Paid traffic without a limit in
  place is a direct path to an unexpectedly large bill.
