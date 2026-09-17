import os, glob

for path in glob.glob(".github/scripts/*.py"):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if "resolve_manifest_path" in line:
                print(path, line.strip())
