import os, glob

for path in glob.glob(".github/scripts/*.py"):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        if "manifest" in content:
            print(path)
