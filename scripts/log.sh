#!/usr/bin/env bash
git log -n 5 --oneline remotes/origin/recovery/f38-result-capture
git diff --name-only remotes/origin/recovery/f38-result-capture...darkfactory
