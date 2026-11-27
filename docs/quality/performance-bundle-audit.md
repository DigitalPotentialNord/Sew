# Leistung & Bundle-Budgets

Geprüfte Dateien: `app/vite.config.ts`, `app/src/ui/App.tsx`, `app/src/core/construction.ts`, `app/scripts/check-bundle-size.mjs`.

---

## 1. Messwerte (Vorher vs. Nachher)

### Konstruktionskern (`tsx` auf Node.js v22)

| Szenario | Vorher | Nachher | Änderung |
| --- | --- | --- | --- |
| `strick` (11 Module, 42 Ops) | ~1,1 ms (Warm) | 4–15 ms (Kaltstart inkl. Import) | konstant schnell |
| `big24` (24 Module, 87 Ops) | 2,87 ms | 4,10 ms (`toSvg` 0,99 ms, `buildPdf` 172,4 ms / 63 S.) | stabil + vollständige Seiten |
| `big60` (60 Module, 210 Ops) | **20,89 ms** | **4,83 ms** | **4,3× schneller** (`O(V log V + E)`) |

### Bundle-Größen (`vite build` + `check-bundle-size.mjs`)

| Chunk | Vorher | Nachher | Budget (raw / gzip) |
| --- | --- | --- | --- |
| `index-*.js` (Initial-Load) | 414,8 kB / 118,0 kB | **407,1 kB / 114,9 kB** | 460 kB / 140 kB |
| `pdf-*.js` (Dynamic Import) | 409,3 kB / 170,5 kB | **428,7 kB / 177,1 kB** | 460 kB / 200 kB |
| `index-*.css` | — | **25,75 kB / 6,02 kB** | — |

---

## 2. Maßnahmen

1. **Echtes Lazy Loading für PDF (`App.tsx`, `vite.config.ts`):**
   - Statischer Import `import { buildPdf } from '../core/pdf'` in `App.tsx` durch `const { buildPdf } = await import('../core/pdf')` ersetzt.
   - `vite.config.ts` bündelt `pdf-lib`, `@pdf-lib` und `src/core/pdf.ts` gemeinsam in genau einen lazy Chunk `pdf-*.js`.
   - `dist/index.html` enthält kein `<link rel="modulepreload">` für PDF; der ~429 kB große PDF-Code wird erst beim Klick auf **PDF herunterladen** geladen.

2. **Algorithmische Komplexität (`construction.ts`):**
   - Topologisches Sortieren im Operationsgraph auf Adjazenzliste + binären Min-Heap umgestellt.
