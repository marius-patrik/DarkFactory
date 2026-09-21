import subprocess


def search(pattern):
    print(f"=== Pattern: {pattern} ===")
    res = subprocess.run(["git", "grep", "-i", pattern], capture_output=True, text=True)
    lines = res.stdout.splitlines()[:10]
    for l in lines:
        print(l)


search("secret")
search("conventional")
search("branch-name")
search("format")
