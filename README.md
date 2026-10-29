# G-Code Travel Optimizer

**[▶ Open the tool](https://sch000f.github.io/gcode-travel-optimizer/)** · [Deutsch](#deutsch)

A small browser tool that reduces travel moves in sliced G-code, and with them the stringing they cause. It was built for foaming / LW-PLA, which strings badly no matter how the retraction is set up, but it helps with any material that strings (PETG, TPU, …).

Everything runs locally in your browser. Your files are never uploaded anywhere. The whole tool is a single `index.html`, so you can also download it and use it offline.

## What it does

Slicers often start a new layer far away from where the previous one ended, or travel to small separate islands and back. This tool rewrites the G-code so that:

- **Closed loops start where the nozzle currently is.** The next layer begins right above the end of the previous one.
- **Small islands become detours.** A path that touches a wall is printed as a short detour from that wall instead of being travelled to separately. If the nozzle is on the smaller of two touching loops, the bigger one can also be printed as the detour.
- **Paths are reordered.** Within one feature type, the nearest path is printed next. Open paths such as infill and gap fill may be reversed.
- **Tiny extrusions can be removed (optional).** Stand-alone extrusions shorter than a set length (0–2 mm) are dropped.
- **Layer changes are streamlined.** When the new layer starts right next to the end of the previous one, the slicer's lift and travel moves are merged into one short ramp move. Retraction and Z hop are dropped if the slicer only added them for a long travel that no longer exists.
- **Layer-change retraction can be skipped (optional)** when the move to the next layer is very short.

Geometry, extrusion amounts, speeds and the order of feature types stay the same. Only start points and the order of paths change. A layer is only rewritten if its travels get shorter, and anything the tool does not understand is left untouched.

The page shows before/after statistics, a list of changed layers and a layer-by-layer preview with original and optimized side by side.

## Supported input

| Slicer | Status |
|---|---|
| PrusaSlicer (.gcode and binary .bgcode) | tested on a Prusa MK4S |
| SuperSlicer, OrcaSlicer | same G-code markers as PrusaSlicer |
| Bambu Studio | tested with a real multi-material H2D file (spiral Z hop, prime tower and firmware macros are kept as they are) |
| Cura, ideaMaker | supported (`;LAYER:`, `;TYPE:`), absolute extrusion is converted to relative |
| Simplify3D | supported (`; layer N, Z = …`, `; feature …`) |

Also handled:
- relative (M83) and absolute (M82) extrusion
- firmware retraction (G10/G11)
- Z hop
- arcs (G2/G3)
- wipe moves
- relative positioning blocks (G91)

Apart from PrusaSlicer and Bambu Studio, slicers were tested with converted files rather than real exports. **Always check the result in your slicer's G-code preview before printing**, and please open an issue if a file does not work.

`.bgcode` files are written back with heatshrink compression and without MeatPack. Thumbnails and metadata are kept.

## Usage

1. Open the [tool](https://sch000f.github.io/gcode-travel-optimizer/), or download `index.html` and open it in a browser.
2. Drop a `.gcode` or `.bgcode` file onto the page.
3. Click **Optimize**, check the preview, then download the result.

## Source code

The tool is a single self-contained `index.html`, so that it also works offline. To make the code easier to read, the same code is also copied into separate files in [`src/`](src):

| File | Contents |
|---|---|
| [`src/optimizer.js`](src/optimizer.js) | G-code parser and the travel optimization (loop rotation, detours, reordering) |
| [`src/bgcode.js`](src/bgcode.js) | Reading and writing Prusa binary G-code (heatshrink, MeatPack, CRC32) |
| [`src/app.js`](src/app.js) | User interface, preview and translations |
| [`src/style.css`](src/style.css) | Styles |

The copies are for reading only. The page always runs from `index.html`. After changing `index.html`, run `perl sync-src.pl` to refresh them.

## License

Public domain ([Unlicense](LICENSE)). Do whatever you want with it. There is no warranty, so use it at your own risk.

---

## Deutsch

**[▶ Tool öffnen](https://sch000f.github.io/gcode-travel-optimizer/)**

Ein kleines Browser-Tool, das Travel-Moves in fertig gesliceten G-Code-Dateien reduziert und damit das Stringing, das sie verursachen. Entstanden ist es für Foaming-/LW-PLA, das unabhängig von den Retract-Einstellungen stark fädelt. Es hilft aber bei jedem Material, das zu Stringing neigt (PETG, TPU, …).

Alles läuft lokal im Browser. Deine Dateien werden nirgends hochgeladen. Das ganze Tool ist eine einzige `index.html`, du kannst es also auch herunterladen und offline nutzen.

### Funktionen

- **Loop-Start verschieben:** Geschlossene Wände beginnen dort, wo die Düse gerade steht. Der neue Layer beginnt also direkt über dem Ende des vorherigen.
- **Inseln als Abstecher:** Ein Pfad, der eine Wand berührt, wird als kurzer Abstecher von dieser Wand gedruckt, statt separat angefahren zu werden. Steht die Düse auf der kleineren von zwei sich berührenden Konturen, kann auch die grössere als Abstecher gedruckt werden.
- **Pfade umsortieren:** Innerhalb eines Feature-Typs wird immer der nächstgelegene Pfad als Nächstes gedruckt. Offene Pfade wie Infill und Gap Fill dürfen auch rückwärts gedruckt werden.
- **Mini-Extrusionen entfernen (optional):** Alleinstehende Pfade unter einer einstellbaren Länge (0–2 mm) werden weggelassen.
- **Layerwechsel straffen:** Beginnt der neue Layer direkt neben dem Ende des vorherigen, werden die Hub- und Travel-Moves des Slicers zu einem kurzen Rampen-Move zusammengefasst. Retract und Z-Hop entfallen, wenn der Slicer sie nur für einen langen Travel eingefügt hatte, den es nicht mehr gibt.
- **Retract beim Layerwechsel weglassen (optional),** wenn der Weg zum nächsten Layer sehr kurz ist.

Geometrie, Extrusionsmengen, Geschwindigkeiten und die Reihenfolge der Feature-Typen bleiben gleich. Es ändern sich nur Startpunkte und die Reihenfolge der Pfade. Ein Layer wird nur umgeschrieben, wenn seine Travels kürzer werden, und alles, was das Tool nicht versteht, bleibt unverändert.

Die Seite zeigt eine Vorher/Nachher-Statistik, eine Liste der geänderten Layer und eine Vorschau, in der du Layer für Layer Original und Optimiert vergleichen kannst.

### Unterstützte Slicer

| Slicer | Stand |
|---|---|
| PrusaSlicer (.gcode und binäres .bgcode) | auf einem Prusa MK4S getestet |
| SuperSlicer, OrcaSlicer | gleiche Markierungen wie PrusaSlicer |
| Bambu Studio | mit einer echten Mehrfarben-Datei (H2D) getestet; Spiral-Z-Hop, Prime Tower und Firmware-Makros bleiben unverändert |
| Cura, ideaMaker | unterstützt, absolute Extrusion wird in relative umgewandelt |
| Simplify3D | unterstützt |

Ausserdem unterstützt:
- relative (M83) und absolute (M82) Extrusion
- Firmware-Retraction (G10/G11)
- Z-Hop
- Bögen (G2/G3)
- Wipes
- relative Positionierung (G91)

Ausser PrusaSlicer und Bambu Studio wurden die Slicer mit umgewandelten statt echten Dateien getestet. **Das Ergebnis vor dem Druck immer in der G-Code-Vorschau des Slicers prüfen.** Wenn eine Datei nicht funktioniert, freue ich mich über ein Issue.

### Quellcode

Das Tool ist eine einzige, eigenständige `index.html`, damit es auch offline funktioniert. Damit der Code leichter zu lesen ist, liegt derselbe Code zusätzlich als einzelne Dateien in [`src/`](src): `optimizer.js` (Parser und Optimierung), `bgcode.js` (Prusa Binary-G-Code), `app.js` (Oberfläche, Vorschau, Übersetzungen) und `style.css`. Diese Kopien sind nur zum Lesen da. Die Seite läuft immer aus der `index.html`.

### Lizenz

Gemeinfrei ([Unlicense](LICENSE)). Mach damit, was du willst. Es gibt keine Gewährleistung, die Nutzung erfolgt auf eigene Gefahr.
