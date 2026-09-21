import subprocess

print("--- Engine ---")
res = subprocess.run(
    ["bun", "test", "packages/core/test/hooks/engine.test.ts"], capture_output=True, text=True
)
print(res.stdout, res.stderr)

print("--- Registry ---")
res2 = subprocess.run(
    ["bun", "test", "packages/core/test/hooks/registry.test.ts"], capture_output=True, text=True
)
print(res2.stdout, res2.stderr)
