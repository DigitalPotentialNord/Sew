# MVP-Umfang

Stand: 26.11.2026 · Anforderungen: [`prd.md`](prd.md) · Module: [`module-library.md`](module-library.md)

---

## 1. Der MVP in einem Satz

> **Ein Nadel-Etui, das aus „was nimmst du mit" entsteht und in unter drei Minuten als
> maßhaltiges PDF mit Materialliste und Anleitung vorliegt — ohne Konto, ohne CAD.**

**Zielgruppe im MVP:** Maike (Strick, Priorität 1) und Betül (Anfängerin, Priorität 4).
**Nicht im MVP adressiert:** Sabine (Gewerbe, Varianten) und Jonas (Expertenmodus, SVG-Detail).
Deren Anforderungen sind **architektonisch vorbereitet**, aber nicht implementiert.

---

## 2. Der funktionale Kern (was gebaut wird)

### 2.1 Grundformen — 1 von 3 *(reduziert nach Architekturprüfung K-04)*

| Form | Im MVP | Warum |
|---|---|---|
| **Aufklappbares Etui (Buchform)** | ✅ **ja** | Klarste Konstruktion: 2 Panel-Lagen (außen + Futter), Bund, umlaufende Außennaht. Beste Grundlage für die Pipeline |
| **Ausrollbar (Rolle)** | ❌ **nein — Stufe 2** | Ein Panel + Verschlussbänder. **Fachlich** einfacher, aber es verdoppelt Export-, Tiling- und Testfläche und verlangt die geschätzte Bandlängenformel (O-M3) |
| Steh-Utensilo / Halbrund | ❌ nein | Braucht Bodenkonstruktion (Boxed Corners) → eigene Geometrie-Klasse |

> **Warum diese Reduktion (K-04).** Der ursprüngliche Plan hatte zwei Grundformen in 12 Wochen
> — bei einem Aufwand von ≈ 20 Personenwochen (Architekturprüfung §3, K-04). Eine Rolle bedeutet:
> neues Panel-Layout, andere Verschlusskonstruktion, geschätzte Bandlänge als neuen
> Unsicherheitsherd (`certainty: 'estimated'`), zusätzliche Goldens, zusätzliche Testnähung.
> **Erst ein Etui, das passt — dann eine zweite Form.** Der Typ `BaseShape` behält `'roll'`:
> Die Rolle ist **vorbereitet, nicht gebaut** (`mvp-scope.md` §6 Stufe 2).

> **Was der MVP wirklich druckt:** ein **flaches, zweilagiges** Panel (außen + Futter) mit Bund.
> Keine Bodenecke, keine Tiefe (`depthMm` ist aus dem Schema entfernt, `pattern-data-model.md`
> §2.2.1). Ein Etui mit „40 mm Tiefe" auf dem Deckblatt und einem flachen Blatt als Zuschnitt wäre
> **nicht nähbar** — und genau dieser Widerspruch war Befund K-02.

### 2.2 Module — 5 statt 16 (davon 4 Implementierungen)

