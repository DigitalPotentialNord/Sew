# Editor-Usability-Audit

Stand: 26.11.2026 · Spek: `docs/ux/editor-redesign.md` ·
Implementierung: Branch `arena/e0c5b61b-sew` ·
Tests: `app/tests/editor-redesign.spec.ts` (12), `app/tests/acceptance.spec.ts` (30)

---

## 1. Bewertungsraster

10 Usability-Kriterien, je bewertet als **▲ gelöst** / **~ teilweise** / **▽ offen**.

| # | Kriterium | Bewertung | Hinweis |
| --- | --- | --- | --- |
| 1 | Visual clutter / kognitive Last | ▲ | Einfacher Modus: kein Raster, keine Maßketten, keine NZ-Innenlinie, keine dauerhaften Griffe. |
| 2 | Affordanz / visuelle Auffindbarkeit | ▲ | Kontext-Aktionsleiste über Auswahl, Karten-Bibliothek, Modus-Umschalter, Starter. |
| 3 | Konsistenz (Drag vs Klick vs Toolbar) | ▲ | Klick primär, Drag zusätzlich; gleiche Aktion (Duplikat) in Kontextleiste, Panel, `⌘D`. |
| 4 | Effizienz / Wege zum Ziel | ▲ | Fach hinzufügen = 2 Klicks (Bibliothek → Karte). |
| 5 | Fehlerverhinderung | ▲ | Regelwerk meldet pro Seite (V-G-01), Grenzen (V-G-13/14), Überlauf (V-M\*-01); Blockade + automatischer Fix. |
| 6 | Umkehrbarkeit | ▲ | Undo/Redo + Duplikat-Löschen-Undo-Kette im Walkthrough getestet. |
| 7 | Bezeichnerklarheit | ▲ | „Mäppchen", „Innenfläche", „Fach", „Designen" — nicht „Kanal", „Zeile", „Editor". |
| 8 | Responsivität / Touch | ~ | Konzept umgesetzt (Drawer/Sheet/Touch-Ziele ≥ 28 px); echte Touch-Geräte-Tests stehen aus. |
| 9 | Visuelle Ehrlichkeit | ▲ | Geometrie aus `construct` + `draw()`; kein Fake-x/y (Architekturentscheidung §3/§7). |
| 10 | Lernkurve / Erstsbesuch | ▲ | Geführter Starter (Typ → Startart → Beginnen); nie leere technische Fläche. |

**Gesamt: 9 ▲, 1 ~ (Touch-Echtgerät-Tests ausstehend).**

---

## 2. Walkthrough — die zehn Schritte aus Nutzerperspektive

Aufgeschrieben als Szenario „Ringhalter zum Schmuck-Organizer hinzufügen".

1. **App öffnen.** Starter begrüßt: *„Was möchtest du gestalten?"*
2. **Schmuck-Organizer** wählen → *„Mit einer Vorlage"* → **Beginnen**.
3. Die Designfläche zeigt das **aufgeschlagene textile Mäppchen** mit den fünf
   Vorlagen-Modulen.
4. Bibliothek: Kategorie **Schmuck** → **Ringhalter-Karte** anklicken.
5. Der Ringhalter erscheint auf der linken Innenfläche, ist **ausgewählt**; die
   Kontext-Aktionsleiste schwebt darüber.
6. Ringhalter **verschieben** — magnetische Hilfen (Falzmitte) leiten.
7. In den Eigenschaften **Breite** oder **Ringe** ändern; das Muster folgt sofort.
8. **Duplizieren** (Kontextleiste) → zweiter Ringhalter; **Rückgängig** (`⌘Z`).
9. **Materialien** öffnen → Einkaufsliste liegt vor.
10. **Schnittmuster** öffnen → die technische Ansicht (Linien/Maße) ist sekundär,
    eine Navigationsebene entfernt.

---

## 3. Heuristische Bewertung (Nielsen)

1. **Sichtbarkeit des Systemstatus** ▲ — Statusleiste (Fehler/Warnungen), Toast,
   Auswahl-Affordanz, Modus-Umschalter.
2. **Übereinstimmung mit der Realwelt** ▲ — aufgeschlagenes textiles Mäppchen,
   nicht CAD-Zeichenblatt.
3. **Nutzerkontrolle und Freiheit** ▲ — Undo/Redo, Starter überspringbar, Modus
   frei wählbar.
4. **Konsistenz und Standards** ▲ — Tabs, Karten, Drawer, deutsche Bezeichnungen.
5. **Fehlerverhinderung** ▲ — Grenzprüfungen im Regelwerk, Blockade, automatischer Fix.
6. **Weniger tippen, mehr erkennen** ▲ — Klick-zum-Hinzufügen, Vorschauen aus
   echter Geometrie, Auswahlwerte sichtbar.
7. **Flexibilität und Effizienz** ▲ — Drag optional, Klick primär; Shortcuts als
   zusätzliche Wege.
8. **Ästhetik und Minimalismus** ▲ — Einfacher Modus reduziert sichtbar; warmes
   Atelier-Palette statt neutralgrau.
9. **Fehler erkennen und beheben** ▲ — Findings mit Werten und `seite`; Fix per
   Knopf; Blockade erklärt, was zu tun ist.
10. **Hilfe und Dokumentation** ▲ — Anleitungs-Tab; kontextuelle Feldhilfen
    (`.hint`); die vorliegenden UX-Docs.

---

## 4. Tests und Nachvollziehbarkeit

- **Unit-Tests (228, Vitest):** Konstruktion, Geometrie, Migration, i18n, Findings
  — Maßhaltigkeit gesichert. Alle grün.
- **Acceptance-Tests (30, Playwright):** Kernabläufe (Vorlage, Hinzufügen,
  Positionieren, Duplikat, Undo, Export-Blockade, Tabs, Responsiv, Leere).
  **Aktualisiert** für die neue UI (Starter-Dismiss, `nav.*`-Tablabels, Karten-
  Bibliothek, `.atelier-edge`, Modus-Umschalter). Ausgeführt in einer Umgebung
  mit Playwright-Browsern — **in dieser Sandbox nicht lauffähig** (`playwright
  install` wird blockiert, siehe Build-Notiz §5).
- **Editor-Redesign-Tests (12, Playwright):** Starter, Walkthrough-Aufgaben
  (Hinzufügen, Verschieben, Seite wechseln, Duplizieren, Undo, Moduswechsel).
  Gleiches Vorbehalt wie oben.

> **Hinweis zu Nutzer-Tests:** Es wurden **keine echten Nutzer-Tests** mit
> Personen durchgeführt. Die Bewertung beruht auf heuristischer Analyse und
> automatisierten Tests. Das Kriterium „mit echten Nutzern validiert" ist **nicht**
> erfüllt und wird auch nicht so dargestellt.

---

## 5. Offene Punkte / weitere Schritte

- **Touch-Echtgerät-Tests:** Touch-Ziel-Größen sind konzeptionell umgesetzt und
  per Media-Query sichergestellt; echte Gerätetests (iPad/Handy) stehen aus.
- **Playwright-Lauf:** Browser-Download in dieser Sandbox blockiert; Tests müssen
  in einer Umgebung mit Browsern ausgeführt werden, um „Playwright 30 (bzw. 42)
  grün" zu erfüllen.
- **Zugänglichkeit (a11y):** Rollen/Labels vorhanden (tabs, spinbuttons,
  buttons); ein vollständiger Screenreader-Audit steht aus.
