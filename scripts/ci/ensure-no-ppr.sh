#!/usr/bin/env bash
set -euo pipefail

echo "[guard] Scanning for PPR flags…"

if git grep -n -e 'export const[[:space:]]\+experimental_ppr[[:space:]]*=[[:space:]]*true' -- . ':(exclude)**/*.md'; then
  echo "❌ Found 'export const experimental_ppr = true'"
  exit 1
fi

if git grep -n -e 'ppr:[[:space:]]*true' -- . ':(exclude)**/*.md' ':(exclude)next.config.ts'; then
  echo "❌ Found 'ppr: true' outside next.config.ts"
  exit 1
fi

echo "✅ No PPR flags found."
