#!/usr/bin/env bash

set -e

BASE=$(bun scripts/get-base-branch.mjs)
if [ -z "$BASE" ]; then
    echo "Base branch not detected"
    exit 1
fi

if ! git rev-parse --verify "$BASE" > /dev/null 2>&1; then
    echo "Base branch $BASE not found"
    exit 1
fi

bun x biome ci --changed --since="$BASE"
