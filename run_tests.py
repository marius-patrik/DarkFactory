import subprocess

result = subprocess.run(
    ["bun", "test", "packages/core/test/hooks/engine.test.ts"], capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
