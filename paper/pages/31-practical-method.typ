// 3.1 Method.
//
// What remains here is the reproducibility record: what was built, under what conditions,
// and what the simplification costs. The sentence that named the pinned revision, and the
// sentence about source types, were both removed at the author's instruction — they
// described the paper rather than the system.
//
// The four-layer list that opened this section is gone. It named GitHub, GitHub Actions,
// the Python/Docker runner and the review loop, and then 3.2 to 3.5 described all four
// again - the list was a second, compressed edition of the chapter it introduces, which is
// how its fourth item came to contradict 3.4 (../STATE.md, Q-E). What remains is the
// reproducibility record: the pinned revision, how the runner was built, and what the
// simplification costs. The system itself is described once, in 3.2 to 3.5.
//
// Tři kritária was the only level-3 subsection here. It has been removed: R15 supersedes
// R11, R12 and R13 and deletes the criteria from the whole paper, keeping only the main
// research question. 3.1 Metodika stays because the school requires a methodological part
// and scores methods; it just no longer carries criteria. See ../STATE.md, R15, Q-A, Q-C.
//
// The composition question used to be 3.1.2. It was cut and its one live idea became the
// third limitation in the discussion (4.2), beside ownership and scope.
//
// The criteria are this thesis's own operationalisation, not the field's taxonomy, and say
// so.
#heading(level: 2)[Metodika] <practical-first>

Praktická část implementuje záměrně jednoduchou produkční pipeline, v níž je vývojovým prostředím přímo GitHub a harness produkční coding agent. Cílem je ukázat, jak lze spojit události GitHubu, automatizované plánování, izolovanou práci v kontejneru a lidskou integraci do jednoho opakovatelného procesu.

Pipeline byla implementována pomocí komerčních coding agentů, které následně sama provozuje. Cílem nebyla stavba co nejucelenějšího systému, ale co nejmenší uzavřená smyčka, na níž lze ukázat, jak se navzájem ovlivňují agent, harness a lidský recenzent. Pozornost je proto soustředěna na tuto interakci a na její členění, nikoli na šíři nabízených funkcí.
