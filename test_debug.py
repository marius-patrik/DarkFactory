import os
import tempfile
import sys

# Move the actual repo.dfconfig out of the way for a second
os.rename("repo.dfconfig", "repo.dfconfig.bak")
try:
    sys.path.insert(0, ".github/scripts")
    import manifest

    t = tempfile.mkdtemp()
    os.chdir(t)
    os.environ.pop("GITHUB_REPOSITORY", None)
    loaded = manifest.load(".")
    print("owner:", loaded.owner, "repo:", loaded.repo, "root:", loaded.root)
    print("GITHUB_REPOSITORY:", os.environ.get("GITHUB_REPOSITORY"))
finally:
    os.rename("repo.dfconfig.bak", "repo.dfconfig")
