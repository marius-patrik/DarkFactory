# Přibalená písma

| Písmo | Metricky odpovídá | Licence |
| :--- | :--- | :--- |
| **Carlito** | Calibri | SIL Open Font License 1.1 |
| **Caladea** | Cambria | SIL Open Font License 1.1 |

Písma jsou přibalena záměrně: práce se pak vysází naprosto stejně na
školním počítači, na vlastním notebooku i v CI, bez ohledu na to, zda je
nainstalován MS Office. Rozměry znaků jsou shodné s Calibri a Cambria,
takže rozvržení odpovídá wordové předloze.

Sazba je proto potřeba spouštět s `--font-path fonts` — což dělá `make`
za vás.
