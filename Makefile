TYPST ?= typst
PYTHON ?= python3
FONTS := --font-path fonts
MAIN := main.typ

DEFAULT_TEMPLATE := gjkt-odborna-prace
TEMPLATE_FILES := $(wildcard templates/*/template.typ)
TEMPLATES := $(sort $(notdir $(patsubst %/,%,$(dir $(TEMPLATE_FILES)))))
TEMPLATE ?= $(DEFAULT_TEMPLATE)
OUT_DIR ?= out

OUT_SCHOOL := $(OUT_DIR)/prace.pdf
OUT_CS := $(OUT_DIR)/prace-cs.pdf
OUT_EN := $(OUT_DIR)/prace-en.pdf
OUT_MERGED := $(OUT_DIR)/prace-bilingual.pdf

OUT_REVIEW_SCHOOL := $(OUT_DIR)/prace-review.pdf
OUT_REVIEW_CS := $(OUT_DIR)/prace-cs-review.pdf
OUT_REVIEW_EN := $(OUT_DIR)/prace-en-review.pdf
OUT_REVIEW_MERGED := $(OUT_DIR)/prace-bilingual-review.pdf

.PHONY: help build build-school build-cs build-en build-merged review review-school review-cs review-en review-merged all all-templates template-check verify ci site watch png clean check

help:
	@echo "make all             – 8 PDF pro TEMPLATE=$(TEMPLATE)"
	@echo "make all-templates   – 8 PDF pro každou šablonu pod out/templates/<template>/"
	@echo "make template-check  – smoke compile school profilu každé objevené šablony"
	@echo "make ci              – defaultní 8 PDF + template smoke + statická kontrola"
	@echo "make site            – defaultní 8 PDF + GitHub Pages web"
	@echo "make watch           – živý náhled TEMPLATE=$(TEMPLATE), school/final"
	@echo "Templates: $(TEMPLATES)"

build: build-school build-cs build-en build-merged

build-school:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input profile=school $(MAIN) $(OUT_SCHOOL)

build-cs:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input profile=cs $(MAIN) $(OUT_CS)

build-en:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input profile=en $(MAIN) $(OUT_EN)

build-merged:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input profile=merged $(MAIN) $(OUT_MERGED)

review: review-school review-cs review-en review-merged

review-school:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input review=true --input profile=school $(MAIN) $(OUT_REVIEW_SCHOOL)

review-cs:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input review=true --input profile=cs $(MAIN) $(OUT_REVIEW_CS)

review-en:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input review=true --input profile=en $(MAIN) $(OUT_REVIEW_EN)

review-merged:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input review=true --input profile=merged $(MAIN) $(OUT_REVIEW_MERGED)

all: build review

all-templates:
	@set -e; for template in $(TEMPLATES); do \
		echo "==> building template $$template"; \
		$(MAKE) all TEMPLATE=$$template OUT_DIR=out/templates/$$template; \
	done

template-check:
	@mkdir -p out/template-check
	@set -e; for template in $(TEMPLATES); do \
		echo "==> checking template $$template"; \
		$(TYPST) compile $(FONTS) --input template=$$template --input profile=school $(MAIN) out/template-check/$$template.pdf; \
	done

verify:
	$(PYTHON) scripts/check_build.py

ci: all template-check verify

site:
	@if command -v $(TYPST) >/dev/null 2>&1; then \
		$(MAKE) all verify && $(PYTHON) scripts/build_site.py; \
	else \
		echo "Typst unavailable: validating Pages structure without PDF copies"; \
		$(PYTHON) scripts/build_site.py --allow-missing; \
	fi

check: ci

watch:
	@mkdir -p out
	$(TYPST) watch $(FONTS) --input template=$(TEMPLATE) --input profile=school $(MAIN) $(OUT_SCHOOL)

png:
	@mkdir -p out/pages
	$(TYPST) compile $(FONTS) --input template=$(TEMPLATE) --input profile=school $(MAIN) "out/pages/strana-{0p}.png" --ppi 150

clean:
	rm -rf out site
