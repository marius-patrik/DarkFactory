## Summary
<!-- What changed and why, in a few sentences. -->

## Linked Issues
<!-- Required. Rule 9 in AGENTS.md: every PR binds a tracked issue with a closing keyword. -->
- Closes #

## Type of Change
<!-- Check all that apply using [x]. Must match the Conventional Commit type on the commits. -->
- [ ] `feat`: New feature
- [ ] `bug`: Bug fix
- [ ] `refactor`: Code refactoring without behavioral change
- [ ] `docs`: Documentation updates or docstring additions
- [ ] `test`: New or updated tests
- [ ] `chore`: Maintenance, dependency bump, or configuration
- [ ] `ci`: Pipeline or automation changes

## Area Affected
<!-- Check all that apply using [x]. Must match the commit scope. -->
- [ ] `area:agents`: Harness orchestration, provider adapters, personas, approvals
- [ ] `area:governance`: Agent rules, branch protection, required checks, project board taxonomy
- [ ] `area:release`: Versioning modes, tagging, asset packaging, release notes
- [ ] `area:docs`: Documentation site, theme, architecture notes
- [ ] `area:ci`: GitHub Actions workflows, containers, runner scripts, repository automation

## Verification Checklist
- [ ] All commits follow Conventional Commits: `<type>(<scope>): <description>`
- [ ] Unit tests added or updated for every behavior introduced
- [ ] All CI jobs pass (`pipeline`, `rust`, `web`, `docs`, `verify-bound-issue`)
- [ ] `properdocs build --strict` completes with zero warnings and zero errors
- [ ] Implementation matches the approved child Plan issue, or a `Plan Alignment:` comment records
      every deviation and has been approved
- [ ] No feature branches on a preset *name* — only on capability-matrix axis values
      (`ARCHITECTURE.md` §3)
- [ ] `ARCHITECTURE.md` and `ROADMAP.md` updated if this changes the architecture or an epic
- [ ] No secrets, tokens, or credentials added to the tree or to workflow logs
