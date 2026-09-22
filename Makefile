TYPST ?= typst
PYTHON ?= python3
NPM ?= npm

BOOK ?= paper
ifeq ($(BOOK),DarkFactory)
  ifeq ($(wildcard DarkFactory),)
    BOOK_ROOT := paper
  else
    BOOK_ROOT := $(BOOK)
  endif
else
  BOOK_ROOT := $(BOOK)
endif
MAIN := $(BOOK_ROOT)/PAPER.typ
FONTS := --font-path $(BOOK_ROOT)/fonts

DEFAULT_TEMPLATE := gjkt-odborna-prace
TEMPLATE_FILES := $(wildcard $(BOOK_ROOT)/templates/*/template.typ)
TEMPLATES := $(sort $(notdir $(patsubst %/,%,$(dir $(TEMPLATE_FILES)))))
TEMPLATE ?= $(DEFAULT_TEMPLATE)

BOOK_FILES := $(wildcard */book.typ)
BOOKS := $(sort $(notdir $(patsubst %/,%,$(dir $(BOOK_FILES)))))

OUT_DIR ?= out
OUT_FINAL := $(OUT_DIR)/prace.pdf
OUT_REVIEW := $(OUT_DIR)/prace-review.pdf

.PHONY: help external-assets build review exports all all-templates all-books template-check web-install web-lint web-format web-check web-build verify ci site watch png clean check

help:
	@echo "make all BOOK=$(BOOK) TEMPLATE=$(TEMPLATE)   – PDF/HTML/Markdown final + review"
	@echo "make all-templates BOOK=$(BOOK)             – build every template in the selected book"
	@echo "make all-books                              – build every registered book root"
	@echo "make template-check BOOK=$(BOOK)            – final-publication smoke for every book template"
	@echo "make web-lint                               – Biome lint web viewer"
	@echo "make web-format                             – Biome format web viewer"
	@echo "make web-check                              – Biome + TypeScript + production Rsbuild"
	@echo "make ci                                     – canonical book publication + viewer + architecture"
	@echo "make site                                   – canonical book + React GitHub Pages"
	@echo "make watch BOOK=$(BOOK)                     – live final preview"
	@echo "Books: $(BOOKS)"
	@echo "Templates for $(BOOK): $(TEMPLATES)"

external-assets:
	$(PYTHON) scripts/fetch_external_assets.py
	$(PYTHON) scripts/render_phase2_evidence.py

build: external-assets
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) $(MAIN) $(OUT_FINAL)

review: external-assets
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --font-path "$(BOOK_ROOT)/fonts" --main "$(MAIN)" --output "$(OUT_REVIEW)"

exports: external-assets
	$(PYTHON) scripts/build_web_exports.py --typst "$(TYPST)" --font-path "$(BOOK_ROOT)/fonts" --source "$(MAIN)" --output-dir "$(OUT_DIR)"

all: build review exports

all-templates: build review exports

all-books: all-templates

template-check: build

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
	BOOK=$(BOOK) $(PYTHON) scripts/check_build.py

ci: all all-templates web-check verify

site:
	@if command -v $(TYPST) >/dev/null 2>&1; then \
		$(MAKE) ci BOOK=$(BOOK) && $(PYTHON) scripts/build_site.py --book "$(BOOK)" --default-template "$(DEFAULT_TEMPLATE)"; \
	else \
		echo "Typst unavailable: building React Pages structure without compiled publication artifacts"; \
		$(MAKE) web-build && $(PYTHON) scripts/build_site.py --book "$(BOOK)" --default-template "$(DEFAULT_TEMPLATE)" --allow-missing; \
	fi

check: ci

watch: external-assets
	@mkdir -p $(OUT_DIR)
	$(TYPST) watch $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) $(MAIN) $(OUT_FINAL)

png: external-assets
	@mkdir -p $(OUT_DIR)/pages
	$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) $(MAIN) "$(OUT_DIR)/pages/strana-{0p}.png" --ppi 150

clean:
	rm -rf out site
