#!/bin/bash
# Portable checksum + provenance for #360
sha256sum artifacts/* > checksums.sha256
echo "source-commit=$(git rev-parse HEAD)" >> provenance.txt
