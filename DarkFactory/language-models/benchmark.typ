#import "/DarkFactory/templates/common.typ": bib

#let evidence = json("/DarkFactory/data/phase2-evidence.json")
#let rows = evidence.artificial_analysis.rows
#let r0 = rows.at(0)
#let r1 = rows.at(1)
#let r2 = rows.at(2)
#let r3 = rows.at(3)
#let r4 = rows.at(4)

#let pct(value) = str(value) + " %"

#let benchmark_snapshot = [
#figure(
  text(size: 7.4pt)[
    #table(
      columns: (2.35fr, 1.05fr, 1.25fr, 1fr, 0.8fr),
      align: (left, left, center, center, center),
      inset: 3pt,
      [*Model*],
      [*Poskytovatel*],
      [*Artificial Analysis Intelligence Index*],
      [*Terminal-Bench 4.0*],
      [*SciCode*],
      [#r0.model], [#r0.provider], [#r0.index], [#pct(r0.terminal_bench_4_0_percent)], [#pct(r0.scicode_percent)],
      [#r1.model], [#r1.provider], [#r1.index], [#pct(r1.terminal_bench_4_0_percent)], [#pct(r1.scicode_percent)],
      [#r2.model], [#r2.provider], [#r2.index], [#pct(r2.terminal_bench_4_0_percent)], [#pct(r2.scicode_percent)],
      [#r3.model], [#r3.provider], [#r3.index], [#pct(r3.terminal_bench_4_0_percent)], [#pct(r3.scicode_percent)],
      [#r4.model], [#r4.provider], [#r4.index], [#pct(r4.terminal_bench_4_0_percent)], [#pct(r4.scicode_percent)],
    )
  ],
  caption: [Bodový snímek pěti nejvýše skórujících odlišných základních modelů podle Artificial Analysis Intelligence Index v4.3.2, zveřejněného 7. 9. 2026; hodnoty byly ověřeny 22. 9. 2026. U každého základního modelu je ponechána jeho nejvýše skórující vyhodnocená konfigurace. #cite(bib.artificial_analysis_intelligence_v4_3_2)],
)
]
