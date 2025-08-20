#!/usr/bin/env bash
set -euo pipefail

echo "[guard] Scanning for PPR flags…"

if git grep -n -e 'export const[[:space:]]\+experimental_ppr[[:space:]]*=[[:space:]]*true' \
  -- ':!*.md' ':!**/*.md' ':!scripts/ci/ensure-no-ppr.sh'; then
  echo "❌ Found 'export const experimental_ppr = true'"
  exit 1
fi

if git grep -n -e 'ppr:[[:space:]]*true' \
  -- ':!*.md' ':!**/*.md' ':!next.config.ts' ':!scripts/ci/ensure-no-ppr.sh'; then
  echo "❌ Found 'ppr: true' outside next.config.ts"
  exit 1
fi

echo "✅ No PPR flags found."
