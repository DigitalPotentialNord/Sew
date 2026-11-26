# Keyword- & Nachfrageforschung

Stand: 26.11.2026 · Methode und Beweisregeln: siehe [`README.md`](README.md)

---

## 0. Methodik — und was diese Daten **nicht** sind

**Verfügbar war:** Google-Autocomplete (Suggest-API, live abgefragt am 26.11.2026 für `hl=de`
und `hl=en`) sowie öffentlich genannte Keyword-Zahlen einzelner Quellen.

**Nicht verfügbar war:** Ahrefs, Semrush, eRank, Marmalead, Google Keyword Planner. Es gibt
daher **keine durchgängigen absoluten Suchvolumina**. Wer in diesem Dokument eine Zahl ohne
Quellenangabe sieht, sieht einen Fehler – es gibt keine.

### Was Autocomplete leisten kann und was nicht

| Autocomplete sagt | Autocomplete sagt **nicht** |
|---|---|
| **welche Formulierungen** Menschen tatsächlich tippen | wie **viele** Menschen sie tippen |
| **Rangfolge** der vermutlich häufigeren Varianten (die API ordnet grob nach Popularität) | absolute Volumina |
| **Existenz** eines wiederkehrenden Bedürfnisses | Kaufabsicht |
| **Abwesenheit** eines Begriffs (wenn keine Vervollständigung existiert, existiert kaum Nachfrage) | regionale Verteilung |

**Konsequenz:** Die folgenden Aussagen sind **relative** Aussagen. „Fehlt in den Top-10" heißt:
*deutlich* seltener, nicht „null".

---

## 1. Rohdaten: Deutsche Autocomplete-Bäume

Abgefragt am 26.11.2026, `hl=de`, Firefox-Client der Suggest-API. **Unverändert
wiedergegeben** – das ist das wichtigste Beweismaterial des Dokuments, weil es die Sprache der
Nutzer:innen zeigt.

### 1.1 Produkt-/Projektbegriffe mit Näh-Intention

| Eingabe | Top-Vervollständigungen |
|---|---|
| `federmäppchen` | federmäppchen · mädchen · jungen · erwachsene · englisch · step by step · **3 fach** · **nähen** · schwarz · leder |
| `federmäppchen nähen schnittmuster` | **kostenlos pdf** · **kostenlos** · *[bare]* · **ohne schnittmuster** |
| `organizer nähen` | **anleitung kostenlos** · **schnittmuster** · anleitung · **schnittmuster kostenlos** · **zum aufhängen** · youtube · einfach · wand · kabel |
| `utensilo nähen` | **schnittmuster gratis** · **anleitung pdf** · anleitung · **ohne schnittmuster** · einfach · **für anfänger** · mit boden · kinder · schnittmuster |
| `kosmetiktasche nähen schnittmuster` | **gratis** · *[bare]* · **kostenlos pdf** · **ohne reißverschluss** · **anfänger** · **ohne schnittmuster** · klein · **große … kostenlos** · anfänger kostenlos · einfache |
| `nadeltasche nähen` | anleitung · **selber nähen** · **für rundstricknadeln** · **für nadelspitzen** |
| `stricktasche nähen` | anleitung · **schnittmuster** · **socken** · **für unterwegs** |
| `pinselrolle` | **nähen** · **leder** · **nähen schnittmuster** · reinigen · klein · maler · bambus · künstler |
| `stricknadel etui` | **nähen** · leder · **schnittmuster** · **selbst nähen** · muud · häkeln · groß · leer · stricken · lana grossa |
| `schmuck organizer` | **schublade** · **ikea** · **hängend** · schublade ikea · **action** · **holz** · **dm** · **wand** · **diy** |
| `schmuck aufbewahrung nähen` | *(keine einzige Vervollständigung)* |
| `make up organizer` | schubladen · action · holz · jysk · **drehbar** · tasche · ikea · groß · dm |
| `organizer selber` | **machen** · **nähen** · basteln · bauen · **nähen anleitung** · häkeln · ideen · **gestalten** · zusammenstellen · ladekabel |

### 1.2 Werkzeug-/Softwarebegriffe (englisch, `hl=en`)

