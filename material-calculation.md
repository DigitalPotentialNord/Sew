# Materialberechnung

Stand: 26.11.2026 · Module: [`../product/module-library.md`](../product/module-library.md) ·
Geometrie: [`geometry-engine.md`](geometry-engine.md)

---

## 1. Zweck und die zentrale Ehrlichkeitsanforderung

Phase 1 (`customer-research.md` §4) hat einen unterschätzten Moment identifiziert:

> Der wertvollste Moment ist **nicht** das Gestalten, sondern das **Messen der eigenen
> Gegenstände** und die **Einkaufsliste für den Stoffladen**.

Und `keyword-research.md` zeigt: Die **deutsche** Suchintention ist projektgetrieben
(„ohne schnittmuster", „kostenlos pdf") — Menschen kaufen **Material für ein Projekt**, nicht
Software. Die Materialliste ist damit kein Nebenprodukt, sondern **der Moment, in dem das
Produkt nützlich wird.**

**Deshalb die harte Anforderung (PRD FR-60):** Jede Materialzeile ist **entweder exakt oder als
geschätzt gekennzeichnet**. Nie implizit genau. Das ist keine Formalie: Eine Zahl, die wie eine
Messung aussieht und eine Schätzung ist, führt dazu, dass jemand zu wenig Stoff kauft — und das
ist der eine Fehler, der ein Nähprojekt wirklich zerstört.

---

## 2. Materialmodell

### 2.1 Klassifikation

```ts
type MaterialClass =
  | 'fabric'        // Außenstoff, Futter, Einlage (flächig, mit Fadenlauf)
  | 'interfacing'   // Verstärkung, Vlies (flächig, oft ohne NZ)
  | 'elastic'       // Gummiband (längenbasiert, dehnbar)
  | 'zip'           // Reißverschluss (längenbasiert, gerichtet)
  | 'notion'        // Knopf, Druckknopf, Öse, Klett (stückbasiert)
  | 'webbing'       // Gurtband, Stoffband (längenbasiert, nicht dehnbar)
  | 'thread';       // Nähgarn (längenbasiert, geschätzt)

interface MaterialRequirement {
  readonly material: MaterialRef;       // Katalog-Verweis (Art + Spezifikation)
  readonly amount: Amount;              // { value, unit }
  readonly certainty: 'exact' | 'estimated';
  readonly basisKey: string;            // 'mat.basis.fabric' — Wörterbuchschlüssel (K-05)
  readonly basisValues: Readonly<Record<string, number | string>>;  // { teile: 8, breite: 240, hoehe: 180 }
  readonly sources: readonly PieceId[];  // welches Schnittteil/welches Modul
  readonly purchaseHint?: PurchaseHint;  // Packungsgröße (FR-64)
}
```

### 2.2 Materialkatalog (MVP)

```ts
interface MaterialRef {
  readonly kind: string;         // 'fabric' | 'interfacing' | 'elastic' | 'thread' | 'webbing'
  readonly spec: string;         // 'canvas' | 'popeline' | 'H250' | 'gummiband-10mm'
  readonly labelKey: string;     // 'mat.canvas' — Wörterbuchschlüssel (K-05)
  readonly widthMm?: Mm;         // nur flächig: 1400
  readonly thicknessMm?: Mm;     // für Loop-Berechnung (Stufe 2 für Polsterung)
}
```

**Die Materialien, die die 5 MVP-Module tatsächlich brauchen:**

| Material | Klasse | Verwendung | Mengenart |
|---|---|---|---|
| Außenstoff (Canvas/Popeline) | fabric | Panels, Fächer, Kanäle, Lasche | geschätzt (Meter) |
| Futterstoff | fabric | Futterpanel, Fächer (je `lage`) | geschätzt (Meter) |
| Verstärkung H250 | interfacing | Kanäle, Fächer | geschätzt (Meter) |
| Gummiband 10 mm | elastic | M04 | **exakt** (Meter) |
| Nähgarn | thread | alles | geschätzt (Spulen) |

**Was fehlt und bewusst fehlt:** Reißverschluss (M06, Stufe 2), Knöpfe/Druckknöpfe/Klett
(M13/M14/M15, Stufe 2), Ösen/Metall (M11), Volumenvlies (M09).

> **Warum das ehrlich ist:** Das Materialmodell ist **nicht** vollständig — es deckt ab, was die
> MVP-Module brauchen. Die Klassen `zip` und `notion` sind im Typ vorgesehen, aber unbenutzt.
> Ein Materialkatalog mit 12 Einträgen, von denen 7 nie erzeugt werden, wäre irreführend.

