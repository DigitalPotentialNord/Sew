# Modulbibliothek

Stand: 26.11.2026 · Grundlage: [`../research/competitors.md`](../research/competitors.md) §4.8 ·
Anforderungen: [`prd.md`](prd.md) · Regeln: [`../engineering/construction-rules.md`](../engineering/construction-rules.md)

---

## 1. Architektur der Modulbibliothek

### 1.1 Was ein Modul ist

Ein Modul ist **keine Zeichnung, sondern ein Regelsatz**. Es beschreibt, wie aus einer Absicht
(„8 Nadelspiele sollen geordnet halten") eine nähbare Konstruktion wird.

```text
ModuleDefinition  (statisch, deklarativ, testbar)
├─ meta            id, name (de/en), kategorie, icon, status, bindung
├─ params          Parameter-Deklarationen (Typ, Einheit, Grenzen, Default, abgeleitet?)
├─ geometry        reine Funktion: Params → Geometrie (Panels, Pfade, Ankerpunkte)
├─ pieces          reine Funktion: Params → Schnittteile (mit NZ-Regeln)
├─ materials       reine Funktion: Params → Materialbedarf (exakt | geschätzt)
├─ attach          Befestigungspunkte (Anker, Naht, Knips-Positionen)
├─ operations      Nähoperationen (typisiert, mit Vorbedingungen)
└─ rules           Validierungsregeln (Schweregrad, Ursache, Vorschlag)
```

**Verbindlich (P3, P4, P6):**

- Alle Funktionen sind **rein** (kein Zustand, keine Zeit, kein Zufall) → deterministisch, testbar.
- Ein Modul **kennt keine anderen Module**. Abhängigkeiten zwischen Modulen werden ausschließlich
  vom **Layout-Solver** und der **Konstruktions-Pipeline** aufgelöst
  (`../engineering/construction-rules.md` §6). Das verhindert das klassische
  Modul-Kopplungsproblem, an dem Bausteinsysteme scheitern.
- Ein Modul mit `status: planned` hat **keine** Implementierung und ist im UI nicht klickbar (FR-29).

### 1.2 Bindungstypen (PRD FR-30)

| Bindung | Bedeutung | MVP |
|---|---|---|
| `channel` | Modul sitzt in einem 1D-Kanal einer Trägerfläche; Position folgt aus der **Sequenz**, nichts wird gespeichert | **✅ ja** |
| `slot` | Modul sitzt in einer 2D-Zelle eines Flächenrasters | ❌ nein (Stufe 2) |
| `free` | Modul frei auf der Fläche platziert | ❌ nein (Stufe 3, nur mit echtem Solver) |
| `edge` | Modul sitzt an einer Kante (Verschluss, Aufhänger) – Sonderform von `channel` | ✅ ja |

### 1.3 Status-Übersicht

| # | Modul | Kategorie | Bindung | Status | MVP |
|---|---|---|---|---|---|
| **M01** | Einfaches Stofffach | Taschen | channel | **implemented** | **✅** |
| **M02** | Geteiltes Stofffach | Taschen | channel | **implemented** (= M01 mit `sections > 1`) | **✅** |
| **M03** | Nadelkanal | Nadeln | channel | **implemented** | **✅** |
| **M04** | Elastikschlaufen | Halter | channel | **implemented** | **✅** |
| **M05** | Verschlusslasche | Verschluss | edge | **implemented** | **✅** |
| M06 | Reißverschlusstasche | Taschen | channel | planned | – |
| M07 | Pinselhalter | Halter | channel | planned | – |
| M08 | Werkzeughalter | Halter | channel | planned | – |
| M09 | Ringhalter | Schmuck | channel | planned | – |
| M10 | Ohrringhalter | Schmuck | slot | planned | – |
| M11 | Kettenhalter | Schmuck | channel | planned | – |
| M12 | Trennwand | Struktur | channel | planned | – |
| M13 | Knopfverschluss | Verschluss | edge | planned | – |
| M14 | Druckknopf | Verschluss | edge | planned | – |
| M15 | Klettverschluss | Verschluss | edge | planned (= M05 Variante) | – |
| M16 | Aufhänger / Lasche | Struktur | edge | planned | – |

> **Warum 5 statt 4 MVP-Module:** M02 ist keine eigene Implementierung, sondern eine
> **Parametervariante von M01** (`sections`). Das ist Architektur, keine Feature-Zählung:
> es gibt EINEN Fachttyp, nicht zwei. Ein getrenntes „geteiltes Stofffach" wäre eine
> Duplikation und würde bei jeder Änderung doppelt gepflegt werden müssen (P3).

---

## 2. Der gemeinsame Modul-Vertrag

### 2.0 `nz` — die einzige Nahtzugabe in allen Formeln *(Architekturprüfung K-01)*

In allen Formeln dieses Dokuments steht **`nz`** für **`effectiveSeamAllowance(module, settings)`**
(`pattern-data-model.md` §2.1.1). Das ist **keine Konstante**: Es ist der Modul-Override, sonst der
globale Wert. Die Formeln sind so geschrieben, dass sie für **jeden** Wert gelten — auch nach der
Kalibrierung in der Testnähung.

> **Warum das ausdrücklich hier steht:** Vorher stand in den Formeln „NZ" wie eine feste Zahl. Eine
> Änderung der Nahtzugabe (FR-71, oder Kalibrierung) hätte 30 Teile gleichzeitig verschoben, ohne
> dass eine Stelle sie auflöst. Jetzt gibt es genau eine Auflösungsfunktion, und dieser Absatz ist
> ihr Verweis.

### 2.1 Parametertypen

Jedes Modul deklariert seine Parameter mit **Einheit, Grenzen, Default und Ableitungsstatus**.

### 2.1 Parametertypen

| Typ | Bedeutung | Beispiel |
|---|---|---|
| `length` | Länge in mm (Integer) | `breite: 220` |
| `count` | Anzahl (Integer) | `faecher: 1` |
| `enum` | Auswahl | `anlage: 'unten' \| 'oben'` |
| `bool` | Schalter | `bodennaht: true` |
| `derived` | **berechnet**, nicht gespeichert (P3) | `hoehe = nadelLaenge + 2 * zugabe` |

### 2.1.1 Grenzen sind eine Funktion, kein Tabellenwert *(Architekturprüfung H-06)*

Mehrere Parameter haben als Obergrenze `channel.frei` — und das ist **keine Zahl**, sondern der zum
Platzierungszeitpunkt noch freie Platz, abhängig von allen anderen Modulen im Kanal. In einer
Tabelle ist das darstellbar, in einem Zod-Schema nicht. Damit UI und Regelwerk nicht **zwei**
verschiedene Grenzen berechnen:

```ts
interface ModuleDef<P> {
  schema: ZodType<P>;                                  // statische Grenzen (Untergrenze)
  getBounds(params: P, ctx: ModuleBoundsContext): Bounds;  // kontextabhängige Grenzen (Obergrenze)
}

interface ModuleBoundsContext {
  readonly channelFreeMm: Mm;      // freier Platz im Kanal (ohne dieses Modul)
  readonly panelHeightMm: Mm;
  readonly panelWidthMm: Mm;
  readonly fabricWidthMm: Mm;
}
```

| Regel | Warum |
|---|---|
| `getBounds` ist **rein** und **O(1)** | sie läuft bei jedem Frame beim Ziehen (NFR-02) |
| UI **und** Regelwerk rufen **dieselbe** Funktion | keine zwei Wahrheiten (vgl. K-01) |
| Zod prüft nur die **statische Untergrenze** | was ohne Kontext sicher gilt |
| Die Obergrenze wird **immer** über `getBounds` geprüft | sonst erlaubt der Stepper, was die Regel blockiert |

---

### 2.2 Pflichtangaben pro Modul (Checkliste für neue Module)

| Pflichtfeld | Warum unverzichtbar |
|---|---|
| `meta.id`, `name`, `kategorie`, `status` | Auffindbarkeit + Ehrlichkeit (P6) |
| Alle Parameter mit Grenzen | sonst kann UI keine sinnvollen Stepper bauen |
| `getBounds(params, ctx)` | sonst rechnet die UI die Obergrenze selbst — und weicht irgendwann ab |
| Geometriefunktion | sonst kein Rendering, keine Kollisionsprüfung |
| Schnittteile mit NZ-Regel | sonst kein Schnittmuster |
| Materialbedarf mit `exact`/`estimated` | sonst keine Materialliste (FR-60) |
| Befestigungspunkte | sonst keine Knipse, keine Anlagevalidierung |
| Nähoperationen mit Vorbedingungen | sonst keine korrekte Anleitung (FR-82) |
| Validierungsregeln mit `suggestedFix` | sonst keine behebbaren Warnungen (FR-50) |
| Mindestens ein Golden-Test | sonst keine Gewähr gegen Regression |

---

## 3. MVP-Module — vollständige Spezifikation

> **Die Teile jedes Projekts, unabhängig von den Modulen** *(Architekturprüfung K-02)*:
>
> | Teil | Anzahl | Maße | Material |
> |---|---|---|---|
> | `panel-aussen` | 1 | `panelWidthTotal × panelHeight` + 2·nz | Außenstoff |
> | `panel-futter` | 1 | **identisch** | Futterstoff |
> | `panel-verstaerkung` | 1 (optional) | ohne NZ | H250 |
>
> Beide Panels werden rechts auf rechts genäht und gewendet; die Module liegen **dazwischen**
> und werden mit ihren Zulagen in der Panelnaht gefasst (`construction-rules.md` §6.2). Diese
> drei Teile erzeugt **jedes** Projekt — sie kommen nicht von einem Modul. `T-S-01` prüft es.

### M01 / M02 — Stofffach (einfach / geteilt)

**Zweck.** Aufgesetztes Steckfach auf einem Panel. Nimmt flache Gegenstände auf (Karten,
Markierer, kleine Werkzeuge, Ersatzteile). Mit `sections > 1` als geteiltes Fach (z. B. drei
Fächer für Markierer).

**Warum im MVP:** Es ist das einfachste Modul mit echter Konstruktion (Faltkante, Seitennaht,
Teilungsnähte) und deckt als einziges Modul zwei Einträge der Wunschliste ab. Es ist außerdem
das Modul, an dem sich die Pipeline vollständig testen lässt.

**Bindung:** `channel`
**Anlage:** Unterkante des Kanals (Fach wird mit der Unterkante in die Panelnaht gefasst)

> **Konstruktionsentscheidung [A]:** Das Fach wird an der **Seiten- und Unterkante in die
> Panelnaht** gefasst und nur oben offen. Das vermeidet eine separate Befestigungsnaht und ist
> die in der Branche übliche, robusteste Lösung — und es ist die, die Print + Cut + Sew
> ebenfalls verwendet (Phase 1, `competitors.md` §4.1, Schritt „baste the sides and bottom
> inside the seam allowance"). **Wir übernehmen bewährte Konstruktion, nicht nur beworbene
> Funktion.**

#### Parameter

| Name | Typ | Einheit | Min | Max | Default | Abgeleitet |
|---|---|---|---|---|---|---|
| `breite` | length | mm | 20 | `channel.frei` | 60 | nein |
| `hoehe` | length | mm | 25 | `panel.hoehe` | 60 | nein |
| `sections` | count | – | 1 | 12 | 1 | nein |
| `steg` | length | mm | 0 | 20 | 0 | nein |
| `bodennaht` | bool | – | – | – | true | nein |
| `oberkante` | enum | – | `saum` \| `einschlag` | – | `saum` | nein |
| `saumbreite` | length | mm | 5 | 20 | 8 | nein |

**Abgeleitet (nicht gespeichert):**

| Größe | Formel |
|---|---|
| `teilbreite` | `(breite − (sections − 1) × steg) / sections` |
| `zuschnittBreite` | `breite + 2 × nahtzugabe` |
| `zuschnittHoehe` | `hoehe + saumbreite + nahtzugabe` (Oberkante) `+ nahtzugabe` (Unterkante) |
| `faltlinie` | bei `saum`: keine; bei `einschlag`: Oberkante − `saumbreite` |

#### Geometrie

```text
Vorderansicht (auf dem Panel):

   ┌──────────────────────────────┐  ◀ obere Kante (offen, gesäumt)
   │      ▕        ▕        ▕     │  ◀ Teilungsnähte bei sections=4
   │                              │
   └──────────────────────────────┘  ◀ Unterkante — in Panelnaht gefasst

Öffnungsrichtung: nach oben
Tiefe: 0 (flach aufsitzend, kein Volumen)  → beeinflusst Gusset NICHT
```

Ankerpunkte: `unten-links`, `unten-rechts` (in Panelnaht), `oben-links`, `oben-rechts`,
sowie `teilung_i` für jede Teilungsnaht.

#### Mindestmaße

| Bedingung | Wert | Begründung |
|---|---|---|
| `breite ≥ 20 mm` | technisch | schmaler ist nicht wendbar |
| `teilbreite ≥ 15 mm` | praktisch | bei 10 mm NZ und 3 mm Naht bleibt zu wenig Nutzbreite **[A]** |
| `hoehe ≥ 25 mm` | praktisch | darunter ist die Teilungsnaht nicht führbar |
| `hoehe ≤ panel.hoehe − 20` | konstruktiv | oberhalb muss Platz für die Öffnung bleiben |

#### Schnittteile

| Teil | Anzahl | Zuschnitt-Maße | Fadenlauf | Material |
|---|---|---|---|---|
| `fach` | 1 | `zuschnittBreite × zuschnittHoehe` | längs | Außenstoff |
| `fach-verstärkung` | 1 (optional) | `breite × hoehe` (ohne NZ) | längs | H250 |

#### Materialbedarf

| Material | Menge | Art | Herleitung |
|---|---|---|---|
| Stoff | `fläche = zuschnittBreite × zuschnittHoehe` | **exakt** (Fläche) → **geschätzt** (Meter) | Fläche geht in die Zuschnittanordnung ein |
| Verstärkung | `fläche` (immer) | geschätzt | – |
| Garn | geschätzt aus Nahtlänge `2 × (breite + hoehe) + sections × hoehe` | geschätzt | – |

#### Befestigungspunkte

| Punkt | Position | Zweck |
|---|---|---|
| `naht-unten` | Unterkante, volle Breite | wird in Panelnaht gefasst |
| `naht-links` / `naht-rechts` | Seitenkanten | in Panelnaht gefasst (bei `bodennaht = true`) |
| `knips-oberkante` | Mitte Oberkante | Ausrichtungs-Knips (optional) |

#### Nähoperationen (Reihenfolge verbindlich)

| # | ID | Operation | Vorbedingung | Ergebnis |
|---|---|---|---|---|
| 1 | `press-saum` | Oberkante `saumbreite` einschlagen und bügeln | – | Saumkante fixiert |
| 2 | `stitch-saum` | Saum feststeppen, 1 mm von der Kante | 1 | Oberkante versäubert |
| 3 | `mark-sections` | Teilungslinien auf dem Panel anzeichnen (Abstände aus Geometrie) | – | Markierungen |
| 4 | `attach-pocket` | Fach auf Panel heften (Seiten + Unterkante, innerhalb NZ) | 1, 2 | Fach fixiert |
| 5 | `stitch-dividers` | Teilungsnähte von unten nach oben steppen, am oberen Ende verriegeln | 3, 4 | Fächer entstanden |
| 6 | `close-panel` | Panelnaht schließt Fachkanten ein | 4 | Fach integriert |

> **Reihenfolge ist nicht beliebig:** `stitch-dividers` **muss** vor `close-panel` liegen, sonst
> sind die Teilungsnähte nicht mehr erreichbar. Diese Ordnung wird als Constraint im
> Operationsgraphen geprüft (`construction-rules.md` §5).

#### Validierungsregeln

| ID | Bedingung | Schwere | Meldung | Vorschlag |
|---|---|---|---|---|
| `V-M01-01` | `teilbreite < 15 mm` | **error** | „Dein Fach wäre nur 12 mm breit — zu schmal zum Wenden." | `[sections auf 2 reduzieren]` |
| `V-M01-02` | `hoehe > panel.hoehe − 20` | warn | „Das Fach lässt oben keinen Rand zum Fassen." | `[Höhe auf X mm setzen]` |
| `V-M01-03` | `breite > channel.frei` | error | „{breite} mm Fach, {frei} mm frei im Kanal." | `widenBase` / `setParam` |
| `V-M01-04` | `sections > 6` | info | „Viele schmale Fächer nähen sich schwer gleichmäßig." | – (nur Hinweis) |
| `V-M01-05` | `oberkante = einschlag` und `saumbreite > hoehe / 2` | error | „Der Einschlag ist höher als das halbe Fach." | `[Saumbreite auf X]` |

**`lage` ist entfallen** *(Architekturprüfung K-02, schließt O-M6)*. Das Feld hätte ein Fach auf
der Futterseite verlangt — mit einer Befestigung, die in der Panelnaht nicht mehr trivial ist.
Stattdessen ist das **Panel selbst** jetzt zweilagig (außen + Futter, gewendet,
`pattern-data-model.md` §2.2.1); Futter ist damit eine Eigenschaft der Grundform, nicht eine
Moduloption. Ein `enum`-Wert weniger, ein Sonderfall weniger, ehrlicher statt falsch (P6).

---

### M03 — Nadelkanal

**Zweck.** Der Kern des MVP: ein Kanal, der Strick-/Häkelnadeln einzeln oder paarweise hält,
mit exakt der Breite, die die Nadeln brauchen — abgeleitet aus der Nadellänge.

**Warum im MVP:** Es ist das Modul, das Phase 1 als einzige belegte Nische identifiziert hat
(„stricknadel etui" hat Näh-Intention, kein Generator vorhanden), und es hat die klarste
Geometrie-Ableitung (Nadellänge → Fachhöhe).

**Bindung:** `channel` · **Anlage:** Unterkante (Nadeln stehen senkrecht im Etui)

#### Parameter

| Name | Typ | Einheit | Min | Max | Default | Abgeleitet |
|---|---|---|---|---|---|---|
| `nadelLaenge` | length | mm | 60 | 400 | 200 | nein |
| `nadelStaerke` | length | mm | 1 | 15 | 4 | nein |
| `paare` | count | – | 1 | 6 | 1 | nein (Nadeln pro Kanal) |
| `zugabe` | length | mm | 4 | 20 | 10 | nein (Griffzugabe oben) |
| `breite` | length | mm | 8 | `channel.frei` | – | **ja** |
| `hoehe` | length | mm | – | `panel.hoehe` | – | **ja** |
| `boden` | enum | – | `geschlossen` \| `offen` | – | `geschlossen` | nein |
| `verstaerkung` | bool | – | – | – | true | nein |

**Ableitung (die zentrale Rechnung des Produkts):**

```text
breite = paare × (nadelStaerke + 2 × 1.0 mm Nahtluft) + 2 × 5.0 mm Randnaht
hoehe  = nadelLaenge + zugabe
```

> **Warum `+2 × 1.0 mm Nahtluft` und `+2 × 5.0 mm Randnaht`?**
> `[H]` Die Werte sind **Annahmen aus der Nähpraxis**, nicht aus einer Quelle. 1 mm Nahtluft
> pro Nadel verhindert, dass die Teilungsnaht die Nadel klemmt; 5 mm Randnaht ist ein üblicher
> Nahtabstand für schmale Steppnähte. **Diese beiden Zahlen müssen in der Testnähung
> (PRD Abnahmekriterium 10) kalibriert werden.** Bis dahin sind sie der wahrscheinlichste
> Fehlerursprung des Produkts — und deshalb als Konfigurationskonstante (nicht hartkodiert)
> ausgelegt.

**Beispiel (Maike):** `nadelLaenge=200, nadelStaerke=4, paare=1`
→ `breite = 1 × (4 + 2) + 10 = 16 mm`, `hoehe = 200 + 10 = 210 mm`

#### Geometrie

```text
   ┌────────────┐  ◀ Oberkante, offen (Nadeln ragen `zugabe` heraus)
   │  ┌──────┐  │
   │  │ Nadel│  │  ◀ ein Kanal, eine Nadel (oder ein Paar)
   │  └──────┘  │
   │            │
   ├────────────┤  ◀ Teilungsnaht (bei paare > 1)
   │  ┌──────┐  │
   │  │ Nadel│  │
   │  └──────┘  │
   └────────────┘  ◀ Unterkante — in Panelnaht gefasst
```

Ankerpunkte: `unten-links`, `unten-rechts`, `oben-links`, `oben-rechts`, `teilung_i` je Trennnaht.

#### Mindestmaße

| Bedingung | Wert | Begründung |
|---|---|---|
| `breite ≥ 12 mm` | technisch | 10 mm Randnaht + 2 mm Nutzbreite = Untergrenze |
| `hoehe ≥ nadelLaenge + 4` | konstruktiv | Nadel muss vollständig fassen |
| `nadelStaerke ≤ 15` | praktisch | darüber ist es kein Stricknadel-Etui mehr |

#### Schnittteile

| Teil | Anzahl | Maße | Fadenlauf | Material |
|---|---|---|---|---|
| `kanal` | 1 | `(breite + 2·NZ) × (hoehe + NZ)` | längs (**wichtig:** Nadel liegt längs zum Fadenlauf) | Außenstoff |
| `kanal-verstaerkung` | 1 | `breite × hoehe` | längs | H250 (bei `verstaerkung`) |

> **Fadenlauf-Begründung [A]:** Ein Kanal, der quer zum Fadenlauf geschnitten ist, dehnt sich und
> die Nadeln fallen heraus. Längs = formstabil. Das ist eine **Konstruktionsregel**, keine
> Geschmacksfrage, und wird als `error` validiert (siehe `material-calculation.md` §4).

#### Materialbedarf

| Material | Menge | Art |
|---|---|---|
| Außenstoff | Fläche `(breite+2NZ) × (hoehe+NZ)` | exakt (Fläche) → geschätzt (Meter) |
| Verstärkung | `breite × hoehe` | geschätzt |
| Garn | `hoehe × (1 + 2 × paare)` + `breite` | geschätzt |

#### Nähoperationen

| # | ID | Operation | Vorbedingung |
|---|---|---|---|
| 1 | `fuse-interfacing` | Verstärkung aufbügeln (innerhalb NZ) | – |
| 2 | `press-top` | Oberkante einschlagen und steppen | 1 |
| 3 | `attach-channel` | Kanal auf Panel heften (Seiten + Unterkante) | 2 |
| 4 | `stitch-dividers` | Trennähte von unten nach oben, oben verriegeln | 3 |
| 5 | `close-panel` | Panelnaht fasst Unterkante | 3 |

#### Validierungsregeln

| ID | Bedingung | Schwere | Meldung | Vorschlag |
|---|---|---|---|---|
| `V-M03-01` | `breite > channel.frei` | error | „{anzahl} Kanäle à {breite} mm brauchen {summe} mm, frei sind {frei} mm." | `widenBase` |
| `V-M03-02` | `nadelStaerke < 2` und `paare > 3` | warn | „Sehr dünne Nadeln in einem Kanal verkanten." | `[Nadeln auf 3 Kanäle verteilen]` |
| `V-M03-03` | `hoehe > panel.hoehe − 10` | error | „Kanal ist höher als das Panel." | `[Nadellänge prüfen]` / `[Panel vergrößern]` |
| `V-M03-04` | `zugabe < 6` | warn | „Nadeln lassen sich schlecht greifen." | `[Zugabe auf 10 mm]` |
| `V-M03-05` | Fadenlauf quer (aus Geometrie) | error | „Kanal muss längs zum Fadenlauf liegen." | `[automatisch korrigiert]` |

---

### M04 — Elastikschlaufen

**Zweck.** Gummiband-Schlaufen halten runde/schmale Gegenstände (Häkelnadeln, Markierer,
Stifte), die nicht in einem geschlossenen Kanal sitzen sollen.

**Warum im MVP:** Es ist mechanisch **anders** als M01/M03 (Zugspannung statt Naht) und damit
der Beweis, dass die Engine nicht nur Rechtecke kann. Phase 1 zeigt: Print + Cut + Sew rechnet
genau diese Loop-Längen — wir müssen gleichziehen, nicht darunter bleiben
(`competitors.md` §4.1: *„the section's width plus twice the item's thickness, less a little so
the loop grips"*).

**Bindung:** `channel` · **Anlage:** Unterkante

#### Parameter

| Name | Typ | Einheit | Min | Max | Default | Abgeleitet |
|---|---|---|---|---|---|---|
| `breite` | length | mm | 20 | `channel.frei` | 80 | nein (Gesamtbreite der Reihe) |
| `loops` | count | – | 1 | 20 | 6 | nein |
| `gegenstandBreite` | length | mm | 2 | 60 | 8 | nein |
| `gegenstandDicke` | length | mm | 1 | 40 | 8 | nein |
| `bandbreite` | length | mm | 5 | 30 | 10 | nein |
| `zug` | length | mm | 2 | 12 | 5 | nein (Straffheit) |
| `reihen` | count | – | 1 | 3 | 1 | nein |
| `reihenAbstand` | length | mm | 8 | 60 | 20 | nein |

**Ableitung:**

```text
loopLaenge     = gegenstandBreite + 2 × gegenstandDicke − zug          (Bandlänge pro Loop)
bandLaenge     = loops × loopLaenge + 2 × NZ + 2 × 10 mm Einzugsreserve
loopsPerRow    = floor((breite − 2 × 5 mm Randnaht + gap) / (gegenstandBreite + gap))
reihenHoehe    = reihen × reihenAbstand  (abgeleitete Panel-Belegung)
```

> **`zug`-Begründung:** Ein Loop, der nur „genau" um den Gegenstand passt, hält nicht — Gummi
> muss gespannt sein. Print + Cut + Sew formuliert „less a little so the loop grips" ohne Zahl;
> `5 mm` ist unsere **Annahme [H]** und muss in der Testnähung kalibriert werden.

**Beispiel:** 6 Loops, Gegenstand 8 mm breit / 8 mm dick, Zug 5 mm
→ `loopLaenge = 8 + 16 − 5 = 19 mm`, `bandLaenge = 6 × 19 + 20 + 20 = 154 mm`

#### Geometrie

```text
   ┌──────────────────────────────────────┐
   │  ╭──╮  ╭──╮  ╭──╮  ╭──╮  ╭──╮  ╭──╮  │  ◀ 6 Schlaufen, je 19 mm Band
   │  │  │  │  │  │  │  │  │  │  │  │  │  │
   │  ╰──╯  ╰──╯  ╰──╯  ╰──╯  ╰──╯  ╰──╯  │
   └──────────────────────────────────────┘  ◀ Unterkante in Panelnaht
      ▲ Anlagepunkte = Knips-Positionen = Steppnähte
```

#### Mindestmaße

| Bedingung | Wert |
|---|---|
| `gegenstandBreite + gegenstandDicke ≥ bandbreite / 2` | sonst schlackert der Loop |
| `loopLaenge ≥ 8 mm` | sonst nicht nähbar |
| Abstand Loop–Loop `≥ 6 mm` | sonst Nähte überlappen |

#### Schnittteile

| Teil | Anzahl | Maße | Material |
|---|---|---|---|
| – (kein Stoffteil!) | – | – | – |

> **Besonderheit:** M04 erzeugt **kein** Schnittteil, sondern nur **Markierungen + Material**.
> Das ist der Grund, warum das Materialmodell (FR-60) `exact` und `estimated` trennen muss:
> Elastik ist hier die einzige Größe, und sie ist **exakt** berechenbar. Print + Cut + Sew macht
> das genauso — und das ist der Grund, warum es überzeugt.

#### Materialbedarf

| Material | Menge | Art |
|---|---|---|
| Gummiband `bandbreite` | `bandLaenge` | **exakt** |
| Garn | `loops × 4 mm × reihen` + Randnaht | geschätzt |

#### Nähoperationen

| # | ID | Operation | Vorbedingung |
|---|---|---|---|
| 1 | `mark-loop-positions` | Anlagepunkte auf Panel anzeichnen (aus Geometrie, mm-genau) | – |
| 2 | `cut-elastic` | Band auf `bandLaenge` schneiden | – |
| 3 | `pin-loops` | Band an Markierungen feststecken, Schlaufen gleichmäßig legen | 1, 2 |
| 4 | `stitch-loops` | An jeder Markierung quer über das Band steppen, verriegeln | 3 |
| 5 | `baste-ends` | Bandenden in der NZ verstecken | 4 |

> **Anleitungstext (FR-81) enthält konkrete Zahlen:** „Stecke das Band bei 5,0 / 24,0 / 43,0 / 62,0
> / 81,0 / 100,0 mm fest." — nicht „gleichmäßig verteilen". Das ist der Unterschied, den Phase 1
> als Vertrauensfaktor identifiziert hat.

#### Validierungsregeln

| ID | Bedingung | Schwere | Meldung | Vorschlag |
|---|---|---|---|---|
| `V-M04-01` | `breite < loops × (gegenstandBreite + 6 mm)` | error | „6 Schlaufen à 8 mm brauchen mind. 84 mm, die Reihe ist 60 mm." | `[Breite auf 84 mm]` / `[Loops auf 4]` |
| `V-M04-02` | `zug ≥ gegenstandDicke` | warn | „Der Loop würde nicht spannen." | `[Zug auf 5 mm]` |
| `V-M04-03` | `zug < 2` | warn | „Der Loop hält nichts — Band zu locker." | `[Zug auf 5 mm]` |
| `V-M04-04` | `reihen > 1` und Panelhöhe reicht nicht | error | „Zwei Reihen brauchen 40 mm, frei sind 30 mm." | `[Eine Reihe]` |
| `V-M04-05` | Loop überlappt `bodennaht` | error | „Elastik liegt in der Nahtzugabe." | `[Reihe 5 mm nach oben]` |

---

### M05 — Verschlusslasche (Band / Klett)

**Zweck.** Hält das Etui geschlossen. Für Rolle: zwei Bänder zum Knoten. Für Buchform: eine
Lasche mit Klett oder Druckknopf (M15 ist die Klettvariante).

**Warum im MVP:** Ohne Verschluss ist kein Etui fertig — es wäre ein unvollständiges Produkt.
Es ist außerdem das einzige MVP-Modul mit Bindung `edge` und beweist, dass die Architektur
mehr als nur Kanäle kann.

**Bindung:** `edge` (Sonderform von `channel` an einer Panelkante)

#### Parameter

| Name | Typ | Einheit | Min | Max | Default | Abgeleitet |
|---|---|---|---|---|---|---|
| `variante` | enum | – | `band` \| `klett` | – | `band` | nein |
| `bandLaenge` | length | mm | 60 | 600 | – | **ja** |
| `bandBreite` | length | mm | 15 | 60 | 25 | nein |
| `anzahl` | count | – | 1 | 2 | 2 | nein |
| `position` | enum | – | `mitte` \| `kante` | – | `mitte` | nein |
| `ueberlappung` | length | mm | 20 | 120 | 40 | nein |

**Ableitung:**

```text
bandLaenge = 2 × (umfang/anzahl) + ueberlappung
  bei Rolle: umfang = 2 × π × (aufgerollterRadius)  ≈ 2 × π × (tiefe/2 + lagen × 3 mm)
  bei Buch:  bandLaenge = 2 × tiefe + ueberlappung
```

> `[H]` Die Aufrollformel ist eine **Näherung**. Sie wird im MVP durch die **einfachere
> Buchform-Variante** umgangen: Für die Buchform ist `2 × tiefe + überlappung` exakt genug.
> Die Rollvariante erhält einen `warn`: „Bandlänge ist geschätzt — nach dem ersten Aufrollen
> prüfen." **Das ist eine bewusste, dokumentierte Ungenauigkeit.** Materialien, die geschätzt
> sind, müssen als geschätzt markiert sein (FR-60). Sie zu verstecken wäre der Fehler.

#### Schnittteile

| Teil | Anzahl | Maße | Fadenlauf | Material |
|---|---|---|---|---|
| `lasche` | `anzahl` | `(bandBreite + 2·NZ) × (bandLaenge + 2·NZ)` | längs | Außenstoff |

**Faltanleitung im Teil enthalten:** Längs falten, beide langen Kanten zur Mitte, erneut falten
→ fertige Breite `bandBreite/2`? **Nein:** Die Lasche wird **doppelt** gelegt, fertige Breite =
`bandBreite`. Zuschnittbreite = `2 × bandBreite + 2·NZ`. **Diese Verwechslung ist ein klassischer
Fehler und wird als Golden-Test abgesichert.**

#### Nähoperationen

| # | ID | Operation | Vorbedingung |
|---|---|---|---|
| 1 | `make-strap` | Lasche längs falten, beide Kanten zur Mitte, erneut falten, Kanten steppen | – |
| 2 | `attach-strap` | Lasche zwischen Außen- und Futterpanel einnähen, in der NZ | 1, `panel.lining-ready` |
| 3 | `install-klett` | (nur `klett`) Klettteil auf Gegenlasche steppen | 1 |
| 4 | `test-close` | (Anleitungshinweis) Schließen prüfen, Länge kürzen falls zu lang | 2 |

> **`attach-strap` hat eine harte Constraint:** Die Lasche **muss** vor der Panelnaht eingenäht
> werden. Sie kann nicht nachträglich befestigt werden. Das ist ein **Vorbedingungs-Knoten** im
> Operationsgraph und wird als `error` erzwungen (`construction-rules.md` §5).

#### Validierungsregeln

| ID | Bedingung | Schwere | Meldung | Vorschlag |
|---|---|---|---|---|
| `V-M05-01` | `bandBreite < 15 mm` | warn | „Schmale Bänder rollen sich." | `[25 mm]` |
| `V-M05-02` | `anzahl = 2` und `breite < 120 mm` | warn | „Zwei Bänder auf 100 mm liegen zu dicht." | `[Ein Band]` |
| `V-M05-03` | Rollvariante | info | „Bandlänge geschätzt — nach Aufrollen prüfen." | – |
| `V-M05-04` | `ueberlappung < 20 mm` | error | „Klett braucht mind. 20 mm Überlappung." | `[40 mm]` |

---

## 4. Geplante Module — Kurzspezifikation

> Alle `status: planned`: **keine Implementierung**, im UI sichtbar mit Begründung (FR-29).
> Die Kurzspezifikation existiert, damit die Architektur sie tragen kann — nicht, weil sie
> gebaut werden.

### M06 — Reißverschlusstasche

- **Zweck:** Fach mit Reißverschluss (Geld, Nadeln, Kleinteile).
- **Warum nicht MVP:** Ein Reißverschluss braucht eine **Reihenfolge-Abhängigkeit**
  (Naht vor Futter) und eine **Längenberechnung an Kurven**. Das ist der teuerste Einzelposten
  und der Punkt, an dem Print + Cut + Sew den größten Vorsprung hat (`competitors.md` §4.1,
  Zip-Around mit berechneter RV-Länge über Rundungen). **Phase 1, Risiko 5: „unmögliche
  Schnittmuster zerstören Vertrauen sofort."** Also: nicht im MVP, aber als nächstes Modul.
- **Parameter (Skizze):** `breite`, `hoehe`, `rvArt` (`naht`|`aufgesetzt`), `rvLaenge` (abgeleitet
  `= breite − 2·NZ`), `unterteilung`, `beidseitig`.
- **Kernproblem:** RV-Länge entlang einer Naht mit Kurven = Bogenlänge, nicht Bounding-Box.
  → `geometry-engine.md` §6 (Pfadlänge).

### M07 — Pinselhalter

- **Zweck:** Wie M04, aber für lange, dünne Gegenstände (Pinsel, Stifte) — höher, mit
  durchgehendem Band.
- **Warum nicht MVP:** Praktisch identisch zu M04 mit anderen Defaults → **keine neue
  Mechanik**. Wird gebaut, sobald M04 kalibriert ist (Konfiguration, nicht Code).
- **Parameter:** `pinselLaenge`, `pinselDurchmesser`, `anzahl`, `bandbreite`, `zug`.

### M08 — Werkzeughalter

- **Zweck:** Variabler Halter für unregelmäßige Werkzeuge (Schere, Maßband, Nahttrenner).
- **Warum nicht MVP:** Braucht pro Fach eigene Breite (Liste statt Skalar) — das ist eine
  **Datenmodell-Erweiterung** (`params` als Array), die bewusst nicht im MVP steckt.
- **Parameter:** `faecher: Array<{breite, hoehe}>`.

### M09 — Ringhalter

- **Zweck:** Gepolstertes Band mit Rillen für Ringe.
- **Warum nicht MVP:** Braucht **Polsterung/Volumen** (Vlieslagen, 3D-Form) und damit eine
  Materialdimension, die das MVP-Modell nicht hat (nur flächige Teile). Zusätzlich:
  „definierte Aufnahmekapazität" (Briefing) = Ringzahl pro cm, was eine **empirische** Größe ist,
  die kalibriert werden muss.
- **Offene Frage:** Polsterung als eigenes Material mit Dicke → `material-calculation.md` §2
  „layer thickness" fehlt im MVP. **Bewusst offen gelassen, dokumentiert.**

### M10 — Ohrringhalter

- **Zweck:** Fläche mit Steckmöglichkeit (Filz/Netz) für Ohrringe.
- **Warum nicht MVP:** Braucht **Slot-Bindung** (2D-Fläche, nicht Kanal) — genau der Fall, für
  den FR-30/FR-34 die Erweiterung vorbereitet. **Es ist der Testfall für die Erweiterbarkeit.**

### M11 — Kettenhalter

- **Zweck:** Haken oder Lasche, an der Ketten hängen und nicht verknoten.
- **Warum nicht MVP:** Braucht **Metallteile** (Karabiner, Ringe) als eigene Materialklasse mit
  Befestigungslöchern → Ösen setzen ist eine eigene Nähoperation mit Werkzeug (Ösenzange).
- **Offene Frage:** Ösen/Metallteile sind im Materialmodell vorgesehen, aber nicht implementiert.

### M12 — Trennwand

- **Zweck:** Unterteilt das Etui in zwei Bereiche.
- **Warum nicht MVP:** In der Buchform ist die Trennwand **strukturell** (Teil der Grundform),
  nicht modular. Als Modul wäre sie eine Doppelung. **Entscheidung: bleibt `planned`, wird
  ggf. gestrichen.** Ehrlicher als ein Modul, das nur ein Panel-Rand ist.

### M13 — Knopfverschluss

- **Zweck:** Knopf + Schlaufe statt Band.
- **Warum nicht MVP:** Braucht Knopfloch (eigene Operation, Fadenlauf-abhängig, dehnbar) → ein
  Knopfloch in einem Textilteil ist eine der fehleranfälligsten Nähoperationen.

### M14 — Druckknopf

- **Zweck:** Druckknopf (Kam Snaps) als Verschluss.
- **Warum nicht MVP:** Braucht **Werkzeug** (Zange, Ösen) und eine **Verstärkungslage** an der
  Knopfstelle, sonst reißt der Stoff. Diese „Material an Punkt X"-Logik fehlt im MVP-Modell
  (das nur Flächen kennt).

### M15 — Klettverschluss

- **Zweck:** Klett statt Band.
- **Warum nicht MVP:** **Kein eigenes Modul** — Variante von M05 (`variante: 'klett'`).
  Ein eigenes Modul wäre Duplikation (P3). Die Wunschliste wird durch M05 erfüllt.

### M16 — Aufhänger / Lasche

- **Zweck:** Schlaufe zum Aufhängen.
- **Warum nicht MVP:** Kein MVP-Nutzen nachgewiesen (Phase 1: keine Nachfrage artikuliert);
  einfache Ergänzung später (`edge`-Bindung, wiederverwendet M05-Mechanik).

---

## 5. Was die Modulbibliothek über das MVP hinaus trägt

### 5.1 Das Erweiterungsversprechen — konkret geprüft

| Erweiterung | Ändert sich am Datenmodell? | An Geometrie? | An Material? | An Export? |
|---|---|---|---|---|
| Neues `channel`-Modul (M07, M12) | nein | nein | nein | nein |
| Modul mit Liste von Fächern (M08) | **ja** (`params` Array) | nein | nein | nein |
| `slot`-Modul (M10) | **nein** (Feld existiert, FR-30) | nein | nein | nein |
| Modul mit Metalldetails (M11, M14) | **ja** (Punktmaterialien) | nein | **ja** | nein |
| Modul mit Volumen/Polsterung (M09) | **ja** (Schichtdicke) | **ja** (3D-Andeutung) | **ja** | nein |
| `free`-Bindung mit Solver | nein (Feld existiert) | **ja** (Kollision) | nein | nein |

**Bewertung [A]:** Vier von sechs Erweiterungen sind **ohne Modellbruch** möglich. Zwei
(Listen-Parameter, Punktmaterialien) sind additive Erweiterungen des Schemas. Nur Volumen/3D
greift in Geometrie und Material ein — und genau deshalb ist es **nicht** im MVP.

**Das ist die Antwort auf die Frage „ist die Architektur erweiterbar?": ja, mit zwei
benannten additiven Erweiterungspunkten, die bereits im Schema vorgesehen sind.**

### 5.2 Der Testfall für Erweiterbarkeit (verbindlich für Phase 3)

> Ein synthetisches Modul `TEST-SLOT` mit `bindung: 'slot'` muss durch **denselben** Pipeline-Pfad
> laufen (`construct → pieces → materials → export`) und ein gültiges SVG erzeugen, ohne dass
> eine Datei außerhalb von `modules/` geändert wird. Dieser Test existiert ab Tag 1 und ist der
> Beweis für FR-34.

---

## 6. Modul-Kategorien und Bibliotheks-UX

| Kategorie | Module (MVP fett) | Icon |
|---|---|---|
| **Nadeln** | **M03** | Nadelstrich |
| **Taschen** | **M01**, **M02**, M06 | Fach-Symbol |
| **Halter** | **M04**, M07, M08, M09, M11 | Schlaufe |
| **Schmuck** | M10, M11 | Ring |
| **Struktur** | M12, M16 | Linie |
| **Verschluss** | **M05**, M13, M14, M15 | Lasche |

**Bibliotheks-Regeln:**

- Maximal **6 Kategorien** – mehr ist Navigation, nicht Ordnung.
- `planned`-Module sind **sichtbar**, mit Badge „Stufe 2" und deaktiviertem Drag (FR-29).
- **Suche** (ab `S`) findet über deutschen und englischen Namen und Synonyme („Gummiband",
  „elastic", „Schlaufe", „loop").
- **Favoriten** lokal gespeichert, ohne Konto.
- **Sortierung** innerhalb der Kategorie: MVP-Module zuerst, dann geplant.

---

## 7. Offene Punkte aus der Modulspezifikation

| # | Offener Punkt | Betrifft | Klärung |
|---|---|---|---|
| **O-M1** | Nahtluft 1,0 mm und Randnaht 5,0 mm sind Annahmen | M03, alle | **Testnähung** kalibriert sie |
| **O-M2** | `zug = 5 mm` für Elastik ist eine Annahme | M04 | Testnähung, je Bandbreite unterschiedlich |
| **O-M3** | Rollformel für Bandlänge ist Näherung | M05 | MVP: Buchform bevorzugt; Rollvariante mit `warn` |
| **O-M4** | Polsterung/Schichtdicke fehlt im Materialmodell | M09 | Vor Stufe 2 zu entscheiden: Schema-Erweiterung |
| **O-M5** | Punktmaterialien (Ösen, Druckknöpfe) fehlen | M11, M14 | Schema-Erweiterung, additiv |
| ~~**O-M6**~~ | ~~`lage: innen` bei M01 konstruktiv unklar~~ | M01 | **erledigt:** Feld entfällt, Panel ist immer zweilagig (K-02) |
| **O-M7** | M12 (Trennwand) ist evtl. kein Modul, sondern Grundform | M12 | Ggf. streichen — Entscheidung in Stufe 2 |

**Diese sieben Punkte sind kein Versäumnis, sondern das Ergebnis einer ehrlichen Spezifikation.**
Sechs davon sind Meldungen für die Testnähung oder für Stufe 2; nur O-M4/O-M5 sind echte
Architekturentscheidungen (und beide additiv).
