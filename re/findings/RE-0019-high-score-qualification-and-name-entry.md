---
id: RE-0019
title: High-score entry requires beating the current 10th-place score; names are 16 bytes of A-Z/space
status: confirmed
confidence: high
target: KAWAI 連連看 2004 v1.01
environment:
  os: Windows 11 x64
  locale: zh-TW
evidence:
  - re/sessions/20261023-kawai2004-live-audit.md
  - re/sessions/20261023-kawai2004-high-score-entry.md
  - re/findings/RE-0014-high-score-file.md
  - re/findings/RE-0016-failure-and-high-score-flow.md
implementation:
  - src/game/session.ts
  - src/ui/game-view.ts
---

## Question

When does a failed run qualify for the high-score table, how are ties ordered,
and what does the name-entry screen accept?

## Method

The high-score insertion routine `0x41c3a0` and the name-entry key handler
`0x41b730` were read statically in the unpacked v1.01 executable. The offsets
were cross-checked against the 22-byte file record and the live 7777-point
insertion in RE-0014/RE-0016.

## Observations

### Qualification

```text
difficulty = word [0x41f180]
if score <= table[difficulty][rank 9].score:
    [0x41f188] = 0
    return
```

- The comparison target is the current **10th-place** score for the active
  difficulty.
- The comparison is strict: a score equal to 10th place does not qualify.
- With a zeroed table, any positive score qualifies; a score of 0 does not.
- The qualifying branch sets `0x41f188 = 5` (name entry) at `0x41c878`; the
  non-qualifying branch sets it to 0 at `0x41c888` and returns.

### Ordering

The qualification routine also opens the name-entry screen. It first writes the
current score and level into the rank-10 slot and then walks upward, swapping
with the record above only while that record has a strictly lower score. The
resulting table is descending by score, and a new score equal to an existing
score is inserted below the existing entry. The old rank-10 entry is discarded.
This insertion happens when the screen opens, before the name is typed; the row
is provisional until Enter writes the name and saves the file.

### Name entry

The key handler is active while `0x41f188 == 5`:

| Key | Effect |
| --- | --- |
| `0x08` Backspace | Removes the last character. |
| `0x0D` Enter | Copies the text to the 16-byte fixed name field and saves. |
| `0x20` Space | Appends a space while the length is below 16. |
| `0x41`–`0x5A` | Appends the uppercase letter while the length is below 16. |

All other keys are ignored, including Escape. The name is not validated:
Enter on an empty field saves 16 spaces. The maximum length is 16 characters.
After Enter the game writes the active difficulty table and returns to the menu.

### Live confirmation

- With the saved 強 table `[24, 4, 0, …]` (10th = 0): score 0 produced no name
  screen; score 1 produced the name screen and saved at rank 2.
- With a custom 強 table `[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]` (10th = 1):
  score 1 (equal to 10th) produced no name screen; score 2 produced the name
  screen.
- The score-2 save produced `[10, 9, 8, 7, 6, 5, 4, 3, 2, 2]`: the new 2 was
  inserted below the existing 2, and the old 10th-place 1 was discarded.
- Escape did not cancel the entry; Enter saved. The injected keys again
  produced `UGVX` instead of `TEST`, the same input-injection artifact noted in
  RE-0014.

## Interpretation

```text
on failure:
    if score > table[difficulty][9].score:
        show name entry
        on Enter:
            write score/level into the table
            stable-insert by descending score, new entry below equal scores
            truncate to ten entries
            save the three-table file
            return to menu
    else:
        return to menu without a name screen
```

The high-score screen is optional presentation for a clone, but the threshold
and tie rule are now unambiguous.

## Confidence and limits

High: the comparison, insertion loop, and key dispatch are direct control-flow
reads. The live 7777 run in RE-0016 confirms the save and table offset. The
exact in-memory padding is a VB layout detail and does not affect the file
format.

The live audit also tested equality with 10th place and insertion below an
existing equal score; both results agree with the comparison instructions.

## Open questions

- Does the `最佳記錄` screen read only the active difficulty table, or all three?
  This is a display choice; the file contains all three tables.
- Are lowercase letters reachable through the real keyboard path? The handler
  only accepts `0x41`–`0x5A`; the synthetic `UGVX` result in RE-0014 was an
  input-injection artifact, not a game rule.

## Implementation impact

If the clone implements persistent high scores, qualify with
`score > tenthPlaceScore`, insert with a stable descending sort, and cap names
at 16 uppercase letters/spaces. Do not add an empty-name rejection; the original
saves spaces.
