---
id: RE-0014
title: The high-score file is 660 bytes of 22-byte name/score/level entries under a virtualized Windows path
status: inferred
confidence: medium
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
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

## Interpretation

The most likely layout is **three difficulty tables of ten rank entries**, each
22 bytes, for a total of 30 entries. The file may store the tables contiguously
(weak/strong/ultra) or interleave them by rank; the observed two non-empty
entries at indices 10 and 11 are consistent with the second table, but the
screen order and default `100` row are not yet explained.

```text
record: name[16] + score u32 + level u16
count: 10 ranks * 3 difficulty tables = 30 records = 660 bytes
```

## Confidence and limits

Medium for the 22-byte atomic entry and the 660-byte size, which are directly
observed. The 10×3 grouping and table ordering are inferred.

The name encoding, sort order, save timing, and how the built-in `100` row is
represented remain unconfirmed. A controlled high-score entry with a unique
name and score is the next test.

## Open questions

- Are the three 10-entry tables contiguous or interleaved?
- Is `100` a default score in memory, a data-table row, or a file row?
- Is the name ASCII, DBCS, or UTF-16? How is it terminated/padded?
- When is the file rewritten: immediately on name entry, on returning to the
  menu, or on exit?

## Implementation impact

Do not implement a high-score file format until a controlled write maps the
table index. The UI itself only needs ten rows with name/score/level.
