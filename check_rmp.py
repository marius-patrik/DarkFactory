import os, glob

for path in glob.glob(".github/scripts/*.py"):
    with open(path, "r", encoding="utf-8") as f:
        if "resolve_manifest_path" in f.read():
            print(path)