### 2.2.1 `certainty` vererbt sich nach unten — und wird nach oben minimiert

*(Architekturprüfung H-07.)* `certainty` stand bisher **nur an der Materialzeile**. Damit galt:
ein Schnittteil mit **geschätzter** Länge (M05, Rollvariante: „Bandlänge ist geschätzt") erzeugte
eine Materialzeile, die mechanisch als „exakt aus dem Teil abgeleitet" erschien — obwohl ihre
Grundlage eine Schätzung war. **Genau dieser Fehler ist der eine, den §1 als projektzerstörend
bezeichnet.**

**Regel:**

```text
certainty(Piece)    = 'exact' | 'estimated'        ← NEU: Feld am Schnittteil
certainty(Material) = min(certainty über alle sources)   ← 'estimated' gewinnt immer
```

| Fall | Ergebnis |
|---|---|
| alle Quellen `exact` | Material `exact` |
| mindestens eine Quelle `estimated` | Material `estimated` + `basis` erbt den Hinweis („Länge geschätzt — nach dem ersten Aufrollen prüfen") |
| keine Quelle (theoretisch) | **Zod-Fehler** — jedes Material braucht ≥ 1 Quelle |

**Test `T-M-13`:** Projekt mit Rollform + M05 ⇒ **null** Zeilen mit `certainty: 'exact'` bei
`webbing`. Mit dem MVP-Schnitt aus der Architekturprüfung (K-04: nur Buchform) ist der Fall
zunächst theoretisch — das Feld muss aber **vor** dem ersten Modul existieren, sonst wird es
nachgerüstet und vergessen.

**Invariante I11** (`pattern-data-model.md` §8).

---

### 2.3 Der Unterschied: exakt vs. geschätzt

| Materialklasse | Kann exakt sein? | Warum |
|---|---|---|
| **elastik** | **ja** | Länge folgt direkt aus Loops × Loop-Länge + Reserve — keine Zuschnittanordnung nötig |
| **zip** | ja (Stufe 2) | Länge = Nahtlänge; aber Einkauf in 5-cm-Stufen → `purchaseHint` |
| **notion** | ja | Stückzahl |
| **webbing** | ja | Länge = 2 × Überlappung + Umfang |
| **fabric / interfacing** | **nein — immer geschätzt** | Der Verbrauch hängt von der **Zuschnittanordnung** auf einem **endlichen Stoffstück** ab. Das ist ein 2D-Packing-Problem; jede „exakte" Meterangabe wäre eine Lüge |
| **thread** | nein | Garnverbrauch hängt von Stichdichte, Maschine, Spannung ab |

**Das ist die wichtigste Aussage dieses Dokuments:**

> **Stoffverbrauch kann prinzipiell nicht exakt sein.** Deshalb wird er als **Fläche exakt**
> und als **Meter geschätzt** angegeben — mit offengelegter Rechnung.

Phase 1 belegt, dass der Hauptwettbewerber es genauso macht: Print + Cut + Sew schreibt
*„The maker's **fabric estimate** at this size: Main fabric **about** 0.2 m of 112 cm fabric"*
(`competitors.md` §4.1). **„Estimate"/„about" ist die korrekte Wortwahl — und sie ist ein
Vertrauenssignal, kein Eingeständnis.**

---

## 3. Berechnung: exakte Mengen

### 3.1 Elastik (M04)

```text
loopLaenge   = gegenstandBreite + 2 × gegenstandDicke − zug          [-Zug, damit es spannt]
bandLaenge   = loops × loopLaenge + 2 × seamAllowance + 2 × 10 mm    [Einzugsreserve je Ende]
anzahlReihen = reihen
gesamtMm     = bandLaenge × anzahlReihen
```

**Beispiel (aus module-library.md §3):** 6 Loops, Gegenstand 8/8 mm, Zug 5 mm, NZ 10
→ `loopLaenge = 19`, `bandLaenge = 6×19 + 20 + 20 = 154 mm`, exakt.

**Einkaufshinweis (FR-64), [H]:**
Gummiband wird üblicherweise in 3-m- oder 5-m-Packungen verkauft → `purchaseHint`:
„1 Packung à 3 m (Bedarf 0,154 m)".

> **Diese Zeile ist unbequem und richtig:** Sie zeigt dem Nutzer, dass er 95 % der Packung
> übrig hat. Ein System, das das verschweigt, ist kein Berater.

### 3.2 Band / Lasche (M05)

```text
bandLaenge = 2 × tiefe + ueberlappung        (Buchform, exakt)
bandLaenge = 2 × π × aufrollRadius + ueberlappung   (Rollform, GESCHÄTZT → warn)
```

**Die Rollform ist bewusst als `estimated` + `warn` markiert** (Modulregel `V-M05-03`), weil der
Aufrollradius von der Füllung abhängt. Das ist der Fall, in dem ein System **seine eigene
Unsicherheit benennen muss** (P6).

### 3.3 Stückgüter (Stufe 2, vorbereitet)

```text
anzahl = Σ(spezifische Zählung je Modul)   // z. B. 2 Druckknöpfe je Verschluss
```

---

## 4. Berechnung: Stoffverbrauch (geschätzt, mit offengelegter Rechnung)

### 4.1 Die vier Einflussgrößen (PRD FR-61)

| Größe | Wirkung | Woher |
|---|---|---|
| **Stoffbreite** (`fabricWidthMm`, Default 1400) | bestimmt, wie viele Teile nebeneinander passen | Projekteinstellung |
| **Fadenlauf** (`grainDirection` je Teil) | verbietet Drehen; erzwingt Ausrichtung | Moduldeklaration |
| **Zuschnittanordnung** | Packing; bestimmt Verschnitt | Algorithmus (§4.3) |
| **Verschnittzuschlag** | Reserve für Fehler, Muster, Rapport | Konstante + Regel |

### 4.2 Zweistufige Ausgabe

```text
Stufe 1  FLÄCHE (exakt):   Σ polygonArea(alle Teile je Material)      → mm²
Stufe 2  METER  (geschätzt): aus Packing in Bahnen der Stoffbreite     → m
```

**Warum zwei Stufen:** Die Fläche ist eine belastbare, prüfbare Zahl. Der Meter ist eine
Modellrechnung. Beide werden angezeigt — aber nur der Meter in der Einkaufsliste, mit
„ca." und Kennzeichnung.

### 4.3 Das Packing-Verfahren (bewusst einfach, deterministisch)

```text
Eingabe:  Teile (bbox, grainDirection), Stoffbreite w, Verschnittzuschlag v
Ausgabe:  benötigte Bahnlänge L (mm, aufgerundet auf 10 mm)

Verfahren: "First-Fit Decreasing an der Bahn" (Shelf-Packing mit Fadenlauf-Zwang)

1. Teile mit grainDirection = 'lengthwise' → DÜRFEN NICHT gedreht werden
   (Höhe = Fadenlaufrichtung)
   Teile mit 'crosswise' → gedreht (Breite = Fadenlaufrichtung)
   Teile mit 'bias' → wie lengthwise, aber mit Zuschlag
2. Sortierung (total, stabil): Höhe ↓, Breite ↓, PieceId ↑
3. Regale bilden: Regalhöhe = max. Teilhöhe des Regals
4. Regal füllen, solange Σ Breiten ≤ w − 2 × RandMm
5. L = Σ Regalhöhen + (Regale − 1) × AbstandMm
6. L_gesamt = ceil((L × (1 + v)) / 10) × 10
```

**Warum nicht optimales Nesting:** PRD FR-W5. Ein 5 %-Unterschied im Stoffverbrauch ist für eine
Einkaufsliste irrelevant; ein optimaler Nesting-Algorithmus ist ein eigenes Forschungsfeld und
würde die Determinismus-Anforderung (D3, D6) deutlich erschweren.

**Der Fadenlauf-Zwang ist die wichtigste Zeile:** Ein Nadelkanal, der quer zugeschnitten wird,
dehnt sich und lässt die Nadeln fallen (`V-G-11`, `error`). Deshalb ist „darf nicht gedreht
werden" kein Optimierungshinweis, sondern eine **Konstruktionsregel** — und das Packing muss sie
respektieren, sonst ist die Materialmenge zu klein.

### 4.4 Verschnittzuschlag — offengelegt

| Stoff | Zuschlag | Begründung |
|---|---|---|
| Unifarben, Webware | **10 %** | Schnittkanten, Fehler, Nahtzugaben-Rundung **[H]** |
| Gemustert (Rapport) | **20 %** | Muster muss fortlaufen **[H]** |
| Karo/Streifen | **25 %** | Ansatz erforderlich **[H]** |

**Das ist im MVP nur eine Konstante (10 %), weil es keine Musterauswahl gibt.** Der Typ ist aber
vorbereitet — und die Zahlen sind als Annahme markiert.

### 4.5 Genauigkeitsangabe — was das Produkt verspricht

> **Zusage: Der geschätzte Stoffverbrauch liegt bei korrekter Stoffbreite und ungemustertem Stoff
> in der Regel innerhalb von ±15 % des tatsächlichen Verbrauchs [H].**
>
> **Diese Zahl ist eine Annahme, kein Messergebnis.** Sie muss in der Testnähung (Abnahme N1)
> gemessen werden. Bis dahin ist sie eine Zielvorgabe, die im UI **nicht** als Garantie erscheint.

**Und die Konsequenz im UI:** Kein „du brauchst genau 0,45 m", sondern
**„ca. 0,45 m bei 140 cm Stoffbreite — 5 % Reserve empfohlen"**.

---

## 5. Materialbedarf aus Schnittteilen: die Ableitung

**Einheitliche Regel (P3):** Material kommt **immer** aus Schnittteilen, nie aus Modulen direkt.

```text
Modul → pieces[]              (mit material-Ref und cutCount)
pieces[] → Σ Fläche je Material
Fläche je Material → Packing → Meter
```

**Warum über Teile und nicht über Module:** Sonst gäbe es zwei Rechenwege (Modul sagt „braucht
0,02 m² Stoff", Teil sagt „ist 200 × 110 mm") und sie würden auseinanderlaufen. Der Fehler
„Materialliste passt nicht zum Schnittmuster" ist der klassische und der vertrauensschädlichste.

**Konsequenz:** Ein Modul, das Material braucht, aber kein Teil erzeugt, kann **kein** Material
deklarieren. Das ist beabsichtigt: Es erzwingt, dass jedes Material sichtbar auf einem
Schnittteil landet.

**Die Ausnahme ist M04 (Elastik):** Elastik ist kein Schnittteil. Deshalb erzeugt M04 ein
**Pseudo-Teil ohne Geometrie** (`PatternPiece` mit `areaMm2 = 0` und `material: elastic`), damit
die Regel „Material kommt aus Teilen" nicht durchbrochen wird. Das ist eine bewusste,
dokumentierte Modellierung — nicht eine Ausnahme im Code.

---

## 6. Die Materialliste als Produkt

### 6.1 Struktur der Ausgabe

```text
MATERIAL                              MENGE              ART
──────────────────────────────────────────────────────────────
Außenstoff, Baumwoll-Canvas 140 cm    ca. 0,45 m         geschätzt
  Grundlage: 3 Teile · 0,038 m² · Fadenlauf längs · 10 % Reserve
Futterstoff, Popeline 140 cm          ca. 0,40 m         geschätzt
  Grundlage: 4 Teile · 0,033 m² · Fadenlauf längs · 10 % Reserve
Verstärkung H250, 90 cm               ca. 0,35 m         geschätzt
Gummiband, 10 mm breit                0,154 m            exakt
  Einkauf: 1 Packung à 3 m
Nähgarn (Polyester, farblich passend) ca. 1 Spule        geschätzt
──────────────────────────────────────────────────────────────
Gesamtfläche Zuschnitt: 0,071 m²  ·  Verschnitt: ca. 18 %
```

### 6.2 UX-Regeln

| Regel | Warum |
|---|---|
| **Jede geschätzte Zeile trägt das Wort „ca."** | FR-60; eine Zahl ohne „ca." wird als Messung gelesen |
| **Jede Zeile nennt ihre Grundlage** (aufklappbar) | FR-47; Nachvollziehbarkeit ist Vertrauen |
| **Exakte Mengen zuerst**, geschätzte danach? **Nein — nach Materialart**, wie im Laden | die Liste ist eine Einkaufsliste, keine Datenbank |
| **Einkaufshinweis nur, wenn er überrascht** (95 % der Packung übrig) | sonst Rauschen |
| **Kopierbar** als Klartext (FR-63) | für Notizen, Chat mit der Freundin, Einkauf |
| **Mobil als Einkaufsmodus** mit Checkboxen | Phase 1: der Moment im Stoffladen |
| **Keine Preise im MVP** | Preise wären eine Quelle für Ärger und Aktualität; Phase 3 mit Affiliate |

### 6.3 Was die Liste bewusst **nicht** enthält

| Nicht enthalten | Warum |
|---|---|
| Preise | ändern sich täglich, keine verlässliche Quelle, Affiliate erst Stufe 3 |
| Bezugsquellen/Links | `C`-Priorität, muss als Werbung gekennzeichnet werden (FR-65) |
| Nähmaschinennadeln, Schere, Kreide | Werkzeug, nicht Material; würde die Liste verwässern |
| „Empfohlene" Alternativen | Beratung, die wir nicht belegen können |
| Exakte Stofffarbe/Menge in Yard | Einheitenumrechnung ja, aber kein zweiter Materialkatalog |

---

## 7. Testbarkeit

| # | Test | Erwartung |
|---|---|---|
| **T-M-01** | M04: 6 Loops, 8/8 mm, Zug 5 → `bandLaenge = 154 mm` exakt | exakt, Integer |
| **T-M-02** | M04: Elastik ist `certainty: 'exact'` | ja |
| **T-M-03** | Stoff ist **immer** `certainty: 'estimated'` | ja, für alle Stoffteile |
| **T-M-04** | Änderung `fabricWidthMm` 1400 → 900 ändert Meter, nicht Fläche | Fläche konstant, Meter ≥ |
| **T-M-05** | Fadenlauf quer bei M03 → `error`, Teil wird nicht gedreht gepackt | `V-G-11` |
| **T-M-06** | Zwei Läufe → identische Mengen | Determinismus |
| **T-M-07** | `Σ Fläche(Teile) = areaMm2 je Material` (Konsistenz) | exakt |
| **T-M-08** | Kein Material ohne `sources[]` | Schema |
| **T-M-09** | Meter ist auf 10 mm aufgerundet | `% 10 === 0` |
| **T-M-10** | Geschätzte Mengen ≤ exakte Mengen anzeigen? **Nein** — Reihenfolge ist Materialart | – |
| **T-M-11** | Property: Für jedes Projekt ist `meter ≥ fläche / breite` (Packen kann nicht besser als Fläche sein) | fast-check, 5.000 Fälle |
| **T-M-12** | Property: `+1 Modul` erhöht Meter **nie** | fast-check |

**T-M-11 ist die wichtigste Invariante:** Der gepackte Meter kann **nie kleiner** sein als Fläche
geteilt durch Breite — sonst ist der Packing-Algorithmus kaputt (Überlappung). Das ist ein
exakter, billiger Beweis gegen den schlimmsten Fehlerklasse (zu wenig Stoff).

---

## 8. Grenzen und offene Punkte

| # | Grenze | Konsequenz | Entscheidung |
|---|---|---|---|
| **L-1** | Meter ist geschätzt (±15 % [H]) | Einkauf mit Reserve | dokumentiert, im UI als „ca." |
| **L-2** | Kein Musterrapport im MVP | Zuschlag pauschal 10 % | Feld vorbereitet, Stufe 2 |
| **L-3** | Keine Stoffdicke im Modell | Polsterung (M09) nicht möglich | Stufe 2, Schema-Erweiterung |
| **L-4** | Keine Maschinen-/Nadelparameter | Lagenwarnung fehlt | Stufe 2 |
| **L-5** | Garnverbrauch nur grob (× 3 der Nahtlänge) | Spulenangabe ist grob | bewusst, `estimated` |
| **L-6** | Keine Preise/Verfügbarkeit | Liste ist keine Bestellung | Stufe 3 (Affiliate) |
| **L-7** | Nesting nicht optimal | bis ~15 % mehr Stoff möglich | akzeptiert (FR-W5) |
| **L-8** | Kein Zuschnittplan mit Anordnung auf dem Stoff (nur Meter) | Nutzer legt selbst aus | **Stufe 2**: Zuschnittplan als Bild wäre wertvoll |

> **L-8 ist die wichtigste offene Funktionslücke.** Ein visueller Zuschnittplan („so legst du die
> Teile auf den Stoff") ist in der Nähwelt ein eigenes, geschätztes Feature — und Print + Cut +
> Sew bietet es **nicht** (nur Stücklisten-Maße). Es ist eine echte Differenzierung und braucht
> „nur" das Packing-Ergebnis, das ohnehin berechnet wird, plus eine SVG-Darstellung.
> **Empfehlung: erste Erweiterung nach dem MVP, günstiger als M06.**

---

## 9. Der eine Satz

> **Die Materialliste ist die Stelle, an der das Produkt beweist, ob es rechnet — oder ob es
> schätzt und es zugibt.** Beides ist in Ordnung. Nur die Verwechslung ist ein Vertrauensbruch.
