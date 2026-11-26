# Pattern Data Model

Stand: 26.11.2026 · Geometrie: [`geometry-engine.md`](geometry-engine.md) ·
Module: [`../product/module-library.md`](../product/module-library.md)

---

## 1. Die zentrale Regel: Gespeichert wird nur die Absicht

> **Das Projekt enthält Entscheidungen. Es enthält keine Ergebnisse.**

Alles, was berechnet werden kann, wird **nicht** gespeichert (P3). Das ist keine Stilfrage,
sondern die Voraussetzung dafür, dass:

- ein alten Projekt nach einem Regelwerk-Update **korrekt neu** gerechnet wird (statt mit
  veralteten Maßen),
- Golden-Tests einen Hash über *Eingaben* bilden können,
- Undo/Redo klein bleibt,
- ein Import nie inkonsistente Daten erzeugt.

```text
GESPEICHERT (Absicht)                 BERECHNET (Ergebnis, nie gespeichert)
─────────────────────                 ──────────────────────────────────────
Grundform                             Panels, Kanäle
Abmessungen (B, H, T)                 Modulgeometrie, Positionen
Module + Parameter                    Schnittteile, Nahtzugaben, Knipse
Nahtzugabe (global/überschrieben)      Materialmengen, Stoffverbrauch
Materialwahl (Stoffart)                Nähoperationen (Reihenfolge)
Sprache, Einheit (Anzeige)             Findings (Warnungen)
                                      Layout/Tiling
```

**Die Prüfung:** Jedes Feld im Schema, das in `Construction` ebenfalls vorkommt, ist ein
Fehler — außer es ist ein **Eingabewert**, der bewusst gespiegelt wird (z. B. `seamAllowanceMm`).

---

## 2. Das Projektschema

### 2.1 Wurzelobjekt

```ts
interface Project {
  readonly schemaVersion: 1;              // siehe §6
  readonly id: ProjectId;                 // nanoid, lokal
  readonly meta: ProjectMeta;
  readonly base: BaseShape;               // Grundform + Abmessungen
  readonly panels: readonly PanelSpec[];  // Trägerflächen
  readonly modules: readonly ModuleInstance[];
  readonly settings: ProjectSettings;
}

interface ProjectMeta {
  readonly name: string;                  // "Nadel-Etui"
  readonly createdAt: string;             // ISO 8601 — NUR Metadatum, nie in Konstruktion
  readonly updatedAt: string;             // dito
  readonly locale: 'de' | 'en';
}

interface ProjectSettings {
  readonly seamAllowanceMm: Mm;           // die EINE Wahrheit, Default 10 (s. §2.1.1)
  readonly unit: 'mm' | 'cm' | 'inch';    // nur Anzeige
  readonly fabricWidthMm: Mm;             // für Verbrauchsschätzung, Default 1400
  readonly stitchLengthMm: Mm;            // für Garnverbrauch, Default 3
}
```

#### 2.1.1 Nahtzugabe: eine Wahrheit, zwei Ebenen *(Architekturprüfung K-01)*

Die Nahtzugabe existiert in mehreren Dokumenten. Damit es **genau eine** Wahrheit gibt:

```ts
// domain/src/settings/seam.ts — die einzige Auflösung, überall importiert
function effectiveSeamAllowance(m: ModuleInstance, s: ProjectSettings): Mm {
  return m.overrides.seamAllowanceMm ?? s.seamAllowanceMm;
}
```

| Ebene | Rolle | Vorrang |
|---|---|---|
| `ProjectSettings.seamAllowanceMm` | **die Wahrheit** | Basis |
| `ModuleOverrides.seamAllowanceMm?` | Ausnahme pro Modul (FR-71) | **gewinnt** |
| `PRACTICE.seamAllowanceMm` | liefert nur den **Default beim Anlegen** eines Projekts | wird danach **nie** gelesen |
| Formeln in `module-library.md` (`nz`) | Ergebnis von `effectiveSeamAllowance` | – |

**Verboten:** `PRACTICE.seamAllowanceMm` irgendwo außer in `createProject()`. Test `T-D-06`:
Projekt mit global 10 + Modul-Override 8 ⇒ das Modul-Teil ist exakt 4 mm schmaler.

