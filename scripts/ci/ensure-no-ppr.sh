#!/bin/bash
# Fail CI if any segment opts into experimental PPR while tests are unstable.
set -e
git grep -n -- ":!**/*.md" "export const experimental_ppr = true" && \
  echo "PPR segment ON interdit en CI" && exit 1 || exit 0
