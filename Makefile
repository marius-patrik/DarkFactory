TYPST ?= typst
PYTHON ?= python3
FONTS := --font-path fonts
MAIN := main.typ

OUT_SCHOOL := out/prace.pdf
OUT_CS := out/prace-cs.pdf
OUT_EN := out/prace-en.pdf
OUT_MERGED := out/prace-bilingual.pdf

OUT_REVIEW_SCHOOL := out/prace-review.pdf
OUT_REVIEW_CS := out/prace-cs-review.pdf
OUT_REVIEW_EN := out/prace-en-review.pdf
OUT_REVIEW_MERGED := out/prace-bilingual-review.pdf

.PHONY: help build build-school build-cs build-en build-merged review review-school review-cs review-en review-merged all verify ci site watch png clean check

help:
	@echo "make build           – všechny 4 final profily"
	@echo "make review          – všechny 4 review profily"
	@echo "make all             – všech 8 PDF variant"
	@echo "make ci              – build všech variant + statická kontrola artefaktů"
	@echo "make site            – build všech variant + GitHub Pages web"
	@echo "make build-school    – školní CZ profil -> $(OUT_SCHOOL)"
	@echo "make build-cs        – čistě český profil -> $(OUT_CS)"
	@echo "make build-en        – anglický profil -> $(OUT_EN)"
	@echo "make build-merged    – plně bilingvní profil -> $(OUT_MERGED)"
	@echo "make review-school   – review školní profil -> $(OUT_REVIEW_SCHOOL)"
	@echo "make review-cs       – review čistě CZ -> $(OUT_REVIEW_CS)"
	@echo "make review-en       – review EN -> $(OUT_REVIEW_EN)"
	@echo "make review-merged   – review bilingvní -> $(OUT_REVIEW_MERGED)"
	@echo "make watch           – živý náhled školního final profilu"
	@echo "make clean           – smaže out/ a site/"

build: build-school build-cs build-en build-merged

build-school:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input profile=school $(MAIN) $(OUT_SCHOOL)

build-cs:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input profile=cs $(MAIN) $(OUT_CS)

build-en:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input profile=en $(MAIN) $(OUT_EN)

build-merged:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input profile=merged $(MAIN) $(OUT_MERGED)

review: review-school review-cs review-en review-merged

review-school:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input profile=school $(MAIN) $(OUT_REVIEW_SCHOOL)

review-cs:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input profile=cs $(MAIN) $(OUT_REVIEW_CS)

review-en:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input profile=en $(MAIN) $(OUT_REVIEW_EN)

review-merged:
	@mkdir -p out
	$(TYPST) compile $(FONTS) --input review=true --input profile=merged $(MAIN) $(OUT_REVIEW_MERGED)

all: build review

verify:
	$(PYTHON) scripts/check_build.py

ci: all verify

site: all verify
	$(PYTHON) scripts/build_site.py

check: ci

watch:
	@mkdir -p out
	$(TYPST) watch $(FONTS) --input profile=school $(MAIN) $(OUT_SCHOOL)

png:
	@mkdir -p out/pages
	$(TYPST) compile $(FONTS) --input profile=school $(MAIN) "out/pages/strana-{0p}.png" --ppi 150

clean:
	rm -rf out site