> **`createdAt`/`updatedAt` sind die einzige Ausnahme von P4** (keine Zeit in der Konstruktion).
> Sie werden im Schema geführt, aber `construct()` **darf sie nicht lesen** — erzwungen durch
> einen Test, der ein Projekt mit zwei verschiedenen Zeitstempeln konstruiert und identische
> Hashes erwartet.

### 2.2 Grundform

```ts
type BaseShape =
  | { readonly kind: 'book';
      readonly widthMm: Mm;          // je Flügel
      readonly heightMm: Mm;
      readonly cornerRadiusMm: Mm;
      readonly spineWidthMm: Mm }    // Bund — EINE Breite im Zuschnitt, kein eigenes Teil
  | { readonly kind: 'roll';
      readonly widthMm: Mm;
      readonly heightMm: Mm;
      readonly cornerRadiusMm: Mm
      readonly tieCount: 1 | 2 };
```

**Warum nur zwei Varianten im Typ:** Weil der Typ die Wahrheit über den MVP-Umfang sagt.
Eine dritte Form ist ein **Typwechsel** — also eine bewusste, geprüfte Entscheidung, kein
Versehen.

#### 2.2.1 Kein `depthMm` — der MVP ist flach *(Architekturprüfung K-02)*

`depthMm` war im Schema, wurde von `V-G-02` geprüft — und erzeugte **kein Schnittteil**. Ein
Etui mit „40 mm Tiefe" in der Beschriftung und einem flachen Blatt als Zuschnitt ist **nicht
nähbar**. Deshalb:

