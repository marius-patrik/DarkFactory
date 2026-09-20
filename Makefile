TYPST ?= typst
PYTHON ?= python3
NPM ?= npm
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

.PHONY: help build build-school build-cs build-en build-merged review review-school review-cs review-en review-merged exports all all-templates template-check web-install web-lint web-format web-check web-build verify ci site watch png clean check

help:
	@echo "make all             – PDF + HTML + Markdown matice pro TEMPLATE=$(TEMPLATE)"
	@echo "make all-templates   – PDF + HTML + Markdown pro každou šablonu pod out/templates/<template>/"
	@echo "make template-check  – rychlý school/final smoke každé objevené šablony"
	@echo "make web-lint        – Biome lint webového vieweru"\n\t@echo "make web-format      – Biome formátování webového vieweru"\n\t@echo "make web-check       – Biome lint + TypeScript + produkční Rsbuild React vieweru"
	@echo "make ci              – PDF/HTML/Markdown matice + React/TypeScript viewer + kontrola architektury"
	@echo "make site            – CI matice + React GitHub Pages pro všechny šablony"
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
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --font-path fonts --template "$(TEMPLATE)" --profile school --main "$(MAIN)" --output "$(OUT_REVIEW_SCHOOL)"

review-cs:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --font-path fonts --template "$(TEMPLATE)" --profile cs --main "$(MAIN)" --output "$(OUT_REVIEW_CS)"

review-en:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --font-path fonts --template "$(TEMPLATE)" --profile en --main "$(MAIN)" --output "$(OUT_REVIEW_EN)"

review-merged:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --font-path fonts --template "$(TEMPLATE)" --profile merged --main "$(MAIN)" --output "$(OUT_REVIEW_MERGED)"

exports:
	$(PYTHON) scripts/build_web_exports.py --typst "$(TYPST)" --font-path fonts --template "$(TEMPLATE)" --source web-publication.typ --output-dir "$(OUT_DIR)"

all: build review exports

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

web-install:
	$(NPM) --prefix web install --no-audit --no-fund

web-lint: web-install
	$(NPM) --prefix web run lint

web-format: web-install
	$(NPM) --prefix web run format

web-check: web-install
	$(NPM) --prefix web run check

web-build: web-install
	$(NPM) --prefix web run build

verify:
	$(PYTHON) scripts/check_build.py

ci: all all-templates web-check verify

site:
	@if command -v $(TYPST) >/dev/null 2>&1; then \
		$(MAKE) ci && $(PYTHON) scripts/build_site.py; \
	else \
		echo "Typst unavailable: building React Pages structure without compiled publication artifacts"; \
		$(MAKE) web-build && $(PYTHON) scripts/build_site.py --allow-missing; \
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
