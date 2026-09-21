import os

rule_hooks = {
    "001-unit-tests.md": "tests-touched",
    "002-inline-docs-and-generated-documentation.md": "tsdoc-docs",
    "003-product-requirements-and-adrs.md": "request-binding",
    "004-english-language.md": "english-policy",
    "005-commit-granularity.md": "conventional-commit",
    "006-ci-readiness.md": "tests-touched",
    "007-branches-and-pull-requests.md": "branch-name",
    "008-formatting-and-linting.md": "format-check",
    "009-issue-binding-and-board-status.md": "request-binding",
    "010-approved-delivery-plan.md": "request-binding",
    "011-review-approval-and-auto-merge.md": "request-binding",
    "012-request-capture-and-confirmation.md": "request-binding",
    "013-specification-and-work-tracking.md": "request-binding",
    "014-agent-runtime-and-resilience.md": "tests-touched",
    "015-repository-taxonomy.md": "conventional-commit",
    "016-security-and-secrets.md": "secret-scan",
}

rules_dir = os.path.join(".", ".agents", "rules")
for filename, hook in rule_hooks.items():
    filepath = os.path.join(rules_dir, filename)
    with open(filepath, "r") as f:
        content = f.read()

    if "enforced_by:" in content:
        continue

    # Insert enforced_by: [hook] before the closing ---
    new_content = content.replace("---", f"enforced_by: [{hook}]\n---", 1)
    with open(filepath, "w") as f:
        f.write(new_content)
    print(f"Updated {filename} with {hook}")
