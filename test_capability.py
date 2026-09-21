import subprocess

result = subprocess.run(
    ["bun", "test", "capabilities/hooks/capability.test.ts"], capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
