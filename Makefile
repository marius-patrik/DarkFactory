TYPST ?= typst
FONTS := --font-path fonts
MAIN := main.typ

OUT_CS := out/prace.pdf
OUT_EN := out/prace-en.pdf
OUT_MERGED := out/prace-merged.pdf
OUT_REVIEW_CS := out/prace-review.pdf
OUT_REVIEW_EN := out/prace-en-review.pdf
OUT_REVIEW_MERGED := out/prace-merged-review.pdf

.PHONY: help build build-cs build-en build-merged review review-cs review-en review-merged all watch png clean check

help:
	@echo "make build          – vysází final verze: cs, en, merged"
	@echo "make review         – vysází review verze: cs, en, merged"
	@echo "make all            – vysází všech šest variant"
	@echo "make build-cs       – final CZ -> $(OUT_CS)"
	@echo "make build-en       – final EN -> $(OUT_EN)"
	@echo "make build-merged   – final CZ+EN -> $(OUT_MERGED)"
	@echo "make review-cs      – review CZ -> $(OUT_REVIEW_CS)"
	@echo "make review-en      – review EN -> $(OUT_REVIEW_EN)"
	@echo "make review-merged  – review CZ+EN -> $(OUT_REVIEW_MERGED)"
	@echo "make watch          – živý náhled final CZ"
	@echo "make check          – ověří kompilaci všech šesti variant"
	@echo "make clean          – smaže adresář out/"

build: build-cs build-en build-merged

build-cs:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input language=cs $(MAIN) $(OUT_CS)

build-en:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input language=en $(MAIN) $(OUT_EN)

build-merged:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input language=merged $(MAIN) $(OUT_MERGED)

review: review-cs review-en review-merged

review-cs:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input language=cs $(MAIN) $(OUT_REVIEW_CS)

review-en:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input language=en $(MAIN) $(OUT_REVIEW_EN)

review-merged:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input language=merged $(MAIN) $(OUT_REVIEW_MERGED)

all: build review

watch:
	@mkdir -p out
	$(TYPST) watch $(FONTS) --input language=cs $(MAIN) $(OUT_CS)

png:
	@mkdir -p out/pages
	$(TYPST) compile $(FONTS) --input language=cs $(MAIN) "out/pages/strana-{0p}.png" --ppi 150

check:
	$(TYPST) compile $(FONTS) --input language=cs $(MAIN) --format pdf /dev/stdout > /dev/null
	$(TYPST) compile $(FONTS) --input language=en $(MAIN) --format pdf /dev/stdout > /dev/null
	$(TYPST) compile $(FONTS) --input language=merged $(MAIN) --format pdf /dev/stdout > /dev/null
	$(TYPST) compile $(FONTS) --input review=true --input language=cs $(MAIN) --format pdf /dev/stdout > /dev/null
	$(TYPST) compile $(FONTS) --input review=true --input language=en $(MAIN) --format pdf /dev/stdout > /dev/null
	$(TYPST) compile $(FONTS) --input review=true --input language=merged $(MAIN) --format pdf /dev/stdout > /dev/null

clean:
	rm -rf out
