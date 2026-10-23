---
id: RE-0014
title: The high-score file is 660 bytes of 22-byte name/score/level entries under a virtualized Windows path
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261023-kawai2004-live-audit.md
  - re/sessions/20261022-kawai2004-runtime.md
implementation:
  - src/game/session.ts
---

## Question

Where is the high-score file, and what is its record format?

## Method

The game's high-score screen exposes a top-10 table with `NO`, `NAME`, `SCORE`,
and `LEVEL` columns. The virtualized Windows directory was searched after live
runs, and the file was read as bytes.

## Observations

- The file is written to the Windows directory as `kawai2004.hst`. Under UAC
  virtualization the observed file was:

  `C:\Users\<user>\AppData\Local\VirtualStore\Windows\kawai2004.hst`

- The observed file is exactly **660 bytes**.
- A natural layout is **30 entries × 22 bytes**, where each entry is:

  ```text
  name[16]    space-padded ASCII
  score u32   little-endian
  level u16   little-endian
  ```

  All unused names were 16 spaces; unused records had zero score/level.
- The observed nonzero entries were at entry indices 10 and 11:

  ```text
  index 10: name = 16 spaces, score = 24, level = 0
  index 11: name = 16 spaces, score = 4,  level = 0
  ```

- The live high-score screen showed `100`, `24`, and `4` in the first three
  rows, all level 1. The `100` entry was not found in the file, so either it is
  a built-in/default row or the file had not yet been rewritten when it was
  read.

### Controlled write

A fresh difficulty-1 game was given score **7777**, then timer 0 to force a
time-out. The lose overlay was dismissed; the high-score name entry screen
appeared with score 7777. After a synthetic four-character name and Enter, the
file was re-read:

```text
index 10: name = "UGVX" + spaces, score = 7777, level = 0
index 11: name = spaces,         score = 24,   level = 0
index 12: name = spaces,         score = 4,    level = 0
```

The new entry was inserted at index **10**, not index 0, and the old entries
shifted down. This proves the 10-entry tables are contiguous and that
difficulty 1 (強) uses the second table, entries 10–19.

The synthetic key events produced `UGVX` rather than the intended `TEST`; the
name bytes are nevertheless plain single-byte characters padded with spaces.
The original high-score file was restored from the pre-test backup after the
probe.

## Interpretation

The layout is **three contiguous difficulty tables of ten rank entries**,
each 22 bytes:

```text
record: name[16] + score u32 + level u16
count: 10 ranks * 3 difficulty tables = 30 records = 660 bytes
table 0: entries  0-9   (weak / 弱, confirmed by a live 8493 save)
table 1: entries 10-19  (strong / 強, confirmed by controlled writes)
table 2: entries 20-29  (ultra / 超強, confirmed by a live score-1 save)
```

Entries are sorted by descending score within a table; a new score is inserted
at its rank and later entries shift down. The stored level is normally the
zero-based level index (`0` for level 1), matching `0x41F166`. A level-11
completion increments `0x41F166` to 11 and stores 11; the best-records screen
renders that row as `ALL PASS`.

The file is rewritten immediately after the name is entered and Enter is
pressed, while the high-score screen is still active.

## Confidence and limits

High for the 22-byte entry, the 660-byte size, the contiguous 10×3 table
layout, all three difficulty table offsets, the descending insertion, the
level-11 `ALL PASS` sentinel, and the immediate save after Enter: all were
directly observed.

The weak table was confirmed by a live 8493 save at difficulty 0; the ultra
table by a live score-1 save at difficulty 2.

The earlier `100` was not a default row: it was the **current failed run's
score** shown provisionally at the top of the name-entry screen. The
`最佳記錄` screen reads only persisted file entries; with the file containing
24 and 4, it shows exactly those two rows and no 100. Entering 7777 replaced
the provisional run score and wrote 7777/24/4.

## Open questions

- What exact keyboard mapping produced `UGVX` from synthetic VK events? This is
  an input-injection artifact; the game only accepts `A`–`Z`, space, backspace,
  and Enter (RE-0019).
- Does the game read all three tables or only the current difficulty table? The
  file contains all three; the `最佳記錄` screen displays the active difficulty.
- Are ties sorted by insertion order or by another key? Resolved in RE-0019:
  the insertion is stable and a new equal score goes below the existing entry.

## Implementation impact

The persistent format is now known: three contiguous 10-entry tables of
16-byte padded names, u32 scores, and u16 zero-based levels. The UI shows one
table for the active difficulty. Keep the file I/O out of the DOM and use the
same 660-byte layout for compatibility.
