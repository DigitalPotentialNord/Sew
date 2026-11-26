# Entscheidungsvorlage (1 Seite)

Stand: 26.11.2026 · Grundlage: [`README.md`](README.md) · [`market-landscape.md`](market-landscape.md) ·
[`competitors.md`](competitors.md) · [`customer-research.md`](customer-research.md) ·
[`keyword-research.md`](keyword-research.md) · [`opportunity-analysis.md`](opportunity-analysis.md) ·
[`business-model.md`](business-model.md)

---

## Die Frage

Gibt es einen echten CAD-ähnlichen Organizer-Designer, in dem Nutzer das Innenleben eines
Mäppchens frei konstruieren und daraus ein vollständiges, nähbares Schnittmuster erhalten?

## Die Antwort

**Nein. Die Lücke existiert – aber sie ist eine Integrations- und Domänenlücke, keine
Erfindungslücke.**

| Was fehlt | Was schon da ist (und zwar gratis) |
|---|---|
| Objektbasierter, frei positionierbarer Innenraum-Editor | Parametrische Organizer-Schnittmuster mit Elastik-/RV-Berechnung, Zuschnittliste, Stoffschätzung und Nähanleitung → **Print + Cut + Sew, 0 €, ohne Konto** |
| Modulbibliothek für Halterungen (Ohrring, Kette, Pinsel, Nadelkanal) | 3D-Parametrik + Export → **Atomm/xTool, 0 €** |
| Domänen-Constraints (Loop-Länge, Fachtiefe, Kollision) | Vollständige Constraint-, Nahtzugaben-, Material- und Nesting-Logik → **OpenSloper, Open Source, 0 €** |
| — | Modulbaukästen für Taschen-Innenleben als **Produkt** → **shesmile „Innenleben 1–3"** |

## Die harten Zahlen

- Handarbeitsmarkt DE: **960 Mio. €** – davon „Anleitungen" (Schnittmuster): **48 Mio. €** = **5 %**
- Nähsegment: **schrumpfend** (Stoffe −10 % 2024→2025). Stricken/Häkeln: **+7 %**
- Suchintention: `federmäppchen nähen schnittmuster` → Platz 1 ist **„kostenlos pdf"**
- Werkzeug-Suche: `custom bag pattern generator` → **keine Vervollständigung existiert**
- Conversion-Rechnung: Für 3.000 €/Monat braucht es **~118.000 Besuche/Monat** → unrealistisch
- Makerist (70.000 Patterns, 1.200 Designer) ist **trotzdem geschlossen** worden

## Die Entscheidung

> ## Bedingtes GO
> **Gebaut wird nicht der Organizer-CAD, sondern ein Innenleben-Konfigurator für
> Strick- und Häkelnadel-Etuis.**

**Positionierung:** „Dein Etui. Gerechnet, nicht gesucht."
Füllmengen rein → Layout-Vorschlag → Schnittmuster, Zuschnittliste, Stoffmenge, Anleitung.
Ohne Konto. Erstes Ergebnis gratis.

**Warum diese Nische:** Stricken wächst, Ravelry hat 8–11 Mio. Nutzer:innen, „stricknadel etui"
hat belegte Näh-Intention, und **es gibt keinen Generator dafür**.
**Warum nicht Schmuck/Make-up:** `make up organizer` ist **vollständig retail** (ikea, dm,
action) – **null Näh-Intention in den Suchdaten**.

## MVP (8–12 Wochen)

Nadel-Etui · Füllmengen-Input · regelbasierter Layout-Vorschlag · Ziehen von Fachtrennern ·
Live-Validierung · PDF (A4-getiled, 50-mm-Kalibrierung) · **SVG** · Zuschnittliste ·
Stoffverbrauch · konfigurationsspezifische Anleitung · kein Konto · DE+EN

**Nicht im MVP:** freie 2D-Fläche · 3D · weitere Projekttypen · Konten · Marketplace ·
KI-Prompting · Hobby-Abo · App · Nesting

## Modell

`Gratis (ohne Konto)` → `14 € einmalig` → `29 €/Monat Gewerbe`
**Kein Hobby-Abo.** Hobby-Einmalkäufe allein tragen nicht – das Modell muss auf Gewerbe
und Material-Affiliate (Sewunity-Muster) gebaut werden.

## Abbruchkriterien (vorher festschreiben)

| K | Kriterium | Schwelle |
|---|---|---|
| K1 | Nachfrage | < 200 Etuis in 8 Wochen → **No-Go** |
| K2 | Zahlungsbereitschaft | < 0,5 % Conversion nach 12 Wochen → **No-Go für B** |
| K3 | Passgenauigkeit | > 15 % „passt nicht"-Meldungen → **Baustopp** |
| K4 | Wiederkehr | < 10 % zweites Etui → Einmal-Tool, kein Produkt |
| K5 | Wettbewerb | Print + Cut + Sew/Atomm bringt Nadel-Etui → Wechsel auf Gewerbe |

## Vor der ersten Codezeile (2 Wochen, ~500 €)

1. **Print + Cut + Sew selbst nähen** (Zip-Around + Roll-Up Case) – die wichtigste Einzelaufgabe
2. 5–8 Gespräche mit Stricker:innen: *„zeig mir deine Nadelbox"* (nicht: „würdest du nutzen")
3. Fake-Door-Landingpage + Preistest 9/14/19 €
4. Rechtsprüfung GPLv3 (OpenSloper) + USt/Widerruf

## Der ehrlichste Satz

> Dieses Produkt kann scheitern, weil die Menschen, die das Problem haben, es bereits
> **kostenlos** gelöst bekommen – von einem Anbieter, der kein Geld braucht, keine Konten will
> und keine Werbung schaltet. Es muss in **3 Minuten** etwas liefern, das **besser passt**.
> Gelingt das nicht, gibt es weder Grund zu zahlen noch Grund zu wechseln.
