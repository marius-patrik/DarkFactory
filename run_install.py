import subprocess

result = subprocess.run(["bun", "install"], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
