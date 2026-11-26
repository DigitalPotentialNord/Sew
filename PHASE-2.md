# Phase 2: Product Design, UX & System Architecture

Stand: 26.11.2026 · Grundlage: [`docs/research/`](../research/) (Phase 1, abgeschlossen)

---

## 1. Was Phase 2 liefert

Zwölf Dokumente in zwei Gruppen, plus diese Übersicht:

### Produkt

| Datei | Inhalt |
|---|---|
| [`product/product-vision.md`](product/product-vision.md) | Vision, Positionierung, Prinzipien, Nicht-Ziele, Erfolgsmetriken |
| [`product/prd.md`](product/prd.md) | Anforderungen, Personas→Features, funktionale/nicht-funktionale Specs, Editor-Konzept, Touch-UX |
| [`product/user-flows.md`](product/user-flows.md) | 12 detaillierte Flows mit Zustandsmodellen, Fehlerpfaden, Abbruchpunkten |
| [`product/module-library.md`](product/module-library.md) | 16 Module vollständig spezifiziert (Geometrie, Parameter, Grenzen, Nähoperationen, Abhängigkeiten, Validierung) |
| [`product/mvp-scope.md`](product/mvp-scope.md) | MVP-Umfang (5 Module, **1 Grundform**), Ausschlüsse mit Begründung, 12-Wochen-Plan mit Kalibrierung in Woche 1, Roadmap, Abnahmekriterien |

### Engineering

| Datei | Inhalt |
|---|---|
| [`engineering/system-architecture.md`](engineering/system-architecture.md) | Schichten, Pakete, Grenzen, Technologieentscheidung mit Alternativenprüfung |
| [`engineering/geometry-engine.md`](engineering/geometry-engine.md) | Koordinaten, Primitive, Pfade, Offsets, Nahtzugaben, Determinismus, Testbarkeit |
| [`engineering/pattern-data-model.md`](engineering/pattern-data-model.md) | Versioniertes Projektmodell, Schemata, Migration, Serialisierung |
| [`engineering/construction-rules.md`](engineering/construction-rules.md) | Nähbarkeits-Regelwerk, Operationsmodell, typisierte Konstruktionsregeln |
| [`engineering/material-calculation.md`](engineering/material-calculation.md) | Materialmodell, exakt vs. geschätzt, Fadenlauf, Zuschnittanordnung |
| [`engineering/export-system.md`](engineering/export-system.md) | SVG/PDF/Tiling/Plotter, Projektor, Kalibrierung, Dateinamen, Anleitung |
| [`engineering/testing-strategy.md`](engineering/testing-strategy.md) | Testpyramide, Golden/Property/Snapshot-Tests, Playwright, Härtetests |

### Abschluss

| Datei | Inhalt |
|---|---|
| [`architecture-review.md`](architecture-review.md) | **Unabhängige Architekturprüfung**: **16 Befunde, 5 davon kritisch**, mit Beschluss, Änderungsliste und Urteil |

> **Die Prüfung ist nicht nur gelesen, sondern eingearbeitet.** Alle Befunde, die einen Beschluss
> hatten, sind in die betroffenen Dokumente zurückgeschrieben (markiert mit
> `*(Architekturprüfung K-0x)*`). Die Änderungsliste steht in `architecture-review.md` §7 —
> ≈ 21 Stunden Dokumentarbeit, keine Codezeile. Was dort steht, ist der Startpunkt von Phase 3.

---

## 2. Die Dokument-Lesereihenfolge

**Wenn Sie nur 15 Minuten haben:** [`architecture-review.md`](architecture-review.md) §1–§3 und
[`product/mvp-scope.md`](product/mvp-scope.md) §1.

**Wenn Sie bauen wollen:** `product-vision` → `mvp-scope` → `system-architecture` →
`geometry-engine` → `pattern-data-model` → `construction-rules` → `material-calculation` →
`export-system` → `testing-strategy`.

**Wenn Sie gestalten wollen:** `prd` §5–§7 (Editor & Touch) → `user-flows` → `module-library`.

---

## 3. Der wichtigste Konflikt in dieser Phase — und wie er gelöst wurde

Phase 1 hat entschieden (und mit Belegen begründet):

