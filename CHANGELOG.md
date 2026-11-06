# Changelog

All changes to the tool, newest first.

## 2026-11-06

### Added
- **Refine path order** (on by default): after sorting by nearest path, the tool also tries reversing sections and moving paths elsewhere (2-opt / Or-opt). On a complex fuselage this cut travel distance by about 14 %; simple parts barely change. ([83c431a](https://github.com/sch000f/gcode-travel-optimizer/commit/83c431a))
- **Mix walls and infill** (off by default, from layer 2 on): walls and infill may be printed in any order if that saves travel. This changes the print order, so infill can be printed before the wall it touches. Bridges, overhangs, top surfaces and supports are not mixed. ([18c7efa](https://github.com/sch000f/gcode-travel-optimizer/commit/18c7efa))

### Changed
- Large files run about 10x faster, thanks to a bounding-box check in the detour search. ([18c7efa](https://github.com/sch000f/gcode-travel-optimizer/commit/18c7efa))

### Fixed
- Misplaced feature-type comments: when paths were reordered, some were labelled with the wrong feature (e.g. infill as "External perimeter"). Optimizing such a file a second time could then mix walls and infill by accident. ([18c7efa](https://github.com/sch000f/gcode-travel-optimizer/commit/18c7efa))
- The hint of "Skip retraction on layer change" pointed to a value "on the left" that is no longer there. ([83c431a](https://github.com/sch000f/gcode-travel-optimizer/commit/83c431a))

## 2026-10-29

### Added
- **Bambu Studio support.** Bambu files were not optimized at all, because the spiral Z lift at every layer change was treated as an unknown command. Prime towers and firmware macros (nozzle camera, timelapse) stay as written. ([f0662fd](https://github.com/sch000f/gcode-travel-optimizer/commit/f0662fd))

### Changed
- Where two paths keep their order and direction, the slicer's own moves between them (wipes, Z hop, turnarounds) are kept exactly as written. ([9f592bc](https://github.com/sch000f/gcode-travel-optimizer/commit/9f592bc))
- Top surfaces, top solid infill and ironing are never reordered, so monotonic surfaces stay unchanged. ([9f592bc](https://github.com/sch000f/gcode-travel-optimizer/commit/9f592bc))
- Paths next to a firmware macro with its own moves (e.g. a tool change) stay in place, so the macro is kept as written. ([9f592bc](https://github.com/sch000f/gcode-travel-optimizer/commit/9f592bc))
- Statistics and preview count one travel per gap between two extrusions, not one per G-code line. Numbers from earlier versions are not directly comparable. ([9f592bc](https://github.com/sch000f/gcode-travel-optimizer/commit/9f592bc))

### Fixed
- Arcs (G2/G3) were drawn as straight lines in the preview. ([f85fa4a](https://github.com/sch000f/gcode-travel-optimizer/commit/f85fa4a))
- Arc length was measured as a straight line, so a full circle counted as 0 mm and could be deleted by "Remove stand-alone extrusions". If you optimized files with that option on, optimize them again. ([f85fa4a](https://github.com/sch000f/gcode-travel-optimizer/commit/f85fa4a))

## 2026-10-28

### Added
- **Streamline layer changes** (on by default): when a new layer starts right next to the end of the previous one, the slicer's lift and travel moves are merged into one short ramp move. Retraction and Z hop are dropped if the slicer only added them for a long travel that no longer exists. ([8154387](https://github.com/sch000f/gcode-travel-optimizer/commit/8154387))

### Changed
- The retraction threshold now prefers PrusaSlicer's filament-specific `filament_retract_before_travel` over the printer value. ([8154387](https://github.com/sch000f/gcode-travel-optimizer/commit/8154387))
- The download buttons are labelled by file type (".bgcode" / ".gcode"). The .bgcode button is only shown for .bgcode input, because thumbnails and metadata come from the original file. ([754cb2a](https://github.com/sch000f/gcode-travel-optimizer/commit/754cb2a))

## 2026-10-24

### Added
- First public version: a single-file browser tool that moves loop starts, prints small islands as detours, reorders paths and can remove short extrusions. It reads PrusaSlicer, SuperSlicer, OrcaSlicer, Cura, ideaMaker and Simplify3D G-code plus Prusa binary .bgcode, with an English and German interface. Released into the public domain (Unlicense). ([ef3190c](https://github.com/sch000f/gcode-travel-optimizer/commit/ef3190c))
- Readable copies of the code in `src/`, so the source is easy to find on GitHub. ([17c4f2c](https://github.com/sch000f/gcode-travel-optimizer/commit/17c4f2c))

### Changed
- The page starts in English, and "Remove stand-alone extrusions" defaults to 0.8 mm. ([f5fd08c](https://github.com/sch000f/gcode-travel-optimizer/commit/f5fd08c))
