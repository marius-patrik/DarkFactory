TYPST ?= typst
FONTS := --font-path fonts
MAIN  := main.typ
REVIEW := review.typ
OUT   := out/prace.pdf
OUT_REVIEW := out/prace-review.pdf

.PHONY: help build review all watch png clean check

help:
	@echo "make build   – vysází čistou práci bez recenzních značek do $(OUT)"
	@echo "make review  – vysází recenzní verzi se značkami a diffem do $(OUT_REVIEW)"
	@echo "make all     – vysází obě verze ($(OUT) i $(OUT_REVIEW))"
	@echo "make watch   – průběžná sazba s živým náhledem (čistá verze)"
	@echo "make png     – vyexportuje jednotlivé strany do out/pages"
	@echo "make check   – ověří, že obě verze práce jdou vysázet bez chyb"
	@echo "make clean   – smaže adresář out/"

build:
	@mkdir -p $(dir $(OUT))
	$(TYPST) compile $(FONTS) $(MAIN) $(OUT)
	@echo "Hotovo (čistá verze): $(OUT)"

review:
	@mkdir -p $(dir $(OUT_REVIEW))
	$(TYPST) compile $(FONTS) $(REVIEW) $(OUT_REVIEW)
	@echo "Hotovo (recenzní verze): $(OUT_REVIEW)"

all: build review

watch:
	@mkdir -p $(dir $(OUT))
	$(TYPST) watch $(FONTS) $(MAIN) $(OUT)

png:
	@mkdir -p out/pages
	$(TYPST) compile $(FONTS) $(MAIN) "out/pages/strana-{0p}.png" --ppi 150

check:
	$(TYPST) compile $(FONTS) $(MAIN) --format pdf /dev/stdout > /dev/null
	$(TYPST) compile $(FONTS) $(REVIEW) --format pdf /dev/stdout > /dev/null

clean:
	rm -rf out
