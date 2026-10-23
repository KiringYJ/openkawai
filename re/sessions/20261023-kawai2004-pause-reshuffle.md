# 2026-10-23 — pause entry vs resume, and B = 0

## Setup

| Field        | Value |
| ------------ | ----- |
| Target       | KAWAI 連連看 2004 v1.01 |
| Archive SHA  | `3e722be316006e07fa3da8c39fa7926db41966b1501f756513df2335a93142c8` |
| Analysis SHA | `f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a` (`Kawai2004.unpacked.exe`) |
| Live build   | packaged `Kawai2004-0.1.0-rc.1`, DxWnd windowed |
| Process      | `Kawai2004.exe`, PID 63204 this run |
| Window       | `ThunderRT5Form`, client 800 × 600 at screen (50,50) |
| Tools        | REA 6.7.0, Ghidra 12.1.4, GNU objdump 2.42, Python ctypes process probe |
| Input        | Lawfully owned local copy |

## Question

When is the pause shuffle/resource cost paid, and what happens at B = 0?

## Procedure

1. Read the v1.01 README note.
2. Read the pause entry handler at `0x41a178` and the resume handler at
   `0x41a860`.
3. Start level 1 in the packaged windowed build.
4. Read A, B, timer, state, `0x41f188`, remaining, and a SHA-256 of the board
   array through `ReadProcessMemory`.
5. Click pause at client `(630, 13)`; read again.
6. Click the `GAME PAUSE` overlay at client `(400, 290)`; read again.
7. Write B = 0 (precondition only), click pause, and read again.

The probe only wrote resource B for the B=0 case. The board and timer were
never written.

## Observations

### Static

Pause entry, `0x41a178`:

```text
cmp word [0x41f1ae], 0    ; resource B
jle skip
word [0x41f188] = 7       ; GAME PAUSE
skip:
```

It does **not** shuffle or decrement B.

Pause resume, `0x41a860`:

```text
call [vtable+0x714]       ; 0x408c00 shuffle
loop:
    call [vtable+0x738]   ; 0x40b400 move finder
    until a move exists
B -= 1
timestamp = now
word [0x41f188] = 1       ; playing
```

It does **not** call `0x408b20`, so the chance kind is not re-rolled.

### Live

At B = 5:

```text
before pause: ui_state=1  B=5  board=6a63c3...
after pause:  ui_state=7  B=5  board=6a63c3...   GAME PAUSE visible
after resume: ui_state=1  B=4  board=ee8e99...   board shuffled
```

At B = 0:

```text
before pause: ui_state=1  B=0  board=ee8e99...
after pause:  ui_state=1  B=0  board=ee8e99...   no overlay
```

The pause click at B=0 did nothing: no `GAME PAUSE`, no B change, no board
change, no underflow. The entry gate `B > 0` is why.

The earlier 2026-10-22 pause probe measured the timer freeze (195860 ms
unchanged over two seconds) and the resume decay. This run confirms the
resource/board timing: entry is free, resume pays one B and reshuffles.

## Evidence

- `re/.local/evidence/readme.utf-8.txt` line 56 (v1.01 note).
- `0x41a178` pause entry and `0x41a860` resume handlers.
- `0x408c00` shuffle and `0x40b400` move finder (RE-0015).
- Live snapshots above; screenshots:
  - `re/.local/evidence/screens/live-after-pauseclick.png`
  - `re/.local/evidence/screens/live-b0-pause-denied.png`

## Limitations

- The B=0 precondition was written by the probe; the pause click and all
  subsequent game code ran normally.
- The pause entry did not measure the timer over two seconds in this run; the
  2026-10-22 probe did.
- The resume handler has no `B > 0` guard, but it is only reachable after a
  B > 0 entry and B cannot change while the overlay is up.

## Follow-ups

- None for the pause rule.
