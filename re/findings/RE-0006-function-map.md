---
id: RE-0006
title: Function-level map of the v1.01 executable
status: confirmed
confidence: high
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
| `0x004087b0` | form vtable `0x70c`, level/board setup | Initializes `DAT_0041f118`; loops 18×11, playable 16×9; Frida caller `0x40dd7d` |
| `0x00408b20` | form vtable `0x710`, chance/board setup | Writes the chance kind at `0x408b9c`; called at level start and after a shuffle |
| `0x00408c00` | form vtable `0x714`, shuffle | Called by the manual/auto-shuffle paths |
| `0x00409040`–`0x0040afa0` | form vtable `0x718`–`0x734`, level-specific dispatch | Ten methods selected by the post-match jump table at `0x40da9c`; level 1 uses none |
| `0x0040b400` | move finder | Scans for a legal pair, stores hint endpoints, returns `-1`/`0` |
| `0x0040b610` | path checker | Called by the move finder for a candidate pair |
| `0x0040d230` | card deck initializer | Shuffles the 18 card reward codes and writes selected/reward records |
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
**rejected**. The live vtable map in RE-0015 shows:

- `0x4087b0`, `0x408b20`, `0x408c00` are common setup/shuffle methods called
  at level start and by the shuffle path.
- `0x409040`–`0x40afa0` occupy vtable slots `0x718`–`0x734` and are selected
  by the post-match level dispatch table, not one fixed routine per level.

The vtable slot map and dispatch table are now explicit; see RE-0015.

## Confidence and limits

High for the vtable slots, move finder, card initializer, and level dispatch
map: they were read from the live form vtable and decoded thunk targets. The
level-specific method semantics are only partly decoded; L2 is a downward
column compaction and L3 a leftward row compaction, while L4–L11 remain open.

Ghidra's `0x40afa0` decompilation timed out; its function body is not fully
decompiled. VB event handlers are invoked through runtime metadata rather than
direct calls, so `callers` lists are empty for several paint/mouse functions.

## Follow-ups

1. Parse the VB event table to map `Form_KeyDown`, `Form_Load`,
   `Form_MouseDown`, `Form_MouseMove`, and `Form_Paint` to addresses.
2. Decode the level-specific board transformations `0x409040`–`0x40afa0`
   statically; L2/L3 are known, L4–L11 remain open.
3. Finish the high-score save/load routine and its default `100` row.
4. Reproduce auto-shuffle exhaustion with a clean no-move board.
