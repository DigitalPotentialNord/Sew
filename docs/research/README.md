# Research: Interaktiver Organizer-Designer für Nähprojekte

**Phase 1 – Marktforschung & Produktchance**
Stand: 26. November 2026 · Status: abgeschlossen, Entscheidungsvorlage fertig

---

## Worum es geht

Geprüft wurde die Produktidee einer Webanwendung, in der Nutzer das **Innenleben** von
Federmäppchen, Schmuckrollen, Make-up-Organizern, Stricknadel-Etuis und ähnlichen
Taschen-Projekten **frei konstruieren** (Module platzieren, skalieren, konfigurieren) und
daraus automatisch **Schnittmuster, Materialliste, Zuschnittliste und Nähanleitung**
erhalten.

Die zentrale Forschungsfrage:

> Gibt es bereits einen echten CAD-ähnlichen Organizer-Designer, bei dem Nutzer das
> Innenleben eines Mäppchens frei konstruieren können und anschließend ein vollständiges,
> nähbares Schnittmuster erhalten?

## Kurzantwort

**Nein – diese Lücke existiert wirklich. Aber sie ist sehr viel schmaler, als die
Produktidee unterstellt.**

Alle Einzelteile existieren bereits und sind überwiegend **kostenlos**:

| Baustein | Status quo | Anbieter |
|---|---|---|
| Parametrische Maße → fertiges Organizer-Schnittmuster mit Nahtzugabe, Zuschnittliste, Materialschätzung, Nähanleitung | **existiert, gratis, ohne Konto** | Print + Cut + Sew, Katagami, Nastix, Atomm |
| Innenleben-Parameter (Elastikreihen, Loop-Breite, Steckfach-Tiefe, Fächeraufteilung, Reißverschlusslänge) | **existiert, gratis** | Print + Cut + Sew (Zip-Around Organiser, Roll-Up Case, Tool Belt, Bag Organiser Insert) |
| 3D-Vorschau + Parametrik + Export | **existiert, gratis** | Atomm Sewing Bag Pattern Generator |
| Freie 2D-Konstruktion mit Abhängigkeiten, Nahtzugaben, Stoffverbrauch, Packing | **existiert, Open Source** | OpenSloper, Seamly2D, Valentina, Sewist CAD |
| Modulbaukästen für Taschen-Innenleben als Produkt | **existiert, kommerziell** | shesmile „Innenleben 1–3" |

Was **nachweislich fehlt**, ist die **Kombination**: ein *objektbasierter, frei
positionierbarer* Innenraum-Editor, der Constraint-Logik (Kollision, Überlappung, Tiefe,
Nahtzugabe) beherrscht und daraus eine *technisch nachvollziehbare* Nähkonstruktion ableitet.

Das ist ein **echtes, aber enges Feature-Delta** – kein neuer Markt. Und es liegt in einem
Segment, in dem (a) die zahlungskräftigste Vergleichsgruppe „0 €" kostet, (b) die
Zahlungsbereitschaft für digitale Nähprodukte strukturell bei 3–8 € liegt und (c) das
relevante Suchvolumen um **ein bis drei Größenordnungen unter** dem der Kernbegriffe des
Segments liegt.

**Empfehlung: Bedingtes Go** – nicht als „Organizer-CAD", sondern als schlanker
*„Innenleben-Konfigurator"* mit einem einzigen, sehr engen Startsegment und einem
Bezahlmodell, das gegen „kostenlos" bestehen kann. Details und Abbruchkriterien in
[`opportunity-analysis.md`](opportunity-analysis.md).

---

## Dokumente

| Datei | Inhalt |
|---|---|
| [`market-landscape.md`](market-landscape.md) | Marktgrößen, Segmente, Wertschöpfungskette, Zahlungsstrukturen, Trends DE/EU/USA |
| [`competitors.md`](competitors.md) | Vollständige Wettbewerberanalyse: 30+ Anbieter, Vergleichsmatrix, 10 kritische Prüffragen, Beweislage |
| [`customer-research.md`](customer-research.md) | 8 Zielgruppen, 8 Personas, 5 Kernprobleme, Nutzungssituationen, Zahlungsbereitschaft |
| [`keyword-research.md`](keyword-research.md) | Nachfrageindikatoren DE/EU/USA, Autocomplete-Rohdaten, Suchintention, Angebot-vs-Nachfrage |
| [`opportunity-analysis.md`](opportunity-analysis.md) | 3 Positionierungen, 18 Differenzierungsmöglichkeiten, Chancen/Risiken, MVP, Go/No-Go |
| [`business-model.md`](business-model.md) | 8 Erlösmodelle, Szenarien (Modellrechnung, klar als Annahme markiert), Unit Economics |

## Arbeitsweise & Beweisregeln

Jede wesentliche Aussage trägt eine von vier Markierungen:

| Kürzel | Bedeutung |
|---|---|
| **[F]** | **Fakt** – auf einer benannten Quelle direkt nachlesbar (Preis, Funktionsliste, Zitat). Quelle verlinkt. |
| **[B]** | **Beobachtet** – von mir am 26.11.2026 tatsächlich auf der Anbieterseite geprüft (Funktion, Preis, Formulierung). |
| **[A]** | **Abgeleitet** – Schlussfolgerung aus mehreren Fakten; die Ableitung ist im Text nachvollziehbar. |
| **[H]** | **Hypothese** – begründete Annahme, **nicht** belegt. Muss vor Investitionsentscheidungen validiert werden. |

**Bewusst nicht enthalten:** erfundene Suchvolumina, erfundene Umsatzzahlen, erfundene
Interviewzitate. Wo Zahlen fehlen, steht das da. Wo ich rechne, steht die Rechnung.

**Bekannte Grenzen dieser Recherche (ehrlich):**

1. Kein Zugriff auf bezahlte Keyword-Tools (Ahrefs, Semrush, eRank, Marmalead). Absolute
   Suchvolumina sind deshalb **nur** dort angegeben, wo eine Quelle sie nennt – sonst wird
   ausschließlich mit Autocomplete-Rangfolgen und relativen Aussagen gearbeitet.
2. Keine Nutzerbefragung, kein Nutzertest. Personas sind aus beobachteten Artikulationen in
   Communities und aus Produktangeboten **abgeleitet**, nicht interviewt.
3. Wettbewerberfunktionen wurden über öffentliche Seiten, Doku und Presse geprüft – **nicht**
   durchgängig durch eigene Account-Anlage und Testnähung. Die Spalte „getestet" in
   [`competitors.md`](competitors.md) sagt genau, was tatsächlich geprüft wurde.
4. Marktzahlen von Marktforschungs-Portalen (unten) sind teils widersprüchlich und werden
   als solche gekennzeichnet.
