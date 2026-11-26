# Konstruktions- und Fertigungsregeln

Stand: 26.11.2026 · Module: [`../product/module-library.md`](../product/module-library.md) ·
Geometrie: [`geometry-engine.md`](geometry-engine.md)

---

## 1. Warum dieses Dokument das Herzstück ist

Phase 1 (`opportunity-analysis.md` §5, Problem 4) hat festgestellt: **Nutzer:innen misstrauen
generierten Schnittmustern.** Belege: Kalibrierfelder bei Katagami, „sew a test in scrap fabric"
bei Print + Cut + Sew, Nutzerkritik an Sewist („instructions are quite bare bones").
Und Risiko 5 derselben Analyse: *„Unmögliche Schnittmuster zerstören Vertrauen sofort."*

**Deshalb ist das Regelwerk nicht ein Anhängsel der Konstruktion, sondern ihr Zweck.** Ein
Schnittmuster, das nicht nähbar ist, ist schlechter als kein Schnittmuster.

Drei Ebenen von Regeln, streng getrennt:

```text
1. DARSTELLBARKEIT   strukturell unmöglich   → im Typ/Schema (nicht verletzbar)
2. NÄHBARKEIT        fachlich falsch         → Regel mit severity 'error'  (blockiert Export)
3. QUALITÄT          suboptimal              → Regel mit severity 'warn'   (erlaubt Export)
```

**Das Prinzip (PRD P2):** Was strukturell unmöglich sein kann, wird strukturell unmöglich
gemacht. Was fachlich falsch ist, wird blockiert — **aber nie ohne Vorschlag**. Was nur
suboptimal ist, wird gesagt, nicht verboten.

---

## 2. Ebene 1 — Darstellbarkeit (nicht verletzbar)

Diese Zustände existieren im Datenmodell **nicht**:

| Unmöglicher Zustand | Warum strukturell ausgeschlossen |
|---|---|
| Modul ohne Bindung | `ModuleInstance.binding` ist Pflichtfeld (Zod) |
| Modul in zwei Kanälen | Referenz genau einmal, Invariante I2 |
| Modul an einer nicht existierenden Fläche | `panelId` gegen `panels[]` geprüft (Zod `superRefine`) |
| Negatives Maß | `Mm` branded + Schema-Grenzen |
| Fließkomma-Maß | `z.number().int()` |
| Modulüberlappung im Kanal | Sequenzmodell — Überlappung ist nicht repräsentierbar |
| Zwei Panels übereinander | Panel-Rollen `front`/`back` sind disjunkt |
| Nahtzugabe < 0 | Schema |

**Das ist die wichtigste Ebene**, weil jede dort verhinderte Fehlerklasse **keine** UI-Behandlung,
**keine** Fehlermeldung und **keinen** Test braucht — sie kann nicht auftreten.

---

## 3. Ebene 2/3 — Das Regelformat

### 3.1 Struktur eines Findings

```ts
type Severity = 'info' | 'warn' | 'error';

interface Finding {
  readonly ruleId: RuleId;               // 'V-M03-01' — stabil, für Tests & Support
  readonly severity: Severity;
  readonly subject: FindingSubject;      // { kind: 'module', id } | { kind: 'panel', id } | { kind: 'project' }
  readonly values: Readonly<Record<string, number | string>>;
                                         // { anzahl: 8, breite: 16, summe: 128, frei: 96 }
  readonly fix?: SuggestedFix;           // PFLICHT bei severity !== 'info'  (Zod erzwingt)
  readonly dismissible: boolean;         // 'error' → immer false
}

interface SuggestedFix {
  readonly kind: FixKind;                // 'widenBase' | 'removeModule' | 'setParam' | …
  readonly params: Readonly<Record<string, number | string>>;  // { toMm: 320 }
}
```

### 3.1.1 Warum keine Texte und keine Closures in der Domäne *(Architekturprüfung K-05)*

Ein `Finding` ist ein **Berechnungsergebnis**. Ergebnisse müssen hashbar, serialisierbar und
golden-testbar sein. Ein lokalisierter Text und eine Closure können alle drei nicht:

| Problem | Folge |
|---|---|
| Text im Ergebnis | Ein Komma in einer Meldung ändert den Konstruktions-Hash → alle Goldens rot, ohne dass sich an der Konstruktion etwas geändert hat |
| Text im Ergebnis | `construct()` müsste `locale` lesen — ein **Anzeigefeld** würde die Berechnung beeinflussen (Verstoß gegen P4) |
| Closure im Ergebnis | Nicht serialisierbar, nicht hashbar, nicht in Golden-JSON ablegbar |
| Closure im Ergebnis | Nicht rein prüfbar; ein Fix mit Seiteneffekt wäre nicht nachweisbar |

**Stattdessen:**

```text
DOMÄNE (L2)  →  { ruleId: 'V-M03-01', values: { anzahl: 8, breite: 16, summe: 128, frei: 96 } }
UI (L5)      →  i18n/de.ts['V-M03-01.detail']
                = "Kein Platz: {anzahl} Kanäle à {breite} mm brauchen {summe} mm, frei sind {frei} mm."
                → "Kein Platz: 8 Kanäle à 16 mm brauchen 128 mm, frei sind 96 mm."
```

- `title`, `detail`, `why`, `severityReason` und `fix.label` sind **Wörterbuchschlüssel**
  (`${ruleId}.title` etc.), keine Werte im Ergebnis.
- `fix` ist **Daten**, keine Funktion: `applyFix(project, fix: SuggestedFix): Project` ist eine
  reine Funktion **in der Domäne**, die über `kind` dispatcht. Sie ist damit testbar, ohne eine
  Closure auszuführen.
- Der **Konstruktions-Hash** läuft über `ruleId + severity + subject + values` — also über genau
  das, was fachlich zählt.
- `LocalizedText` bleibt der Typ für alles, was **nicht** aus `construct()` kommt: Modulnamen,
  UI-Labels, Teilebezeichnungen im Export.

**Vier Regeln, die das Format erzwingt (und Zod prüft):**

| # | Regel | Warum |
|---|---|---|
| **R1** | `severity !== 'info'` ⇒ `fix` ist vorhanden | Keine Sackgasse (PRD FR-50) |
| **R2** | `values` enthält mindestens einen **numerischen** Wert | „Fehler" hilft nicht; „128 mm vs. 96 mm" hilft; die Zahl ist der Inhalt der Meldung |
| **R3** | `error` ⇒ `dismissible === false` | Ein nicht nähbarer Zustand ist nicht wegklickbar |
| **R4** | `applyFix(p, fix)` ist **rein** und erzeugt ein **valides** Projekt | Fixes können nicht selbst Fehler erzeugen (Property-Test) |

> **R4 ist die wichtigste Regel.** Ein „Fix", der eine neue Warnung erzeugt, ist schlimmer als
> keine Hilfe. Getestet: für jedes Finding mit Fix gilt `validate(applyFix(p, fix))` erzeugt
> **keine neue `error`-Regel für dasselbe Subjekt**, und die Zahl der `error`s sinkt.
>
> **R2 in der Fassung „numerisch" ist eine Verschärfung:** Vorher genügte *irgendeine* Ziffer im
> Text — ein Datum hätte die Regel erfüllt. Jetzt muss eine **Zahl aus der Rechnung** drin sein.

### 3.2 Schweregrad-Semantik (verbindlich)

| Severity | Bedeutung | Export | Darstellung |
|---|---|---|---|
| `info` | Hinweis, alles in Ordnung, aber erwähnenswert | erlaubt | grau, kein Badge-Zähler |
| `warn` | Ergebnis ist nähbar, aber suboptimal oder geschätzt | **erlaubt**, mit Vermerk auf PDF-Deckblatt | gelb, Badge zählt |
| `error` | Ergebnis ist **nicht** nähbar oder widersprüchlich | **blockiert** | rot, Export deaktiviert |

---

## 4. Der Katalog der Regeln

### 4.1 Globale Regeln (Projekt-/Panel-Ebene)

| ID | Bedingung | Sev | Meldung (`values`) | Fix (`kind`) |
|---|---|---|---|---|
| `V-G-01` | `Σ modulBreiten > channel.length` | **error** | „{anzahl} Module à {breite} mm = {summe} mm, im Kanal sind {frei} mm frei." | `widenBase` / `removeModule` |
| `V-G-02` | ~~Modultiefe > `maxModuleDepth`~~ **entfällt** | – | *(MVP ist flach — `depthMm` ist aus `BaseShape` entfernt, s. `pattern-data-model.md` §2.2)* | – |
| `V-G-03` | Kein Modul vorhanden | warn | „Das Etui ist leer — es entsteht ein {panels} cm großes Fach ohne Innenleben." | `suggestFill` |
| `V-G-04` | (Stufe 2, mit Tiefe) | – | – | – |
| `V-G-05` | `cornerRadiusMm < seamAllowanceMm + 2` | **error** | „Eckenradius {radius} mm ist kleiner als Nahtzugabe {nz} mm + 2 mm — die Naht franst an der Ecke." | `setCornerRadius` |
| `V-G-06` | `widthMm` außerhalb 100–500 | error (Schema) | – (UI klemmt) | – |
| `V-G-07` | Kanalauslastung < 40 % | info | „Der Kanal ist nur zu {pct} % gefüllt ({belegt} mm von {laenge} mm)." | – (kein Fix bei info) |
| `V-G-08` | Kanalauslastung > 98 % | warn | „Der Kanal ist zu {pct} % voll — beim Nähen braucht die Naht Platz." | `removeModule` |
| `V-G-09` | > **24** Module | warn | „{anzahl} Module sind zu viel für eine übersichtliche Naht." | – |
| `V-G-10` | Buchform ohne Verschluss (M05) | warn | „Ohne Verschluss bleibt das {hoehe} mm hohe Etui offen." | `addModule` |
| `V-G-11` | Modul-Fadenlauf quer zur Anforderung | **error** | „{modul} liegt quer zum Fadenlauf — er leiert um {delta} mm aus." | `setGrain` |
| `V-G-12` | Stoffbreite < benötigte Teilebreite | warn | „Teil {teil} ist {breite} mm breit, dein Stoff {stoff} mm." | `setFabricWidth` |
| **`V-G-13`** | **Kanäle überlappen** (`Σ Kanalhöhen > panelHeight`) | **error** | „Kanal {kanal} überlappt Kanal {anderer}: {summe} mm auf {panel} mm Panel." | `growPanel` / `removeChannel` |

> **`V-G-13` ist neu (Architekturprüfung H-10).** Das Kanalmodell macht Kollisionen **innerhalb**
> eines Kanals strukturell unmöglich — **zwischen** zwei Kanälen auf demselben Panel sind sie
> möglich und im MVP erreichbar (Fächer unten, Nadeln oben). `system-architecture.md` §5.3 nennt
> jetzt ausdrücklich den Geltungsbereich dieser Aussage.

> **`V-G-02` entfällt (Architekturprüfung K-02).** `depthMm` ist aus `BaseShape` entfernt; ein
> Etui ohne Tiefe hat keine Modultiefen-Grenze. Der MVP druckt ein **flaches** Panel mit Futter.
> Volumen (Bodenecke) ist Stufe 2 — mit eigener Regel und eigener Testnähung.

### 4.2 Modulregeln

*(Vollständig in [`../product/module-library.md`](../product/module-library.md) §3 —
hier nur die übergreifende Systematik.)*

| Modul | Regel-IDs | Anzahl |
|---|---|---|
| M01/M02 Stofffach | `V-M01-01` … `V-M01-05` | 5 |
| M03 Nadelkanal | `V-M03-01` … `V-M03-05` | 5 |
| M04 Elastik | `V-M04-01` … `V-M04-05` | 5 |
| M05 Verschluss | `V-M05-01` … `V-M05-04` | 4 |

**Systematik, die jedes Modul einhalten muss:**

| Kategorie | Pflichtregel |
|---|---|
| **Platz** | Passt das Modul in den Kanal? (`error`) |
| **Mindestmaß** | Ist das Modul über seiner technischen Untergrenze? (`error`) |
| **Konstruktionsgrenze** | Verletzt es eine Nähgrenze (Tiefe, Radius, Fadenlauf)? (`error`) |
| **Qualität** | Ist es suboptimal (zu schmal, zu viele Fächer)? (`warn`) |
| **Annahme** | Beruht eine Zahl auf einer Schätzung? (`info`) |

**Die letzte Kategorie ist ungewöhnlich und wichtig:** M05 (Rollvariante) *muss* ein `info`
erzeugen, weil die Bandlänge geschätzt ist. Ein System, das seine eigenen Unsicherheiten
benennt, ist glaubwürdiger als eines, das alles als exakt darstellt (PRD P6).

---

## 5. Der Operationsgraph (die Nähreihenfolge)

### 5.1 Typisierte Operationen

```ts
type OperationKind =
  | 'fuse'            // Verstärkung aufbügeln
  | 'press'           // Saum/Kante einschlagen und bügeln
  | 'staystitch'      // Naht sichern
  | 'mark'            // Positionen anzeichnen
  | 'cut'             // Zuschnitt (Material)
  | 'baste'           // Heften
  | 'stitch'          // Steppen (gerade)
  | 'stitch-divider'  // Teilungsnaht
  | 'insert-strap'    // Lasche/between layers einnähen
  | 'close-panel'     // Panelnaht schließen (fasst Zulagen)
  | 'finish-edge';    // Oberkante versäubern

interface SewingOperation {
  readonly id: OperationId;
  readonly kind: OperationKind;
  readonly moduleId?: ModuleId;            // Herkunft (für Anleitungsprosa)
  readonly requires: readonly OperationId[];  // Vorbedingungen — DAG
  readonly consumes: readonly MaterialRef[];
  readonly pieces: readonly PieceId[];
  readonly instructionKey: string;          // 'op.attach-strap' — Wörterbuchschlüssel (K-05)
  readonly values: Readonly<Record<string, number | string>>;  // die Zahlen, die im Satz stehen
  readonly measurements: readonly MeasurementRef[]; // Zahlen, die im Text stehen
}
```

### 5.2 Der Graph, nicht die Liste

**Die Reihenfolge ist keine Liste, sondern ein gerichteter azyklischer Graph.** Das ist nötig,
weil Module unterschiedliche Vorbedingungen haben (M05 muss *vor* der Panelnaht eingenäht werden,
M01 *in* der Panelnaht gefasst werden, M04 kann *nach* dem Heften gesteppt werden).

```text
                    ┌──────────────────────────┐
                    │ cut (alle Teile)         │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ fuse (Verstärkungen)     │  ← M01, M03
                    └────────────┬─────────────┘
                    ┌────────────┴────────────┐
                    ▼                         ▼
        ┌───────────────────┐     ┌────────────────────┐
        │ press (Säume)     │     │ make-strap (M05)   │
        └────────┬──────────┘     └─────────┬──────────┘
                 ▼                          │
        ┌───────────────────┐               │
        │ mark (Positionen) │  ← M01, M04   │
        └────────┬──────────┘               │
                 ▼                          │
        ┌───────────────────┐               │
        │ baste (Module)    │  ← M01,M03,M04│
        └────────┬──────────┘               │
                 ▼                          ▼
        ┌──────────────────────────────────────────┐
        │ stitch-divider (Teilungs-/Trennähte)     │
        └────────────────────┬─────────────────────┘
                             ▼
        ┌──────────────────────────────────────────┐
        │ insert-strap (M05, zwischen Lagen)       │
        └────────────────────┬─────────────────────┘
                             ▼
        ┌──────────────────────────────────────────┐
        │ close-panel (Panelnaht, fasst Zulagen)   │
        └────────────────────┬─────────────────────┘
                             ▼
        ┌──────────────────────────────────────────┐
        │ finish-edge (wenden, Kanten steppen)     │
        └──────────────────────────────────────────┘
```

### 5.3 Die harten Kanten (Vorbedingungen) und warum sie `error`s sind

| Kante | Vorbedingung | Was passiert, wenn verletzt | Regel |
|---|---|---|---|
| `press → stitch-saum` | Saum muss gebügelt sein | Naht wird schief | Graph erzwingt es (kein Regel nötig) |
| `baste → stitch-divider` | Modul muss fixiert sein | Fach verrutscht | Graph |
| `stitch-divider` **vor** `close-panel` | Teilungsnaht muss erreichbar sein | **Naht nicht mehr möglich** | `V-O-01` (`error`) |
| `make-strap` **vor** `insert-strap` | Lasche muss fertig sein | – | Graph |
| `insert-strap` **vor** `close-panel` | Lasche muss in der NZ liegen | **Lasche nicht befestigbar** | `V-O-02` (`error`) |
| `fuse` **vor** `stitch` | Verstärkung muss vor dem Nähen sitzen | – | Graph |

> **`V-O-01`/`V-O-02` sind Beispiele dafür, dass eine *Reihenfolge* eine `error`-Klasse ist.**
> Ein Modul, dessen Operationen nicht rechtzeitig ausgeführt werden können, ist nicht nähbar —
> auch wenn alle Maße stimmen. Das ist der feinste Punkt des ganzen Regelwerks und der, den
> generierte Anleitungen am häufigsten falsch machen.

### 5.4 Topologische Sortierung — deterministisch

```ts
function orderOperations(ops: readonly SewingOperation[]): SewingOperation[] {
  // Kahn-Algorithmus mit total sortierter Bereitschaftsliste:
  // Priorität:  (1) Phasenindex (cut < fuse < press < mark < baste < stitch < close < finish)
  //             (2) Modulreihenfolge im Kanal
  //             (3) OperationId (string-Vergleich)  ← totaler Schlüssel, kein Zufall
}
```

**Der stabile Sortierschlüssel ist Pflicht (D3):** Zwei Operationen ohne Abhängigkeit müssen
**immer** in derselben Reihenfolge erscheinen, sonst unterscheidet sich die Anleitung zwischen
zwei Läufen — und der Golden-Test wird wertlos.

**Zyklus = Fehler:** Ein Zyklus im Graphen ist ein **Entwicklungsfehler**, kein Nutzerfehler.
Er löst eine Ausnahme aus, die im CI durch einen Test über alle Module ausgeschlossen wird.

---

## 6. Abhängigkeiten zwischen Modulen

**Grundregel: Module kennen sich nicht** (`module-library.md` §1.1). Was sie verbindet, sind
**Flächenressourcen** und **Operationskanten**.

### 6.1 Ressourcenkonflikt (gelöst, nicht erkannt)

| Ressource | Wer braucht sie | Konfliktfall | Lösung |
|---|---|---|---|
| **Kanalbreite** | alle `channel`-Module | Summe > verfügbar | `V-G-01` (error + Fix) |
| **Panelnaht** | M01 (fasst Seiten), M05 (eingelegt) | beide wollen NZ | Beide möglich: M05 liegt *in* der NZ, M01 wird *mitgefasst* — keine Kollision |
| **Panelhöhe** | M03 (lang), M01 (hoch) | Modul höher als Panel | `V-M03-03` (error) |
| **Panelhöhe, kanalübergreifend** | je Kanal alle | Σ Kanalhöhen > Panelhöhe | **`V-G-13` (error + Fix)** |
| **Stofffläche** | alle (Schnittteile) | Stoffbreite zu klein | `V-G-12` (warn) |
| **Fadenlauf** | M03 (längs zwingend) | quer | `V-G-11` (error, Auto-Fix) |

**Diese Tabelle ist die vollständige Liste möglicher Konflikte im MVP.** Sie ist kurz — und das
ist ein Ergebnis der Architektur: Weil Module nur über den *Kanal* und die *Panelnaht* verbunden
sind, gibt es nur zwei echte Interaktionspunkte. Ein freier Canvas hätte Dutzende.

### 6.2 Der „gemeinsame Nenner": die Panelnaht

Alle MVP-Module werden über **eine** Naht integriert: die umlaufende Panelnaht (Außen- und
Futterteil zusammennähen, Module liegen dazwischen). Das ist die einfachste nähbare Konstruktion
für Taschen dieser Art, sie ist in der Branche üblich, und sie macht **jedes** MVP-Modul
kompatibel mit jedem anderen:

```text
  Außenpanel (rechts auf rechts) ┌─────────────────────────┐
                                 │  ┌───┐  ┌───┐  ╭────╮   │ ← Module liegen auf dem
                                 │  │M03│  │M01│  │M04 │   │   Futterpanel, mit ihren
                                 │  └───┘  └───┘  ╰────╯   │   Zulagen in der NZ
                                 └───────────┬─────────────┘
                                             │ Naht (10 mm)
                              ┌──────────────▼─────────────┐
                              │   Futterpanel              │
                              └────────────────────────────┘
```

**Konsequenz:** Ein Modul, das sich dieser Logik nicht fügt (z. B. eine Reißverschlusstasche, die
*vorher* in das Futter eingenäht werden muss, M06), bricht die Einfachheit. **Das ist der
tatsächliche Grund, warum M06 nicht im MVP ist** — nicht nur die RV-Länge, sondern die
Operationsreihenfolge. Phase 3 sollte das wissen.

---

## 7. Praxiskonstanten — und die Pflicht, sie zu kalibrieren

### 7.1 Alle Werte, die auf Annahmen beruhen

| Konstante | Wert | Betrifft | Herkunft | Kalibrierung |
|---|---|---|---|---|
| `seamAllowanceMm` | 10 | alle Teile | üblich für Taschen **[H]** | Spielraum 8–12 |
| `edgeMarginMm` | 10 | Kanalnutzung | Annahme **[H]** | – |
| `foldAllowanceMm` | 5 | max. Modultiefe | Annahme **[H]** | – |
| `needleClearanceMm` | 1,0 (je Seite) | M03 Kanalbreite | Annahme **[H]** | **Testnähung** |
| `channelEdgeSeamMm` | 5,0 | M03 Randnaht | Annahme **[H]** | **Testnähung** |
| `elasticGripMm` | 5 | M04 Loop-Länge | Annahme **[H]** | **Testnähung** |
| `minSectionMm` | 15 | M01 Teilbreite | Annahme **[H]** | – |
| `minTurnMm` | 15 | M01 Mindestbreite | Annahme **[H]** | – |
| `stitchLengthMm` | 3 | Garnverbrauch | üblich | – |
| `threadDensityFactor` | 3.0 | Garnverbrauch (× Nahtlänge) | Annahme **[H]** | grob |

### 7.2 Warum diese Konstanten **nicht** hartkodiert sind

```ts
// domain/src/practice/practice-constants.ts
export const PRACTICE = {
  version: '1.0.0',
  seamAllowanceMm: 10,
  needleClearanceMm: 1.0,
  channelEdgeSeamMm: 5.0,
  elasticGripMm: 5,
  // …
} as const;
```

**Gründe:**

1. **Sie werden sich in der Testnähung ändern** (Abnahme N1–N3). Ein Wert, der an 30 Stellen
   steht, ist nicht änderbar.
2. **Sie sind die Grundlage für einen Golden-Test, der bewusst bricht**, wenn sie sich ändern —
   das ist ein *Feature*, kein Ärgernis: Es erzwingt, dass eine Änderung bewusst geschieht.
3. **Sie dokumentieren sich selbst.** Wer `needleClearanceMm` liest, weiß, dass es eine
   Praxiserfahrung ist und keine physikalische Konstante.
4. **Sie sind pro Projekt überschreibbar** (geplant, Stufe 2): Erfahrene Näher:innen haben
   andere Vorlieben. Das ist der Expertenmodus (FR-45).

### 7.3 Der Umgang mit Unsicherheit — verbindlich

> **Jede Zahl, die auf einer Annahme beruht, muss (a) an genau einer Stelle stehen,
> (b) als Annahme dokumentiert sein und (c) in der Testnähung geprüft werden.**

Ein System, das 1,0 mm Nahtluft als „berechnet" darstellt, obwohl es geraten ist, ist unehrlich —
und es wird an genau dieser Stelle scheitern, ohne dass jemand weiß warum. Das ist Phase-1-Risiko
R1 und der wichtigste Grund, warum dieses Kapitel existiert.

---

## 8. Was das Regelwerk nicht leistet (Grenzen)

| Nicht abgedeckt | Konsequenz | Umgang |
|---|---|---|
| **Stoffverhalten** (Dehnung, Stand, Dicke) | Ein Etui aus festem Canvas verhält sich anders als aus Popeline | `warn` + Materialempfehlung; Testnähen-Hinweis |
| **Nähmaschinen-Grenzen** (Lagen, Nadelstärke) | 6 Lagen Canvas sind mit Haushaltsmaschine schwer | `info` bei > 4 Lagen an einer Naht (Stufe 2) |
| **Handwerkliches Können** | Ein Reißverschluss an einer Kurve ist für Anfänger:innen schwer | Schwierigkeitsgrad pro Modul (Stufe 2) |
| **Optik/Geschmack** | – | nicht Sache des Systems |
| **Passform am Gegenstand** | Ob eine 4,5-mm-Nadel in einem 16-mm-Kanal gut sitzt, ist Erfahrung | **`needleClearanceMm` ist genau deshalb kalibrierbar** |
| **Reihenfolge-Optimum** | Der Graph garantiert *nähbar*, nicht *optimal* | bewusst: nähbar schlägt elegant |

**Der letzte Punkt ist die ehrliche Grenze des Systems:** Es garantiert **Nähbarkeit**, nicht
**Nähfreude**. Das ist genau die Zusage, die Phase 1 als Vertrauensfaktor identifiziert hat — und
nicht mehr.

---

## 9. Teststrategie für das Regelwerk

| Test | Was | Werkzeug |
|---|---|---|
| **Regel-Existenz** | Jede Regel-ID ist genau einmal definiert | Unit (Registry-Eindeutigkeit) |
| **Fix-Gültigkeit (R4)** | Für jedes Finding mit Fix: `applyFix(p, fix)` ist valide und reduziert `error`s | Property (fast-check) |
| **Textfreiheit (K-05)** | Kein `Finding` enthält String-Felder außer `ruleId`/`severity`; kein `typeof === 'function'` im Ergebnis | Unit + Lint-Regel |
| **Kein-Fix-Loch (R1)** | Jedes `warn`/`error` hat ein `fix` | Schema-Test |
| **Zahlen-Pflicht (R2)** | `values` enthält ≥ 1 numerischen Wert | Snapshot-Test über alle Regeln |
| **Nicht-Wegklickbar (R3)** | `error` ⇒ `dismissible === false` | Schema-Test |
| **Graph-Azyklik** | Für alle Modulkombinationen (Power Set der 5 MVP-Module) | Unit, 31 Kombinationen |
| **Reihenfolge-Stabilität** | 100 Läufe → identische Operationsreihenfolge | Property |
| **Determinismus der Sortierung** | Zwei Operationen ohne Abhängigkeit immer gleich geordnet | Unit |
| **Abbruchfall** | Ein absichtlich zyklisches Testmodul löst eine Ausnahme aus | Unit (negativ) |

**Die 31 Kombinationen** (2⁵ − 1 nichtleere Teilmengen der 5 MVP-Module) werden **alle** als
Golden-Test gefahren. Das ist billig (Sekunden) und deckt jede Operationsreihenfolge ab, die im
MVP möglich ist. **Es gibt keinen Grund, das nicht zu tun.**
