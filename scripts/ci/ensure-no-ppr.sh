#!/bin/bash
# Fail CI if any segment opts into experimental PPR while tests are unstable.
set -e
if git grep -n "export const experimental_ppr = true"; then
  echo "PPR segment ON interdit en CI"
  exit 1
fi
