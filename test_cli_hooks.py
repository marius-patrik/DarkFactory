import subprocess

result = subprocess.run(
    ["bun", "harness/src/cli.ts", "hooks", "run", "pre-commit"], capture_output=True, text=True
)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("EXIT:", result.returncode)
