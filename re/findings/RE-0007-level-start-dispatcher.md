---
id: RE-0007
title: The level-start dispatcher sets the 225-second timer, score, and difficulty resources before calling three form methods
status: confirmed
confidence: high
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

Which routine starts a level, and where do the initial timer, score, and
resource counts come from?

## Method

Frida 17.24.3 attached to the windowed game and hooked the candidate routines
`0x4087b0`–`0x40afa0`. Starting level 1 produced three entries:
`0x4087b0`, `0x408c00`, and `0x408b20`, all with the same caller return
addresses `0x40dd7d`, `0x40dd84`, and `0x40dd8b` inside **`0x40dad0`**.

REA's instruction view of `0x40dad0` was then read around those call sites.
The live globals were read on the same process.

## Observations

1. `0x40dad0` contains the three calls through form-vtable slots:

   ```text
   0x40dd77  CALL [EDI+0x70c]
   0x40dd7e  CALL [EDI+0x714]
   0x40dd85  CALL [EDI+0x710]
   ```

   The hooked targets were `0x4087b0`, `0x408c00`, and `0x408b20`
   respectively. They are **methods called together on level start**, not three
   mutually exclusive level numbers.
2. Before those calls, `0x40dad0` computes the timer:

   ```text
   MOV EAX, [0x0041f184]
   IMUL EAX, EAX, 0x3e8
   MOV [0x0041f184], EAX
   MOV [0x0041f1b4], EAX
   ```

   The pre-multiplication value is the level time limit in seconds; for a
   fresh level 1 it was **225**. After the multiplication, `0x41f184` and the
   timer both held **225000**. This confirms a **225.000-second** initial timer.
3. `0x40dad0` reads `word [0x0041f166]`; when it is zero (level index 0, the
   first level) it resets the score and selects resource counts from
   `word [0x0041f180]`:

   - branch value 0 → `EAX = 8`;
   - branch values 1 or 2 → `EAX = 5`;
   - the result is written to `0x0041f1ac` and `0x0041f1ae`.

   On the live level-1 state, `0x41f180 = 1`, `0x41f1ac = 5`,
   `0x41f1ae = 5`, matching the two HUD resource counts `005` / `005`.
4. `0x40dad0` also writes `0x41f146 = 0`, `0x41f188 = 1`, and stores a
   timestamp/value at `0x41f1b0`.
5. The three form methods are **common level-start methods**. The earlier
   hypothesis that the eleven consecutive functions are one-per-level is
   therefore **rejected**; the eleven are form methods at different vtable
   slots, and at least three run for every level start.

## Interpretation

The level-start contract is now:

```text
level_start:
  if level_index (0x41f166) == 0:
      score = 0
      resources = (difficulty in {1,2}) ? 5 : 8
  timer_ms = level_seconds * 1000
  call form methods [vtable+0x70c], [vtable+0x714], [vtable+0x710]
```

For level 1, `level_seconds = 225`, `difficulty = 1` (`強`), resources 5/5.
The menu handlers write difficulty 0/1/2 for 弱/強/超強; see RE-0008.

## Confidence and limits

High for the dispatcher, the three observed method calls, the `225000 ms`
initial timer, and the live 5/5 resource values at difficulty 1.

The 8-resource branch is read from assembly but has not been reproduced by
changing the menu difficulty. The exact resource names (search vs reshuffle)
remain to be confirmed.

## Open questions

- Which HUD resource is `0x41f1ac` and which is `0x41f1ae`?
- Which of the eleven vtable methods are called on level 2/3/… transitions?
- Where is the level-clear bonus computed (not in this dispatcher)?

## Implementation impact

`src/game/session.ts` should model a zero-based level index, a per-level
`timeLimitMs` initialized from the level table, difficulty-dependent resource
counts, and the three start hooks only if they affect rules. The current flat
five-minute timer is wrong; see RE-0008 for the exact per-level formula.
