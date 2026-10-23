# 2026-10-23 — continuation resource increments

## Setup

| Field        | Value |
| ------------ | ----- |
| Target       | KAWAI 連連看 2004 v1.01 |
| Archive SHA  | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8` |
| Analysis SHA | `f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a` (`Kawai2004.unpacked.exe`) |
| OS           | Windows 11 x64 |
| Locale       | zh-TW |
| Display      | 2560 × 1440 host desktop; no game process started |
| Tools        | REA 6.7.0, Ghidra 12.1.4 |
| Input        | Lawfully owned local copy; no runtime patching |

## Question

Does the clear-overlay continue increment both resource counters at every
difficulty, or does difficulty change the increment?

## Procedure

1. Open the unpacked executable in REA with the existing Ghidra snapshot.
2. Locate the continue hit-test and increment block inside the input dispatcher
   `0x4197f0`; the block starts at `0x41a344`.
3. Read the level-start resource initialization at `0x40dd3c` for comparison.
4. Cross-check the live difficulty-1 continuation in
   `20261022-kawai2004-runtime.md` (5/5 → 6/6, then 6/6 → 7/7).

## Observations

The continue block performs:

```text
level_index = word [0x41f166]
resourceA   = word [0x41f1ac]
level_index += 1
resourceA   += 1
if difficulty > 0:
    resourceB += 1
word [0x41f166] = level_index
word [0x41f1ac] = resourceA
then call vtable +0x758 (0x40dad0, the level-start dispatcher)
```

The condition is `CMP word [0x41f180], 0` followed by `JLE` over the
resource-B increment (`0x41a355`–`0x41a37b`). Therefore:

- difficulty 0 (弱): A increments, B does not;
- difficulty 1 (強): A and B both increment;
- difficulty 2 (超強): A and B both increment.

The level-start dispatcher `0x40dad0` only initializes both counters when the
level index is zero (`0x40dd3c`); it does not set them on a continuation. The
level-1 start values are 8/8 at difficulty 0 and 5/5 at difficulty 1/2.

## Evidence

- `0x41a344`–`0x41a38f` in `FUN_004197f0` (continue block).
- `0x40dd25`–`0x40dd74` in the level-start dispatcher (initial resources).
- Live difficulty-1 continuation readings in the 2026-10-22 session log.

## Limitations

- Static only for the difficulty-0 B skip; it was not re-tested live.
- The input dispatcher is a large VB event handler; only the increment block and
  its hit-test were read for this question.

## Follow-ups

- If desired, confirm difficulty 0 live by starting 弱, clearing level 1, and
  reading A/B before and after the continue click.
