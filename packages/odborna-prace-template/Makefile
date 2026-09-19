TYPST ?= typst
SMOKE := tests/smoke.typ
OUT := /tmp/odborna-prace-template-smoke.pdf

.PHONY: ci check clean

ci: check

check:
	$(TYPST) compile $(SMOKE) $(OUT)
	@test -s $(OUT)
	@rm -f $(OUT)
	@echo "ok: internal Typst package smoke test"

clean:
	rm -f $(OUT)
