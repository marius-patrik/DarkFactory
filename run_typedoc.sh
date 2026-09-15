#!/bin/bash
cd harness
bun x typedoc --emit none --entryPoints src/ci/templates.ts 2>&1