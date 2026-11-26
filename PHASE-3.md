# Phase 3 — Implementierung

Stand: 26. November 2026 · Praxiswerte v1.2.0

Anwendung: `/home/user/app` · Spezifikation: `/home/user/docs`

---

## 1. Was fertig ist

Die App ist gebaut, läuft und ist bedienbar. Fünf Ansichten, ein Konstruktionskern
ohne UI-Abhängigkeiten, deutsche Oberfläche, Export.

| Bereich | Stand | Nachweis |
| --- | --- | --- |
| Konstruktionskern (`src/core/`) | fertig | 189 Unit-Tests |
| Regelwerk V-G/V-M | 15 Regeln, V-G-11 fehlt | Tests + Vorlagen mit 0 Fehlern |
| Praxiswerte | v1.2.0, zentral in `practice.ts` | `LIMITS`, `PRACTICE` |
| Drei Vorlagen | Schmuck / Make-up / Stricknadel, je 0 Fehler / 0 Hinweise | `npx vite-node`-Sonde je Vorlage |
| Editor | Canvas, Zoom 0,35–14, Auto-Fit, Raster, Snap, Guides | Screenshots `docs-shots/` |
| Schnittmuster-Ansicht | Kalibrierquadrat, Kachelübersicht, Maßtabelle | `6-schnitt.png` |
| Material | Meterware vs. Stück, Grundlage je Zeile | `5-material.png` |
| Anleitung | topologisch sortierte Nähoperationen | `7-anleitung.png` |
| Projekt | Speichern, Laden, JSON-Import/-Export | Playwright-Test 6 |
| PDF | Druckfenster **und** echter PDF-Download | `src/core/pdf.ts`, 13 Tests |
| Tastatur | Auswahl, Duplizieren, Löschen, Undo/Redo, Ansichtswechsel | Playwright-Test 8 |
| Responsive | 1440 / 1024 / 390 ohne Überlauf | Screenshots 12, 13 |

**Prüfstand (alle grün, zuletzt 26.11.2026):**

```
npx tsc --noEmit        → 0 Fehler
npx eslint src          → 0 Fehler
npx vitest run          → 189 Tests, 5 Dateien
npx playwright test     → 27 Tests
npm run build           → OK, Editor-Chunk 388 kB (gzip 111 kB), PDF-Chunk separat
```

---

## 2. Was in dieser Runde dazukam

### 2.1 Drehung ist echte Geometrie, keine Kosmetik

Ein gedrehtes Modul belegt ein anderes Rechteck. Das war vorher nur optisch.

- `PlacedModule.rect` ist die **belegte** Fläche (bei 90°/270° mit getauschten Maßen).
- Gezeichnet wird das ungetauschte Modul in einem zentrierten Kasten
  (`drawW/drawH`, `boxX/boxY`) — dadurch bleibt das Innenleben lesbar und die
  Fläche ehrlich.
- Die Prüfung läuft über `checkContext(p, drawWide, freeAlongRow, rowRoom)`:
  bei 90°/270° tauschen Kanalbreite und Zeilenhöhe die Achsen.
- Schnittteile drehen mit (`ring-band 126×66 → 66×126`), inklusive Nahtmaß.
- Neue Regel **V-G-14**: ein Modul, das höher ist als seine Zeile, wird gemeldet
  (Überlappung mit der Folgezeile, Fix `growHeight`) statt still überzustehen.

Vorher gab es vier falsche Varianten mit Scheinmeldungen (V-M06-02 bei 90°).
Der jetzige Stand erzeugt bei keiner der drei Vorlagen eine Meldung durch Drehung.

### 2.2 Mengen haben eine Einheit, die man kaufen kann

Vorher stand „**0,32 m²**“ für Außenstoff — eine Fläche mit Meterangabe, und
„**0,000 m²**“ für Einlage, weil 106 × 46 mm auf drei Stellen gerundet null wird.

Jetzt gibt es **eine** Stelle für Mengen: `formatAmount()` im Kern plus das Feld
`display` je Materialzeile. Tabelle, Druck und PDF lesen dasselbe Feld.

| Material | vorher | jetzt |
| --- | --- | --- |
| Außenstoff | 0,32 m² | 0,32 m Meterware |
| Einlage H250 | 0,00 m² | 106 × 46 mm · 0,0049 m² |
| Reißverschluss | 170 mm | 170 mm |
| Metallhaken | 5 | 5 Stk |
| Nähgarn | 23,62 m | 23,62 m |

Zwei Fehler dabei gefunden und behoben: Flächenmaterial wurde in der
Zusatzmaterial-Sammelstelle auf ganze Zahlen gerundet (aus 0,0049 wurde 0),
und Zeilen mit Menge 0 wurden als Kaufempfehlung angezeigt.