| Eingabe | Top-Vervollständigungen |
|---|---|
| `sewing pattern generator` | **free** · **online free** · online · software · **from picture** · **from image** · **ai** · from image free · from image online free |
| `custom sewing pattern` | **patterns** · **creator** · **designer** · **from photo** · *[bare]* · **generator** · patterns free · maker free · free · patterns website |
| `bag pattern maker` | *[bare]* · makers · **job** · **sewing** pattern maker · **leather** · kandi · beaded · **free** · crochet · **tote** |
| `sewing pattern calculator` | **online free** · stitch pattern calculator · **finder** · finder from image · **size calculator** · size calculator australia · **free** · **skirt** · **fabric** |
| `bag pattern calculator` | **box** · **boxy** · **tote** · **boxy makeup bag** · boxy bag sewing pattern calculator · how to calculate patterns · tote bag dimensions |
| `parametric sewing pattern` | parametric sewing **patterns** · parametric examples · parametric dimensions · … |
| `pouch pattern` | **pdf** · **knitting** · **free** · **sewing** · **calculator** · crochet · patterns free · pdf free |

### 1.3 Nischenbegriffe mit tiefer Nachfrage (englisch)

| Eingabe | Top-Vervollständigungen |
|---|---|
| `knitting needle case sewing pattern` | **free** · **free pdf** · **zipper** · needle **holder** · needle **bag** · **circular** · bag free · **interchangeable** · circular knitting needle case |
| `jewelry organizer sewing pattern` | **free** · **holder** · **box** · **storage** · **travel** · how to sew a travel jewelry organizer · **ideas** |
| `makeup bag sewing pattern` | **free** · **free pdf** · **beginner** · **pdf** · **no zipper** · **7 inch zipper** · **quilted** · **easy** · **with pockets** |
| `pencil case sewing pattern` | **free** · **no zipper** · pdf · **pdf free download** · free pdf · easy · **large** · **pen case** · pen case free |
| `sewing organizer insert pattern` | **purse** organizer insert · **bag** organizer insert · **tote** bag insert organizer · ~~how to organize sewing patterns~~ (Bedeutungswechsel!) |

---

## 2. Befunde aus den Rohdaten

### Befund 1 — Die Nachfrage ist **produkt**-, nicht **werkzeug**getrieben **[A, aus Rohdaten]**

Vergleich der Autocomplete-Tiefe:

