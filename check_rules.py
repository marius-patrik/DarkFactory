import os

path = os.path.join(".", ".agents", "rules")
for f in sorted(os.listdir(path)):
    if f.endswith(".md"):
        with open(os.path.join(path, f), "r", encoding="utf-8") as file:
            head = "".join([file.readline() for _ in range(10)])
        print("===", f)
        print(head)