| Modul | Umfang | Begründung |
|---|---|---|
| **M01 Stofffach** | vollständig | einfachste echte Konstruktion; deckt M02 als Parametervariante mit ab |
| **M02 Geteiltes Fach** | = M01 mit `sections > 1` | **keine eigene Implementierung**, nur Parameter |
| **M03 Nadelkanal** | vollständig | **das Kernmodul und der Marktgrund** (Phase 1: „stricknadel etui" ohne Generator) |
| **M04 Elastikschlaufen** | vollständig | andere Mechanik (Zugspannung) → beweist die Engine |
| **M05 Verschlusslasche** | vollständig (`variante: band`) | ohne Verschluss ist das Etui unfertig |

**Warum genau diese fünf [A]:**

1. **Sie ergeben ein vollständiges, benutzbares Produkt.** Ein Etui aus Nadelkanälen, Fächern,
   Elastik und Verschluss ist das, was Maike tatsächlich nähen will.
2. **Sie decken drei verschiedene Mechanik-Klassen ab:** Nahtgefasst (M01/M03), Zugspannung (M04),
   Kanteneinlage (M05). Damit ist die Engine-Klasse „nur Rechtecke" widerlegt.
3. **Sie erzeugen alle Materialtypen, die das Modell braucht:** Stoff, Verstärkung, Gummiband,
   Garn (+ Reißverschluss erst in Stufe 2). Die Material-Engine wird also vollständig getestet.
4. **Sie sind alle ohne Polsterung, ohne Metallteile, ohne Kurven-Sonderfälle nähbar.** Genau
   die Klasse von Konstruktion, die in der Testnähung zuverlässig prüfbar ist.

### 2.3 Funktionsumfang (Feature-Liste mit IDs)

| Bereich | Im MVP | PRD-Referenz |
|---|---|---|
| Grundfläche definieren (B × H, Rechteck/abgerundet) | ✅ | FR-10…FR-14 |
| Grundform wählen (1 Form im MVP, Typ vorbereitet) | ✅ | FR-03 |
| Füllmenge erfassen | ✅ | F5 |
| Module hinzufügen (Drag & Drop, Desktop + Touch) | ✅ | FR-20 |
| Module verschieben / umordnen | ✅ | FR-21, FR-25 |
| Module skalieren (nur erlaubte Achsen) | ✅ | FR-22, FR-23 |
| Module konfigurieren (vollständiges Panel) | ✅ | FR-24 |
| Duplizieren / Löschen / Undo-Redo (50 Schritte) | ✅ | FR-25, FR-26 |
| Warnungen mit Schweregrad + Vorschlag (1-Klick-Fix) | ✅ | FR-50…FR-55 |
| Geometrie berechnen (deterministisch, mm-Integer) | ✅ | FR-40…FR-44, FR-46, FR-47 |
| Materialliste (exakt/geschätzt, Stoffbreite, Fadenlauf) | ✅ | FR-60…FR-63 |
| Schnittteile mit NZ, Nählinie, Faltlinie, Fadenlauf, Knipsen | ✅ | FR-70…FR-74 |
| PDF-Export (getiled, A4/Letter, Kalibrierquadrat, Deckblatt) | ✅ | FR-90, FR-95 |
| **SVG-Export** | ✅ | FR-75 |
| Nähanleitung (aus Operationen, mit konkreten Zahlen) | ✅ | FR-80…FR-84 |
| Projekt-JSON-Export/Import | ✅ | FR-92 |
| Kein Konto, lokal gespeichert, offline nach Erstaufruf | ✅ | FR-01, NFR-06 |
| Deutsch + Englisch | ✅ | UX-05 |
| Touch-UX (Tablet-Anpassen, Mobile-Begleiter) | ✅ | PRD §6 |

### 2.4 Was im MVP **nicht** gebaut wird — mit Begründung

| Nicht im MVP | Warum | Wann |
|---|---|---|
| **Freie 2D-Platzierung / Kollisionsauflösung** | Phase 1: Aufwand 9/10, Nachfrage niedrig, direkter Vergleich mit OpenSloper. Bindungsmodell ist offen (FR-30/34) | Stufe 3, nur mit Solver |
| **3D-Vorschau** | Aufwand 5/5, kein Conversion-Beweis; isometrische 2.5D-Skizze als Stufe 2 | Stufe 2 |
| **Reißverschluss (M06)** | Höchste Konstruktionskomplexität (RV-Länge über Kurven, Naht vor Futter). Größter Vorsprung des Hauptwettbewerbers → braucht eigene Sorgfalt | **Stufe 2, erstes Modul** |
| **Schmuck-Module (M09–M11)** | Brauchen Polsterung, Metallteile oder Slot-Bindung → Schema-Erweiterung | Stufe 2 |
| **Weitere Grundformen** (Utensilo, Halbrund) | neue Geometrie-Klasse | Stufe 3 |
| **Varianten / Größenfamilien** | Sabine-Anforderung, braucht Batch-Pipeline + Lizenzmodell | Stufe 2 (`S`) |
| **Projektor-Modus** | `S`-Priorität, billig, aber nachrangig | Stufe 2 |
| **Teilen per Link** | `S`; JSON-Export deckt den Bedarf zuerst | Stufe 2 |
| **Affiliate-Links** | `C`; erst mit Nutzerbasis sinnvoll | Stufe 3 |
| **Konto / Cloud / Sync** | widerspricht P5 und dem „kein Konto"-Anker | nie (bewusst) |
| **KI-Prompt-Eingabe** | Ourlette/IntelliSeam; Erwartungsfalle | beobachten |
| **Marketplace, Community** | Makerist-Beleg; kalter Start | nie (bewusst) |
| **Zuschnitt-Nesting** | Aufwand hoch; Gewerbe-Nutzen | Stufe 2/3 |
| **Native App** | mobile Konstruktion unrealistisch | nie |
| **Illustrierte Schritt-Diagramme** | `C`; Text mit Zahlen zuerst | Stufe 2 |

> **Die wichtigste Auslassung ist M06 (Reißverschluss).** Sie ist schmerzhaft, weil ein
> Reißverschluss-Etui ein naheliegender Wunsch ist. Aber: Phase 1 (`competitors.md` §4.1) zeigt,
> dass Print + Cut + Sew **genau hier** seine stärkste und am besten dokumentierte Konstruktion
> hat (Zip-Around mit berechneter RV-Länge, Corner-Radius-Constraints, Tape-Einschnitt-Anleitung).
> Wenn wir das im MVP halbgar bauen, verlieren wir gegen einen Gratis-Anbieter an seiner
> stärksten Stelle. **Also: erst Stufe 2, dann richtig.**

---

## 3. Technischer MVP-Umfang

### 3.1 Was an Infrastruktur nötig ist

| Baustein | MVP-Anforderung | Bewusst nicht |
|---|---|---|
| Build | Vite + React + TypeScript + Tailwind (siehe `system-architecture.md` §7) | SSR, Next.js, Server-Routen |
| Zustand | Ein Store (Zustand), Projekt als serialisierbares JSON | Redux, Server-State, Query-Cache |
| Persistenz | localStorage mit Schema-Version + Migration | IndexedDB, Backend, Cloud |
| Geometrie | Eigenes mm-basiertes Modul, Integer + feste Präzisionsregeln | Constraint-Solver, fremde CAD-Bibliothek |
| Rendering | SVG (DOM) für Canvas + Export aus **derselben** Geometrie | Canvas2D, WebGL, separate Export-Geometrie |
| PDF | Erzeugung im Browser (siehe `export-system.md` §3) | Server-Rendering |
| Validierung | Zod für Projekt + Modulparameter | eigene Validatoren daneben |
| Tests | Vitest (Unit/Golden/Property) + Playwright (E2E, Touch, PDF) | visuelle Regression in Stufe 1 |
| Deployment | Statisches Hosting, keine Laufzeitumgebung | Container, DB, Queue |

### 3.2 Nicht-funktionale MVP-Ziele (aus PRD §4)

Alle 15 NFRs gelten. Die drei, die den MVP *definieren*:

- **NFR-03** Konstruktion < 50 ms bei 30 Modulen
- **NFR-07** null Netzwerk-Requests mit Projektdaten
- **NFR-15** 50-mm-Kalibrierung ± 0,5 mm

---

## 4. Zeitplan und Reihenfolge (12 Wochen, geschnitten nach Architekturprüfung K-04)

### 4.0 Warum dieser Plan anders aussieht als der erste

Die Architekturprüfung hat zwei Dinge festgestellt, die den Plan verändern:

1. **Der Umfang passte nicht.** Eine Schätzung von unten ergibt ≈ 20 Personenwochen für den
   ursprünglich dokumentierten Umfang; der Plan sagte 8–12. Deshalb der Schnitt in §4.2.
2. **Das größte Risiko wurde zu spät geprüft.** Die Testnähung stand in Woche 10 von 12 und war
   der **einzige** Test für die Praxiswerte (`needleClearanceMm`, `channelEdgeSeamMm`,
   `elasticGripMm` — alle `[H]`). Neun Wochen Bau auf ungeprüften Zahlen.

**Deshalb beginnt der Plan mit einem halben Tag Handarbeit, nicht mit Code:**

> **Woche 1, halber Tag, ohne Software — Papier-Kalibrierung.** Vier echte Nadelspiele
> (2,0 / 3,0 / 4,0 / 5,0 mm), ein Lineal, ein Streifen Canvas, eine Nähmaschine. Vier Kanäle von
> Hand nähen, Nadel einlegen, prüfen: klemmt / fällt / hält. Ergebnis: eine Tabelle mit
> `needleClearanceMm` je Nadelstärke. Das ist die **billigste Maßnahme des ganzen Projekts** und
> ersetzt neun Wochen Arbeit auf Annahmen.

### 4.1 Der Plan

Die Reihenfolge ist **risikogetrieben**: Was das Produkt scheitern lassen kann, wird zuerst gebaut.

| Woche | Inhalt | Warum diese Position |
|---|---|---|
| **1** | Datenmodell + Zod-Schemata + `construct()` leer + Golden-Test-Harness | Ohne Determinismus-Gerüst ist alles Weitere nicht absicherbar (P4) |
| **1–2** | Geometrie-Kern: mm-Integer, Rechtecke, Offset, Nahtzugabe, Pfadlänge | die Basis für alles |
| **2** | **M03 Nadelkanal** vollständig (Params → Geometrie → Teile → Material → Operationen → Regeln) | **Das Kernmodul. Wenn es nicht geht, ist das Produkt falsch** |
| **3** | Konstruktions-Pipeline + Layout-Solver (Kanal, Platzprüfung) | der eigentliche Wert |
| **3** | **M01/M02 Stofffach** | beweist Wiederverwendung des Modulvertrags |
| **4** | **M04 Elastik**, **M05 Lasche** | zweite/dritte Mechanik-Klasse |
| **4–5** | Regelwerk + Warn-UI mit 1-Klick-Fix | Vertrauen (V2) |
| **5–6** | Canvas + Drag/Reorder/Scale + Eigenschaften-Panel | Editor |
| **6** | PDF + Tiling + Kalibrierquadrat + SVG | **Ab hier ist das Produkt nützlich** |
| **7** | Nähanleitung aus Operationen | Kernversprechen |
| **8** | Materialliste + Füllmengen-Flow | Weg A |
| **9** | Touch-UX (Tablet + Mobile) | Zielgruppe nutzt Tablet/Handy |
| **9** | **Testnähung N1 + Kalibrierung der Praxiswerte** | **vorgezogen von Woche 10** — was hier schiefgeht, ist in Woche 10 noch reparierbar, in Woche 12 nicht |
| **10** | Playwright-Matrix, Offline, A11y, Fehlerfälle | NFRs |
| **11** | Nachbesserung aus der Testnähung (Praxiswerte, Goldens, Anleitung) | die erwartete Arbeit |
| **12** | Release-Härtung + Puffer | realistisch |

**Der kritische Punkt:** Woche 9 ist **kein Puffer**, sondern ein **Meilenstein mit möglichem
Abbruch** — und Woche 4 hat eine **Vorstufe**: ein Modul, ein Kanal, eine Nadel, von Hand genäht,
**bevor** der Editor existiert. Wenn die Testnähung zeigt, dass die Konstruktionsannahmen (O-M1, O-M2) falsch sind,
ändert sich das Produkt — nicht nur der Code.

### 4.2 Der Schnitt (was gegenüber dem ersten Entwurf gestrichen ist)

| Was | Aktion | Gespart (Personenwochen) |
|---|---|---|
| **Englisch** | nur DE im MVP (Architekturprüfung M-14) | 1,0 |
| **Zweiter PDF-Pfad** | nur Pfad A (`window.print()`); `pdf-lib` erst nach Entscheidung X1 | 1,0 |
| **M02 (geteiltes Fach)** | `sections` bleibt 1 im MVP — M01 ohne Teilung | 0,5 |
| **Rolle als Grundform** | Stufe 2 (§2.1) | 1,5 |
| **Property-Tests** | 8 statt 16 Properties im CI, Rest nightly | 0,5 |
| **Browser-Matrix** | Chromium + WebKit im CI; Firefox/Edge manuell vor Release | 0,5 |
| **E2E** | 14 statt 25 Tests (`testing-strategy.md` §7.1) | 0,5 |
| **Summe** | | **≈ 5,5** |

**Der schmerzhafteste Schnitt ist die Rolle** — und er ist richtig: zwei Grundformen mit fünf
Modulen in 12 Wochen ist die Position, die scheitert.

### 4.3 Was den Zeitplan realistisch sprengt

| Risiko | Wirkung | Gegenmaßnahme |
|---|---|---|
| PDF-Erzeugung im Browser wird fummelig (Fonts, mm-Präzision) | +1–2 Wochen | früh in Woche 6 prototypisch prüfen, nicht am Ende |
| Touch-Drag & Drop mit Scroll-Konflikt | +1 Woche | Long-press-Muster früh prototypen (Woche 5) |
| Testnähung deckt Konstruktionsfehler auf | +2 Wochen | deshalb Woche 10 mit Puffer 12 |
| Deutsches Fachvokabular inkonsistent | +0,5 Woche | Glossar in Woche 1 anlegen |

---

## 5. Abnahmekriterien des MVP

Der MVP ist fertig, wenn **alle** Punkte in einem dokumentierten Testlauf belegt sind.

### 5.1 Funktionale Abnahme

| # | Kriterium | Nachweis |
|---|---|---|
| A1 | „Nadelspiele bis 20 cm" → PDF in **≤ 4 Interaktionen** | Playwright misst `interaction_count` |
| A2 | Mit Editor-Anpassung → PDF in **≤ 8 Interaktionen** | dito |
| A3 | Median Time-to-pattern **< 3 Minuten** bei 5 Testnutzern | moderierter Test |
| A4 | Alle 5 MVP-Module erzeugen korrekte Teile, Material und Operationen | Golden-Tests je Modul |
| A5 | Jede `error`-Regel blockiert Export sichtbar mit Vorschlag | E2E je Regel |
| A6 | Anleitung nennt **die tatsächlichen Zahlen** der Konfiguration | Snapshot-Test |
| A7 | Materialliste trennt exakt/geschätzt korrekt | Unit-Test je Materialtyp |
| A8 | JSON-Export → Import → identischer Konstruktions-Hash | Round-Trip-Test |
| A9 | Buchform **und** Rolle vollständig durchgängig | E2E je Grundform |

### 5.2 Qualitätsabnahme

| # | Kriterium | Nachweis |
|---|---|---|
| Q1 | **10.000 Zufallskonfigurationen** erzeugen keine `error`-verletzende Ausgabe | Property-Test (fast-check) |
| Q2 | Zwei Läufe → bit-identische Geometrie (Hash) | Golden-Test |
| Q3 | Identisches Ergebnis auf iOS Safari, Android Chrome, Desktop-Chrome/Firefox/Safari | Playwright-Matrix (NFR-13) |
| Q4 | 50-mm-Kalibrierung ± 0,5 mm | physischer Druck + Messung |
| Q5 | Null Netzwerk-Requests mit Projektdaten | Request-Interception im CI |
| Q6 | axe-core: 0 critical/serious | CI |
| Q7 | Offline funktionsfähig nach Erstaufruf | Playwright offline |
| Q8 | Korruptes localStorage → kein weißer Screen | Chaos-Test |

### 5.3 Die nicht-technische Abnahme — die wichtigste

| # | Kriterium | Nachweis |
|---|---|---|
| **N1** | **Das Standardprojekt wurde tatsächlich genäht** und passt für 8 Nadelspiele à 20 cm | **Foto + schriftlicher Bericht + Messprotokoll** |
| **N2** | Die Kalibrierwerte aus O-M1 (Nahtluft, Randnaht) und O-M2 (Elastikzug) sind anhand der Testnähung **dokumentiert angepasst** | Änderungsprotokoll im Repo |
| **N3** | Mindestens **eine** Person außerhalb des Teams hat ein Etui nach der Anleitung genäht | Kurzbericht |

> **N1–N3 sind nicht optional.** Phase 1 (`opportunity-analysis.md` §10) macht die Testnähung zur
> wichtigsten Einzelaufgabe — und Abnahmekriterium 10 des PRD verlangt sie ausdrücklich.
> **Ein MVP, der alle technischen Kriterien erfüllt, aber nie genäht wurde, ist nicht fertig.**

---

## 6. Roadmap nach dem MVP

| Stufe | Inhalt | Auslöser (Gate) |
|---|---|---|
| **2a** | **Rolle als zweite Grundform** (Bandlänge dann `estimated`, `V-M05-03` wird sichtbar), **M06 Reißverschlusstasche** (mit Rundungen), Projektor-Modus, Teilen-Link | MVP-Abnahme + K3 (keine „passt nicht"-Häufung) |
| **2a'** | **Volumen** (Bodenecke, `depthMm` kehrt zurück — mit Schnittteil, Faltlinien, Operation `sew-box-corners` und eigener Testnähung) | Nur mit Nachfrage-Signal; K-02 hat es bewusst verschoben |
| **2b** | Varianten/Größenfamilien + Lizenz + Batch-Export (**Sabine**) | ≥ 1,5 % Conversion oder ≥ 10 Gewerbe-Anfragen |
| **2c** | Schmuck-Module (M09–M11) → braucht **Schema-Erweiterung** (Polsterung, Punktmaterialien, `slot`) | Nachfrage-Signal aus Feedback |
| **2d** | Isometrische 2.5D-Vorschau | Conversion-Experiment |
| **3a** | `slot`-Bindung (2D-Raster) → **Erweiterbarkeitsbeweis** | Wenn 2c gebaut wird |
| **3b** | Weitere Grundformen (Utensilo) | Nachfrage |
| **3c** | `free`-Bindung mit Solver | **nur** wenn Daten es rechtfertigen (unwahrscheinlich) |
| **nie** | Konto, Cloud, Marketplace, KI-Prompt, native App | siehe PRD FR-W1…W8 |

---

## 7. Was den MVP scheitern lassen würde (Risikoliste für Phase 3)

| # | Risiko | Frühwarnsignal | Konsequenz |
|---|---|---|---|
| **R1** | **Konstruktionsannahmen falsch** (Nahtluft, Elastikzug) → Etui passt nicht | Testnähung Woche 10 | Werte ändern; wenn strukturell falsch: Modul überarbeiten |
| **R2** | **PDF-Maßhaltigkeit** stimmt nicht (Browser-Druck) | Kalibrierung Q4 | Tiling-/Kalibrierlogik überarbeiten; ggf. SVG als Primärformat |
| **R3** | **Editor wird als zu eng erlebt** (Jonas-Problem) | Feedback „ich kann nicht frei platzieren" | Expertenmodus vorziehen; `slot`-Bindung früher |
| **R4** | **Füllmengen-Flow wird übersprungen** (Nutzer gehen direkt in den Editor) | Instrumentierung `project_created.path` | Flow prominenter oder Editor-First umstellen |
| **R5** | **Zu wenige Nutzer** (Phase-1-Risiko 4: Werkzeug-Nachfrage ≈ 0) | Traffic nach 8 Wochen | SEO-Positionierung auf Produktbegriffe; Kanalwechsel |
| **R6** | **Print + Cut + Sew baut ein Nadel-Etui** | Monatsmonitoring | Auf Gewerbe/Workflow ausweichen (Phase 1, K5) |
| **R7** | **Textile Fachsprache im UI inkonsistent** → Nutzer versteht Warnungen nicht | Usability-Test A3 | Glossar + Umformulierung (nie Regel-IDs im UI) |

---

## 8. Die eine Folie, die den MVP erklärt

```text
                    WAS NUTZER TUN              WAS DAS SYSTEM TUT
                    ──────────────              ──────────────────
Schritt 1     "Nadel-Etui" wählen          ─▶  Grundform + Panels anlegen
Schritt 2     "Nadelspiele, 20 cm, 8×"     ─▶  Maße + 8 Nadelkanäle ableiten
                        │                        │
                        │                        ├─ Kanalbreite 16 mm (Nadelstärke + Nahtluft)
                        │                        ├─ Panel 240 × 180 mm
                        │                        └─ 8 Kanäle à 16 mm = 128 mm  ✓ passt
                        ▼
Schritt 3     [Anpassen] (optional)        ─▶  Warnungen + 1-Klick-Fixes
Schritt 4     [Drucken]                    ─▶  PDF: Deckblatt · Material · Teile · Anleitung
                        │
                        └─ 4 Interaktionen · ~90 Sekunden · kein Konto · kein CAD
```

**Das ist der ganze MVP.** Alles andere in diesen zwölf Dokumenten dient dazu, diese vier
Schritte zuverlässig, deterministisch und nähbar zu machen.
