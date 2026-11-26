# Chancenanalyse, Positionierung & Go/No-Go

Stand: 26.11.2026 · Methode und Beweisregeln: siehe [`README.md`](README.md)

**Dieses Dokument enthält die Entscheidung.** Wer nur ein Dokument liest, liest dieses.

---

## 1. Die Ausgangslage in fünf Sätzen

1. Die Produktidee beschreibt eine **echte, präzise Lücke**: objektbasierter, frei
   positionierbarer Innenraum-Editor mit Domänen-Constraints und automatischer Nähkonstruktion
   existiert bei **keinem** der 32 geprüften Anbieter.
2. Aber **jeder Baustein existiert bereits – überwiegend kostenlos**: Print + Cut + Sew liefert
   parametrische Organizer-Schnittmuster inkl. Elastik-/Reißverschlussberechnung,
   Zuschnittliste, Stoffschätzung und Nähanleitung für **0 €**; Atomm liefert dasselbe mit
   **3D** für **0 €**; OpenSloper liefert die **komplette Constraint- und Material-Logik**
   als Open Source.
3. Die Nachfrage nach dem *Ergebnis* ist belegt und tief, die Nachfrage nach dem *Werkzeug* ist
   **näherungsweise null** und muss erst erzeugt werden.
4. Der zahlungsfähige Kern ist **nicht** die breite Hobby-Masse (die erwartet „kostenlos pdf"),
   sondern **Gewerbliche mit Zeitdruck** und **Fortgeschrittene, die ein Werkzeug suchen**.
5. Der adressierbare Geldtopf ist klein: „Anleitungen" sind in Deutschland ein **48-Mio.-€-Markt**
   innerhalb eines **960-Mio.-€-Handarbeitsmarkts**, dessen Nähsegment **schrumpft**.

---

## 2. Drei Produktpositionierungen — und die Bewertung

### Positionierung A — „Der Organizer-CAD" (die Idee, wie sie im Briefing steht)

> *„Ein CAD-ähnlicher Konstruktionseditor, in dem du das Innenleben deiner Taschen frei baust –
> mit Modulen, Abhängigkeiten, Materialberechnung und automatischem Schnittmuster."*

| Kriterium | Bewertung | Begründung |
|---|---|---|
| Differenzierung | 🟢 **hoch (8/10)** | objektbasierter Innenraum-Editor existiert nicht |
| Marktpotenzial | 🔴 **niedrig (3/10)** | Werkzeug-Nachfrage ≈ 0; Hobby zahlt nicht; Suchintention fehlt |
| Entwicklungsaufwand | 🔴 **sehr hoch (9/10)** | Constraint-Solver, Freiform-Nahtzugabe, Kollision, Tiefe, Reißverschluss an Rundungen, SVG/PDF-Rendering, 3D |
| Zielgruppenreichweite | 🔴 **klein (3/10)** | nur Fortgeschrittene + Gewerbe |
| Monetarisierung | 🟡 **mittel (5/10)** | Einmalkauf 15–29 €, Gewerbe-Abo möglich, aber kleine Basis |
| Wettbewerbsrisiko | 🔴 **hoch (8/10)** | Print + Cut + Sew/Atomm können 80 % in Wochen nachziehen; KI entwertet die Bedienform |
| **Summe** | **36/70** | |

**Urteil:** Das ist das **richtige Produkt für eine falsche Zielgruppe**. Als Open-Source- oder
Profi-Werkzeug sinnvoll; als Geschäft gegen 0-€-Konkurrenz und schrumpfendes Segment **nicht
tragfähig**.

---

### Positionierung B — „Der Innenleben-Konfigurator für Handarbeits-Zubehör"
**(empfohlen)**

> *„Sag uns, was du mitnimmst. Wir rechnen dir das Etui: Schnittmuster, Fachbreiten,
> Elastiklängen, Stoffmenge und Nähanleitung – in 3 Minuten, ohne Konto."*
>
> Startnische: **Strick- und Häkelnadel-Etuis** (Nadelspiele, Rundstricknadeln, Zubehör).

| Kriterium | Bewertung | Begründung |
|---|---|---|
| Differenzierung | 🟡 **mittel-hoch (6/10)** | nicht der Editor differenziert, sondern **Füllmengen-Input → Layout-Vorschlag**; Domänenwissen statt Geometrie-Freiheit |
| Marktpotenzial | 🟡 **mittel (6/10)** | Stricken/Häkeln **wächst +7 %**, Ravelry 8,3–11 Mio., Nachfrage nach Nadel-Etuis belegt, **kein Generator vorhanden** |
| Entwicklungsaufwand | 🟢 **tragbar (4/10)** | 3–5 Modultypen, regelbasiertes Layout, 2D-Preview, PDF/SVG; kein generischer Solver nötig |
| Zielgruppenreichweite | 🟡 **mittel (6/10)** | Strick-Communitys sind groß, organisiert und **kanalisiert** (Ravelry, FB-Gruppen, LYS, YouTube) |
| Monetarisierung | 🟡 **mittel (6/10)** | Gratis-Kern + 9–19 € Einmalkauf „mein Etui als Paket" + Gewerbe-Lizenz; realistisch, aber klein |
| Wettbewerbsrisiko | 🟡 **mittel (5/10)** | Print + Cut + Sew könnte ein Nadel-Etui-Template bauen – **aber es hat keins, und Nadel-Etuis brauchen Domänenlogik (Nadelspitzen, Nadelstärken, Rundstrick-Seillängen)** |
| **Summe** | **33/70** | |

**Urteil:** **Beste Balance.** Der Differenzierungsanspruch ist kleiner, aber **ehrlich**: Wir
behaupten nicht, alles zu können, sondern **eine Sache besser zu wissen** (was Stricker:innen
mitnehmen). Und es gibt einen echten, unbesetzten Nachfrage-Ort.
**Schwäche:** Zu klein für ein großes Unternehmen. Genau richtig für ein kleines.

---

### Positionierung C — „Der Produktions-Assistent für Handmade-Marken" (B2B)

> *„Ein Innenleben definieren, 12 Größen und 40 Varianten generieren – mit konsistenter
> Anleitung, Chargendokumentation und kommerzieller Lizenz."*

| Kriterium | Bewertung | Begründung |
|---|---|---|
| Differenzierung | 🟢 **hoch (7/10)** | Größenfamilien + Lizenz + Chargendoku macht niemand; Wild Ginger **verbietet** kommerzielle Nutzung explizit |
| Marktpotenzial | 🔴 **niedrig-mittel (4/10)** | ~65 % der Etsy-Verkäufer:innen machen < 100 USD/Jahr **[H]**; die zahlungsfähige Schicht ist dünn |
| Entwicklungsaufwand | 🟡 **mittel-hoch (6/10)** | Varianten-Generierung, Versionierung, Lizenzverwaltung, Beleg-Export |
| Zielgruppenreichweite | 🔴 **klein (3/10)** | wenige Tausend Betriebe in DACH **[H]** |
| Monetarisierung | 🟢 **hoch (8/10)** | 29–79 €/Monat ist in diesem Segment marktüblich (Tailornova 49 USD, CLO 50 USD) |
| Wettbewerbsrisiko | 🟡 **mittel (5/10)** | Tailornova/Sewist könnten es nachbauen; aber sie adressieren Kleidung |
| **Summe** | **33/70** | |

**Urteil:** **Höchste Zahlungsbereitschaft pro Kopf, kleinste Reichweite.** Als **zweite Stufe**
nach B sehr attraktiv (der gleiche Konstruktionskern, ein anderes Paket). Als **Startpunkt**
riskant, weil man einen Markt von wenigen Tausend Betrieben mit einem Produkt betreten muss, das
noch niemand kennt.

---

### Positionierungsvergleich auf einen Blick

| | A: Organizer-CAD | **B: Innenleben-Konfigurator** | C: B2B-Produktions-Assistent |
|---|---|---|---|
| Kernversprechen | Freiheit | **Passgenauigkeit in 3 Min.** | Reproduzierbarkeit |
| Primärzielgruppe | Fortgeschrittene | **Strick-/Häkelfans** | Handmade-Gewerbe |
| Preis | 15–29 € einmalig | **0 € / 9–19 €** | 29–79 €/Monat |
| Aufwand bis MVP | 9–12 Monate **[H]** | **8–12 Wochen** **[H]** | 6–9 Monate **[H]** |
| Umsatzpotenzial (3 J.) | niedrig | **niedrig-mittel** | mittel |
| Verteidigbarkeit | niedrig (Technik kopierbar) | **mittel (Domänenwissen + Community)** | mittel (Workflow-Lock-in) |

### **Empfehlung: B als Einstieg, C als Ausbaustufe, A als Open-Source-/Vertrauens-Investment
(nicht als Produkt).**

Begründung [A]:
- **B ist der einzige Weg, mit dem Budget und der Zeit eines kleinen Teams ein Ergebnis zu
  liefern, das gegen „kostenlos" bestehen kann** – weil es nicht mit Funktionsumfang konkurriert,
  sondern mit **Geschwindigkeit und Domänenwissen**.
- **B erzeugt die Datenbasis für C:** Wer 2.000 Strick-Nadel-Etuis gerechnet hat, weiß, welche
  Nadelkombinationen real vorkommen. Dieses Wissen ist der einzige Burggraben, der nicht in
  Wochen kopiert werden kann.
- **A als öffentliches „Regelwerk"** (Open Source oder frei dokumentiert) schafft Vertrauen und
  Reichweite, ohne Entwicklungsbudget zu verbrennen – und positioniert das Team als
  Kompetenzträger in einer Nische, in der Kompetenz die Währung ist.

---

## 3. Achtzehn konkrete Differenzierungsmöglichkeiten

Bewertet nach **Wirkung** (wie stark unterscheidet es?) und **Aufwand** (1 = trivial, 5 = gross).
Alle sind gegen den in [`competitors.md`](competitors.md) belegten Status quo geprüft.

| # | Differenzierung | Warum es zählt (gegen wen) | Wirkung | Aufwand |
|---|---|---|---|---|
| 1 | **Füllmengen-Input statt Maßeingabe** („8 Nadelspiele, 4 Rundstricknadeln, 12 Markierer") | Kein Wettbewerber fragt nach dem **Inhalt**. Print + Cut + Sew fragt nach cm. Das ist der **Perspektivwechsel von Konstruktion zu Bedarf** | 🟢🟢🟢 | 3 |
| 2 | **Layout-Vorschlag statt leerer Canvas** | Löst die Lernkurve, an der Seamly/Valentina scheitern („steep learning curve") | 🟢🟢🟢 | 3 |
| 3 | **„Passt-das?"-Prüfung mit Warnungen** (Modul > Gusset-Tiefe, Loop kreuzt Naht, RV zu kurz) | Print + Cut + Sew rechnet, warnt aber nicht; Nutzerzitate zu Sewist zeigen, dass **Zuverlässigkeit** das Kaufkriterium ist | 🟢🟢🟢 | 3 |
| 4 | **Objektbibliothek für Halterungen** (Nadelkanal, Ringsteg, Kettenhaken, Ohrringstreifen, Pinselhalter) | Existiert **nirgends** als wiederverwendbare Objekte | 🟢🟢🟢 | 3 |
| 5 | **Loop-Länge aus Objektgeometrie** (Fachbreite + 2 × Dicke − Zug) | Print + Cut + Sew hat die Formel – **aber nur in einem Template**. Als generische Regel über alle Module ist es neu | 🟢🟢 | 2 |
| 6 | **SVG-Export** (Laser/Plotter/Projektor) | Print + Cut + Sew hat **kein SVG**; Katagami/Nastix schon | 🟢🟢 | 1 |
| 7 | **3D-Vorschau des *gefüllten* Innenlebens** | Atomm hat 3D nur für die Außenform; niemand zeigt das Innere mit Inhalt | 🟢🟢🟢 | 5 |
| 8 | **Kein Konto, kein Login, kein Preis für das Basis-Ergebnis** | Tisch-Stakes: Print + Cut + Sew und Katagami werben damit – **man kann nicht weniger anbieten** | 🟢🟢 (Hygiene) | 1 |
| 9 | **Deutschsprachige Bedienung mit deutscher Nähsprache** | Sewist, OpenSloper, Seamly, Print + Cut + Sew sind englisch; DE-Foren sind aktiv | 🟢🟢 | 2 |
| 10 | **Größenfamilien / Varianten-Export** (ein Layout → 6 Größen) | Atomm bewirbt es als Feature, aber nur für 4 Außenformen; Wild Ginger verbietet Verkauf | 🟢🟢🟢 | 4 |
| 11 | **Kommerzielle Lizenz explizit erlaubt** | Wild Ginger: „NOT licensed to create patterns to sell" – eine **marktlücke**, nicht nur ein Feature | 🟢🟢🟢 | 1 |
| 12 | **Anleitung, die die eigene Konfiguration nennt** („dein 3,2-cm-Fach, deine 4 Loops") | Print + Cut + Sew kann das für Templates; für freie Layouts ist es ungleich schwerer und wertvoller | 🟢🟢 | 3 |
| 13 | **Stoffverbrauch inkl. Verschnitt bei Freiform-Layouts** | OpenSloper kann Nesting, aber nicht für Organizer; Print + Cut + Sew schätzt nur | 🟢🟢 | 4 |
| 14 | **Mobile Einkaufsliste mit Stoffempfehlung** | Kein Wettbewerber adressiert den Moment **im Stoffladen** | 🟢🟢 | 2 |
| 15 | **„Ohne Schnittmuster"-Positionierung** (SEO/Botschaft gegen die Suchintention) | Trifft `ohne schnittmuster` als belegten Suchbegriff exakt | 🟢🟢 | 1 |
| 16 | **Community-Galerie „so sieht mein Innenleben aus"** | shesmile macht das erfolgreich mit „Designnähen"; kein Tool hat es | 🟢🟢 | 3 |
| 17 | **Domänen-Regelwerk als offene Spezifikation** | Schafft Vertrauen + SEO + Abwehr gegen „black box"-Vorwurf bei KI-Tools | 🟢 | 2 |
| 18 | **Auf Gegenstände kalibrierbare Standards** (Kreditkarte, Stiftlänge, Nadelstärke-Tabelle) | Ersetzt das Maßband – der größte Reibungspunkt am Nähplatz | 🟢🟢 | 2 |

**Die vier wertvollsten (Wirkung ÷ Aufwand):** #1, #3, #4, #2.
**Die drei teuersten:** #7 (3D), #10 (Varianten), #13 (Nesting) – **nicht in den MVP**.

---

## 4. Die fünf interessantesten Zielgruppen

| Rang | Zielgruppe | Warum | Zahlungsbereitschaft | Erreichbarkeit |
|---|---|---|---|---|
| **1** | **Strick- & Häkelfans** | Wachsender Markt (+7 % Garne), 8,3–11 Mio. Ravelry-Nutzer:innen, **belegte Näh-Intention** bei „stricknadel etui", **kein Generator vorhanden** | mittel (Community zahlt für gute Anleitungen) | 🟢 sehr gut (Ravelry, FB-Gruppen, LYS, YouTube, Strick-Podcasts) |
| **2** | **Handmade-Kleinunternehmer:innen** | Höchster Zahlungswille pro Kopf; Zeitersparnis ist direkt monetarisierbar; Lizenz-Lücke (Wild Ginger) ist belegt | **hoch** (29–79 €/Monat marktüblich) | 🟡 mittel (Etsy-Foren, Instagram, Sewunity, Messen) |
| **3** | **Fortgeschrittene Näher:innen** | Wollen konstruieren, scheitern an Seamly/Valentina (belegte Zitate); klein, aber **meinungsbildend und Multiplikator** | mittel (15–29 € einmalig) | 🟢 gut (Reddit, Foren, Näh-Blogs) |
| **4** | **Nähanfänger:innen** | Größtes Suchvolumen („für anfänger", „einfach"); bester Kanal für organisches Wachstum | **niedrig** (0–5 €) | 🟢 sehr gut (Pinterest, YouTube, Suchmaschinen) |
| **5** | **Schmuckliebhaber:innen** | Belegter, dauerhafter Objektmarkt (Etsy-Listings mit 2.300 Bewertungen); starke Empfehlerinnen, Geschenk-Kontext | niedrig für Software, hoch für Objekt | 🟡 mittel (Pinterest, Etsy) |

**Explizit nicht priorisiert:**
- **Make-up-Nutzer:innen** – Suchdaten zeigen **null Näh-Intention**, vollständig retail-orientiert
  (ikea, dm, action, jysk) **[B]**. Diese Zielgruppe ist ein **Content-/Objektmarkt**, kein
  Softwaremarkt. Sie als Kernziel zu wählen, wäre der teuerste Fehler der Produktidee.
- **Hobby-Näher:innen als Umsatzträger** – sie sind **Reichweite**, nicht **Erlös**
  (Suchintention „kostenlos pdf" auf Platz 1).

---

## 5. Die fünf wichtigsten Nutzerprobleme

*(Herleitung und Belege vollständig in [`customer-research.md`](customer-research.md), Kap. 3)*

| Rang | Problem | Belegstärke | Zahlungsrelevanz |
|---|---|---|---|
| **1** | **„Es passt nicht für *meine* Gegenstände"** | 🟢🟢🟢 Reddit-Eigenbaubeschreibungen, „ohne schnittmuster"-Suchbegriff, Etsy-Argument „sized to your tools" | hoch (Kernnutzen) |
| **2** | **„Ich weiß nicht, wie ich es konstruieren soll"** | 🟢🟢🟢 Seamly/Valentina-Rezeption („steep learning curve", „no manual") | hoch (ermöglicht Zahlung) |
| **3** | **„Ich habe keine Zeit, das jedes Mal neu zu machen"** | 🟢🟢 Atomm „re-exporting, not re-drafting"; shesmile-Module | **höchste** (Gewerbe) |
| **4** | **„Ich weiß nicht, ob das Ergebnis nähbar ist"** | 🟢🟢 Kalibrierfelder, „sew a test in scrap fabric", Sewist-Kritik | hoch (Vertrauen = Conversion) |
| **5** | **„Ich finde nichts, was ich verstehe"** (Orientierung, Sprache) | 🟢🟢 Autocomplete-Modifikatoren `einfach`, `für anfänger`, `anleitung`; englische Tools | mittel |

---

## 6. Empfohlene Positionierung (final)

> ### „Dein Etui. Gerechnet, nicht gesucht."
>
> **Für Menschen, die etwas mitnehmen, das es nicht in der richtigen Größe gibt.**
> Du sagst uns, was rein soll. Wir rechnen das Etui: Fächer, Elastiklängen, Reißverschluss,
> Stoffmenge – und du bekommst ein Schnittmuster, das beim ersten Mal passt, mit einer
> Anleitung, die zu *deiner* Konfiguration passt.
>
> **Kein Konto. Kein CAD. Kein Suchen. Erstes Ergebnis kostenlos.**

**Warum diese Formulierung:**

| Element | Begründung |
|---|---|
| „gerechnet, nicht gesucht" | trifft den belegten Suchbegriff `ohne schnittmuster` und die Frustration „ich finde kein passendes Pattern" |
| „was rein soll" | adressiert Problem 1 (Füllmenge statt Maße) – die stärkste Differenzierung (#1) |
| „beim ersten Mal passt" | adressiert Problem 4 (Nähbarkeit/Vertrauen) – die größte Kaufbarriere |
| „kein Konto, kein CAD" | adressiert die zwei stärksten Ablehnungen im Markt (belegt: Print + Cut + Sew, Katagami, Seamly-Kritik) |
| „erstes Ergebnis kostenlos" | überlebensnotwendig gegen den 0-€-Anker |

**Was diese Positionierung bewusst NICHT behauptet:** „frei konstruieren", „CAD", „Designer",
„unbegrenzte Möglichkeiten". Diese Wörter ziehen die falsche Zielgruppe an (Persona Jonas statt
Persona Maike) und wecken Erwartungen, die gegen OpenSloper und Seamly nicht zu gewinnen sind.

---

## 7. Empfohlenes Geschäftsmodell (Kurzfassung, Details in `business-model.md`)

**Freemium mit Einmalkauf – kein Abo im Hobby-Segment.**

```text
GRATIS (dauerhaft, ohne Konto)     → 1 Konfiguration, PDF-Download, Wasserzeichen-frei
                                      Ziel: Volumen, SEO, Mundpropaganda, Pinterest
     ↓
PAKET 9–19 € EINMALIG              → unbegrenzte Konfigurationen, SVG, Varianten,
                                      Anleitung als PDF, kommerzielle Lizenz
                                      Ziel: Hobby-Kern, Fortgeschrittene
     ↓
GEWERBE 29–49 €/MONAT              → Größenfamilien, Chargen-Export, Dokumentation,
  (oder 199–299 € einmalig)            Lizenz, Prioritätssupport
                                      Ziel: Handmade-Marken
```

**Warum kein Abo für Hobby:** Belegt durch Tailornova-Kündigungszitat, MPattern-Einmalkauf-
Modell (19,99 €), Wild-Ginger-Einmalkauf und die saisonale Nutzung (Weihnachten). Ein
Hobby-Abo ist gegen die Nutzungsrealität gebaut.

**Warum Gewerbe-Abo vertretbar ist:** Es existiert bereits Zahlungsbereitschaft für
Werkzeug-Abos in diesem Feld (Tailornova 49 USD/Monat, CLO 50 USD/Monat, Sewist Studio
4,99 USD/Monat).

---

## 8. Empfohlene MVP-Funktionen

**Ziel: In 8–12 Wochen ein Produkt, das eine Person in 3 Minuten zu einem nähbaren
Nadel-Etui bringt – und das man in einem Reddit-Post empfehlen kann.**

### MVP-Umfang (Must-have)

| # | Funktion | Warum im MVP |
|---|---|---|
| 1 | **Ein Projekttyp: Nadel-Etui** (eine Rolle/ein Etui, Wickel- oder Reißverschlussvariante) | Fokus. Nicht 5 Projekte halb. Belegte Nachfrage, kein Wettbewerber |
| 2 | **Füllmengen-Eingabe** (Nadelspiele mit Länge/Stärke, Rundstricknadeln, Häkelnadeln, Markierer) | Differenzierung #1 |
| 3 | **Regelbasierter Layout-Vorschlag** (Fachbreiten aus Nadellängen, Kanäle, Elastik-Loops) | Differenzierung #2 |
| 4 | **Einfache Anpassung per Ziehen** (Fachtrenner verschieben, Reihenfolge ändern) – **ohne** freie 2D-Fläche | der minimale „Editor"-, ohne Solver-Risiko |
| 5 | **Live-Validierung** (Fach zu schmal für Nadel, Gesamthöhe zu groß, Loop zu kurz) | Differenzierung #3 |
| 6 | **PDF-Export, A4-getiled, 100 %-Maßstab + 50-mm-Kalibrierquadrat** | Tisch-Stakes (Katagami/Nastix haben es) |
| 7 | **Zuschnittliste mit Nahtzugabe** (Stoff, Vlies, Elastik, Reißverschluss, Garn) | Tisch-Stakes |
| 8 | **Stoffverbrauch in Metern** | Tisch-Stakes |
| 9 | **Nähanleitung, die die eigene Konfiguration nennt** | Kernnutzen; Print + Cut + Sew ist hier gut – wir müssen gleichziehen |
| 10 | **Ohne Konto nutzbar, lokal gespeichert (localStorage), teilbarer Link** | gegen „no account"-Anker |
| 11 | **SVG-Export** | billig, differenzierend (#6) |
| 12 | **Deutsche + englische Oberfläche** | DE-Vorteil, EN-Reichweite |

### Ausdrücklich **nicht** im MVP

| Nicht bauen | Warum nicht | Wann ggf. |
|---|---|---|
| Freie 2D-Arbeitsfläche mit Objekt-Platzierung an beliebiger Position | Das ist Positionierung A – hoher Solver-Aufwand, niedrige Nachfrage, direkter Vergleich mit OpenSloper | nie als Kern; höchstens als „erweiterter Modus" nach Validierung |
| 3D-Vorschau | Teuer (#7, Aufwand 5), kein Conversion-Beweis | Stufe 2, wenn Zahlen es tragen |
| Weitere Projekttypen (Schmuck, Make-up, Federmäppchen, Pinselrolle) | verwässert; Make-up hat **null** Näh-Nachfrage **[B]** | erst wenn #1 trägt |
| Konto-, Cloud-, Sync-System | widerspricht dem „kein Konto"-Versprechen; kostet Infrastruktur | Stufe 2 für Gewerbe |
| Marktplatz für fremde Patterns | Makerist ist daran gescheitert (trotz 70.000 Patterns, 1.200 Designern) **[F]** | nie |
| Community-Features, Forum, Profile | kalter Start, hohe Moderationslast | nach 1.000 Nutzer:innen |
| KI-Prompt-zu-Pattern | eigener Wettbewerb (Ourlette), hohe Erwartungsfalle | beobachten, nicht bauen |
| Abo/Subscription-Billing | widerspricht Zielgruppe | erst Gewerbe-Tier |
| Lager/Warenwirtschaft, Stoff-Bestellintegration | eigenes Produkt | Partnerschaft statt Eigenbau |
| App (iOS/Android) | mobile Konstruktion ist unrealistisch **[A]** | nie für Konstruktion |
| Zuschnitt-Nesting | Aufwand 4, Nutzen erst bei Gewerbe | Gewerbe-Tier |

---

## 9. Chancen und Risiken — ehrlich gewichtet

### Die fünf Chancen

| # | Chance | Stärke |
|---|---|---|
| 1 | **Kombinationslücke objektbasiert + Constraint + Nähkonstruktion** existiert wirklich (geprüft, 32 Anbieter) | 🟢🟢🟢 |
| 2 | **Stricken/Häkeln wächst** (+7 % Garne) und ist **organisiert erreichbar** (Ravelry, FB, LYS, Podcasts) | 🟢🟢🟢 |
| 3 | **Distributionsbruch in DACH** (Makerist †, Sewunity umgebaut) – der Platz ist frei | 🟢🟢 |
| 4 | **Belegte manuelle Vorarbeit**: Menschen layouten heute auf Papier und im Excel | 🟢🟢 |
| 5 | **Geringe technische Einstiegskosten**: Geometrie-, PDF-, SVG-Engines existieren als Open Source; der Aufwand liegt in der Domänenlogik | 🟢🟢 |

### Die acht Risiken (die härtesten zuerst)

| # | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| 1 | **Der Preis-Anker ist 0 €** – Print + Cut + Sew liefert 80 % gratis, ohne Konto, ohne Werbung | 🔴🔴🔴 | Nicht mit Funktionsumfang konkurrieren, sondern mit **Geschwindigkeit + Domänenwissen + deutscher Sprache**. Und: **das kostenlose Ergebnis muss besser sein als seins** |
| 2 | **Das Segment schrumpft** – Stoffumsatz −10 %, Nähbereich unter Druck | 🔴🔴 | Nische mit Wachstum wählen (Stricken), nicht Federmäppchen |
| 3 | **Der Geldtopf ist winzig** – 48 Mio. € „Anleitungen" in DE | 🔴🔴 | Kein VC-Modell; kleines, profitables Produkt; Gewerbe-Tier früh |
| 4 | **Werkzeug-Nachfrage ≈ 0** – niemand sucht „Organizer-Designer" | 🔴🔴 | Auf **Produktbegriffe** optimieren („stricknadel etui nähen schnittmuster"), nicht auf Werkzeugbegriffe |
| 5 | **Konstruktionslogik ist der Aufwand** – Freiform-Nahtzugabe, Kollision, RV-Rundungen; unmögliche Schnittmuster zerstören Vertrauen sofort | 🔴🔴 | **MVP bewusst ohne Freiform.** Regelbasiert, validiert, mit Kalibrierquadrat und „Testnähen"-Hinweis |
| 6 | **KI verschiebt die Erwartung** von „bauen" zu „beschreiben" (Ourlette seit 10/2026) | 🟡🟡 | Domänen-Regelwerk so bauen, dass es **auch als Agenten-Tool** funktioniert (Seamcult-/MCP-Muster) |
| 7 | **Support-Last** bei Anfänger:innen | 🟡 | Geführter Modus, weniger Freiheit, klare Fehlermeldungen, FAQ statt Support |
| 8 | **GPLv3-Falle**, falls OpenSloper-Code verwendet wird | 🟡🟡 | **Juristisch klären vor der ersten Zeile fremden Codes.** Alternativ: eigene schlanke Geometrie oder permissive Bibliotheken |

### Der Grund, warum das Produkt scheitern könnte (der ehrlichste Satz in diesem Dokument)

> **Es könnte scheitern, weil die Menschen, die das Problem haben, es bereits kostenlos gelöst
> bekommen – von einem Anbieter, der kein Geld braucht, keine Konten will und keine Werbung
> schaltet.** Das Produkt muss in **drei Minuten** ein Ergebnis liefern, das **besser passt** als
> das von Print + Cut + Sew. Gelingt das nicht, gibt es keinen Grund zu zahlen – und keinen
> Grund zu wechseln.

---

## 10. Empfehlung: **Bedingtes Go**

### Die Entscheidung

**GO** – aber **nicht** für das Produkt aus dem Briefing.

Gebaut wird **Positionierung B**: ein **Innenleben-Konfigurator für Strick- und
Häkelnadel-Etuis**, gratis nutzbar ohne Konto, mit einem Einmalkauf-Tier (9–19 €) und einer
späteren Gewerbe-Stufe. **Nicht** gebaut wird ein frei positionierbarer Organizer-CAD als
Einstiegsprodukt.

### Begründung in drei Sätzen

1. Die im Briefing beschriebene Lücke **existiert** – aber sie ist eine **Integrations- und
   Domänenlücke**, keine Erfindungslücke, und jeder Baustein ist gratis verfügbar.
2. Der **einzige verteidigbare Vorteil** ist Domänenwissen („was nehmen Stricker:innen
   tatsächlich mit") plus Geschwindigkeit plus deutschsprachige Zugänglichkeit – und der lässt
   sich in einer **engen Nische** aufbauen, nicht in einem generischen CAD.
3. Die Nachfrage nach dem Ergebnis ist belegt, die Nachfrage nach dem Werkzeug nicht; deshalb
   muss das Produkt **als Ergebnis** auftreten („dein Etui, gerechnet") und nicht als Editor.

### Die fünf Abbruchkriterien (bitte vorher aufschreiben und einhalten)

| # | Kriterium | Messung | Konsequenz |
|---|---|---|---|
| **K1** | **Nachfrage**: < 500 Personen erzeugen in 8 Wochen nach Launch ein Etui | Analytics (eindeutige PDF-Downloads) | Positionierung überdenken; wenn < 200 → **No-Go** |
| **K2** | **Zahlungsbereitschaft**: < 1,5 % der Gratis-Nutzer:innen kaufen das 9–19-€-Paket | Conversion nach 12 Wochen | Preismodell/Positionierung ändern; wenn < 0,5 % → **No-Go für B, Wechsel zu C** |
| **K3** | **Passgenauigkeit**: > 15 % der erzeugten Schnittmuster werden als „passt nicht / nicht nähbar" gemeldet | Feedback-Button + Forenbeobachtung | **Sofortiger Baustopp**, Konstruktionslogik reparieren. Vertrauen ist nicht reparierbar |
| **K4** | **Wiederkehr**: < 10 % erstellen ein zweites Etui | Analytics | Es ist ein Einmal-Tool, kein Produkt → entweder Gewerbe-Fokus (C) oder einstellen |
| **K5** | **Wettbewerbsreaktion**: Print + Cut + Sew oder Atomm bringen ein Nadel-Etui-Template | Manuelles Monitoring, 1×/Monat | Auf Gewerbe/Workflow (C) ausweichen; nicht im Feature-Wettlauf kämpfen |

### Was vor der ersten Codezeile passieren muss (2 Wochen, wenig Budget)

1. **5–8 Interviews** mit Stricker:innen (Ravelry, FB-Gruppen, lokale LYS) zum heutigen Umgang
   mit Nadelaufbewahrung. **Frage nicht „würdest du ein Tool nutzen", sondern „zeig mir deine
   Nadelbox".**
2. **Wettbewerbs-Testnähung:** Print + Cut + Sew Zip-Around + Roll-Up Case **selbst nähen**.
   Erst danach weiß man, wie gut der Gratis-Standard wirklich ist. **Das ist die wichtigste
   Einzelaufgabe.**
3. **Fake-Door-Test:** Landingpage mit der Positionierung, 200–400 € Pinterest/Reddit-Traffic,
   messen: Klickrate auf „mein Etui rechnen".
4. **Preistest:** 9 € / 14 € / 19 € als Varianten, Conversion messen.
5. **Rechtsprüfung:** OpenSloper/Seamly-Lizenz (GPLv3) bei geplanter SaaS-Nutzung.

**Aufwand:** ~2 Wochen, ~500 €. **Ersparnis bei No-Go:** 3–6 Monate Entwicklung.

---

## 11. Technische Leitplanken (Empfehlung, keine Entscheidung)

| Thema | Empfehlung | Begründung |
|---|---|---|
| Geometrie-Kern | **Eigenes, schlankes parametrisches Modell** (Rechtecke, Rundungen, Offset-Polygone) – **kein** generischer Constraint-Solver im MVP | Ein Solver ist der teuerste Teil und im MVP nicht nötig (kein Freiform-Layout) |
| Fremdcode | OpenSloper/Seamly nur nach Lizenzprüfung; GPLv3 kann SaaS kontaminieren | Risiko #8 |
| Rendering | SVG-first, PDF aus SVG; A4-Tiling mit Kalibrierquadrat | Tisch-Stakes; SVG ist zusätzlich differenzierend |
| Sprache der Konstruktion | Domänenregeln **deklarativ** (Regelwerk als Daten, nicht als Code) | Voraussetzung für Varianten, Prüfungen und spätere Agenten-Anbindung |
| Zustand | lokal (localStorage/IndexedDB), teilbarer Link über kodierten Zustand | erfüllt „kein Konto"; Print + Cut + Sew macht es vor (`#z=…` in der URL) |
| Stack | Web, kein Login, statisch auslieferbar | niedrigste Betriebskosten, höchste Geschwindigkeit |

**Ein Warnhinweis [A]:** Der von Print + Cut + Sew verwendete Ansatz – **Zustand im URL-Fragment,
Rendering im Browser, kein Backend** – ist für dieses Produkt die richtige Architektur. Er
erklärt auch, warum der Wettbewerber ohne Team und ohne Kosten operieren kann. Wer hier einen
Server, Konten und eine Datenbank vorzieht, baut teurer, langsamer und mit mehr Angriffsfläche –
**ohne Nutzen für die Zielgruppe.**