### 2.3 PDF als Datei, nicht nur als Druckdialog

`src/core/pdf.ts` zeichnet A4-Seiten vektoriell mit pdf-lib (1 mm = 72/25,4 pt):

1. Deckblatt mit 50-mm-Kontrollmaßstab und Prüfergebnis
2. Material (umbrochen, über so viele Seiten wie nötig)
3. Zuschnitt mit Seitenzuordnung je Teil
4. eine Seite je Kachel
5. Anleitung, umbrochen und mit Fortsetzungsseiten

Kacheln werden **nicht** per Clip-Operator beschnitten, sondern jede Linie wird
vorher zugeschnitten (`clipSegment`, Liang–Barsky für achsenparallele Segmente).
Clip-Pfade verhalten sich je nach Betrachter unterschiedlich; zugeschnittene
Linien sind nachrechenbar — und mit Unit-Tests abgedeckt.

Klebekanten sind Teil des Drucks: linke Spalte und untere Reihe zeigen den
Nachbarstreifen noch einmal, mit feiner Nahtlinie und Beschriftung.

Im Editor sitzt der Download als zweiter Knopf neben „PDF / Druck“; das
PDF-Paket liegt in einem eigenen Chunk (427 kB, gzip 178 kB) und wird erst beim
Klick geladen. Der Editor selbst bleibt bei 388 kB / 111 kB gzip.

### 2.4 Kleinere Ehrlichkeiten

- `applyFix` setzt **kein** `updatedAt` mehr auf den 1.1.1970. Der Kern liest
  keine Uhr; der Store stempelt. (Test in `project.test.ts`.)
- Modulbeschriftungen stehen aufrecht außerhalb der Drehgruppe und werden nur
  gezeichnet, wenn sie in die Modulbreite passen — sonst bleibt nur das
  `aria-label`. Schriftgröße der Einzelteile 7 → 4,5 → 3,6, damit nichts kollidiert.

---

## 3. Abweichungen Spezifikation → Implementierung

Die IDs wurden **nicht** umbenannt (Bestandsdaten, Tests, Hash hängen daran).
Stattdessen hier die Übersetzungstabelle.

| Bereich | Spezifikation | Implementierung |
| --- | --- | --- |
| M03 | Nadelkanal | Reißverschlussfach |
| M05 | Verschlusslasche | (nicht belegt) |
| M06 | RV-Tasche | Nadelkanal |
| M07 | Pinselhalter | Lasche |
| M08 | Werkzeughalter | Knopf |
| M13 | Knopf | (nicht belegt) |
| M14 | Druckknopf | (nicht belegt) |
| M15 | Klett | (nicht belegt) |
| M16 | Aufhänger | (nicht belegt) |

Konsequenz: Wer die Spezifikation liest und M06 sucht, findet den Nadelkanal.
Die Regel-IDs (V-M01…M16) folgen weiter der Spezifikation, nicht der Belegung.

---

## 4. Bekannte Lücken (nicht beschönigt)

| Lücke | Wirkung | Warum jetzt nicht |
| --- | --- | --- |
| Ein gedrehtes Modul, das die Zeile überragt, wird gemeldet, aber nicht automatisch umgelegt | Nutzer muss selbst umbauen | Auto-Relayout braucht eine Prioritätsregel, die die Spezifikation nicht hergibt |
| V-G-11 fehlt | eine Regel ohne Prüfung | Kriterium in der Spezifikation nicht eindeutig |
| M07/M08 Randplatzierung angenähert | Maße können um die Nahtzugabe abweichen | Randfall ohne Vorlage, die ihn zeigt |
| `PatternView` nutzt `as Mm`-Casts | Typ nicht durchgängig gebrandet | Aufräumarbeit ohne Funktionsgewinn |
| PDF-Anleitung: eine Seite kann bei sehr vielen Schritten knapp werden | Fortsetzungsseite greift, prüft aber nicht jede Zeile | Kalibrierquadrat und Kacheln haben Vorrang |
| Kein Undo über Ansichtswechsel hinweg | Undo gilt für Projektschritte | so entschieden (60 Schritte) |

---

## 5. Dateien

```
app/src/core/     geometry · construction · modules · practice · fixes · export · pdf · project
app/src/state/    store.ts (Zustand, Undo 60, Hash-Guard)
app/src/ui/       App · Canvas · Properties · Warnings · Library · 5 Ansichten · styles.css
app/src/i18n/     de.ts (alle sichtbaren Strings)
app/src/_tests/   5 Dateien, 189 Tests
app/tests/        acceptance.spec.ts, 27 Tests
app/docs-shots/   13 Screenshots des laufenden Editors
```

Start: `cd app && npm install && npm run dev` → `http://localhost:5173`
