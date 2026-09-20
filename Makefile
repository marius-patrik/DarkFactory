TYPST ?= typst
PYTHON ?= python3
NPM ?= npm

BOOK ?= DarkFactory
BOOK_ROOT := $(BOOK)
MAIN := main.typ
WEB_SOURCE := web-publication.typ
FONTS := --font-path $(BOOK_ROOT)/fonts

DEFAULT_TEMPLATE := gjkt-odborna-prace
TEMPLATE_FILES := $(wildcard $(BOOK_ROOT)/templates/*/template.typ)
TEMPLATES := $(sort $(notdir $(patsubst %/,%,$(dir $(TEMPLATE_FILES)))))
TEMPLATE ?= $(DEFAULT_TEMPLATE)

BOOK_FILES := $(wildcard */book.typ)
BOOKS := $(sort $(notdir $(patsubst %/,%,$(dir $(BOOK_FILES)))))

OUT_DIR ?= out
OUT_SCHOOL := $(OUT_DIR)/prace.pdf
OUT_CS := $(OUT_DIR)/prace-cs.pdf
OUT_EN := $(OUT_DIR)/prace-en.pdf
OUT_MERGED := $(OUT_DIR)/prace-bilingual.pdf
OUT_REVIEW_SCHOOL := $(OUT_DIR)/prace-review.pdf
OUT_REVIEW_CS := $(OUT_DIR)/prace-cs-review.pdf
OUT_REVIEW_EN := $(OUT_DIR)/prace-en-review.pdf
OUT_REVIEW_MERGED := $(OUT_DIR)/prace-bilingual-review.pdf

.PHONY: help build build-school build-cs build-en build-merged review review-school review-cs review-en review-merged exports all all-templates all-books template-check web-install web-lint web-format web-check web-build verify ci site watch png clean check

help:
	@echo "make all BOOK=$(BOOK) TEMPLATE=$(TEMPLATE)   – complete PDF/HTML/Markdown matrix"
	@echo "make all-templates BOOK=$(BOOK)             – build every template in the selected book"
	@echo "make all-books                              – build every registered book root"
	@echo "make template-check BOOK=$(BOOK)            – school/final smoke for every book template"
	@echo "make web-lint                               – Biome lint web viewer"
	@echo "make web-format                             – Biome format web viewer"
	@echo "make web-check                              – Biome + TypeScript + production Rsbuild"
	@echo "make ci                                     – canonical book publication + viewer + architecture"
	@echo "make site                                   – canonical book + React GitHub Pages"
	@echo "make watch BOOK=$(BOOK)                     – live school/final preview"
	@echo "Books: $(BOOKS)"
	@echo "Templates for $(BOOK): $(TEMPLATES)"

build: build-school build-cs build-en build-merged

build-school:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) --input profile=school $(MAIN) $(OUT_SCHOOL)

build-cs:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) --input profile=cs $(MAIN) $(OUT_CS)

build-en:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) --input profile=en $(MAIN) $(OUT_EN)

build-merged:
	@mkdir -p $(OUT_DIR)
	$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) --input profile=merged $(MAIN) $(OUT_MERGED)

review: review-school review-cs review-en review-merged

review-school:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --book "$(BOOK)" --font-path "$(BOOK_ROOT)/fonts" --template "$(TEMPLATE)" --profile school --main "$(MAIN)" --output "$(OUT_REVIEW_SCHOOL)"

review-cs:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --book "$(BOOK)" --font-path "$(BOOK_ROOT)/fonts" --template "$(TEMPLATE)" --profile cs --main "$(MAIN)" --output "$(OUT_REVIEW_CS)"

review-en:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --book "$(BOOK)" --font-path "$(BOOK_ROOT)/fonts" --template "$(TEMPLATE)" --profile en --main "$(MAIN)" --output "$(OUT_REVIEW_EN)"

review-merged:
	$(PYTHON) scripts/build_review.py --typst "$(TYPST)" --book "$(BOOK)" --font-path "$(BOOK_ROOT)/fonts" --template "$(TEMPLATE)" --profile merged --main "$(MAIN)" --output "$(OUT_REVIEW_MERGED)"

exports:
	$(PYTHON) scripts/build_web_exports.py --typst "$(TYPST)" --book "$(BOOK)" --font-path "$(BOOK_ROOT)/fonts" --template "$(TEMPLATE)" --source "$(WEB_SOURCE)" --output-dir "$(OUT_DIR)"

all: build review exports

all-templates:
	@set -e; for template in $(TEMPLATES); do \
		echo "==> building $(BOOK) template $$template"; \
		$(MAKE) all BOOK=$(BOOK) TEMPLATE=$$template OUT_DIR=$(OUT_DIR)/templates/$$template; \
	done

all-books:
	@set -e; for book in $(BOOKS); do \
		echo "==> building book $$book"; \
		$(MAKE) all-templates BOOK=$$book OUT_DIR=out/books/$$book; \
	done

template-check:
	@mkdir -p $(OUT_DIR)/template-check
	@set -e; for template in $(TEMPLATES); do \
		echo "==> checking $(BOOK) template $$template"; \
		$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$$template --input profile=school $(MAIN) $(OUT_DIR)/template-check/$$template.pdf; \
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

watch:
	@mkdir -p $(OUT_DIR)
	$(TYPST) watch $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) --input profile=school $(MAIN) $(OUT_SCHOOL)

png:
	@mkdir -p $(OUT_DIR)/pages
	$(TYPST) compile $(FONTS) --input book=$(BOOK) --input template=$(TEMPLATE) --input profile=school $(MAIN) "$(OUT_DIR)/pages/strana-{0p}.png" --ppi 150

clean:
	rm -rf out site
