#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "global_ai_diffusion_figure",
    czech: "Globální adopce generativní AI",
  english: "Global Generative AI Adoption",
definition: terms => [
Grafický podklad dokumentuje rychlost, s níž se generativní AI rozšířila z experimentální technologie do běžného používání.
  ],
  description: terms => [
Microsoft AI Economy Institute uvádí pro druhé pololetí roku 2025 celosvětový podíl uživatelů 16,3 %, oproti 15,1 % v prvním pololetí #cite(bib.microsoft2025aiadoption). Novější zpráva pro první čtvrtletí 2026 odhaduje používání generativní AI na 17,8 % světové populace v produktivním věku #cite(bib.microsoft2026aidiffusion).
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/microsoft-ai-diffusion-2025.png", width: 100%),
  caption: [AI diffusion v globálním Severu, globálním Jihu a celosvětově, H1–H2 2025. Zdroj: Microsoft AI Economy Institute #cite(bib.microsoft2025aiadoption).],
)
  ],
  summary: terms => [
Měřítko adopce neposuzuje schopnosti jednotlivých systémů, ale dokládá jejich rychlé rozšíření do reálného používání.
  ],
)
