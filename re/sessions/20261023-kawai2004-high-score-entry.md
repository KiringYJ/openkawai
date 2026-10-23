# 2026-10-23 — high-score qualification and name entry

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

When does a failed run qualify for the high-score table, how are ties ordered,
and what does the name-entry screen accept?

## Procedure

1. Open the unpacked executable in REA with the existing analysis snapshot.
2. Read the high-score insertion routine `0x41c3a0`.
3. Read the name-entry key handler `0x41b730`.
4. Cross-check the record offsets against the 22-byte file layout from RE-0014
   and the live write observed in RE-0016.

## Observations

### Qualification

`0x41c3a0` begins with:

```text
difficulty = word [0x41f180]
if score <= table[difficulty][rank 9].score:
    [0x41f188] = 0
    return
```

The in-memory table is a 10-rank table for the active difficulty. The comparison
target is the current **10th-place** score. A score equal to 10th place does not
qualify; the new score must be strictly greater. With a zeroed table, a positive
score qualifies and a score of 0 does not. The qualifying branch sets
`0x41f188 = 5` (name entry) at `0x41c878`; the non-qualifying branch sets it to
0 at `0x41c888`.

### Insertion and ties

The routine first writes the current score and level into the rank-10 record,
then walks upward from rank 9. It swaps the new record with the record above
only while the record above has a strictly lower score. Therefore:

- entries are stored in descending score order;
- a new score equal to an existing score is inserted **below** the existing
  entry (insertion order is stable among ties);
- lower entries shift down and the old rank-10 entry is discarded.

### Name entry

`0x41b730` runs while `0x41f188 == 5`. It reads the entered text and accepts:

| Key | Effect |
| --- | --- |
| `0x08` Backspace | Remove the last character; an empty string stays empty. |
| `0x0D` Enter | Copy the text into the 16-byte fixed name field, save, and return to the menu. |
| `0x20` Space | Append a space while the length is below 16. |
| `0x41`–`0x5A` | Append the uppercase letter while the length is below 16. |

Other keys are ignored, including Escape (`0x1B`). The name is not validated:
pressing Enter on an empty field saves 16 spaces. The maximum name length is 16
characters; there is no prompt or confirmation after Enter.

The save writes the active difficulty's table (the file layout in RE-0014) and
sets the UI state back to 0.

## Evidence

- `0x41c3a0` qualification comparison and insertion loop.
- `0x41b730` key dispatch and fixed-string copy.
- RE-0014 for the 22-byte file record; RE-0016 for the live 7777 insertion at
  file entry index 10.

## Limitations

- Static analysis only; the qualification threshold was not re-tested live with
  a score equal to 10th place.
- The exact in-memory record padding is a VB layout detail; the file layout is
  already confirmed.

## Follow-ups

- None for the clone rules; the high-score screen is optional UI.
