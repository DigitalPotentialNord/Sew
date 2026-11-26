# Produktvision

Stand: 26.11.2026 · Grundlage: [`../research/`](../research/) · Überblick: [`../PHASE-2.md`](../PHASE-2.md)

---

## 1. Die Vision in einem Satz

> **Ein Design Studio, in dem ein Nähprojekt nicht gezeichnet, sondern gerechnet wird: Der
> Nutzer sagt, was hinein soll — das Studio liefert Schnittmuster, Materialliste, Zuschnittplan
> und Nähanleitung, die zusammenpassen.**

## 2. Die Vision in einem Absatz

Nähen ist heute zweigeteilt: Auf der einen Seite stehen **starre Schnittmuster** (PDF, Etsy,
Blog) — sie passen nie genau, weil sie für Standardgegenstände gemacht sind. Auf der anderen
Seite stehen **mächtige CAD-Systeme** (Seamly2D, Valentina, OpenSloper, Sewist) — sie können
alles, aber sie verlangen Punkte, Formeln, Variablen und Geduld, und ihre Rezeption in der
Community ist eindeutig: *„steep learning curve"*, *„no help file or manual, just a wiki and a
forum"*, *„I spent all day yesterday working out the functions and getting very frustrated"*.

Zwischen beiden liegt ein unbesetztes Feld: **ein Werkzeug, das die Konstruktionsarbeit
übernimmt, ohne die Gestaltungsfreiheit zu nehmen.** Kein CAD. Kein Pattern-Shop. Sondern ein
**Studio**, in dem ein Organizer entsteht, indem man seine Gegenstände hineinlegt.

Das ist der Kern: **Der Nutzer konstruiert nicht Geometrie — er beschreibt Bedarf.** Er sagt
„acht Nadelspiele, vier Rundstricknadeln, zwölf Markierer". Das Studio übersetzt das in
Fachbreiten, Elastiklängen, Reißverschlussmaße, Stoffverbrauch und eine Anleitung, die genau
diese Konfiguration nennt.

## 3. Positionierung (aus Phase 1, unverändert übernommen)

> ### „Dein Etui. Gerechnet, nicht gesucht."
>
> Für Menschen, die etwas mitnehmen, das es nicht in der richtigen Größe gibt.
> Du sagst uns, was rein soll. Wir rechnen das Etui: Fächer, Elastiklängen, Reißverschluss,
> Stoffmenge — und du bekommst ein Schnittmuster, das beim ersten Mal passt, mit einer
> Anleitung, die zu *deiner* Konfiguration passt.
> **Kein Konto. Kein CAD. Kein Suchen. Erstes Ergebnis kostenlos.**

**Verbindlich:** Diese Formulierung ist eine **Leitplanke**, kein Marketingtext. Jede
Designentscheidung muss ihr standhalten. Ein Feature, das „CAD" nötig macht, um es zu bedienen,
ist falsch — auch wenn es technisch beeindruckend ist.

### 3.1 Copy-Regel: was der MVP sagen darf und was nicht *(Architekturprüfung H-09)*

