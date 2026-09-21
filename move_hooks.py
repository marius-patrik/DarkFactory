import os
import shutil

# Create directory structures
os.makedirs(os.path.join("packages", "core", "src", "hooks"), exist_ok=True)
os.makedirs(os.path.join("packages", "core", "test", "hooks"), exist_ok=True)

# Move files
shutil.move("engine.ts", os.path.join("packages", "core", "src", "hooks", "engine.ts"))
shutil.move("registry.ts", os.path.join("packages", "core", "src", "hooks", "registry.ts"))
shutil.move("types.ts", os.path.join("packages", "core", "src", "hooks", "types.ts"))
shutil.move("engine_test.ts", os.path.join("packages", "core", "test", "hooks", "engine.test.ts"))

print("Successfully moved recovered hook files using Python!")
