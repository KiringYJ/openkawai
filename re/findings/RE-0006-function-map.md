---
id: RE-0006
title: Function-level map of the v1.01 executable
status: inferred
confidence: medium
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261022-kawai2004-runtime.md
implementation: []
---

## Question

Which functions own startup, drawing, the 11 level rules, and high-score I/O?

## Method

REA 6.7.0 with the Ghidra 12.1.4 provider opened
`Kawai2004.unpacked.exe` (`f1eab078…`) and enumerated **157 procedures**
(74 external MSVBVM50 imports plus local functions). Function dossiers,
pseudocode, string references, and the existing static reports were cross-read.

The executable imports only `MSVBVM50.DLL`; COM creation supplies `DIRECT.DirectX7`
and `fmod.dll`. Form events are dispatched by the VB runtime, so many handlers
have no ordinary direct callers in Ghidra.

## Observed function map

| Address | Role | Evidence |
| --- | --- | --- |
| `0x004016d8` | PE entry | Ghidra entry symbol |
| `0x00408020` | `Form_Load` | Creates the DirectX object, calls `SetDisplayMode(800, 600, 16)`, creates surfaces, loads resources, initializes FMod |
| `0x00408370` | resource loader | Loads `CUSTOM` 101/102/103 into surfaces; strings `tempx.bmp`, resource IDs 0x65–0x67 |
| `0x004085d0` | surface helper | Creates a DirectDraw surface with width/height and a 0x40 flag |
| `0x004087b0` | form method called by the level-start dispatcher | Initializes `DAT_0041f118`; loops 18×11, playable 16×9; Frida caller `0x40dd7d` |
| `0x00408b20` | form method called by the level-start dispatcher | Same family; called at `0x40dd84` |
| `0x00408c00` | form method called by the level-start dispatcher | Same family; called at `0x40dd8b` |
| `0x00409040`–`0x0040afa0` | eight more form methods | Same board-writing family; their vtable roles and call conditions are not yet mapped |
| `0x00415490` | main paint/HUD (likely `Form_Paint`) | References `"SCORE"`, `"LEVEL"`, `"GAME PAUSE"`, `"CLICK TO CONTINUE"`; 2489-line pseudocode |
| `0x00416180` | overlay/flow routine | References `"ALL PASS"`, `"CLICK TO CONTINUE"` |
| `0x00416b80` | pause/flow routine | References `"GAME PAUSE"`, `"CLICK TO CONTINUE"` |
| `0x00418ad0` | score/level display | References `"SCORE"`, `"LEVEL"` |
| `0x0041a950` | high-score I/O | References `\kawai2004.hst`; file open/close strings |
| `0x0041dca0` | tile draw helper | Called repeatedly by the paint routine with surface coordinates |
| `0x0041dd20` | resource/string helper | Used by the resource loader |

## Interpretation

The executable is compact and splits naturally into:

```text
Form_Load (0x408020)
  → DirectDraw/FMod/resource setup (0x408370, 0x4085d0)
  → 11 level routines (0x4087b0 … 0x40afa0)
  → paint/HUD (0x415490)
  → overlays and high-score flow (0x416180, 0x416b80, 0x418ad0, 0x41a950)
```

The original "eleven consecutive routines = one per level" hypothesis is
**rejected**: Frida showed `0x4087b0`, `0x408c00`, and `0x408b20` all running
on a single level-1 start, through the three vtable calls in `0x40dad0`. They
are common form methods, not mutually exclusive level numbers. The remaining
eight methods are unclassified; their call conditions may still be
level-specific, but that has not been observed.

## Confidence and limits

Medium. The address/role mapping for startup, resource loading, the 11
routines, the paint routine, and the save-file routine is supported by code
shape and string references. The exact ownership of the overlay functions and
the level-by-level reshuffle semantics need dynamic confirmation and complete
decompilation.

Ghidra's `0x40afa0` decompilation timed out; its function body and the exact
event-table handler mapping remain incomplete. VB event handlers are invoked
through runtime metadata rather than direct calls, so `callers` lists are
empty for several paint/mouse functions.

## Follow-ups

1. Parse the VB event table to map `Form_KeyDown`, `Form_Load`,
   `Form_MouseDown`, `Form_MouseMove`, and `Form_Paint` to addresses.
2. Decompile `0x408b20`–`0x40afa0` with per-function timeouts and compare their
   array-writing loops.
3. Set breakpoints on `0x4087b0`–`0x40afa0` while starting each level to prove
   which routine runs for which level.
4. Decompile `0x41a950` fully to recover the `kawai2004.hst` record format.
