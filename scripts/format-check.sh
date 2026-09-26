#!/usr/bin/env bash

set -e
set -o pipefail

BASE=$(bun scripts/get-base-branch.mjs)
if [ -z "$BASE" ]; then
    echo "Base branch not detected"
    exit 1
fi

if ! git rev-parse --verify "$BASE" > /dev/null 2>&1; then
    echo "Base branch $BASE not found"
    exit 1
fi

if ! ./node_modules/.bin/biome ci --changed --since="$BASE"; then
    echo "Biome check failed"
    exit 1
fi
