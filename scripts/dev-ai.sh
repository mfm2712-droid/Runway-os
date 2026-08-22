#!/usr/bin/env bash
# Runs the full local dev stack (Vite frontend + api/ Edge Functions) with
# live AI/Stripe backends enabled.
#
# Why this script exists instead of just `vercel dev`: on at least one
# observed machine/CLI version (Vercel CLI 59.4.0), `vercel dev` silently
# failed to load .env.local into the Edge Function runtime — confirmed via
# --debug output, which never logged parsing .env.local as key/value pairs.
# Exporting the vars in the parent shell before spawning `vercel dev` works
# reliably, so that's what this script does: it parses .env.local itself and
# exports each entry, then execs `vercel dev --local` (the --local flag
# skips fetching your linked Vercel project's remote Environment Variables,
# so this is fully local/offline-safe aside from the calls the app itself
# makes to Anthropic/Stripe).
#
# Usage:
#   1. Fill in ANTHROPIC_API_KEY (and optionally the Stripe vars) in
#      .env.local — see .env.example for the full list.
#   2. ./scripts/dev-ai.sh
#
# Uses a private npm cache dir to route around a broken/root-owned global
# npm cache, if present — harmless if your npm cache is fine.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "No .env.local found — copy .env.example to .env.local and fill in ANTHROPIC_API_KEY first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Warning: ANTHROPIC_API_KEY is empty in .env.local — AI features will run in simulated mode." >&2
fi

exec npx --cache "${HOME}/.npm-vercel-cache" -y vercel@latest dev --local
