# Interaktionsmodell — geführt und frei

Stand: 26.11.2026 · Kontext: [`editor-redesign.md`](editor-redesign.md) ·
Architektur: [`../architecture/positioning-model-decision.md`](../architecture/positioning-model-decision.md)

---

## 1. Leitidee: arbeiten mit dem Produkt, nicht mit der Abstraktion

Der Nutzer soll das Gefühl haben, sein Mäppchen **direkt vor sich** zu haben —
nicht eine technische Repräsentation davon. Deshalb:

- Die Fläche ist das **geöffnete Etui** (textil), kein Koordinatensystem.
- Technische Hilfen (Raster, Maße, Nahtzugaben) erscheinen **nur auf Wunsch**
  (erweiterter Modus) oder **bei Auswahl**.
- Wichtige Aktionen sind **visuell auffindbar** — niemand muss Shortcuts kennen.

---

## 2. Die vier Kernaufgaben (Lastenheft §4)

### A. Ein Element hinzufügen

1. Bibliothek öffnen (Desktop: linke Seitenleiste; mobil: Bibliotheks-Knopf).
2. Kategorie wählen (z. B. „Schmuck") → Karten erscheinen sofort.
3. Auf eine Karte **klicken** → das Modul erscheint auf der Stofffläche und ist
   ausgewählt. Alternativ: Karte auf die Fläche **ziehen**.

Beide Wege sind real: Klick ist primär, Drag & Drop zusätzlich (nicht alternativlos).

### B. Ein Element positionieren

- Das Modul **direkt auf der Fläche verschieben** (Pointer/Touch).
- **Magnetische Hilfen** (Terracotta-Linien) rasten an: Falzmitte, Zeilenanfänge
  beider Seiten, Modulkanten.
- Innerhalb einer Innenfläche sortiert das Verschieben **real** in der Zeile um
  (`moveInstance`) — keine Fake-x/y.
- Über den Falz ziehen wechselt **real** die Innenfläche (`moveToSide`).
- Unzulässige Positionen (Zeilenüberlauf, Höhenüberlauf) werden vom Regelwerk
  gemeldet (V-G-01 pro Seite, V-G-13, V-G-14), nicht still korrigiert.

### C. Ein Element bearbeiten

- Beim Anklicken erscheint die **kontextuelle Bearbeitung** (Desktop: rechtes
  Panel; mobil: rechter Drawer) — nur die Felder dieses Moduls.
- Primärwerte (Größe/Anzahl) oben; Position (Innenfläche/Zeile) und Material
  darunter; **Weitere Einstellungen** eingeklappt.
- Beispiel *Ringhalter* (M09): Breite, Höhe, Ringe (primär) · Position · Material
  · Polsterung („Weitere Einstellungen").
- Beispiel *Reißverschlussfach* (M03): Breite, Höhe (primär) · RV-Typ · Position
  · Material.
- Größe auch per **Griff** an der Auswahl änderbar (nur bei aktiver Auswahl).

### D. Entfernen oder duplizieren

- **Kontext-Aktionsleiste** (`ctx-bar`) schwebt über der Auswahl: Drehen,
  Duplizieren, Seite wechseln, Löschen.
- Gleichzeitig im Eigenschaften-Panel (Kopfleiste) und per Kurzbefehl
  (`⌘D` duplizieren, `⌫` löschen, `R` drehen — zusätzliche, nicht erforderliche Wege).

---

## 3. Standardeinstellungen (Lastenheft §6)

| Einstellung | Standard | Begründung |
| --- | --- | --- |
| Raster | ausgeblendet | Rauschenfrei; nur im erweiterten Modus |
| Automatische Ausrichtung | an (Einrasten) | magnetische Hilfen |
| Permanente Koordinaten | nein | x/y nur im erweiterten Modus bei Auswahl |
| Werkzeugbuttons | reduziert | nur Einrasten im einfachen Modus; Zoom immer |
| Auswahlgriffe | nur bei Auswahl | keine dauerhaften Griffe |
| Maße | nur bei Auswahl / erweitert | Auswahlmaß bleibt |
| Beschriftungen | verständlich | „Innenfläche", „Fach", nicht „Kanal/Zeile" |

Shortcuts sind **nicht erforderlich**; alle wichtigen Aktionen sind visuell
auffindbar (Kontextleiste, Eigenschaften, Bibliothek, Modus-Umschalter).

---

## 4. Modi

- **Einfach** (Standard): textile Oberfläche, kein Raster, keine Maßketten, keine
  Nahtzugaben-Innenlinie. Zeilen als dezente Zonen.
- **Erweitert**: zusätzlich Raster, Buch-Bemaßung, Nahtzugaben-Innenlinie,
  Außenkontur (`flap-outline`), Zeilennamen, x/y/Position-Details im Panel.

Der Modus ist sitzungslokal (`session.mode`) und beeinflusst **nur die Anzeige**,
niemals die Konstruktion.

---

## 5. Navigationsbereiche (Lastenheft §8)

Primär: **Designen** (textile Organizer-Fläche, Module, Positionierung).
Sekundär/technisch: **Schnittmuster** (Linien, Zuschnitt, Nahtzugaben, Maße).
Weiter: **Materialien** (Einkaufsliste), **Anleitung** (Nähreihenfolge), **Projekt**
(Vorlagen, speichern, import/export).

Die Design-Ansicht ist der erste Tab und Standard beim Start. Technische
Informationen sind eine bewusste Navigationsebene entfernt, nicht permanent
eingemischt.

---

## 6. Ehrlichkeit der Interaktion

Jede sichtbare Position ist durch ein echtes Modellfeld gestützt:
`side × rowId × Index`. Drag über den Falz = echte `moveToSide`; Drag innerhalb =
echte `moveInstance`. Es wird **keine** freie Pixel-Position gezeichnet, die das
Modell nicht hält (siehe Architekturentscheidung §3 und §7).