| Entscheidung | Konsequenz |
|---|---|
| **`depthMm` wird gestrichen** (Feld verschwindet, nicht „0 als Wert") | keine Tiefenprüfung, keine Scheinaussage |
| Ein Etui ist **zweilagig**: `panel-aussen` + `panel-futter`, gleiche Maße, rechts auf rechts, gewendet | Futter wird real (statt nur Materialzeile); `panel.lining-ready` existiert |
| Der **Bund** (`spineWidthMm`) ist eine Breite im Panel-Zuschnitt, kein eigenes Schnittteil | `panelWidthTotal = 2 × widthMm + spineWidthMm` |
| **Bodenecke/Volumen** (boxed corner) | **Stufe 2.** Braucht eigenes Teil, Faltlinien, Operation `sew-box-corners` und eine eigene Testnähung |

**Warum:** Phase 1 hat „3D" ausgeschlossen (`mvp-scope.md` §2). `depthMm` war der Rest davon im
Schema. Ein Nadel-Etui ist realistisch flach; die Fläche ist dann die Wahrheit.

**Struktureller Test dafür: `T-S-01`** (`testing-strategy.md` §6.3) — für jedes Projekt muss
`pieces` mindestens `panel-aussen`, `panel-futter` und ein Teil pro platziertem Modul enthalten.

**Abgeleitet aus `base` (nicht gespeichert):**

| Größe | Formel |
|---|---|
| `panelCount` | `book → 2`, `roll → 1` |
| `panelWidthMm` | `book → widthMm`, `roll → widthMm` |
| `panelHeightMm` | `heightMm` |
| `panelWidthTotalMm` | `book → 2 × widthMm + spineWidthMm`, `roll → widthMm` |
| `usableChannelMm` | `panelWidthMm − 2 × edgeMarginMm − 2 × effectiveSeamAllowance` |
| `panelPieces` | immer `['panel-aussen', 'panel-futter']` (gleiche Maße) |

### 2.3 Trägerflächen und Kanäle

```ts
interface PanelSpec {
  readonly id: PanelId;                   // 'p1' | 'p2'
  readonly role: 'front' | 'back';
  readonly channels: readonly ChannelSpec[];
}

interface ChannelSpec {
  readonly id: ChannelId;                 // 'c1'
  readonly axis: 'x' | 'y';               // MVP: immer 'x'
  readonly attach: 'bottom' | 'top';      // Anlagekante
  readonly lengthMm: Mm | 'auto';         // 'auto' = usableChannelMm
  readonly modules: readonly ModuleRef[]; // GEORDNET — die Sequenz
}

interface ModuleRef {
  readonly moduleId: ModuleId;            // Verweis in project.modules
}
```

**Die Reihenfolge lebt im `ChannelSpec.modules`-Array**, nicht in Koordinaten. Das ist die
technische Umsetzung von PRD FR-32 und der Grund, warum Kollisionen unmöglich sind.

### 2.4 Modulinstanz

```ts
interface ModuleInstance {
  readonly id: ModuleId;
  readonly binding: Binding;              // siehe system-architecture.md §5
  readonly params: ModuleParams;          // typspezifisch, Zod-validiert
  readonly overrides: ModuleOverrides;
}

interface ModuleOverrides {
  readonly seamAllowanceMm?: Mm;          // pro Modul (FR-71) — gewinnt gegen global (K-01)
  readonly locked?: boolean;              // FR-27
}

// Der Modultyp lebt GENAU EINMAL: als Diskriminant von params.type.
// (Architekturprüfung M-11: ein zweites Feld `type` wäre eine zweite Wahrheit.)

// Vereinigung statt offener Map: jeder Modultyp hat ein eigenes, geprüftes Schema
type ModuleParams =
  | { readonly type: 'M01'; readonly breite: Mm; readonly hoehe: Mm; readonly sections: number; readonly steg: Mm; readonly saum: 'saum' | 'einschlag'; readonly saumbreite: Mm }
  | { readonly type: 'M03'; readonly nadelLaenge: Mm; readonly nadelStaerke: Mm; readonly paare: number; readonly zugabe: Mm; readonly verstaerkung: boolean }
  | { readonly type: 'M04'; readonly breite: Mm; readonly loops: number; readonly gegenstandBreite: Mm; readonly gegenstandDicke: Mm; readonly bandbreite: Mm; readonly zug: Mm; readonly reihen: number }
  | { readonly type: 'M05'; readonly variante: 'band' | 'klett'; readonly bandBreite: Mm; readonly anzahl: 1 | 2; readonly ueberlappung: Mm };
```

**Warum eine diskriminierte Union und keine `Record<string, number>`:**

| Union | offene Map |
|---|---|
| Zod prüft pro Typ exakt | alles erlaubt, nichts geprüft |
| TypeScript kennt die Parameter | `params.breite` ist `any` |
| Ein neues Modul = ein neuer Union-Zweig (Compiler zwingt zur Vollständigkeit) | neues Modul = vergessene Validierung |
| Fehlermeldung nennt das Feld | „ungültig" |

**Der Preis:** Jedes neue Modul berührt eine zentrale Datei. **Das ist gewollt** — es erzwingt,
dass ein neues Modul nicht „nebenbei" entsteht (P6).

---

## 3. Was `construct()` daraus macht

```ts
interface Construction {
  readonly projectHash: string;            // für Memoisierung & Determinismus-Test
  readonly panels: readonly PlacedPanel[]; // Flächen + Kanäle (Weltkoordinaten)
  readonly modules: readonly PlacedModule[];
  readonly pieces: readonly PatternPiece[]; // siehe geometry-engine.md §4.2
  readonly materials: readonly MaterialRequirement[];
  readonly operations: readonly SewingOperation[];
  readonly findings: readonly Finding[];
  readonly metrics: ConstructionMetrics;    // Fläche, Teilezahl, Kanalauslastung
}
```

**`Construction` ist flüchtig.** Sie wird nie persistiert, nie exportiert (außer als SVG/PDF, was
Rendering ist), nie in localStorage geschrieben. Nur `Project` wird gespeichert (FR-92 exportiert
`Project`).

**Warum nicht beides exportieren:** Wenn man eine `Construction` importieren könnte, könnte man
eine Konstruktion einschleusen, die das Regelwerk nicht erzeugt hat. **`Project` ist die einzige
Importfläche** — das ist eine Sicherheits- und Korrektheitsentscheidung.

---

## 4. Der „Eine Quelle"-Check (automatisiert)

Ein CI-Test prüft das Schema gegen eine Verbotsliste doppelter Felder:

```ts
const FORBIDDEN_IN_PROJECT = [
  'cutOutline', 'netOutline', 'area', 'lengthM', 'fabricMeters',
  'positions', 'x', 'y', 'width' /* als berechnete Modulbreite */,
  'elasticLength', 'zipLength', 'stepOrder', 'warnings',
];
```

Findet der Test eines dieser Felder im serialisierten Projekt, **bricht der Build**. Das ist die
maschinelle Durchsetzung von P3.

---

## 5. Validierung mit Zod — die Schichten

```text
Ebene 1  Struktur        ProjectSchema.parse(raw)          → Formfehler
Ebene 2  Semantik        SuperRefine: Referenzen gültig?   → "moduleId existiert nicht"
                         (channel.modules → project.modules)
Ebene 3  Grenzen         pro Modultyp (min/max/cm)         → "breite < 20 ist ungültig"
Ebene 4  Konstruktion    Regeln in construct()             → Finding (warn/error)
```

**Der entscheidende Punkt:** Ebene 1–3 sind **harte Fehler** (ungültige Daten werden nie
gespeichert). Ebene 4 erzeugt **Findings** — der Nutzer darf einen Zustand mit `warn` haben, aber
nie mit ungültigen Daten.

| Ebene | Reaktion bei Verstoß |
|---|---|
| 1–2 | Import abgelehnt, Rohdaten-Download angeboten |
| 3 | UI klemmt Eingabe vor dem Speichern; nie ein Verstoß im Store |
| 4 | Finding, sichtbar, mit Vorschlag |

---

## 6. Versionierung und Migration

### 6.1 Warum jetzt schon Versionierung

Ein Projekt, das heute gespeichert wird, muss in sechs Monaten noch laden. Ohne Versionierung ist
das nicht möglich — und Phase 1 hat gezeigt, dass **verlorene Käufe/Daten ein ausdrückliches
Akzeptanzproblem** in diesem Markt sind (Makerist: Nutzer:innen mussten alle Käufe retten;
Sewunity: Altinhalte verschwunden). *„Nutzer:innen berichten, sie müssten bei Plattformwechseln
alle gekauften Schnitte neu herunterladen."*

> **Ein Tool, das Projekte verliert, verliert Nutzer:innen.** Versionierung ist hier kein
> Ingenieursluxus, sondern eine direkte Antwort auf einen belegten Marktschmerz.

### 6.2 Mechanik

```ts
type Migration = (input: unknown) => unknown;

const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2: Beispiel, wie eine Migration aussieht
  // 1: (p: any) => ({ ...p, schemaVersion: 2, settings: { ...p.settings, stitchLengthMm: 3 } }),
};

function migrate(raw: unknown): Project {
  let cur = raw;
  while (isObject(cur) && typeof cur.schemaVersion === 'number' && cur.schemaVersion < CURRENT) {
    const m = MIGRATIONS[cur.schemaVersion];
    if (!m) throw new MigrationError(`Keine Migration von Version ${cur.schemaVersion}`);
    cur = m(cur);
  }
  return ProjectSchema.parse(cur);   // Endvalidierung immer
}
```

**Regeln (verbindlich):**

| # | Regel | Warum |
|---|---|---|
| **M1** | Migrationen sind **kumulativ und gerichtet** (n → n+1), nie „n → n+3" | jede Stufe einzeln testbar |
| **M2** | Eine Migration **löscht nie Daten**, sie verschiebt/ergänzt | Datenverlust ist irreparabel |
| **M3** | Jede Migration hat einen Fixture-Test (altes JSON rein → gültiges neues raus) | Regressionsschutz |
| **M4** | `schemaVersion` wird **nur** erhöht, wenn alte Projekte sonst falsch laden | Inflation vermeiden |
| **M5** | Bei fehlgeschlagener Migration: Rohdaten-Download + Beispiel laden (F14) | kein Totalverlust |
| **M6** | Neue Felder sind **optional mit Default** im Schema, wenn möglich | vermeidet Migration |

### 6.3 Kompatibilitätsversprechen

> **Ein Projekt, das in Version X gespeichert wurde, lädt in jeder späteren Version.**
> Rückwärts (neu → alt) gibt es **kein** Versprechen; ältere Builds zeigen bei zu neuer Version:
> „Dieses Projekt wurde mit einer neueren Version erstellt. [App aktualisieren]".

---

## 7. Serialisierung

### 7.1 Drei Formate, drei Zwecke

| Format | Inhalt | Zweck | Stabilität |
|---|---|---|---|
| **localStorage** | `Project` (JSON) | Wiederaufnahme im Browser | schema-versioniert |
| **Datei `.organizer.json`** | `Project` + Export-Metadaten | Sichern, Weitergeben, Backup | **stabil, dokumentiert** |
| **URL-Fragment `#p=…`** | `Project` komprimiert (deflate + base64url) | Teilen | nur „best effort", Größenlimit |

**URL-Fragment bewusst „best effort":** Ein Link mit 30 Modulen kann die praktische URL-Länge
überschreiten. Deshalb: Wenn die kodierte Länge > 8.000 Zeichen ist, wird **kein** Link
angeboten, sondern der Datei-Export (`[Als Datei teilen]`). Ein abgeschnittener Link, der ein
kaputtes Projekt lädt, wäre schlimmer als kein Link.

### 7.2 Dateiformat (Beispiel)

```json
{
  "format": "organizer-studio/project",
  "schemaVersion": 1,
  "exportedAt": "2026-11-26T10:12:00.000Z",
  "appVersion": "0.1.0",
  "project": {
    "schemaVersion": 1,
    "id": "p_7f3a…",
    "meta": { "name": "Nadel-Etui", "createdAt": "…", "updatedAt": "…", "locale": "de" },
    "base": { "kind": "book", "widthMm": 240, "heightMm": 180, "cornerRadiusMm": 20, "spineWidthMm": 40 },
    "panels": [
      { "id": "p1", "role": "front", "channels": [
        { "id": "c1", "axis": "x", "attach": "bottom", "lengthMm": "auto",
          "modules": [ { "moduleId": "m1" }, { "moduleId": "m2" } ] } ] } ],
    "modules": [
      { "id": "m1", "binding": { "kind": "channel", "panelId": "p1", "channelId": "c1" },
        "params": { "type": "M03", "nadelLaenge": 200, "nadelStaerke": 4, "paare": 1, "zugabe": 10, "verstaerkung": true } },
      { "id": "m2", "binding": { "kind": "channel", "panelId": "p1", "channelId": "c1" },
        "params": { "type": "M04", "breite": 80, "loops": 6, "gegenstandBreite": 8, "gegenstandDicke": 8, "bandbreite": 10, "zug": 5, "reihen": 1 } }
    ],
    "settings": { "seamAllowanceMm": 10, "unit": "cm", "fabricWidthMm": 1400, "stitchLengthMm": 3 }
  }
}
```

**Warum `format` getrennt von `schemaVersion`:** `format` identifiziert die Dateiart (für
Drag-&-Drop-Erkennung), `schemaVersion` die Datenversion. Zwei Fragen, zwei Felder.

---

## 8. Invarianten (getestet, nicht nur dokumentiert)

| # | Invariante | Test |
|---|---|---|
| **I1** | Jede `ModuleRef.moduleId` existiert in `project.modules` | Zod `superRefine` + Test |
| **I2** | Jedes Modul ist in **genau einem** Kanal referenziert (oder `edge`) | Refine + Test |
| **I3** | Kein Modul ist verwaist (in `modules`, aber in keinem Kanal) | Refine + Test |
| **I4** | Alle `Mm`-Werte sind Integer ≥ 0 (außer Offsets, die negativ sein dürfen) | Zod |
| **I5** | `schemaVersion` ist vorhanden und ≤ `CURRENT` | Zod + migrate |
| **I6** | Summe der Modulbreiten im Kanal ≤ Kanallänge | Konstruktion (`error`-Finding) |
| **I7** | `construct(project)` zweimal → identischer `projectHash` | Golden |
| **I8** | `createdAt`/`updatedAt` beeinflussen `projectHash` **nicht** | Test |
| **I9** | Round-Trip: `parse(serialize(p))` → identischer Hash wie `p` | Property-Test |
| **I10** | Kein Feld aus `FORBIDDEN_IN_PROJECT` im Serialisat | CI-Test |
| **I11** | `certainty(Material) = min(certainty(sources))` — Schätzung vererbt sich nach oben | Property (T-M-13) |
| **I12** | Kein Schnittteil mit Fläche 0 und `kind: 'cut'` | Property (T-X-16) |

---

## 9. Referenzintegrität: der einzige Ort mit „Löschen"-Problematik

Beim Löschen eines Moduls müssen drei Dinge konsistent bleiben:

```text
1. project.modules         → Modul entfernen
2. channel.modules[]       → Ref entfernen
3. session.selection       → falls betroffen: Auswahl aufheben (Session, nicht Projekt)
```

**Das ist die einzige Stelle, an der ein Command mehrere Strukturen berührt** — deshalb ist sie
als **atomarer Command** implementiert (`module:remove`) und getestet, inklusive Undo. Ein
generisches „lösche alle Referenzen"-Utility wäre die typische Quelle für verwaiste Module.

---

## 9a. `ObjectPreset` — die Maße der eigenen Sachen *(Architekturprüfung M-15)*

Phase 1 (`customer-research.md` §4) identifiziert das **Messen der eigenen Gegenstände** als
wertvollsten Moment; F5 setzt es um — und dann ist es weg. Beim zweiten Etui tippt die Nutzerin
ihre Nadellängen erneut ein. Deshalb:

```ts
// NICHT Teil von Project. Eigener localStorage-Schlüssel, eigener Lebenszyklus.
interface ObjectPreset {
  readonly id: string;
  readonly name: string;            // "Meine Addi 20 cm"
  readonly kind: 'needle-set' | 'hook' | 'object';
  readonly nadelLaenge: Mm;
  readonly nadelStaerke: Mm;
  readonly anzahl: number;
}
```

| Eigenschaft | Wert | Warum |
|---|---|---|
| Speicherort | `localStorage`, Schlüssel `os.presets.v1` | kein Konto, kein Backend (NFR-07 bleibt erfüllt) |
| Teil des Projekts? | **nein** | ein Preset ist keine Konstruktionsabsicht |
| Teil des Exports? | **nein** | Projekte bleiben portabel und selbsttragend |
| Migration | eigene, unabhängige Version | ältere Presets dürfen uralt sein, ohne das Projekt zu blockieren |
| Löschbar | ja, einzeln | Datenschutz ohne Erklärung |

**Wirkung:** ein Klick statt vier Eingaben. Und es macht Phase-1-Kriterium **K4** („< 10 % bauen
ein zweites Etui") überhaupt erst erreichbar — ein zweites Etui, bei dem man alles neu tippt,
baut man nicht.

---

## 10. Was dieses Modell bewusst nicht enthält

| Nicht enthalten | Warum | Wann |
|---|---|---|
| Positionskoordinaten (x/y) für Module | folgen aus Sequenz + Parametern (P3) | `slot`/`free` bringen sie **als Teil der Bindung** |
| Berechnete Maße | eine Quelle (P3) | nie |
| Verlauf/Undo-Historie | Session, nicht Projekt | nie im Export |
| Viewport/Zoom/Selektion | Session | nie |
| Nutzerprofil, Konto, E-Mail | P5, FR-01 | nie |
| Objekt-Presets (`ObjectPreset`) | eigene localStorage-Domäne, nicht Projekt (§9a) | nie im Projekt |
| Telemetrie/IDs | NFR-07 | nie |
| Bilder/Thumbnails | ableitbar | optional in Session-Cache |
| Lokalisierte Texte im Projekt | nur `locale` als Präferenz; Texte kommen aus dem Wörterbuch | nie (sonst veraltete Texte in alten Projekten) |

> **Der letzte Punkt ist wichtig:** Ein Projekt speichert **keine** Anleitungstexte. Sonst würde
> ein Nutzer, der ein altes Projekt öffnet, eine alte (möglicherweise fehlerhafte) Anleitung
> sehen. Stattdessen: aktuelles Wörterbuch + aktuelle Operationen → **immer die beste Anleitung**,
> die wir kennen. Das ist eine stille, aber wertvolle Eigenschaft.
