# Runtime probes

These are optional, read-only investigation helpers for a **lawfully owned,
locally running** copy of Kawai2004 v1.01. They are not part of the web
application and are not required to build or test `openkawai`.

## Prerequisites

- Windows 11 x64.
- The original v1.01 build running in the windowed compatibility package from
  `KiringYJ/kawai-win11-compat`.
- Python 3 with `pymem` installed (`python -m pip install pymem`).

Use the **windowed / DxWnd** entry point. Do not use the direct
`WINXPSP3` launcher for these probes: it calls `SetDisplayMode(800, 600, 16)`
and changes the host desktop.

## Read the live board

```sh
python read_board.py
python read_board.py --json
```

The script prints:

- the module base and board data pointer;
- the 18 × 11 cell grid (`present`, `visual_id`, `match_id`);
- score (`0x41F140`), remaining tiles (`0x41F13C`), and timer
  (`0x41F1B4`) from the current session.

It only reads process memory. It does not patch, save, or inject code.

## Notes

The addresses are valid for the v1.01 unpacked executable with SHA-256
`f1eab078fa65f6fe63b2d5966adcddd1a24abfc99c6706ec30f033965e58f75a`.
A different build or a re-packed executable may place these globals elsewhere.
The version and hash are part of the finding, not an assumption.