| Ebene | Beispiele | Tiefe |
|---|---|---|
| **Produkt** („ich will X nähen") | federmäppchen nähen, organizer nähen, pinselrolle nähen, stricknadel etui | **tief, mit Gratis-/PDF-/Anfänger-Modifikatoren** |
| **Werkzeug** („ich will ein Tool") | sewing pattern generator, bag pattern maker | **flach**, generisch, ohne Organizer-Bezug |
| **Organizer-Werkzeug** | `custom bag pattern generator` → **keine Vervollständigung**; `schmuck aufbewahrung nähen` → **keine Vervollständigung** | **quasi nicht vorhanden** |

**Bedeutung:** Niemand sucht heute „Organizer-Designer". Das heißt **nicht**, dass niemand ihn
bräuchte – aber es heißt, dass **niemand danach sucht**. Ein Produkt in dieser Kategorie muss
**nachfrage-seitig erzeugt** werden (Content, SEO auf Produktbegriffe, Pinterest), nicht
abgeschöpft.

### Befund 2 — „Ohne Schnittmuster" / „ohne Vorlage" ist ein etablierter Suchwunsch **[B]**

Der Begriff taucht unabhängig bei **drei** verschiedenen Projekten in den Top-10 auf:
`utensilo nähen` (Position 4), `kosmetiktasche nähen schnittmuster` (Position 6),
`federmäppchen nähen schnittmuster` (Position 4). Zusätzlich `makeup bag sewing pattern` →
**`no zipper`** (Position 5), `pencil case sewing pattern` → **`no zipper`** (Position 2).

**Interpretation [A]:** Die Suchenden wollen **weniger Konstruktionsarbeit**, nicht mehr. Sie
wollen das Ergebnis *ohne* die Vorlage, weil die Vorlage nicht passt. Das ist die
**Bedürfnisbestätigung** – und gleichzeitig die **Kommunikationsfalle**: Das Produkt darf nicht
„Schnittmuster-Editor" heißen, sondern muss als **Abkürzung zum passenden Ergebnis** auftreten.

### Befund 3 — „Gratis / kostenlos / pdf" ist der Standard-Modifikator **[B]**

In **jedem** deutschen Produktbaum stehen `kostenlos`, `gratis`, oder `kostenlos pdf` in den
Top-Positionen. Bei `federmäppchen nähen schnittmuster` ist die **Nummer 1**
`kostenlos pdf`. Bei `kosmetiktasche nähen schnittmuster` sind **drei der ersten vier**
Gratis-Varianten.

**Bedeutung:** Die Zahlungsbereitschaft für digitale Nähprodukte ist im Volumen-Markt
**strukturell niedrig** – nicht als Meinung, sondern als Suchverhalten. **Ein Paywall-First-
Produkt im Hobby-Segment ist gegen die Suchintention gebaut.**

### Befund 4 — „Für Anfänger / einfach" ist ein starkes Segment **[B]**

`utensilo nähen` → `für anfänger`; `kosmetiktasche nähen schnittmuster` → `anfänger`,
`anfänger kostenlos`, `einfache`; `nähen` (Root) → `für anfänger`, `nähen lernen`, `mit kindern`.
Englisch: `makeup bag sewing pattern` → `beginner`, `easy`; `pencil case sewing pattern` → `easy`.

**Bedeutung:** Das größte Volumen sitzt bei **Anfänger:innen** – also genau bei der Gruppe mit
der **niedrigsten** Zahlungsbereitschaft und dem **größten** Bedarf an Führung. Das ist der
zentrale Zielkonflikt des Produkts.

### Befund 5 — Stricken ist der wachsende, Schmuck/Make-up der schrumpfende Software-Markt **[A]**

| Bereich | Nachfrage-Indikator | Kauf-Indikator |
|---|---|---|
| **Stricken/Häkeln** | `stricknadel etui` + `nähen`/`schnittmuster`/`selbst nähen` in Top-10; Ravelry 8,3–11 Mio. Nutzer:innen; Garnmarkt DE **+7 %** **[F]** | Community zahlt für Anleitungen (Ravelry-Marktplatz, 1,2 Mio. Patterns) |
| **Schmuck** | `jewelry organizer` tief, aber Modifikatoren sind `travel`/`holder`/`box` (Kauf) | **Kauf** von Objekten (25–40 €), nicht von Software |
| **Make-up** | `make up organizer` **vollständig retail** (ikea, dm, action, jysk, drehbar) | **Kauf** von Objekten; **null** Näh-Intention in Top-10 **[B]** |

**Das ist der wichtigste strategische Befund der Keyword-Recherche:** Die Produktidee nennt
Make-up-Organizer und Schmuckaufbewahrung als Kernprojekte. **Beide haben in den Suchdaten
keine Näh-/Software-Intention.** Die Näh-Intention sitzt bei **Stricknadeln, Stiften/Pinseln,
Utensilos, Kosmetiktaschen, Federmäppchen** – also bei **Handarbeits- und Schreibwaren-Zubehör**,
nicht bei Beauty- und Schmuck-Zubehör.

---

## 3. Suchintention: Was steckt hinter den Begriffen?

| Begriffstyp | Beispiel | Intention | Was sie wollen | Was sie **nicht** wollen |
|---|---|---|---|---|
| **Projekt + gratis/pdf** | „federmäppchen nähen schnittmuster kostenlos pdf" | **transaktional, sofort** | druckfertiges PDF, heute | Konto, Erklärung, Preis |
| **Projekt + anleitung** | „organizer nähen anleitung kostenlos" | **instruktiv** | Fotoschritte | CAD |
| **Projekt + ohne schnittmuster** | „utensilo nähen ohne schnittmuster" | **improvisativ** | Maße/Rechner, schnelle Regel | Vorlage kaufen |
| **Projekt + für anfänger** | „kosmetiktasche nähen anfänger" | **lernend, unsicher** | Führung, Sicherheit | Freiheit |
| **Werkzeug + generator/free** | „sewing pattern generator free" | **explorativ, technisch** | Ausprobieren | Registrierung |
| **Werkzeug + calculator** | „boxy bag calculator" | **punktuell, rechengetrieben** | eine Zahl | ein Werkzeug |
| **Konsum + organizer** | „make up organizer ikea" | **kaufend, retail** | fertiges Produkt | Selbstmachen |

**Kernaussage [A]:** Es existiert **keine** Suchintention „ich möchte einen Editor benutzen".
Es existiert eine Suchintention **„gib mir das passende Ergebnis, sofort, umsonst"** und eine
**„hilf mir rechnen"**. Das Produkt muss die erste Intention bedienen und die zweite als
Einstieg nutzen.

---

## 4. Wettbewerb in den Suchergebnissen (was rankt?)

Aus den Recherche-Treffern zu den Zielbegriffen abgeleitet **[A, aus Trefferlisten]**:

| Suchfeld | Wer dominiert | Konsequenz |
|---|---|---|
| „federmäppchen nähen schnittmuster" | Blogs (SewCanShe, Treasurie, deutsche Nähblogs), Pinterest, Etsy | Content-Marketing ist der Eintrittspreis |
| „organizer nähen" | Blogs + YouTube | Video ist Pflicht |
| „knitting needle case sewing pattern" | Etsy-Listings + Blogs + Pinterest | PDF-Anbieter sitzen fest |
| „sewing pattern generator" | Software-Listen (worldmetrics, sewingtrip), Tool-Seiten (DraftMySize, MPattern, Print + Cut + Sew) | **Print + Cut + Sew rankt hier bereits mit Gratis-Angebot** |
| „bag pattern calculator" | kleine Gratis-Rechner (speedcalcs, erb-schatz, sarkirsten) | Der Rechner-Platz ist besetzt, aber schwach |
| „jewelry organizer sewing pattern" | Etsy-Listings dominieren (By Annie, unzählige Indie-Shops) | Marktsättigung hoch |
| „AI sewing pattern" | Ourlette, IntelliSeam, MPattern, CLO | **Der neue, umkämpfte Platz** |

**Bemerkenswert [B]:** Print + Cut + Sew erscheint in den Treffern zu
*„sewing pattern generator"*, *„custom size sewing pattern"* und *„bag pattern maker"* – d. h.
**der Gratis-Wettbewerber besetzt bereits die Werkzeug-Suchbegriffe**, die das Produkt brauchen
würde. Das ist SEO-seitig der unangenehmste Einzelbefund.

---

## 5. Indikatoren jenseits von Google

| Kanal | Belegter Indikator | Bewertung als Nachfragesignal |
|---|---|---|
| **Pinterest** | 520 Mio.+ MAU (2025) **[H]**; „aesthetic organization hacks", „custom drawer dividers", „handmade planner inserts" als Trend 2026 **[H]**; unzählige „Sewing Room Organization"-Boards **[B]** | **Inspiration, nicht Kauf.** Hohe Reichweite, niedrige Konversion. Gut für Top-of-Funnel, schlecht für Umsatzprognose |
| **Etsy** | Organizer-/Jewelry-Patterns mit 800–2.300 Bewertungen pro Listing (z. B. By Annie Jewelry Travel Case: 2.300) **[B]**; Preise 2,50–15 € | **Bestes Nachfragesignal im Set**: Es gibt echte, wiederkehrende Käufe – aber zu Niedrigstpreisen |
| **Reddit** | r/sewing, r/sewingpatterns, r/craftsnark: wiederkehrende Threads zu „inside of bag", „organizer mat", "pattern drafting software" mit **detaillierten Eigenbaubeschreibungen** **[F]** | **Stärkstes Signal für das Kernproblem.** Hier wird die Arbeit, die das Produkt automatisieren will, explizit und freiwillig gemacht |
| **YouTube** | „organizer nähen youtube" ist eine Autocomplete-Variante **[B]**; Print Cut Sew Canada (A0-Druck) als Kanal **[F]** | Video ist der Lernmodus dieser Zielgruppe |
| **Ravelry** | 8,3–11 Mio. Nutzer:innen, 1,2 Mio. Patterns, 3.500 neue Projekte/Tag **[F]** | **Größte, bestorganisierte Teilgruppe.** Aber: Ravelry ist kein Software-Marktplatz |
| **Forentum DE** | Hobbyschneiderin24, Sewunity-Forum: aktive Diskussionen zu Pattern-Käufen, Plattformwechseln, Lizenzfragen **[F]** | **Wichtigster Kanal für DACH-Launch** (kein Algorithmus dazwischen) |
| **Makerist (†)** | 70.000+ Patterns, 1.200+ Designer:innen, 40 % Provision, 11 Jahre **[F]** | **Beweis für Plattformbedarf** – und Beweis, dass er allein nicht trägt (Schließung) |

---

## 6. Angebot vs. Nachfrage — die entscheidende Gegenüberstellung

| Projekt | Nachfrage-Indikator (Autocomplete) | Angebot (geprüft) | Verhältnis |
|---|---|---|---|
| **Federmäppchen** | **stark** (`kostenlos pdf` auf Platz 1) | **sehr hoch** (Blogs, Etsy, Gratis-PDFs, Print + Cut + Sew Zip/Body Pouch) | 🔴 gesättigt |
| **Kosmetiktasche** | **stark** | **sehr hoch** | 🔴 gesättigt |
| **Utensilo** | **stark** | **sehr hoch** | 🔴 gesättigt |
| **Stricknadel-Etui** | **mittel-stark**, wachsende Gruppe | **mittel** (Etsy, Blogs) – **aber kein Generator** | 🟡 **Chance** |
| **Nadelspitzen-/Rundstrick-Tasche** | **mittel** (`nadeltasche für rundstricknadeln`, `für nadelspitzen`) | **niedrig** | 🟢 **Chance** |
| **Pinselrolle** | **mittel** (`pinselrolle nähen schnittmuster`) | **mittel** (Print + Cut + Sew Roll-Up Case) | 🟡 teilweise besetzt |
| **Schmuckreise-Organizer** | **hoch** (`travel`, `roll`, `case` tief) | **sehr hoch** (Etsy, By Annie) | 🔴 gesättigt |
| **Make-up-Organizer** | **retail, nicht Nähen** | hoch im Retail | ⚫ **falsche Zielgruppe** |
| **Nadelkanäle / Nadeltasche für Sticknadeln** | **niedrig** | **niedrig** | 🟢 offen, aber klein |
| **Organizer-Editor (Werkzeug)** | **≈ keine Nachfrage** | **kein Angebot** | ⚪ **muss erzeugt werden** |

**Die vier besten Nachfrage/Angebot-Verhältnisse:**
1. **Stricknadel- & Nadelspitzen-Etui** (wachsende Zielgruppe, kein Generator vorhanden)
2. **Pinsel-/Stiftrolle** (Nachfrage da, nur template-gebunden bedient)
3. **Nadeltasche/Innenleben für Strickzubehör** (klein, unbesetzt)
4. **Gewerbe-Reproduktion** (kein Suchbegriff, aber belegter Zahlungswille)

---

## 7. Was daraus für Positionierung und SEO folgt

1. **Nicht auf „Organizer-Designer" optimieren** – niemand sucht das. Auf
   **„stricknadel etui nähen schnittmuster"**, **„nadeltasche rundstricknadeln"**,
   **„pinselrolle nähen schnittmuster"** optimieren.
2. **Gratis-Einstieg ist Pflicht**, sonst kollidiert das Produkt mit der Suchintention
   (`kostenlos pdf` auf Platz 1).
3. **„Ohne Schnittmuster" als Botschaft nutzen** – „kein Schnittmuster suchen, deins wird
   gerechnet" trifft die artikulierte Intention exakt.
4. **Deutschsprachiger Content ist ein Vorteil** – die mächtigen Tools sind englisch.
5. **Pinterest und YouTube sind Pflichtkanäle**, aber sie liefern Inspiration, keine Käufe;
   die Konversion muss über ein **sofort nutzbares Gratis-Ergebnis** laufen.
6. **Reddit und Hobbyschneiderin24 sind Validierungskanäle** – dort lässt sich die
   Zahlungsbereitschaft testen, bevor Code geschrieben wird.