> „Freie 2D-Arbeitsfläche mit Objekt-Platzierung an beliebiger Position: **nicht im MVP** –
> hoher Solver-Aufwand, niedrige Nachfrage, direkter Vergleich mit OpenSloper."
> „MVP bewusst ohne Freiform. Regelbasiert, validiert."
> (`research/opportunity-analysis.md` §8, §9)

Phase 2 verlangt:

> „Nutzer zieht Module auf die Arbeitsfläche", „frei positionieren", „skalieren".

**Diese beiden Anforderungen widersprechen sich, wenn man „frei" wörtlich nimmt.** Ein freier
2D-Canvas mit beliebiger Modulposition erfordert:

- Kollisionserkennung zwischen beliebig geformten Modulen,
- Offset-/Nahtzugabenberechnung an Freiform-Kanten,
- Entscheidung „was passiert, wenn ein Modul über den Rand ragt",
- und die Frage, wie aus einer beliebigen 2D-Anordnung *eine nähbare* 3D-Konstruktion wird
  (ein Modul „schwebt" nicht – es ist an eine **Fläche** gebunden, mit **Tiefe** und **Naht**).

**Die Auflösung: das Flächen-Kanal-Modell.**

Das Innenleben eines Organizers ist **keine freie 2D-Fläche**, sondern eine Menge von
**Trägerflächen** (Panels), die jeweils einen **1D-Kanal** besitzen:

```text
┌─────────────────────────────────────────────────────┐
│  P1 Vorderes Innenpanel      ◄── Fläche (2D)        │
│  ┌───────────────────────────────────────────────┐  │
│  │ [Nadelkanal 1] [Nadelkanal 2] ... [Fach]      │  │
│  └───────────────────────────────────────────────┘  │
│   ▲ Kanal: Module werden in EINER Achse angeordnet  │
│     (links↔rechts), Tiefe ist eine Eigenschaft      │
│     des Moduls, nicht eine freie Koordinate         │
├─────────────────────────────────────────────────────┤
│  P2 Hinteres Innenpanel / Klappe / Rolle            │
└─────────────────────────────────────────────────────┘
```

Ein Modul hat in der Fläche **eine freie Achse** (Position entlang des Kanals, als
Zentimeter-Offset) und **eine ableitbare Achse** (Anlage an Ober-/Unterkante der Fläche,
abhängig vom Modultyp). Es kann **nicht** überall liegen — und genau das ist der Punkt:

| | Freier Canvas | **Flächen-Kanal-Modell** |
|---|---|---|
| Nutzergefühl | „ich kann alles" | **„ich ziehe Module an ihren Platz, und es passt immer"** |
| Kollisionen | müssen erkannt & aufgelöst werden | **strukturell unmöglich** (Sequenzmodell) |
| Nähbarkeit | offene Frage | **durch Konstruktionsregeln garantiert** |
| Solver | nötig (teuer, fehleranfällig) | **nicht nötig** |
| Aufwand MVP | 9–12 Monate **[H]** | **8–12 Wochen [H]** (Phase-1-Zusage) |
| Erweiterbar? | – | **ja**: Kanäle → 2D-Slots → freie Fläche, ohne Modellbruch (siehe unten) |

**Und der entscheidende Punkt für Phase 3:** Das Modell ist **nach oben offen**. Ein Modul
kennt seine *Bindung* (`channel` | `slot` | `free`). Der MVP implementiert nur `channel`. Ein
späterer „Pro-Modus" kann `slot` (2D-Rasterzellen auf einer Fläche) und danach `free`
(Freiform mit echtem Solver) ergänzen, **ohne dass sich Datenmodell, Geometrie oder Export
ändern**. Das ist die Erweiterungsstrategie — nicht ein Kompromiss.

Ausführlich: [`engineering/system-architecture.md`](engineering/system-architecture.md) §5
(„Das Bindungskonzept") und [`product/prd.md`](product/prd.md) §5.4.

---

## 4. Was bewusst *nicht* in Phase 2 passiert ist

- **Keine Implementierung.** Kein Quellcode außer typisierten Schemata und
  Pseudocode-Signaturen in den Engineering-Dokumenten. Die Anweisung war eindeutig.
- **Keine erfundene Präzision.** Wo eine Zahl physikalisch begründet ist (Loop-Länge,
  Elastikzugabe, Nahtzugabe), steht die Herleitung. Wo sie eine Annahme ist, steht **[H]**.
- **Keine Technologie-Mode.** Next.js/React/TS/Tailwind/SVG/Zod/Vitest/Playwright wurden nicht
  übernommen, weil sie im Briefing standen, sondern geprüft und **mit einer Ausnahme bestätigt**
  (siehe `system-architecture.md` §7 — Next.js ist für dieses Produkt Overhead und wird durch
  Vite+React ersetzt, mit Begründung und Rückfalloption).

---

## 5. Offene Entscheidungen für Phase 3

| # | Entscheidung | Warum jetzt offen | Wer |
|---|---|---|---|
| O1 | Next.js vs. Vite+React | Architekturempfehlung: Vite. Braucht Team-Beschluss | Tech Lead |
| O2 | GPLv3-Prüfung bei OpenSloper-/Seamly-Code-Nutzung | Rechtsfrage, nicht technisch. Empfehlung: **keinen fremden Code übernehmen**, nur Ideen | Recht + Tech Lead |
| O3 | 3D-Vorschau: gar nicht / isometrisch 2.5D / echte 3D-Engine | 2.5D ist billig und reicht für „sieht aus wie gefüllt"; echte 3D ist teuer | Produkt |
| ~~O4~~ | ~~Ob „Nadel-Etui" der einzige MVP-Typ bleibt~~ | **entschieden (Architekturprüfung K-04):** nur Buchform im MVP. Die Rolle verdoppelt Export-, Tiling- und Testfläche; erste Stufe-2-Erweiterung | ~~Produkt~~ **erledigt** |
| O7 | Reihenfolge der Stufe-2-Erweiterungen: Rolle, M06 oder M14/M15-Verschluss | Hängt am Signal aus K1–K4 (welche Rückmeldungen kommen) | Produkt, nach Messung |
| O5 | Preis-Test 9 / 14 / 19 € | Phase 1 verlangt Test vor Launch | Produkt |
| O6 | Datenhoheit: URL-Fragment vs. localStorage vs. beides | Betrifft Datenschutz-Versprechen „kein Konto" | Tech Lead |

Diese Punkte sind **die einzigen** Blocker zwischen dieser Architektur und Phase 3. Nach der
Architekturprüfung sind es **fünf plus einer** (O4 ist entschieden, O7 ist neu).

---

## 6. Stand und Prüfsumme (26.11.2026)

| Kennzahl | Wert |
|---|---|
| Dokumente | **13** (5 Produkt, 7 Engineering, 1 Prüfung) + diese Übersicht |
| Zeilen | **6.109** (Stand nach Einarbeitung der Prüfung) |
| Verifizierte relative Links | alle auflösen, **0 gebrochen** |
| Funktionsanforderungen | FR-01…FR-95, FR-W1…FR-W8 (PRD) |
| Validierungsregeln | **34** (13 global `V-G-*`, 19 modulbezogen, 2 operationsbezogen) |
| Modulspezifikationen | 16 (5 im MVP, davon 4 Implementierungen) |
| Testfälle benannt | 39 (`T-G-*`, `T-M-*`, `T-X-*`, `T-S-01`, `T-D-06`) + **19 Property-Tests** + 27 E2E |
| Invarianten | I1–I12 |
| Offene Entscheidungen | 5 (O1, O2, O3, O5, O6) + 1 neu (O7) |
| Befunde der Architekturprüfung | **16 — 5 kritisch, 5 hoch, 5 mittel, 1 akzeptiertes Risiko** |
| Davon eingearbeitet | **14**; 2 bleiben bewusste Risiken (H-09 Positionierung, K-04 Restrisiko Aufwand) |

**Phase 2 ist damit abgeschlossen.** Die Architektur ist konsistent, die Befunde sind
eingearbeitet, und die verbleibenden Blocker sind benannt. Was als nächstes passiert, steht in
`architecture-review.md` §7 — und es beginnt **nicht** mit Code, sondern mit vier Nadeln, einem
Lineal, einem Stoffrest und einer Nähmaschine.