Der MVP hat fünf Modul-Einträge, davon **einen** fachlich neuen Typ (M03 Nadelkanal), und eine
einzige Grundform. Das ist ein **Nadel-Etui mit Optionen** — ein gutes Produkt, aber eine andere
Behauptung als „baue deinen Organizer". Wenn die Oberfläche die zweite Behauptung macht und die
erste liefert, entsteht Enttäuschung genau am Engpass aus Phase 1 (Abbruchkriterium K3: > 15 %
„passt nicht").

| ❌ Nicht im MVP | ✅ Stattdessen |
|---|---|
| „Baue deinen Organizer" | „**Dein Nadel-Etui. Gerechnet, nicht gesucht.**" |
| „16 Modultypen" | „Nadelkanäle, Fächer, Elastik, Verschluss" |
| „Modulbibliothek" | „**fertig konfiguriert in vier Schritten**" |
| „beliebig erweiterbar" | „passt garantiert — oder wir zeigen dir, warum nicht" |

**Und die Startseite zeigt die Warnung, nicht die Bibliothek:**

> „8 Kanäle à 16 mm brauchen 128 mm — frei sind 96 mm. **[Etui verbreitern]**"

Das ist der einzige Moment im Produkt, den der Hauptwettbewerber nicht hat (Phase 1:
`competitors.md` §4.1 — Print + Cut + Sew rechnet, aber schlägt nicht vor). Er gehört in den
ersten Bildschirm, nicht ins Kleingedruckte.

## 4. Zielgruppe (aus Phase 1, Rangfolge verbindlich)

| Rang | Zielgruppe | Persona | Was sie vom Studio will |
|---|---|---|---|
| **1** | Strick- & Häkelfans | **Maike, 34** | „Meine Nadelmischung passt in kein Etui" → passendes Etui in 3 Minuten |
| **2** | Handmade-Kleinunternehmer:innen | **Sabine, 47** | „12 Produkte × 6 Größen" → Größenfamilien, Konsistenz, Lizenz |
| **3** | Fortgeschrittene Näher:innen | **Jonas, 29** | „Ich will selbst konstruieren, ohne Formeln" → direkte Manipulation, SVG |
| **4** | Nähanfänger:innen | **Betül, 31** | „Ich weiß nicht, ob es klappt" → Führung, Warnungen, Sicherheit |
| **5** | Schmuckliebhaber:innen | **Renate, 58** | „Ketten verknoten, Ohrringe verloren" → Halterungstypen |

**Nicht adressiert (bewusst):** Make-up-Nutzer:innen (Phase 1: null Näh-Intention in Suchdaten),
Industrie/Profi-Pattern-Maker (dort ist CLO/Optitex der Standard).

## 5. Die drei Kernversprechen

| # | Versprechen | Wie es technisch eingelöst wird | Wie es geprüft wird |
|---|---|---|---|
| **V1** | **Es passt.** | Module werden aus **Gegenstandsmaßen** dimensioniert, nicht aus Standardwerten. Jede Fachbreite ist auf die gemessene Nadel abgeleitet | Golden-Tests: „Nadel 20 cm → Fach ≥ 20 cm + 2 × Zugabe" |
| **V2** | **Es ist nähbar.** | Jede Konfiguration läuft durch ein **Regelwerk** (`construction-rules.md`), bevor sie exportierbar ist. Unmögliche Zustände sind nicht darstellbar, nicht nur „gewarnt" | Property-Tests: keine Konfiguration kann einen verbotenen Zustand erzeugen |
| **V3** | **Es ist in 3 Minuten da.** | Kein Konto, kein Login, kein Wizard-Zwang: Projekt → Grundform → Maße → fertig. Vollständiger Pfad in ≤ 8 Interaktionen | Playwright-Test misst die Interaktionszahl und bricht ab, wenn sie überschritten wird |

## 6. Produktprinzipien (verbindlich für alle Design- und Technikentscheidungen)

### P1 — Bedarf statt Geometrie
Der primäre Input ist **was hinein soll**, nicht **welche Maße das Resultat hat**.
Maßgetriebene Eingabe existiert (für Jonas), ist aber **nie der einzige Weg**.

### P2 — Unmöglich statt gewarnt, wo möglich
Ein Zustand, der nicht nähbar ist, sollte **strukturell nicht erzeugbar** sein
(z. B. eine Reißverschlusstasche, die tiefer ist als das Panel — sie wird in der Tiefe
begrenzt). Wo das nicht geht, greift eine **Warnung mit konkretem Vorschlag**. Nie eine
Fehlermeldung ohne Lösung.

### P3 — Alles ist ableitbar, nichts ist doppelt gespeichert
Jede Zahl im System hat **genau eine Quelle**. Fachhöhen ergeben sich aus Nadellängen;
Elastiklängen aus Fachbreite + Dicke; Reißverschlusslänge aus der Nahtlänge. Ein gespeicherter
Wert, der auch berechnet werden könnte, ist ein Bug (siehe `pattern-data-model.md` §4).

### P4 — Determinismus ist ein Feature, nicht eine Testeigenschaft
Gleiche Eingabe → **bit-identische** Ausgabe (Geometrie, Materialmengen, PDF-Maße). Kein
`Math.random`, kein `Date.now` in der Konstruktion, keine Floating-Point-Abhängigkeit von der
Iterationsreihenfolge. Ohne das ist weder ein Golden-Test noch ein „das sah letzte Woche
anders aus"-Support-Fall beherrschbar.

### P5 — Kein Konto, kein Server, kein Risiko
Alles rechnet im Browser. Der Zustand liegt lokal; Teilen erfolgt über einen kodierten Link.
Das ist **Datenschutz durch Architektur** (Phase 1, `business-model.md` §7) und eliminiert
gleichzeitig Betriebskosten, Ausfälle und Compliance-Aufwand.

### P6 — Ehrlich statt vollständig
Lieber 4 Module, die **wirklich nähbar** sind, als 16, die „theoretisch gehen". Jedes Modul in
der Bibliothek hat eine dokumentierte, getestete Nähoperation. Module ohne das bleiben
`status: planned` und sind im UI sichtbar als „kommt noch" markiert — **nicht klickbar**.

### P7 — Deutsch ist die Erstsprache der Konstruktion
Fachbegriffe (Nahtzugabe, Fadenlauf, Beleg, Volumenvlies) sind nicht übersetzte Fremdwörter,
sondern die Wörter, die in deutschen Nähzimmern benutzt werden. Englisch ist die zweite
Sprache, nicht die Quelle.

## 7. Nicht-Ziele (was dieses Produkt ausdrücklich nicht ist)

| Nicht-Ziel | Warum ausdrücklich | Quelle |
|---|---|---|
| **Ein CAD-System** | Phase 1: Das ist Positionierung A — kleiner Markt, hoher Aufwand, direkte Konkurrenz zu OpenSloper/Seamly | `research/opportunity-analysis.md` §2 |
| **Ein Marktplatz für Schnittmuster** | Makerist ist damit trotz 70.000 Patterns und 1.200 Designern gescheitert | `research/competitors.md` §4.9 |
| **Ein KI-Prompt-Generator** | Ourlette/IntelliSeam besetzen das bereits; die Erwartungsfalle ist teuer | `research/competitors.md` §4.7 |
| **Eine Kleidungskonstruktion** | Anderer Markt, andere Regeln, andere Konkurrenz (Seamly, Valentina, Tailornova) | Phase 1, Kap. 1 |
| **Ein Projektverwaltungs-Tool** | Stash Hub, Sewist Studio, Threadloop existieren (3,49–4,99 $/Monat) | `research/competitors.md` §4.10 |
| **Ein Community-Netzwerk** | Kalter Start, Moderationslast; shesmile zeigt, dass Content reicht | `research/competitors.md` §4.8 |
| **Eine native App** | Mobile Konstruktion ist unrealistisch; Touch-UX ist Lesen + Feinjustieren, nicht Bauen | `research/customer-research.md` §4 |
| **Ein Hobby-Abo** | Belegte Abo-Aversion; MPattern/Etsy/Wild Ginger sind Einmalkauf | `research/business-model.md` §1 |

## 8. Was das Produkt besonders macht (und was nicht)

**Besonders:**

1. **Der Input ist der Gegenstand, nicht das Maß.** Kein Wettbewerber fragt „was nimmst du mit".
2. **Das Regelwerk ist sichtbar und begründet.** Jede Warnung erklärt *warum* — nicht „Fehler 42",
   sondern „Dieses Fach ist 8 mm zu schmal für deine 4,5er-Nadelspitze; wir haben es auf 5,2 cm
   gesetzt".
3. **Die Anleitung kennt die Konfiguration.** „Nähe die Elastik bei 4,2 cm, 8,9 cm, 13,6 cm an" —
   nicht „nähe gleichmäßige Schlaufen".
4. **Deutsch und ohne Konto.** Banal, aber im Feld ein Unterschied: Die drei stärksten
   Wettbewerber sind englisch, zwei werben explizit mit „no account" — das ist die Messlatte.
5. **SVG-Export.** Print + Cut + Sew hat keines (Phase 1, `competitors.md` §3.2).

**Nicht besonders (und das wird nicht behauptet):**

- Parametrik (können OpenSloper, Seamly, Sewist, Katagami, Nastix — gratis).
- Nahtzugaben (Tisch-Stakes).
- 3D-Vorschau (Atomm, Tailornova, CLO — teils gratis).
- Materialberechnung (Print + Cut + Sew, OpenSloper, Sewist).
- Nähanleitung (Print + Cut + Sew generiert sie konfigurationsabhängig — **sehr gut**).

## 9. Erfolgsmetriken

### Nordstern

> **Anteil der erzeugten Konfigurationen, die als „genäht und passend" zurückgemeldet werden.**

Das ist die einzige Zahl, die V1, V2 und V3 gleichzeitig misst. Sie ist schwer zu erheben — deshalb
ein leichter Rückmeldeweg: Nach dem Export ein Ein-Klick-Dialog („Hat es gepasst?"), plus
freiwilliger Foto-Upload-Link. Kein Konto nötig.

### Führende Metriken

| Metrik | Zielwert (MVP + 3 Monate) | Warum |
|---|---|---|
| **Time-to-first-pattern** (Seite geladen → PDF/Print-Dialog) | **< 3 Minuten Median** | Versprechen V3; Phase 1: Geschwindigkeit ist der einzige verteidigbare Vorteil |
| **Interaktionen bis zum ersten Ergebnis** | **≤ 8** | harte Obergrenze, im Playwright-Test erzwungen |
| **Anteil Konfigurationen mit ≥ 1 Warnung, die behoben wurde** | > 60 % | zeigt, dass das Regelwerk *hilft* und nicht nervt |
| **Anteil „passt nicht"-Rückmeldungen** | **< 15 %** | Abbruchkriterium K3 aus Phase 1 |
| **Anteil Zweitnutzung** (zweites Etui) | > 10 % | Abbruchkriterium K4 aus Phase 1 |
| **Conversion Free → 14 €** | 1,0–2,5 % | Phase 1, Szenario 2 |

### Ausdrücklich **nicht** als Erfolgsmetrik

- Anzahl Module (P6: lieber wenige, die funktionieren)
- Anzahl Features gegen Wettbewerber
- Verweildauer (ein 3-Minuten-Tool *soll* kurz sein)
- Registrierungen (es gibt keine)

## 10. Der ehrliche Risiko-Satz

> Dieses Produkt gewinnt nicht, weil es mehr kann. Es gewinnt, wenn ein Mensch in drei Minuten
> ein Schnittmuster in der Hand hat, das **besser passt als alles, was er kaufen kann** — und
> wenn das Ergebnis beim ersten Nähen stimmt. **Scheitert es dort, scheitert es überall.**
> Deshalb ist die Konstruktionslogik (`construction-rules.md`) und nicht der Editor das
> Herzstück dieses Produkts.
